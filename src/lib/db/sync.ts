import type { SupabaseClient } from "@supabase/supabase-js";
import { db, SYNC_TABLES, type OutboxEntry, type SyncTable } from "./db";
import { getSettings } from "./repo";
import { defaultSettings, type UserSettings } from "./settings";

/**
 * Local-first sync. IndexedDB is the source of truth on the device; every write is
 * recorded in the outbox. `push` replays the outbox to Supabase (idempotent: rows carry
 * client-generated UUIDs and are upserted), `pull` merges remote rows that have no
 * pending local change. Last write wins per row (by updated_at).
 */

type RemoteSpec = { remote: string; onConflict?: string; cursor: string | null };
export const REMOTE: Record<SyncTable, RemoteSpec> = {
  bankrolls: { remote: "bankrolls", cursor: "updated_at" },
  venues: { remote: "venues", cursor: "updated_at" },
  sessions: { remote: "sessions", cursor: "updated_at" },
  shortcuts: { remote: "session_shortcuts", cursor: null },
  habits: { remote: "habits", cursor: "updated_at" },
  goals: { remote: "goals", cursor: "updated_at" },
  transactions: { remote: "transactions", cursor: "updated_at" },
  stackUpdates: { remote: "stack_updates", cursor: "at" },
  habitLogs: { remote: "habit_logs", onConflict: "habit_id,date", cursor: "updated_at" },
  studySessions: { remote: "study_sessions", cursor: "created_at" },
};

export type PushPlan = Array<{ table: SyncTable; upserts: string[]; deletes: string[] }>;

/** Collapse the outbox to the final operation per row, in parent → child table order. */
export function planPush(entries: readonly OutboxEntry[]): { plan: PushPlan; maxSeq: number } {
  const last = new Map<string, OutboxEntry>();
  let maxSeq = 0;
  for (const e of entries) {
    last.set(`${e.table}:${e.rowId}`, e);
    maxSeq = Math.max(maxSeq, e.seq ?? 0);
  }
  const plan: PushPlan = [];
  for (const table of SYNC_TABLES) {
    const ops = [...last.values()].filter((e) => e.table === table);
    if (!ops.length) continue;
    plan.push({
      table,
      upserts: ops.filter((e) => e.op === "upsert").map((e) => e.rowId),
      deletes: ops.filter((e) => e.op === "delete").map((e) => e.rowId),
    });
  }
  // Deletes run child → parent so FKs never block them.
  return { plan, maxSeq };
}

const LOCAL_ONLY_FIELDS: Partial<Record<SyncTable, string[]>> = {};
const REMOTE_ONLY_FIELDS = ["user_id", "client_id"];

export function toRemote(
  table: SyncTable,
  row: Record<string, unknown>,
  userId: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row, user_id: userId };
  for (const f of LOCAL_ONLY_FIELDS[table] ?? []) delete out[f];
  return out;
}

const DECIMAL_STRING_FIELDS = ["fx_rate", "fx_rate_to_display"];
export function fromRemote(row: Record<string, unknown>): Record<string, unknown> {
  const out = { ...row };
  for (const f of REMOTE_ONLY_FIELDS) delete out[f];
  for (const f of DECIMAL_STRING_FIELDS) if (typeof out[f] === "number") out[f] = String(out[f]);
  return out;
}

export async function push(client: SupabaseClient, userId: string): Promise<number> {
  const d = db();
  const entries = await d.outbox.orderBy("seq").toArray();
  if (!entries.length) return 0;
  const { plan, maxSeq } = planPush(entries);

  for (const step of plan) {
    if (!step.upserts.length) continue;
    const rows = (await d.table(step.table).bulkGet(step.upserts)).filter(Boolean) as Record<
      string,
      unknown
    >[];
    if (!rows.length) continue;
    const spec = REMOTE[step.table];
    const { error } = await client.from(spec.remote).upsert(
      rows.map((r) => toRemote(step.table, r, userId)),
      spec.onConflict ? { onConflict: spec.onConflict } : {},
    );
    if (error) throw new Error(`push ${spec.remote}: ${error.message}`);
  }
  for (const step of [...plan].reverse()) {
    if (!step.deletes.length) continue;
    const { error } = await client.from(REMOTE[step.table].remote).delete().in("id", step.deletes);
    if (error) throw new Error(`delete ${REMOTE[step.table].remote}: ${error.message}`);
  }
  // Only clear what we actually sent; writes made during the push stay queued.
  await d.outbox.where("seq").belowOrEqual(maxSeq).delete();
  return entries.length;
}

export async function pull(client: SupabaseClient): Promise<number> {
  const d = db();
  const cursors = ((await d.meta.get("pullCursors"))?.value ?? {}) as Record<string, string>;
  const pending = new Set((await d.outbox.toArray()).map((e) => `${e.table}:${e.rowId}`));
  let count = 0;

  for (const table of SYNC_TABLES) {
    const spec = REMOTE[table];
    let q = client.from(spec.remote).select("*").limit(5000);
    const since = spec.cursor ? cursors[table] : undefined;
    if (spec.cursor && since) q = q.gt(spec.cursor, since);
    const { data, error } = await q;
    if (error) throw new Error(`pull ${spec.remote}: ${error.message}`);
    const rows = (data ?? []).map((r) => fromRemote(r as Record<string, unknown>));
    const local = d.table(table);
    const toPut: Record<string, unknown>[] = [];
    for (const r of rows) {
      const id = r.id as string;
      if (pending.has(`${table}:${id}`)) continue; // local change wins until pushed
      const existing = (await local.get(id)) as Record<string, unknown> | undefined;
      if (
        existing?.updated_at &&
        r.updated_at &&
        (existing.updated_at as string) > (r.updated_at as string)
      )
        continue;
      toPut.push(r);
    }
    if (table === "habitLogs") {
      // Another device may have created the same (habit, day) under a different id.
      for (const r of toPut) {
        const dup = await d.habitLogs
          .where("[habit_id+date]")
          .equals([r.habit_id as string, r.date as string])
          .first();
        if (dup && dup.id !== r.id) await d.habitLogs.delete(dup.id);
      }
    }
    if (toPut.length) await local.bulkPut(toPut);
    count += toPut.length;
    if (spec.cursor && rows.length) {
      const max = rows.reduce(
        (m, r) => ((r[spec.cursor!] as string) > m ? (r[spec.cursor!] as string) : m),
        since ?? "",
      );
      cursors[table] = max;
    }
  }
  await d.meta.put({ key: "pullCursors", value: cursors });
  return count;
}

/** Profile-level settings live in profiles.settings (jsonb) + a few typed columns. */
export async function syncSettings(client: SupabaseClient, userId: string): Promise<void> {
  const d = db();
  const dirty = (await d.meta.get("settingsDirty"))?.value === true;
  const local = await getSettings();
  const { data, error } = await client
    .from("profiles")
    .select("settings, timezone")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(`profile: ${error.message}`);
  const remote = (data?.settings ?? {}) as Partial<UserSettings>;

  if (!dirty && remote.updated_at && remote.updated_at > local.updated_at) {
    await d.settings.put({ ...defaultSettings(), ...remote, key: "me" } as never);
    return;
  }
  if (dirty) {
    const { error: upErr } = await client
      .from("profiles")
      .update({ settings: local, timezone: local.timezone, onboarding_done: local.onboardingDone })
      .eq("id", userId);
    if (upErr) throw new Error(`profile update: ${upErr.message}`);
    await d.meta.put({ key: "settingsDirty", value: false });
  }
}

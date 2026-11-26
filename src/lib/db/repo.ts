import { db, type SyncTable } from "./db";
import { defaultSettings, type UserSettings } from "./settings";

/**
 * All writes go through here so every change lands in the outbox in the same
 * IndexedDB transaction (no lost syncs, no partial writes).
 */
export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

type AnyRow = { id: string } & Record<string, unknown>;
const listeners = new Set<() => void>();
/** Sync engine subscribes to know when there's something to push. */
export function onLocalWrite(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
const notify = () => listeners.forEach((cb) => cb());

export async function putRows<T extends AnyRow>(table: SyncTable, rows: T[]): Promise<T[]> {
  const d = db();
  const at = nowIso();
  const stamped = rows.map((r) => ("updated_at" in r ? { ...r, updated_at: at } : r));
  await d.transaction("rw", d.table(table), d.outbox, async () => {
    await d.table(table).bulkPut(stamped);
    await d.outbox.bulkAdd(stamped.map((r) => ({ table, op: "upsert" as const, rowId: r.id, at })));
  });
  notify();
  return stamped;
}

export async function putRow<T extends AnyRow>(table: SyncTable, row: T): Promise<T> {
  const [r] = await putRows(table, [row]);
  return r!;
}

export async function deleteRows(table: SyncTable, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const d = db();
  const at = nowIso();
  await d.transaction("rw", d.table(table), d.outbox, async () => {
    await d.table(table).bulkDelete(ids);
    await d.outbox.bulkAdd(ids.map((rowId) => ({ table, op: "delete" as const, rowId, at })));
  });
  notify();
}

export async function getSettings(): Promise<UserSettings> {
  const row = await db().settings.get("me");
  if (!row) return defaultSettings();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { key, ...rest } = row;
  return { ...defaultSettings(), ...rest };
}

export async function saveSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const next = { ...(await getSettings()), ...patch, updated_at: nowIso() };
  await db().settings.put({ ...next, key: "me" });
  await db().meta.put({ key: "settingsDirty", value: true });
  notify();
  return next;
}

/** Wipe everything on this device (sign-out / reset). */
export async function wipeLocalData(): Promise<void> {
  const d = db();
  await d.transaction("rw", d.tables, async () => {
    await Promise.all(d.tables.map((t) => t.clear()));
  });
}

"use client";

import { z } from "zod";
import type {
  Bankroll,
  Goal,
  Habit,
  HabitLog,
  ISODate,
  PokerSession,
  SessionShortcut,
  StackUpdate,
  StudyCategory,
  Transaction,
  TransactionType,
  Venue,
} from "@/lib/domain/types";
import { habitPresets } from "@/content/habits";
import { db } from "./db";
import { deleteRows, newId, nowIso, putRow, putRows } from "./repo";

/* ---------- Validation (every write boundary) ---------- */

const ccy = z.string().regex(/^[A-Z]{3}$/);
const minor = z.number().int().safe();
const nonNeg = minor.nonnegative();

export const bankrollInput = z.object({ name: z.string().trim().min(1).max(60), currency: ccy });

export const transactionInput = z
  .object({
    bankroll_id: z.string().min(1),
    type: z.enum(["deposit", "withdrawal", "transfer", "adjustment"]),
    amount_minor: minor.refine((v) => v !== 0, "Amount can't be zero"),
    currency: ccy,
    transfer_bankroll_id: z.string().nullable().default(null),
    note: z.string().max(500).nullable().default(null),
    occurred_at: z.iso.datetime(),
  })
  .refine(
    (t) =>
      t.type !== "transfer" || (t.transfer_bankroll_id && t.transfer_bankroll_id !== t.bankroll_id),
    {
      message: "Pick a different bankroll to transfer to",
    },
  );

export const sessionInput = z
  .object({
    format: z.enum(["cash", "mtt", "sng", "spin"]),
    is_live: z.boolean(),
    game: z.string().trim().min(1).max(20),
    bankroll_id: z.string().nullable(),
    venue_id: z.string().nullable(),
    stakes_sb_minor: nonNeg.nullable(),
    stakes_bb_minor: nonNeg.nullable(),
    straddle_minor: nonNeg.nullable(),
    buy_in_minor: nonNeg,
    rebuys_minor: nonNeg,
    cash_out_minor: nonNeg,
    prize_minor: nonNeg,
    bounties_minor: nonNeg,
    fees_minor: nonNeg,
    tips_minor: nonNeg,
    currency: ccy,
    fx_rate: z
      .string()
      .regex(/^\d+(\.\d+)?$/)
      .nullable(),
    started_at: z.iso.datetime(),
    ended_at: z.iso.datetime().nullable(),
    paused_ms: nonNeg,
    hands_played: z.number().int().positive().nullable(),
    finish_position: z.number().int().positive().nullable(),
    field_size: z.number().int().positive().nullable(),
    focus_rating: z.number().int().min(1).max(5).nullable(),
    tilt_rating: z.number().int().min(1).max(5).nullable(),
    energy_rating: z.number().int().min(1).max(5).nullable(),
    sleep_rating: z.number().int().min(1).max(5).nullable(),
    game_rating: z.enum(["A", "B", "C"]).nullable(),
    focus_point: z.string().max(200).nullable(),
    followed_focus: z.boolean().nullable(),
    stop_loss_minor: nonNeg.nullable(),
    max_length_min: z.number().int().positive().nullable(),
    takeaway: z.string().max(300).nullable(),
    notes: z.string().max(5000).nullable(),
    tags: z.array(z.string().max(30)).max(20),
  })
  .partial()
  .refine((s) => !s.ended_at || !s.started_at || s.ended_at >= s.started_at, {
    message: "End time is before start time",
  })
  .refine((s) => !s.finish_position || !s.field_size || s.finish_position <= s.field_size, {
    message: "Finish position can't be bigger than the field",
  });

/* ---------- Bankrolls & transactions ---------- */

export async function createBankroll(input: z.input<typeof bankrollInput>): Promise<Bankroll> {
  const v = bankrollInput.parse(input);
  const count = await db().bankrolls.count();
  const at = nowIso();
  return putRow("bankrolls", {
    id: newId(),
    ...v,
    archived: false,
    sort_order: count,
    created_at: at,
    updated_at: at,
  });
}

export async function updateBankroll(
  b: Bankroll,
  patch: Partial<Pick<Bankroll, "name" | "archived">>,
) {
  return putRow("bankrolls", { ...b, ...patch });
}

export async function addTransaction(
  input: z.input<typeof transactionInput>,
): Promise<Transaction> {
  const v = transactionInput.parse(input);
  if (v.type === "transfer") {
    const [from, to] = await db().bankrolls.bulkGet([v.bankroll_id, v.transfer_bankroll_id!]);
    if (!from || !to) throw new Error("Bankroll not found");
    if (from.currency !== to.currency)
      throw new Error("Transfers need two bankrolls in the same currency");
  }
  const at = nowIso();
  const amount = v.type === "adjustment" ? v.amount_minor : Math.abs(v.amount_minor);
  return putRow("transactions", {
    id: newId(),
    ...v,
    amount_minor: amount,
    fx_rate_to_display: null,
    created_at: at,
    updated_at: at,
  } satisfies Transaction);
}

export const deleteTransaction = (id: string) => deleteRows("transactions", [id]);

/* ---------- Sessions ---------- */

export function blankSession(over: Partial<PokerSession> = {}): PokerSession {
  const at = nowIso();
  return {
    id: newId(),
    created_at: at,
    updated_at: at,
    bankroll_id: null,
    venue_id: null,
    format: "cash",
    is_live: true,
    game: "NLHE",
    stakes_sb_minor: null,
    stakes_bb_minor: null,
    straddle_minor: null,
    buy_in_minor: 0,
    rebuys_minor: 0,
    cash_out_minor: 0,
    prize_minor: 0,
    bounties_minor: 0,
    fees_minor: 0,
    tips_minor: 0,
    expenses: [],
    currency: "USD",
    fx_rate: null,
    started_at: at,
    ended_at: null,
    paused_ms: 0,
    paused_at: null,
    hands_played: null,
    finish_position: null,
    field_size: null,
    focus_rating: null,
    tilt_rating: null,
    energy_rating: null,
    sleep_rating: null,
    game_rating: null,
    focus_point: null,
    followed_focus: null,
    stop_loss_minor: null,
    max_length_min: null,
    takeaway: null,
    notes: null,
    tags: [],
    status: "finished",
    ...over,
  };
}

export async function startSession(over: Partial<PokerSession>): Promise<PokerSession> {
  const running = await db().sessions.where("status").equals("running").first();
  if (running) throw new Error("A session is already running. End it first.");
  sessionInput.parse(over);
  const s = blankSession({ ...over, status: "running", started_at: nowIso(), ended_at: null });
  await putRow("sessions", s);
  if (s.buy_in_minor > 0) await addStackUpdate(s.id, s.buy_in_minor, 0);
  return s;
}

export async function updateSession(
  s: PokerSession,
  patch: Partial<PokerSession>,
): Promise<PokerSession> {
  sessionInput.parse({ ...s, ...patch, expenses: undefined, paused_at: undefined, id: undefined });
  return putRow("sessions", { ...s, ...patch });
}

export async function addStackUpdate(
  sessionId: string,
  stack_minor: number,
  addon_minor = 0,
): Promise<StackUpdate> {
  nonNeg.parse(stack_minor);
  nonNeg.parse(addon_minor);
  const u = { id: newId(), session_id: sessionId, stack_minor, addon_minor, at: nowIso() };
  await putRow("stackUpdates", u);
  if (addon_minor > 0) {
    const s = await db().sessions.get(sessionId);
    if (s) await putRow("sessions", { ...s, rebuys_minor: s.rebuys_minor + addon_minor });
  }
  return u;
}

export async function pauseSession(s: PokerSession) {
  if (s.paused_at) return s;
  return putRow("sessions", { ...s, paused_at: nowIso() });
}

export async function resumeSession(s: PokerSession) {
  if (!s.paused_at) return s;
  const paused = Math.max(0, Date.now() - Date.parse(s.paused_at));
  return putRow("sessions", { ...s, paused_at: null, paused_ms: s.paused_ms + paused });
}

export async function endSession(
  s: PokerSession,
  finish: Partial<PokerSession>,
): Promise<PokerSession> {
  const resumed = s.paused_at ? await resumeSession(s) : s;
  const done = {
    ...resumed,
    ...finish,
    status: "finished" as const,
    ended_at: finish.ended_at ?? nowIso(),
    paused_at: null,
  };
  sessionInput.parse({ ...done, expenses: undefined, paused_at: undefined, id: undefined });
  return putRow("sessions", done);
}

export async function saveFinishedSession(s: PokerSession): Promise<PokerSession> {
  sessionInput.parse({ ...s, expenses: undefined, paused_at: undefined, id: undefined });
  return putRow("sessions", { ...s, status: "finished" });
}

export async function deleteSession(id: string) {
  const updates = await db().stackUpdates.where("session_id").equals(id).primaryKeys();
  await deleteRows("stackUpdates", updates as string[]);
  await deleteRows("sessions", [id]);
}

export async function saveShortcut(
  label: string,
  preset: SessionShortcut["preset"],
): Promise<SessionShortcut> {
  const count = await db().shortcuts.count();
  return putRow("shortcuts", {
    id: newId(),
    label: label.trim().slice(0, 40),
    preset,
    sort_order: count,
    created_at: nowIso(),
    updated_at: nowIso(),
  });
}
export const deleteShortcut = (id: string) => deleteRows("shortcuts", [id]);

export async function upsertVenue(name: string, type: Venue["type"]): Promise<Venue> {
  const clean = name.trim();
  const existing = (await db().venues.toArray()).find(
    (v) => v.name.toLowerCase() === clean.toLowerCase(),
  );
  if (existing) return existing;
  const at = nowIso();
  return putRow("venues", {
    id: newId(),
    name: clean,
    type,
    location: null,
    photo_url: null,
    created_at: at,
    updated_at: at,
  });
}

/* ---------- Habits & study ---------- */

export async function createHabitsFromPresets(keys: string[]): Promise<Habit[]> {
  const existing = new Set((await db().habits.toArray()).map((h) => h.key));
  const at = nowIso();
  const rows: Habit[] = keys
    .filter((k) => !existing.has(k))
    .map((key, i) => {
      const p = habitPresets.find((x) => x.key === key)!;
      return {
        id: newId(),
        kind: "preset",
        key,
        name: p.name,
        target_value: p.target,
        unit: p.unit,
        days_of_week: [1, 2, 3, 4, 5, 6, 7],
        sort_order: existing.size + i,
        active: true,
        created_at: at,
        updated_at: at,
      };
    });
  return putRows("habits", rows);
}

export async function createCustomHabit(
  name: string,
  unit: Habit["unit"],
  target: number,
): Promise<Habit> {
  const at = nowIso();
  const count = await db().habits.count();
  return putRow("habits", {
    id: newId(),
    kind: "custom",
    key: null,
    name: z.string().trim().min(1).max(60).parse(name),
    target_value: unit === "boolean" ? 1 : z.number().int().positive().parse(target),
    unit,
    days_of_week: [1, 2, 3, 4, 5, 6, 7],
    sort_order: count,
    active: true,
    created_at: at,
    updated_at: at,
  } satisfies Habit);
}

export const updateHabit = (h: Habit, patch: Partial<Habit>) =>
  putRow("habits", { ...h, ...patch });

/** Set a habit's manual value for a day (one row per habit per day). */
export async function setHabitValue(
  habitId: string,
  date: ISODate,
  value: number,
): Promise<HabitLog> {
  const existing = await db().habitLogs.where("[habit_id+date]").equals([habitId, date]).first();
  return putRow("habitLogs", {
    id: existing?.id ?? newId(),
    habit_id: habitId,
    date,
    value: Math.max(0, Math.round(value)),
    source: "manual",
    updated_at: nowIso(),
  } satisfies HabitLog);
}

export async function logStudy(
  minutes: number,
  category: StudyCategory,
  note: string | null,
  started_at = nowIso(),
) {
  z.number().int().min(1).max(1440).parse(minutes);
  return putRow("studySessions", {
    id: newId(),
    started_at,
    minutes,
    category,
    note: note?.trim() || null,
    created_at: nowIso(),
  });
}

/* ---------- Goals ---------- */

export async function saveGoal(
  g: Omit<Goal, "id" | "created_at" | "updated_at"> & { id?: string },
): Promise<Goal> {
  const at = nowIso();
  const existing = g.id ? await db().goals.get(g.id) : undefined;
  const goal: Goal = {
    ...g,
    id: g.id ?? newId(),
    created_at: existing?.created_at ?? at,
    updated_at: at,
  };
  if (goal.is_main) {
    const others = (await db().goals.toArray()).filter((x) => x.is_main && x.id !== goal.id);
    if (others.length)
      await putRows(
        "goals",
        others.map((o) => ({ ...o, is_main: false })),
      );
  }
  return putRow("goals", goal);
}
export const deleteGoal = (id: string) => deleteRows("goals", [id]);

export type { TransactionType };

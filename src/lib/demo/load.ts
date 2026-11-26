"use client";

import { db, type SyncTable } from "@/lib/db/db";
import { deleteRows, getSettings, putRows, saveSettings } from "@/lib/db/repo";
import { localDate } from "@/lib/dates/dates";
import { generateDemo, type DemoData } from "./demo";

const TABLES: Record<keyof DemoData, SyncTable> = {
  bankrolls: "bankrolls",
  venues: "venues",
  sessions: "sessions",
  shortcuts: "shortcuts",
  habits: "habits",
  goals: "goals",
  transactions: "transactions",
  stackUpdates: "stackUpdates",
  habitLogs: "habitLogs",
  studySessions: "studySessions",
};

/** Writes the demo player through the normal outbox and remembers its ids for removal. */
export async function loadDemoData(): Promise<void> {
  const settings = await getSettings();
  const data = generateDemo(localDate(Date.now(), settings.timezone));
  // Keep the user's own main goal if they already have one (only one main goal at a time).
  if ((await db().goals.toArray()).some((g) => g.is_main && g.status === "active")) {
    data.goals = data.goals.map((g) => ({ ...g, is_main: false }));
  }
  const ids: Record<string, string[]> = {};
  for (const [key, table] of Object.entries(TABLES) as Array<[keyof DemoData, SyncTable]>) {
    const rows = data[key] as unknown as Array<{ id: string } & Record<string, unknown>>;
    // putRows stamps updated_at with "now"; keep the demo's own timestamps instead.
    await putRows(table, rows);
    await db().table(table).bulkPut(rows);
    ids[table] = rows.map((r) => r.id);
  }
  const prev = ((await db().meta.get("demoIds"))?.value ?? {}) as Record<string, string[]>;
  for (const [t, list] of Object.entries(prev)) ids[t] = [...(ids[t] ?? []), ...list];
  await db().meta.put({ key: "demoIds", value: ids });
  await saveSettings({ onboardingDone: true });
}

export async function hasDemoData(): Promise<boolean> {
  return Boolean((await db().meta.get("demoIds"))?.value);
}

export async function removeDemoData(): Promise<void> {
  const ids = ((await db().meta.get("demoIds"))?.value ?? {}) as Record<string, string[]>;
  // Children first.
  const order: SyncTable[] = [
    "studySessions",
    "habitLogs",
    "stackUpdates",
    "transactions",
    "goals",
    "habits",
    "shortcuts",
    "sessions",
    "venues",
    "bankrolls",
  ];
  for (const t of order) await deleteRows(t, ids[t] ?? []);
  await db().meta.delete("demoIds");
}

"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import type { ISODate } from "@/lib/domain/types";
import { localDate } from "@/lib/dates/dates";
import { db } from "./db";
import { getSettings } from "./repo";
import { defaultSettings, type UserSettings } from "./settings";

/** Live queries over the device database. `undefined` while loading. */
export const useBankrolls = () =>
  useLiveQuery(() => db().bankrolls.orderBy("sort_order").toArray(), []);
export const useTransactions = () =>
  useLiveQuery(() => db().transactions.orderBy("occurred_at").toArray(), []);
export const useSessions = () =>
  useLiveQuery(() => db().sessions.orderBy("started_at").reverse().toArray(), []);
export const useRunningSession = () =>
  useLiveQuery(
    async () => (await db().sessions.where("status").equals("running").first()) ?? null,
    [],
  );
export const useSession = (id: string | null) =>
  useLiveQuery(async () => (id ? ((await db().sessions.get(id)) ?? null) : null), [id]);
export const useStackUpdates = (sessionId: string | null) =>
  useLiveQuery(
    async () =>
      sessionId ? db().stackUpdates.where("session_id").equals(sessionId).sortBy("at") : [],
    [sessionId],
  );
export const useShortcuts = () =>
  useLiveQuery(() => db().shortcuts.orderBy("sort_order").toArray(), []);
export const useVenues = () => useLiveQuery(() => db().venues.orderBy("name").toArray(), []);
export const useHabits = () => useLiveQuery(() => db().habits.orderBy("sort_order").toArray(), []);
export const useHabitLogs = () => useLiveQuery(() => db().habitLogs.toArray(), []);
export const useStudySessions = () =>
  useLiveQuery(() => db().studySessions.orderBy("started_at").toArray(), []);
export const useGoals = () => useLiveQuery(() => db().goals.toArray(), []);
export const useSettings = (): UserSettings | undefined => useLiveQuery(() => getSettings(), []);
export const useOutboxCount = () => useLiveQuery(() => db().outbox.count(), []);

/** Current time, re-rendering every `ms` (timers, "today" rollover at midnight). */
export function useNow(ms = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Today's calendar date in the user's timezone. */
export function useToday(): { today: ISODate; tz: string } {
  const settings = useSettings();
  const now = useNow(60_000);
  const tz = settings?.timezone ?? defaultSettings().timezone;
  return useMemo(() => ({ today: localDate(now, tz), tz }), [now, tz]);
}

/* Phase 2: hand journal */
export const useHands = () =>
  useLiveQuery(() => db().hands.orderBy("played_at").reverse().toArray(), []);
export const useHand = (id: string | null) =>
  useLiveQuery(async () => (id ? ((await db().hands.get(id)) ?? null) : null), [id]);
export const useCollections = () =>
  useLiveQuery(() => db().handCollections.orderBy("sort_order").toArray(), []);
export const useRules = () => useLiveQuery(() => db().rules.toArray(), []);

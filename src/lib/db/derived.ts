"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo } from "react";
import type { Bankroll, HabitLog, ISODate, PokerSession, StudySession } from "@/lib/domain/types";
import { dateRange, localDate } from "@/lib/dates/dates";
import { bankrollBalance } from "@/lib/bankroll/bankroll";
import { dayInput, logKey, type DayContext } from "@/lib/habits/habits";
import { computeStreak, type DayInput } from "@/lib/streaks/streaks";
import { convertMoney } from "@/lib/money";
import { fetchEuroRates, pairRates, type EuroRates } from "@/lib/fx/fx";
import { presetByKey } from "@/content/habits";
import { db } from "./db";
import {
  useBankrolls,
  useHabitLogs,
  useHabits,
  useSessions,
  useSettings,
  useStudySessions,
  useToday,
  useTransactions,
} from "./hooks";

/* ---------- FX ---------- */

const FX_MAX_AGE_MS = 12 * 3_600_000;

/** EUR-based rates from the device cache, refreshed in the background when stale. */
export function useEuroRates(): EuroRates {
  const rows = useLiveQuery(() => db().fxRates.where("base").equals("EUR").toArray(), []);
  useEffect(() => {
    if (!rows) return;
    const fresh = rows.length && Date.now() - Date.parse(rows[0]!.fetched_at) < FX_MAX_AGE_MS;
    if (fresh || (typeof navigator !== "undefined" && !navigator.onLine)) return;
    fetchEuroRates()
      .then(({ day, rates }) => {
        const fetched_at = new Date().toISOString();
        return db().fxRates.bulkPut(
          Object.entries(rates).map(([quote, rate]) => ({
            base: "EUR",
            quote,
            rate: String(rate),
            day,
            fetched_at,
          })),
        );
      })
      .catch(() => undefined); // offline or blocked: keep using what we have
  }, [rows]);
  return useMemo(
    () => Object.fromEntries((rows ?? []).map((r) => [r.quote, Number(r.rate)])),
    [rows],
  );
}

export function useRates(currencies: readonly string[]): Record<string, string> {
  const euro = useEuroRates();
  const key = [...new Set(currencies)].sort().join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => pairRates(euro, key ? key.split(",") : []), [euro, key]);
}

/* ---------- Habits & streaks ---------- */

export function buildDayContext(
  sessions: readonly PokerSession[],
  study: readonly StudySession[],
  tz: string,
): DayContext {
  const sessionDays = new Set<ISODate>();
  for (const s of sessions) sessionDays.add(localDate(s.started_at, tz));
  const studyMinutes = new Map<ISODate, number>();
  for (const s of study) {
    const d = localDate(s.started_at, tz);
    studyMinutes.set(d, (studyMinutes.get(d) ?? 0) + s.minutes);
  }
  return { sessionDays, studyMinutes };
}

export function useHabitEngine() {
  const habits = useHabits();
  const logs = useHabitLogs();
  const sessions = useSessions();
  const study = useStudySessions();
  const settings = useSettings();
  const { today, tz } = useToday();

  return useMemo(() => {
    if (!habits || !logs || !sessions || !study || !settings) return null;
    const ctx = buildDayContext(sessions, study, tz);
    const logMap = new Map<string, HabitLog>(logs.map((l) => [logKey(l.habit_id, l.date), l]));
    const firstDay = habits.length
      ? habits.reduce((m, h) => {
          const d = localDate(h.created_at, tz);
          return d < m ? d : m;
        }, today)
      : today;
    const start = [firstDay, ...logs.map((l) => l.date)].reduce(
      (m, d) => (d < m ? d : m),
      firstDay,
    );

    const overall = new Map<ISODate, DayInput>();
    const studyDays = new Map<ISODate, DayInput>();
    const studyHabit = habits.find((h) => h.key === "study" && h.active);
    for (const date of dateRange(start, today)) {
      overall.set(date, dayInput(habits, date, logMap, ctx, settings.commitment));
      if (studyHabit) {
        const minutes =
          (logMap.get(logKey(studyHabit.id, date))?.value ?? 0) + (ctx.studyMinutes.get(date) ?? 0);
        studyDays.set(date, {
          done: minutes >= studyHabit.target_value ? 1 : 0,
          doubled: minutes >= studyHabit.target_value * 2 ? 1 : 0,
          required: 1,
        });
      }
    }
    const config = { restWeekdays: settings.restWeekdays, maxFreezes: settings.maxFreezes };
    const todayInput = dayInput(habits, today, logMap, ctx, settings.commitment);
    return {
      today,
      tz,
      start,
      todayInput,
      days: overall,
      streak: computeStreak(overall, config, start, today),
      studyStreak: studyHabit ? computeStreak(studyDays, config, start, today) : null,
      logMap,
      settings,
    };
  }, [habits, logs, sessions, study, settings, today, tz]);
}

export function isAutoHabit(key: string | null) {
  return Boolean(presetByKey(key)?.auto === "sessions");
}

/* ---------- Bankrolls ---------- */

export type BankrollSummary = { bankroll: Bankroll; balance: number };

export function useBankrollSummary(displayCurrency: string) {
  const bankrolls = useBankrolls();
  const txs = useTransactions();
  const sessions = useSessions();
  const rates = useRates([displayCurrency, ...(bankrolls ?? []).map((b) => b.currency)]);
  return useMemo(() => {
    if (!bankrolls || !txs || !sessions) return null;
    const active = bankrolls.filter((b) => !b.archived);
    const items: BankrollSummary[] = active.map((b) => ({
      bankroll: b,
      balance: bankrollBalance(b, txs, sessions),
    }));
    let total: number | null = 0;
    for (const it of items) {
      if (total === null) break;
      if (it.bankroll.currency === displayCurrency) total += it.balance;
      else {
        const rate = rates[`${it.bankroll.currency}:${displayCurrency}`];
        total = rate
          ? total +
            convertMoney(
              { minor: it.balance, currency: it.bankroll.currency },
              displayCurrency,
              rate,
            ).minor
          : null;
      }
    }
    return { items, total, rates, txs, sessions, bankrolls };
  }, [bankrolls, txs, sessions, rates, displayCurrency]);
}

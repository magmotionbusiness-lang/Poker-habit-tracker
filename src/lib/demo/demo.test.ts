import { describe, expect, it } from "vitest";
import type { HabitLog } from "@/lib/domain/types";
import { bankrollBalance } from "@/lib/bankroll/bankroll";
import { dateRange } from "@/lib/dates/dates";
import { goalCurrentValue, goalProgress } from "@/lib/goals/goals";
import { dayInput, logKey } from "@/lib/habits/habits";
import { computeStreak, type DayInput } from "@/lib/streaks/streaks";
import { DEMO, generateDemo } from "./demo";

describe("demo player", () => {
  const today = "2026-11-26";
  const d = generateDemo(today);

  it("has ~3 months of sessions", () => {
    expect(d.sessions.length).toBeGreaterThan(25);
    expect(d.sessions.length).toBeLessThan(45);
  });

  it("bankroll is exactly $6,400 → 64% of the $10k goal", () => {
    const balance = bankrollBalance(d.bankrolls[0]!, d.transactions, d.sessions);
    expect(balance).toBe(DEMO.endBankroll);
    const goal = d.goals.find((g) => g.is_main)!;
    const current = goalCurrentValue(goal, {
      sessions: d.sessions,
      studySessions: d.studySessions,
      bankrollTotal: balance,
      rates: {},
    });
    expect(goalProgress(goal, current, today, "UTC").fraction).toBe(0.64);
  });

  it("has a 23-day streak", () => {
    const logs = new Map<string, HabitLog>(d.habitLogs.map((l) => [logKey(l.habit_id, l.date), l]));
    const ctx = {
      sessionDays: new Set(d.sessions.map((s) => s.started_at.slice(0, 10))),
      studyMinutes: new Map<string, number>(),
    };
    for (const s of d.studySessions)
      ctx.studyMinutes.set(
        s.started_at.slice(0, 10),
        (ctx.studyMinutes.get(s.started_at.slice(0, 10)) ?? 0) + s.minutes,
      );
    const start = d.habits[0]!.created_at.slice(0, 10);
    const days = new Map<string, DayInput>();
    for (const date of dateRange(start, today))
      days.set(date, dayInput(d.habits, date, logs, ctx, { mode: "any" }));
    const streak = computeStreak(days, { restWeekdays: [], maxFreezes: 2 }, start, today);
    expect(streak.current).toBe(DEMO.streak);
    expect(streak.longest).toBeGreaterThanOrEqual(DEMO.streak);
  });

  it("looks like real live cash: whole-dollar results, no single outlier carrying the total", () => {
    for (const s of d.sessions) expect(s.cash_out_minor % 100).toBe(0);
    const results = d.sessions.map((s) => s.cash_out_minor - s.buy_in_minor - s.rebuys_minor);
    const total = DEMO.endBankroll - DEMO.startBankroll;
    expect(Math.max(...results)).toBeLessThan(total); // no session alone explains the year
  });

  it("is deterministic and uses unique ids", () => {
    expect(generateDemo(today)).toEqual(d);
    const ids = Object.values(d)
      .flat()
      .map((x: { id: string }) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids)
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

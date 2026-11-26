import { describe, expect, it } from "vitest";
import type { Habit, HabitLog } from "@/lib/domain/types";
import { dayInput, habitDay, logKey, type DayContext } from "./habits";

const h = (o: Partial<Habit>): Habit => ({
  id: o.key ?? "h",
  created_at: "",
  updated_at: "",
  kind: "preset",
  key: null,
  name: "x",
  target_value: 1,
  unit: "count",
  days_of_week: [1, 2, 3, 4, 5, 6, 7],
  sort_order: 0,
  active: true,
  ...o,
});
const review = h({ key: "review_hands", target_value: 3 });
const study = h({ key: "study", unit: "minutes", target_value: 30 });
const warm = h({ key: "warm_up", unit: "boolean" });
const logSession = h({ key: "log_session", unit: "boolean" });
const weekdaysOnly = h({ key: "gym", unit: "boolean", days_of_week: [1, 2, 3, 4, 5] });

const THU = "2026-11-26";
const SAT = "2026-11-28";
const log = (habit: Habit, date: string, value: number): [string, HabitLog] => [
  logKey(habit.id, date),
  { id: "l", habit_id: habit.id, date, value, source: "manual", updated_at: "" },
];
const noPlay: DayContext = { sessionDays: new Set(), studyMinutes: new Map() };
const played: DayContext = { sessionDays: new Set([THU]), studyMinutes: new Map([[THU, 20]]) };

describe("habitDay", () => {
  it("adds study-timer minutes to manual minutes", () => {
    const d = habitDay(study, THU, log(study, THU, 15)[1], played);
    expect(d).toMatchObject({ value: 35, complete: true, doubled: false });
  });
  it("auto-completes 'log every session' on play days", () => {
    expect(habitDay(logSession, THU, undefined, played)).toMatchObject({
      applies: true,
      complete: true,
    });
  });
  it("session-linked habits don't apply on days you don't play", () => {
    expect(habitDay(warm, THU, undefined, noPlay).applies).toBe(false);
    expect(habitDay(warm, THU, undefined, played).applies).toBe(true);
  });
  it("respects scheduled weekdays", () => {
    expect(habitDay(weekdaysOnly, SAT, undefined, noPlay).applies).toBe(false);
  });
  it("doubling: counts need 2× target; booleans count as doubled when done", () => {
    expect(habitDay(review, THU, log(review, THU, 6)[1], noPlay).doubled).toBe(true);
    expect(habitDay(review, THU, log(review, THU, 5)[1], noPlay).doubled).toBe(false);
    expect(habitDay(warm, THU, log(warm, THU, 1)[1], played).doubled).toBe(true);
  });
});

describe("dayInput & commitment", () => {
  const habits = [review, study, warm];
  const logs = new Map([log(review, THU, 3)]);
  it("'any' needs one applicable habit", () => {
    expect(dayInput(habits, THU, logs, noPlay, { mode: "any" })).toMatchObject({
      done: 1,
      required: 1,
    });
  });
  it("'all' needs every applicable habit (warm-up excluded on a non-play day)", () => {
    expect(dayInput(habits, THU, logs, noPlay, { mode: "all" })).toMatchObject({
      done: 1,
      required: 2,
    });
    expect(dayInput(habits, THU, logs, played, { mode: "all" })).toMatchObject({
      done: 1,
      required: 3,
    });
  });
  it("'count' is capped at what's applicable; nothing scheduled → required 0", () => {
    expect(dayInput(habits, THU, logs, noPlay, { mode: "count", n: 5 }).required).toBe(2);
    expect(dayInput([weekdaysOnly], SAT, logs, noPlay, { mode: "any" }).required).toBe(0);
  });
});

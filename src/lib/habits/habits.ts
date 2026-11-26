import type { Habit, HabitLog, ISODate } from "@/lib/domain/types";
import { isoWeekday } from "@/lib/dates/dates";
import { presetByKey } from "@/content/habits";
import type { DayInput } from "@/lib/streaks/streaks";

export type Commitment = { mode: "any" } | { mode: "all" } | { mode: "count"; n: number };

export type DayContext = {
  /** Local dates on which at least one session was played/logged. */
  sessionDays: ReadonlySet<ISODate>;
  /** Study-timer minutes per local date. */
  studyMinutes: ReadonlyMap<ISODate, number>;
};

export type HabitDay = {
  habit: Habit;
  value: number;
  target: number;
  applies: boolean;
  complete: boolean;
  doubled: boolean;
};

export function isScheduled(habit: Habit, date: ISODate): boolean {
  return habit.active && habit.days_of_week.includes(isoWeekday(date));
}

/** Value for one habit on one day: manual log + automatic sources. */
export function habitValue(
  habit: Habit,
  date: ISODate,
  log: HabitLog | undefined,
  ctx: DayContext,
): number {
  const manual = log?.value ?? 0;
  const auto = presetByKey(habit.key)?.auto;
  if (auto === "sessions") return Math.max(manual, ctx.sessionDays.has(date) ? 1 : 0);
  if (auto === "study") return manual + (ctx.studyMinutes.get(date) ?? 0);
  return manual;
}

export function habitDay(
  habit: Habit,
  date: ISODate,
  log: HabitLog | undefined,
  ctx: DayContext,
): HabitDay {
  const sessionLinked = presetByKey(habit.key)?.sessionLinked ?? false;
  const applies = isScheduled(habit, date) && (!sessionLinked || ctx.sessionDays.has(date));
  const value = habitValue(habit, date, log, ctx);
  const target = habit.unit === "boolean" ? 1 : habit.target_value;
  const complete = value >= target;
  // A yes/no habit can't be done twice; when done it counts as "doubled" for streak repair.
  const doubled = habit.unit === "boolean" ? complete : value >= target * 2;
  return { habit, value, target, applies, complete, doubled };
}

/** Everything the Today screen and the streak engine need for one day. */
export function dayInput(
  habits: readonly Habit[],
  date: ISODate,
  logs: ReadonlyMap<string, HabitLog>, // key: `${habit_id}:${date}`
  ctx: DayContext,
  commitment: Commitment,
): DayInput & { habits: HabitDay[] } {
  const days = habits.map((h) => habitDay(h, date, logs.get(`${h.id}:${date}`), ctx));
  const applicable = days.filter((d) => d.applies);
  const n = applicable.length;
  const required =
    n === 0
      ? 0
      : commitment.mode === "any"
        ? 1
        : commitment.mode === "all"
          ? n
          : Math.min(Math.max(1, commitment.n), n);
  return {
    habits: days,
    done: applicable.filter((d) => d.complete).length,
    doubled: applicable.filter((d) => d.doubled).length,
    required,
  };
}

export const logKey = (habitId: string, date: ISODate) => `${habitId}:${date}`;

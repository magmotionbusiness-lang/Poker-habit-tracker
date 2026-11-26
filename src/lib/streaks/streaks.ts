import type { ISODate } from "@/lib/domain/types";
import { addDays, dateRange, isoWeekday } from "@/lib/dates/dates";

/**
 * Humane streak engine (Duolingo-informed). Pure: the streak is *derived* by replaying
 * every day from `start` to `today`, so it can never drift from the underlying logs and
 * `streak_state` in the database is only a cache.
 *
 * Rules
 *  - A day counts when `done >= required` (the user's minimum daily commitment).
 *  - Planned rest weekdays never break a streak (and still count if the user plays anyway).
 *  - Earn 1 freeze per 7 counted days in the current streak; hold at most `maxFreezes`.
 *    A missed day auto-spends a freeze.
 *  - With no freeze left, a single missed day can be *repaired* once per streak run by
 *    doing double the next day (`doubled >= required`). Until that next day is over, the
 *    streak is "at risk", not broken.
 *  - Today never breaks a streak: it is "pending" until it's over.
 *  - Longest streak and total active days are kept forever.
 */

export type DayInput = {
  /** Habits completed at ≥ 1× their target. */
  done: number;
  /** Habits completed at ≥ 2× their target (booleans count as doubled when done). */
  doubled: number;
  /** Units needed to count the day. 0 = nothing scheduled (treated like a rest day). */
  required: number;
};

export type StreakConfig = {
  restWeekdays: readonly number[]; // ISO 1..7
  maxFreezes: number; // 2 free, 5 Pro
  freezeEvery?: number; // default 7
  repair?: boolean; // default true
};

export type DayStatus =
  "active" | "rest" | "frozen" | "repaired" | "missed" | "pending" | "at_risk";

export type StreakResult = {
  current: number;
  longest: number;
  totalActiveDays: number;
  freezesAvailable: number;
  days: Array<{ date: ISODate; status: DayStatus }>;
  /** Freezes spent, newest last — "a freeze saved your streak yesterday". */
  freezesUsedOn: ISODate[];
  /** Set when yesterday was missed and today can still repair it. */
  repair: { missed: ISODate; deadline: ISODate; requiredDoubled: number } | null;
  todayDone: boolean;
};

const EMPTY: DayInput = { done: 0, doubled: 0, required: 1 };

export function computeStreak(
  input: ReadonlyMap<ISODate, DayInput> | Readonly<Record<ISODate, DayInput>>,
  config: StreakConfig,
  start: ISODate,
  today: ISODate,
): StreakResult {
  const get = (d: ISODate): DayInput =>
    (input instanceof Map ? input.get(d) : (input as Record<ISODate, DayInput>)[d]) ?? EMPTY;
  const every = config.freezeEvery ?? 7;
  const repairAllowed = config.repair ?? true;
  const met = (d: DayInput) => d.required > 0 && d.done >= d.required;
  const isRest = (date: ISODate, d: DayInput) =>
    d.required === 0 || config.restWeekdays.includes(isoWeekday(date));

  let current = 0;
  let longest = 0;
  let total = 0;
  let freezes = 0;
  let countedInRun = 0;
  let repairUsedInRun = false;
  const days: StreakResult["days"] = [];
  const freezesUsedOn: ISODate[] = [];
  let repair: StreakResult["repair"] = null;

  const resetRun = () => {
    current = 0;
    countedInRun = 0;
    repairUsedInRun = false;
  };

  for (const date of dateRange(start, today)) {
    const d = get(date);
    if (met(d)) {
      current++;
      total++;
      countedInRun++;
      longest = Math.max(longest, current);
      if (countedInRun % every === 0) freezes = Math.min(config.maxFreezes, freezes + 1);
      days.push({ date, status: "active" });
      continue;
    }
    if (date === today) {
      days.push({ date, status: "pending" });
      continue;
    }
    if (isRest(date, d)) {
      days.push({ date, status: "rest" });
      continue;
    }
    // A missed past day.
    if (freezes > 0) {
      freezes--;
      freezesUsedOn.push(date);
      days.push({ date, status: "frozen" });
      continue;
    }
    const next = addDays(date, 1);
    const nextDay = get(next);
    if (repairAllowed && !repairUsedInRun && current > 0) {
      const repaired = nextDay.required > 0 && nextDay.doubled >= nextDay.required;
      if (repaired) {
        repairUsedInRun = true;
        days.push({ date, status: "repaired" });
        continue;
      }
      if (next === today) {
        // Still time to repair today: the streak is at risk, not gone.
        repair = {
          missed: date,
          deadline: today,
          requiredDoubled: Math.max(1, nextDay.required || 1),
        };
        days.push({ date, status: "at_risk" });
        continue;
      }
    }
    days.push({ date, status: "missed" });
    resetRun();
  }

  return {
    current,
    longest,
    totalActiveDays: total,
    freezesAvailable: freezes,
    days,
    freezesUsedOn,
    repair,
    todayDone: met(get(today)),
  };
}

export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365] as const;

/** The milestone crossed when a streak moves from `before` to `after`, if any. */
export function milestoneCrossed(before: number, after: number): number | null {
  const hit = STREAK_MILESTONES.filter((m) => before < m && after >= m);
  return hit.length ? hit[hit.length - 1]! : null;
}

export function nextMilestone(current: number): number | null {
  return STREAK_MILESTONES.find((m) => m > current) ?? null;
}

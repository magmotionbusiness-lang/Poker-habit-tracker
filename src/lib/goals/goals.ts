import type { Goal, ISODate, PokerSession, StudySession } from "@/lib/domain/types";
import { addDays, diffDays, localDate } from "@/lib/dates/dates";
import { resultIn, sessionDurationMs } from "@/lib/stats/session-math";

export type GoalContext = {
  sessions: readonly PokerSession[];
  studySessions: readonly StudySession[];
  /** Total of all active bankrolls, already in the goal's currency (null if unknown). */
  bankrollTotal: number | null;
  rates: Readonly<Record<string, string | number>>;
};

/**
 * Current absolute value of a goal, in its unit.
 *  profit   start_value (profit before tracking) + net results (after costs) since starts_at
 *  bankroll total balance now
 *  volume   hours or sessions since starts_at
 *  study    minutes since starts_at
 *  stake / custom / reviews (Phase 2) → manual_value
 */
export function goalCurrentValue(goal: Goal, ctx: GoalContext): number {
  const since = (iso: string) => iso >= goal.starts_at;
  const finished = ctx.sessions.filter(
    (s) => s.status === "finished" && since(s.ended_at ?? s.started_at),
  );
  switch (goal.type) {
    case "profit": {
      const ccy = goal.currency ?? "USD";
      return (
        goal.start_value +
        finished.reduce((acc, s) => acc + (resultIn(s, ccy, ctx.rates, true) ?? 0), 0)
      );
    }
    case "bankroll":
      return ctx.bankrollTotal ?? goal.start_value;
    case "volume":
      return goal.unit === "hours"
        ? goal.start_value +
            Math.floor(finished.reduce((acc, s) => acc + sessionDurationMs(s), 0) / 3_600_000)
        : goal.start_value + finished.length;
    case "study":
      return (
        goal.start_value +
        ctx.studySessions.filter((s) => since(s.started_at)).reduce((a, s) => a + s.minutes, 0)
      );
    default:
      return goal.manual_value ?? goal.start_value;
  }
}

export type GoalProgress = {
  current: number;
  fraction: number; // 0..1
  remaining: number;
  daysElapsed: number;
  /** Units per day since the goal started (null until there's enough history). */
  pacePerDay: number | null;
  /** Units per day needed to hit the deadline. */
  requiredPerDay: number | null;
  projectedDate: ISODate | null;
  onTrack: boolean | null;
  achieved: boolean;
};

/** Minimum history before we project a finish date — fewer days is just noise. */
export const MIN_DAYS_FOR_PROJECTION = 7;

export function goalProgress(
  goal: Goal,
  current: number,
  today: ISODate,
  tz: string,
): GoalProgress {
  const startDay = localDate(goal.starts_at, tz);
  const daysElapsed = Math.max(0, diffDays(startDay, today));
  const remaining = Math.max(0, goal.target_value - current);
  const achieved = current >= goal.target_value;
  const gained = current - goal.start_value;
  const pacePerDay = daysElapsed >= MIN_DAYS_FOR_PROJECTION ? gained / daysElapsed : null;
  const daysLeft = goal.deadline ? diffDays(today, goal.deadline) : null;
  const requiredPerDay = daysLeft !== null && daysLeft > 0 ? remaining / daysLeft : null;
  const projectedDate = achieved
    ? today
    : pacePerDay && pacePerDay > 0
      ? addDays(today, Math.ceil(remaining / pacePerDay))
      : null;
  const onTrack = achieved
    ? true
    : goal.deadline && projectedDate
      ? projectedDate <= goal.deadline
      : goal.deadline && pacePerDay !== null
        ? false
        : null;
  return {
    current,
    fraction: goal.target_value > 0 ? Math.min(1, Math.max(0, current / goal.target_value)) : 0,
    remaining,
    daysElapsed,
    pacePerDay,
    requiredPerDay,
    projectedDate,
    onTrack,
    achieved,
  };
}

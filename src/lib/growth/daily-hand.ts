import { addDays } from "@/lib/dates/dates";
import type { ISODate } from "@/lib/domain/types";

/** Deterministic spot for a calendar day (everyone gets the same spot the same day). */
export function spotIndexFor(date: ISODate, count: number): number {
  if (count <= 0) return -1;
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  return ((day % count) + count) % count;
}

/** Consecutive answered days ending today (or yesterday, so it isn't "lost" before you answer). */
export function dailyHandStreak(
  answered: Readonly<Record<string, unknown>>,
  today: ISODate,
): number {
  let d = answered[today] ? today : addDays(today, -1);
  let n = 0;
  while (answered[d]) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/** Add an answer, keep the last 90 days. */
export function withDailyAnswer<T>(
  all: Readonly<Record<string, T>>,
  date: ISODate,
  ans: T,
): Record<string, T> {
  return Object.fromEntries(
    Object.entries({ ...all, [date]: ans })
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .slice(0, 90),
  );
}

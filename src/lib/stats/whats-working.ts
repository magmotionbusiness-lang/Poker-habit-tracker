import type { PokerSession } from "@/lib/domain/types";
import { isoWeekday, localDate, localHour } from "@/lib/dates/dates";
import { breakdown, lengthBucket, timeOfDay, type Stats } from "./stats";
import { isTournament, sessionDurationMs, stakesLabel } from "./session-math";

export type Dimension =
  "rating" | "stakes" | "venue" | "length" | "weekday" | "timeOfDay" | "warmUp" | "sleep" | "tilt";

export type Group = { label: string; hourly: number; sessions: number; hours: number };
export type Insight = { dimension: Dimension; best: Group; worst: Group; spread: number };

const WEEKDAYS = [
  "",
  "Mondays",
  "Tuesdays",
  "Wednesdays",
  "Thursdays",
  "Fridays",
  "Saturdays",
  "Sundays",
];
const LENGTHS = { lt2: "Under 2h", "2to4": "2–4h", "4to6": "4–6h", "6plus": "6h+" } as const;
const TIMES = {
  morning: "Mornings",
  afternoon: "Afternoons",
  evening: "Evenings",
  night: "Late nights",
} as const;

/**
 * "What's working": for each dimension (A/B/C-game, stake, venue, session length, weekday,
 * time of day, warm-up, sleep, tilt) compare hourly results of the best and worst group.
 * Cash sessions only (hourly is meaningless for MTTs), groups need ≥ minSessions sessions.
 * Sorted by the gap between best and worst — the biggest lever first.
 */
export function whatsWorking(
  sessions: readonly PokerSession[],
  currency: string,
  rates: Readonly<Record<string, string | number>>,
  tz: string,
  venueName: (id: string) => string | undefined,
  minSessions = 3,
): Insight[] {
  const cash = sessions.filter((s) => s.status === "finished" && !isTournament(s));
  const keys: Record<Dimension, (s: PokerSession) => string | null> = {
    rating: (s) => (s.game_rating ? `${s.game_rating}-game` : null),
    stakes: (s) => stakesLabel(s) || null,
    venue: (s) => (s.venue_id ? (venueName(s.venue_id) ?? null) : null),
    length: (s) =>
      LENGTHS[lengthBucket(sessionDurationMs(s, Date.parse(s.ended_at ?? s.started_at)))],
    weekday: (s) => WEEKDAYS[isoWeekday(localDate(Date.parse(s.started_at), tz))] ?? null,
    timeOfDay: (s) => TIMES[timeOfDay(localHour(Date.parse(s.started_at), tz))],
    warmUp: (s) => (s.focus_point ? "With a warm-up focus" : "Without a focus point"),
    sleep: (s) =>
      s.sleep_rating == null
        ? null
        : s.sleep_rating >= 4
          ? "Well slept"
          : s.sleep_rating <= 2
            ? "Short on sleep"
            : null,
    tilt: (s) =>
      s.tilt_rating == null
        ? null
        : s.tilt_rating <= 2
          ? "Calm"
          : s.tilt_rating >= 4
            ? "Tilted"
            : null,
  };
  const out: Insight[] = [];
  for (const dimension of Object.keys(keys) as Dimension[]) {
    const rows = breakdown(cash, keys[dimension], currency, rates)
      .filter(
        (r): r is { key: string; stats: Stats & { hourly: number } } =>
          r.stats.hourly !== null && r.stats.sessions >= minSessions,
      )
      .map((r) => ({
        label: r.key,
        hourly: r.stats.hourly,
        sessions: r.stats.sessions,
        hours: r.stats.hours,
      }))
      .sort((a, b) => b.hourly - a.hourly);
    if (rows.length < 2) continue;
    const best = rows[0]!;
    const worst = rows.at(-1)!;
    if (best.hourly <= worst.hourly) continue;
    out.push({ dimension, best, worst, spread: best.hourly - worst.hourly });
  }
  return out.sort((a, b) => b.spread - a.spread);
}

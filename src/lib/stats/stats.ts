import type { GameRating, PokerSession, SessionFormat } from "@/lib/domain/types";
import { isoWeekday, localDate, localHour } from "@/lib/dates/dates";
import {
  isTournament,
  resultIn,
  sessionDurationMs,
  sessionResult,
  stakesLabel,
  tournamentCost,
} from "./session-math";

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";
export type LengthBucket = "lt2" | "2to4" | "4to6" | "6plus";

export type SessionFilter = {
  from?: string; // ISODate inclusive (local)
  to?: string;
  formats?: SessionFormat[];
  live?: boolean;
  games?: string[];
  stakes?: string[];
  venueIds?: string[];
  bankrollIds?: string[];
  weekdays?: number[];
  timesOfDay?: TimeOfDay[];
  lengths?: LengthBucket[];
  tags?: string[];
  gameRatings?: GameRating[];
};

export function timeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 23) return "evening";
  return "night";
}

export function lengthBucket(ms: number): LengthBucket {
  const h = ms / 3_600_000;
  if (h < 2) return "lt2";
  if (h < 4) return "2to4";
  if (h < 6) return "4to6";
  return "6plus";
}

const has = <T>(list: readonly T[] | undefined, v: T) =>
  !list || list.length === 0 || list.includes(v);

export function filterSessions(
  sessions: readonly PokerSession[],
  f: SessionFilter,
  tz: string,
): PokerSession[] {
  return sessions.filter((s) => {
    if (s.status !== "finished") return false;
    const day = localDate(s.started_at, tz);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    if (f.live !== undefined && s.is_live !== f.live) return false;
    if (!has(f.formats, s.format)) return false;
    if (!has(f.games, s.game)) return false;
    if (!has(f.stakes, stakesLabel(s))) return false;
    if (f.venueIds?.length && (!s.venue_id || !f.venueIds.includes(s.venue_id))) return false;
    if (f.bankrollIds?.length && (!s.bankroll_id || !f.bankrollIds.includes(s.bankroll_id)))
      return false;
    if (!has(f.weekdays, isoWeekday(day))) return false;
    if (!has(f.timesOfDay, timeOfDay(localHour(s.started_at, tz)))) return false;
    if (!has(f.lengths, lengthBucket(sessionDurationMs(s)))) return false;
    if (f.tags?.length && !s.tags.some((t) => f.tags!.includes(t))) return false;
    if (f.gameRatings?.length && (!s.game_rating || !f.gameRatings.includes(s.game_rating)))
      return false;
    return true;
  });
}

export type SampleLevel = "none" | "tiny" | "small" | "ok";
/** < 10 sessions tells you very little; < 30 is a hint, not a verdict. */
export function sampleLevel(n: number): SampleLevel {
  if (n === 0) return "none";
  if (n < 10) return "tiny";
  if (n < 30) return "small";
  return "ok";
}

export type Stats = {
  currency: string;
  sessions: number;
  excluded: number; // no FX rate to the display currency
  net: number; // minor
  hours: number;
  hourly: number | null; // minor per hour, rounded
  winRate: number | null; // 0..1, share of winning sessions
  biggestWin: number | null;
  biggestLoss: number | null;
  stdDev: number | null; // per session, minor, sample SD
  bbPerHour: number | null; // live cash with stakes
  bbPer100: number | null; // cash sessions with hands_played
  roi: number | null; // tournaments: net / cost
  itm: number | null; // tournaments: share with prize > 0
  avgFinish: number | null;
  avgBuyIn: number | null; // tournaments, minor
  tournaments: number;
  sample: SampleLevel;
};

/**
 * Aggregate stats in `currency`. bb-based stats are computed per session in its own
 * currency (bb is a ratio), so they never need FX.
 */
export function computeStats(
  sessions: readonly PokerSession[],
  currency: string,
  rates: Readonly<Record<string, string | number>> = {},
  options: { includeCosts?: boolean; now?: number } = {},
): Stats {
  const results: number[] = [];
  let excluded = 0;
  let durationMs = 0;
  let bbWon = 0;
  let bbHours = 0;
  let bbWon100 = 0;
  let hands = 0;
  let tCost = 0;
  let tNet = 0;
  let tCount = 0;
  let itm = 0;
  let finishSum = 0;
  let finishCount = 0;
  let buyInSum = 0;

  for (const s of sessions) {
    if (s.status !== "finished") continue;
    const r = resultIn(s, currency, rates, options.includeCosts);
    if (r === null) {
      excluded++;
      continue;
    }
    results.push(r);
    const ms = sessionDurationMs(s, options.now);
    durationMs += ms;

    if (!isTournament(s) && s.stakes_bb_minor) {
      const bbs = sessionResult(s) / s.stakes_bb_minor;
      if (s.is_live) {
        bbWon += bbs;
        bbHours += ms / 3_600_000;
      }
      if (s.hands_played) {
        bbWon100 += bbs;
        hands += s.hands_played;
      }
    }
    if (isTournament(s)) {
      tCount++;
      const cost = resultIn(
        { ...s, cash_out_minor: 0, prize_minor: 0, bounties_minor: 0 },
        currency,
        rates,
      );
      if (cost !== null) {
        tCost += -cost;
        tNet += r;
        buyInSum += -cost;
      }
      if (s.prize_minor > 0) itm++;
      if (s.finish_position) {
        finishSum += s.finish_position;
        finishCount++;
      }
    }
  }

  const n = results.length;
  const net = results.reduce((a, b) => a + b, 0);
  const hours = durationMs / 3_600_000;
  const mean = n ? net / n : 0;
  const variance = n > 1 ? results.reduce((acc, r) => acc + (r - mean) ** 2, 0) / (n - 1) : null;
  const round2 = (x: number) => Math.round(x * 100) / 100;

  return {
    currency,
    sessions: n,
    excluded,
    net,
    hours: round2(hours),
    hourly: hours > 0 ? Math.round(net / hours) : null,
    winRate: n ? results.filter((r) => r > 0).length / n : null,
    biggestWin: n ? Math.max(...results) : null,
    biggestLoss: n ? Math.min(...results) : null,
    stdDev: variance === null ? null : Math.round(Math.sqrt(variance)),
    bbPerHour: bbHours > 0 ? round2(bbWon / bbHours) : null,
    bbPer100: hands > 0 ? round2((bbWon100 / hands) * 100) : null,
    roi: tCost > 0 ? Math.round((tNet / tCost) * 10_000) / 10_000 : null,
    itm: tCount ? itm / tCount : null,
    avgFinish: finishCount ? round2(finishSum / finishCount) : null,
    avgBuyIn: tCount ? Math.round(buyInSum / tCount) : null,
    tournaments: tCount,
    sample: sampleLevel(n),
  };
}

/** Group sessions and compute stats per group (e.g. by game rating, stakes, venue). */
export function breakdown<K extends string>(
  sessions: readonly PokerSession[],
  key: (s: PokerSession) => K | null,
  currency: string,
  rates: Readonly<Record<string, string | number>> = {},
): Array<{ key: K; stats: Stats }> {
  const groups = new Map<K, PokerSession[]>();
  for (const s of sessions) {
    const k = key(s);
    if (k === null) continue;
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  return [...groups.entries()]
    .map(([k, list]) => ({ key: k, stats: computeStats(list, currency, rates) }))
    .sort((a, b) => b.stats.net - a.stats.net);
}

export { tournamentCost };

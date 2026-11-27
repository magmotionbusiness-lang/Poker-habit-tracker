import type { PokerSession } from "@/lib/domain/types";
import { isoWeekday, localDate, localHour } from "@/lib/dates/dates";

/**
 * Data entry friction should go DOWN over time: the app learns the player's usual game.
 */
export type UsualGame = {
  format: PokerSession["format"];
  is_live: boolean;
  game: string;
  stakes_sb_minor: number | null;
  stakes_bb_minor: number | null;
  venue_id: string | null;
  currency: string;
  bankroll_id: string | null;
  buy_in_minor: number;
  /** How many of the recent sessions matched this game. */
  count: number;
};

const key = (s: PokerSession) =>
  [
    s.format,
    s.is_live,
    s.game,
    s.stakes_sb_minor,
    s.stakes_bb_minor,
    s.venue_id,
    s.currency,
    s.bankroll_id,
  ].join("|");

/** The player's most frequent game over the last 20 sessions, with their usual buy-in. */
export function usualGame(sessions: readonly PokerSession[]): UsualGame | null {
  const recent = sessions
    .filter((s) => s.status === "finished")
    .sort((a, b) => (a.started_at < b.started_at ? 1 : -1))
    .slice(0, 20);
  if (recent.length < 2) return null;
  const groups = new Map<string, PokerSession[]>();
  for (const s of recent) groups.set(key(s), [...(groups.get(key(s)) ?? []), s]);
  const [, top] = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)[0]!;
  if (top.length < 2) return null;
  const buyIns = top.map((s) => s.buy_in_minor).sort((a, b) => a - b);
  const s = top[0]!;
  return {
    format: s.format,
    is_live: s.is_live,
    game: s.game,
    stakes_sb_minor: s.stakes_sb_minor,
    stakes_bb_minor: s.stakes_bb_minor,
    venue_id: s.venue_id,
    currency: s.currency,
    bankroll_id: s.bankroll_id,
    buy_in_minor: buyIns[Math.floor((buyIns.length - 1) / 2)]!,
    count: top.length,
  };
}

/**
 * "Playing tonight?": true when, in the last 8 weeks, the player started a session on this
 * weekday at least 3 times, and now is within 2 hours before their usual start time.
 */
export function playingTonight(
  sessions: readonly PokerSession[],
  now: number,
  tz: string,
): { usualHour: number; times: number } | null {
  const today = localDate(now, tz);
  const wd = isoWeekday(today);
  const since = now - 56 * 86_400_000;
  const same = sessions.filter(
    (s) =>
      Date.parse(s.started_at) >= since &&
      isoWeekday(localDate(s.started_at, tz)) === wd &&
      localDate(s.started_at, tz) !== today,
  );
  if (same.length < 3) return null;
  const hours = same.map((s) => localHour(Date.parse(s.started_at), tz)).sort((a, b) => a - b);
  const usualHour = hours[Math.floor((hours.length - 1) / 2)]!;
  const h = localHour(now, tz);
  if (h < usualHour - 2 || h > usualHour) return null;
  if (sessions.some((s) => localDate(s.started_at, tz) === today)) return null;
  return { usualHour, times: same.length };
}

/** Max buy-in allowed by a "N buy-ins" bankroll rule. */
export function maxBuyIn(bankroll: number, buyInsRequired: number): number {
  return buyInsRequired > 0 ? Math.floor(bankroll / buyInsRequired) : bankroll;
}

import { convertMoney, currencyExponent } from "@/lib/money";
import type { PokerSession, Timestamp } from "@/lib/domain/types";

/**
 * Per-session maths. All money in integer minor units of the session's own currency
 * unless converted explicitly.
 *
 *   result  = (cash_out + prize + bounties) − (buy_in + rebuys + fees)
 *   costs   = tips + Σ expenses           (tracked separately; "net after costs" subtracts them)
 */
export function sessionResult(
  s: Pick<
    PokerSession,
    | "cash_out_minor"
    | "prize_minor"
    | "bounties_minor"
    | "buy_in_minor"
    | "rebuys_minor"
    | "fees_minor"
  >,
): number {
  return (
    s.cash_out_minor +
    s.prize_minor +
    s.bounties_minor -
    (s.buy_in_minor + s.rebuys_minor + s.fees_minor)
  );
}

export function sessionCosts(s: Pick<PokerSession, "tips_minor" | "expenses">): number {
  return s.tips_minor + s.expenses.reduce((acc, e) => acc + e.amount_minor, 0);
}

/** Total invested in a tournament entry (for ROI). */
export function tournamentCost(
  s: Pick<PokerSession, "buy_in_minor" | "rebuys_minor" | "fees_minor">,
): number {
  return s.buy_in_minor + s.rebuys_minor + s.fees_minor;
}

export function isTournament(s: Pick<PokerSession, "format">): boolean {
  return s.format !== "cash";
}

/** Played time in ms: wall-clock minus pauses; a running session counts up to `now`. */
export function sessionDurationMs(
  s: Pick<PokerSession, "started_at" | "ended_at" | "paused_ms"> & { paused_at?: Timestamp | null },
  now: number = Date.now(),
): number {
  const end = s.ended_at ? Date.parse(s.ended_at) : now;
  const livePause = !s.ended_at && s.paused_at ? Math.max(0, now - Date.parse(s.paused_at)) : 0;
  return Math.max(0, end - Date.parse(s.started_at) - s.paused_ms - livePause);
}

/**
 * Express a session's result in the target currency. Uses the session's stored fx_rate
 * when the target is its bankroll currency, or an explicit rate map for display currency.
 * Returns null when no rate is known (callers report it as "excluded").
 */
export function resultIn(
  s: PokerSession,
  target: string,
  rates: Readonly<Record<string, string | number>> = {},
  includeCosts = false,
): number | null {
  const minor = sessionResult(s) - (includeCosts ? sessionCosts(s) : 0);
  if (s.currency === target) return minor;
  const rate = rates[`${s.currency}:${target}`];
  if (rate === undefined) return null;
  return convertMoney({ minor, currency: s.currency }, target, rate).minor;
}

/** Stakes label in major units, e.g. "1/2", "0.25/0.50", "2/5 (10)". Tournaments: buy-in. */
export function stakesLabel(
  s: Pick<
    PokerSession,
    | "format"
    | "stakes_sb_minor"
    | "stakes_bb_minor"
    | "straddle_minor"
    | "buy_in_minor"
    | "fees_minor"
    | "currency"
  >,
): string {
  const exp = currencyExponent(s.currency);
  const major = (m: number) => {
    const v = m / 10 ** exp;
    return Number.isInteger(v) ? String(v) : v.toFixed(exp);
  };
  if (s.format === "cash") {
    if (s.stakes_sb_minor == null || s.stakes_bb_minor == null) return "—";
    const base = `${major(s.stakes_sb_minor)}/${major(s.stakes_bb_minor)}`;
    return s.straddle_minor ? `${base} (${major(s.straddle_minor)})` : base;
  }
  return s.fees_minor ? `${major(s.buy_in_minor)}+${major(s.fees_minor)}` : major(s.buy_in_minor);
}

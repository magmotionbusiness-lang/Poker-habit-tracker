/**
 * The stake ladder — Up The Stakes' signature feature. Pure maths: given a bankroll and a
 * bankroll-management rule, which stakes are unlocked, how many buy-ins you have at your
 * stake, exactly how much you need for the next rung, and when to take a shot or move down.
 * Amounts are minor units of the bankroll's currency (players think "1/2" in any currency).
 */
export type LadderKind = "live" | "online" | "mtt";

export type Rung = {
  label: string;
  /** Big blind for cash games; average buy-in for tournaments (minor units). */
  bb: number;
  /** One standard buy-in (100bb for cash; the entry fee for MTTs). */
  buyIn: number;
};

const cash = (label: string, bb: number): Rung => ({ label, bb, buyIn: bb * 100 });
const mtt = (label: string, buyIn: number): Rung => ({ label, bb: buyIn, buyIn });

export const LADDERS: Record<LadderKind, Rung[]> = {
  live: [
    cash("1/2", 200),
    cash("1/3", 300),
    cash("2/5", 500),
    cash("5/10", 1000),
    cash("10/20", 2000),
    cash("25/50", 5000),
  ],
  online: [
    cash("NL2", 2),
    cash("NL5", 5),
    cash("NL10", 10),
    cash("NL25", 25),
    cash("NL50", 50),
    cash("NL100", 100),
    cash("NL200", 200),
    cash("NL500", 500),
    cash("NL1000", 1000),
  ],
  mtt: [
    mtt("$5", 500),
    mtt("$11", 1100),
    mtt("$22", 2200),
    mtt("$55", 5500),
    mtt("$109", 10900),
    mtt("$215", 21500),
    mtt("$530", 53000),
    mtt("$1,050", 105000),
  ],
};

export type BankrollRule = { name: string; buyIns: number; moveDownAt: number; shotAt: number };

/** Buy-ins required to play a stake. MTTs need far more (variance). */
export const RULE_PRESETS: Record<
  "conservative" | "standard" | "aggressive",
  Record<"cash" | "mtt", BankrollRule>
> = {
  conservative: {
    cash: { name: "Conservative", buyIns: 50, moveDownAt: 35, shotAt: 40 },
    mtt: { name: "Conservative", buyIns: 200, moveDownAt: 140, shotAt: 160 },
  },
  standard: {
    cash: { name: "Standard", buyIns: 30, moveDownAt: 20, shotAt: 25 },
    mtt: { name: "Standard", buyIns: 100, moveDownAt: 70, shotAt: 80 },
  },
  aggressive: {
    cash: { name: "Aggressive", buyIns: 20, moveDownAt: 12, shotAt: 15 },
    mtt: { name: "Aggressive", buyIns: 50, moveDownAt: 35, shotAt: 40 },
  },
};

export type RungState = Rung & { index: number; required: number; unlocked: boolean };

export type LadderView = {
  rungs: RungState[];
  /** Highest stake the rule allows right now (-1 if none). */
  maxIndex: number;
  /** Where you actually play (from recent sessions), or the max allowed. */
  currentIndex: number;
  buyInsAtCurrent: number;
  next: { index: number; needed: number; fraction: number } | null;
  /** You may take a shot at the next stake (rule's shot threshold reached). */
  shot: boolean;
  /** Bankroll is below the move-down line for the stake you play. */
  moveDown: boolean;
};

export function ladderView(
  kind: LadderKind,
  bankroll: number,
  rule: BankrollRule,
  playedBb: number | null,
): LadderView {
  const rungs: RungState[] = LADDERS[kind].map((r, index) => {
    const required = r.buyIn * rule.buyIns;
    return { ...r, index, required, unlocked: bankroll >= required };
  });
  const maxIndex = rungs.reduce((m, r) => (r.unlocked ? r.index : m), -1);
  const played = playedBb === null ? -1 : nearestRung(rungs, playedBb);
  const currentIndex = played >= 0 ? played : Math.max(0, maxIndex);
  const cur = rungs[currentIndex]!;
  const nextRung = rungs[maxIndex + 1] ?? null;
  return {
    rungs,
    maxIndex,
    currentIndex,
    buyInsAtCurrent: Math.floor((bankroll / cur.buyIn) * 10) / 10,
    next: nextRung
      ? {
          index: nextRung.index,
          needed: Math.max(0, nextRung.required - bankroll),
          fraction: Math.min(1, Math.max(0, bankroll / nextRung.required)),
        }
      : null,
    shot: nextRung ? bankroll >= nextRung.buyIn * rule.shotAt : false,
    moveDown: bankroll < cur.buyIn * rule.moveDownAt,
  };
}

function nearestRung(rungs: readonly Rung[], bb: number): number {
  let best = 0;
  for (let i = 0; i < rungs.length; i++)
    if (Math.abs(rungs[i]!.bb - bb) < Math.abs(rungs[best]!.bb - bb)) best = i;
  return best;
}

type StakeSession = {
  format: string;
  is_live: boolean;
  stakes_bb_minor: number | null;
  buy_in_minor: number;
  status: string;
  started_at: string;
};

/** Which ladder a player most likely climbs, from their recent sessions. */
export function guessKind(sessions: readonly StakeSession[]): LadderKind {
  const recent = recentFinished(sessions, 20);
  if (!recent.length) return "live";
  const mtts = recent.filter((s) => s.format !== "cash").length;
  if (mtts > recent.length / 2) return "mtt";
  const live = recent.filter((s) => s.format === "cash" && s.is_live).length;
  return live >= (recent.length - mtts) / 2 ? "live" : "online";
}

/** The stake you actually play: median big blind (cash) or buy-in (MTT) of the last 10 sessions. */
export function typicalStake(sessions: readonly StakeSession[], kind: LadderKind): number | null {
  const pool = recentFinished(sessions, 200)
    .filter((s) =>
      kind === "mtt" ? s.format !== "cash" : s.format === "cash" && s.is_live === (kind === "live"),
    )
    .slice(0, 10)
    .map((s) => (kind === "mtt" ? s.buy_in_minor : (s.stakes_bb_minor ?? 0)))
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  if (!pool.length) return null;
  return pool[Math.floor((pool.length - 1) / 2)]!;
}

function recentFinished<T extends StakeSession>(sessions: readonly T[], n: number): T[] {
  return sessions
    .filter((s) => s.status === "finished")
    .sort((a, b) => (a.started_at < b.started_at ? 1 : -1))
    .slice(0, n);
}

/**
 * Ladder amounts are written in "cents" (exponent 2). Scale a balance in another
 * currency's minor units to that basis so "1/2" means 1/2 in any currency.
 */
export function toLadderUnits(minor: number, exponent: number): number {
  return exponent === 2 ? minor : Math.round(minor * 10 ** (2 - exponent));
}
export function fromLadderUnits(units: number, exponent: number): number {
  return exponent === 2 ? units : Math.round(units / 10 ** (2 - exponent));
}

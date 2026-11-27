import type { Hand, Opponent, OpponentStyle, Trait } from "@/lib/domain/types";

/** Style labels and one-line exploit hints (Nelson-editable copy lives here too). */
export const STYLES: Record<OpponentStyle, { label: string; hint: string }> = {
  unknown: { label: "Unknown", hint: "Watch before you adjust." },
  tight_passive: { label: "Tight-passive", hint: "Steal often; respect their raises." },
  tight_aggressive: { label: "TAG", hint: "Solid. Avoid marginal spots out of position." },
  loose_passive: { label: "Loose-passive", hint: "Value bet thinner; bluff less." },
  loose_aggressive: { label: "LAG", hint: "Call down lighter; trap more." },
  maniac: { label: "Maniac", hint: "Tighten up and let them bluff into you." },
  rock: { label: "Rock", hint: "Fold to their aggression; steal their blinds." },
  calling_station: { label: "Calling station", hint: "Never bluff. Value bet every street." },
};

/** Fact vs assumption: how much evidence backs a read. */
export function readConfidence(evidence: number): { label: string; level: 0 | 1 | 2 } {
  if (evidence >= 8) return { label: "Solid read", level: 2 };
  if (evidence >= 3) return { label: "Some evidence", level: 1 };
  return { label: "Assumption", level: 0 };
}

export type OpponentRecord = {
  hands: number;
  /** Net in big blinds across linked hands with a result. */
  netBb: number;
  /** Net in minor units, per currency. */
  net: Record<string, number>;
  won: number;
  lost: number;
  lastPlayed: string | null;
};

/** Your record against a player, from the hands you've tagged them in. */
export function recordVs(opponentId: string, hands: readonly Hand[]): OpponentRecord {
  const mine = hands.filter((h) => h.opponent_ids?.includes(opponentId));
  const r: OpponentRecord = {
    hands: mine.length,
    netBb: 0,
    net: {},
    won: 0,
    lost: 0,
    lastPlayed: null,
  };
  for (const h of mine) {
    if (h.net_bb != null) r.netBb += h.net_bb;
    if (h.net_minor != null && h.currency)
      r.net[h.currency] = (r.net[h.currency] ?? 0) + h.net_minor;
    if ((h.net_minor ?? 0) > 0) r.won++;
    if ((h.net_minor ?? 0) < 0) r.lost++;
    if (!r.lastPlayed || h.played_at > r.lastPlayed) r.lastPlayed = h.played_at;
  }
  r.netBb = Math.round(r.netBb * 10) / 10;
  return r;
}

/** Common read names (shown as quick picks when adding a trait). */
export const TRAIT_PRESETS: Record<string, string> = {
  river_bluffs: "Bluffs rivers",
  three_bets: "3-bets a lot",
  calls_down: "Calls down light",
  folds_to_cbet: "Folds to c-bets",
  overbets: "Overbets",
  limps: "Limps a lot",
  folds_to_4bet: "Folds to 4-bets",
  slowplays: "Slowplays big hands",
  tilts: "Tilts after losses",
};

export const traitLabel = (key: string) => TRAIT_PRESETS[key] ?? key.replace(/_/g, " ");

export function bumpTrait(o: Opponent, key: string, level: Trait["level"]): Opponent["traits"] {
  const cur = o.traits[key];
  return { ...o.traits, [key]: { level, evidence: (cur?.evidence ?? 0) + 1 } };
}

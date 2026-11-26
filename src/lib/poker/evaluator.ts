import { rankName, rankValue, suitOf, type Card } from "./cards";

/**
 * Exact poker hand evaluator (no lookup tables, no dependencies): scores every 5-card
 * combination and keeps the best. Fast enough for replays, tagging and demo data
 * (≤ 100 combos per hand). Hold'em uses any 5 of 7; Omaha uses exactly 2 hole + 3 board.
 */

export const CATEGORY = {
  HIGH_CARD: 0,
  PAIR: 1,
  TWO_PAIR: 2,
  TRIPS: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  QUADS: 7,
  STRAIGHT_FLUSH: 8,
} as const;

export type HandValue = {
  category: number;
  /** Tie-break ranks, most significant first. */
  ranks: number[];
  /** Comparable score: higher wins. */
  score: number;
  cards: Card[];
};

function score(category: number, ranks: number[]): number {
  let s = category;
  for (let i = 0; i < 5; i++) s = s * 16 + (ranks[i] ?? 0);
  return s;
}

export function eval5(cards: readonly Card[]): HandValue {
  if (cards.length !== 5) throw new RangeError("eval5 needs exactly 5 cards");
  const values = cards.map(rankValue).sort((a, b) => b - a);
  const flush = cards.every((c) => suitOf(c) === suitOf(cards[0]!));
  const unique = [...new Set(values)];
  let straightHigh = 0;
  if (unique.length === 5) {
    if (values[0]! - values[4]! === 4) straightHigh = values[0]!;
    else if (values.join() === "14,5,4,3,2") straightHigh = 5; // wheel
  }
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  // Group by count desc, then rank desc.
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const byGroup = groups.map(([v]) => v);
  const shape = groups.map(([, c]) => c).join("");

  let category: number;
  let ranks: number[];
  if (straightHigh && flush) [category, ranks] = [CATEGORY.STRAIGHT_FLUSH, [straightHigh]];
  else if (shape === "41") [category, ranks] = [CATEGORY.QUADS, byGroup];
  else if (shape === "32") [category, ranks] = [CATEGORY.FULL_HOUSE, byGroup];
  else if (flush) [category, ranks] = [CATEGORY.FLUSH, values];
  else if (straightHigh) [category, ranks] = [CATEGORY.STRAIGHT, [straightHigh]];
  else if (shape === "311") [category, ranks] = [CATEGORY.TRIPS, byGroup];
  else if (shape === "221") [category, ranks] = [CATEGORY.TWO_PAIR, byGroup];
  else if (shape === "2111") [category, ranks] = [CATEGORY.PAIR, byGroup];
  else [category, ranks] = [CATEGORY.HIGH_CARD, values];
  return { category, ranks, score: score(category, ranks), cards: [...cards] };
}

function combos<T>(items: readonly T[], k: number): T[][] {
  const out: T[][] = [];
  const rec = (start: number, acc: T[]) => {
    if (acc.length === k) return void out.push([...acc]);
    for (let i = start; i <= items.length - (k - acc.length); i++) {
      acc.push(items[i]!);
      rec(i + 1, acc);
      acc.pop();
    }
  };
  rec(0, []);
  return out;
}

function best(candidates: Card[][]): HandValue {
  let top: HandValue | null = null;
  for (const c of candidates) {
    const v = eval5(c);
    if (!top || v.score > top.score) top = v;
  }
  if (!top) throw new RangeError("No 5-card combinations");
  return top;
}

/** Best Hold'em hand from hole + board (5 to 7 cards in total). */
export function evalHoldem(hole: readonly Card[], board: readonly Card[]): HandValue {
  return best(combos([...hole, ...board], 5));
}

/** Best Omaha hand: exactly two hole cards and three board cards. */
export function evalOmaha(hole: readonly Card[], board: readonly Card[]): HandValue {
  if (board.length < 3) throw new RangeError("Omaha needs at least 3 board cards");
  const out: Card[][] = [];
  for (const h of combos(hole, 2)) for (const b of combos(board, 3)) out.push([...h, ...b]);
  return best(out);
}

export function evaluate(game: string, hole: readonly Card[], board: readonly Card[]): HandValue {
  return game.startsWith("PLO") ? evalOmaha(hole, board) : evalHoldem(hole, board);
}

/** "Full house, Queens full of Fours" */
export function handName(v: HandValue): string {
  const [a = 0, b = 0] = v.ranks;
  switch (v.category) {
    case CATEGORY.STRAIGHT_FLUSH:
      return a === 14 ? "Royal flush" : `Straight flush, ${rankName(a)} high`;
    case CATEGORY.QUADS:
      return `Four of a kind, ${rankName(a, true)}`;
    case CATEGORY.FULL_HOUSE:
      return `Full house, ${rankName(a, true)} full of ${rankName(b, true)}`;
    case CATEGORY.FLUSH:
      return `Flush, ${rankName(a)} high`;
    case CATEGORY.STRAIGHT:
      return `Straight, ${rankName(a)} high`;
    case CATEGORY.TRIPS:
      return `Three of a kind, ${rankName(a, true)}`;
    case CATEGORY.TWO_PAIR:
      return `Two pair, ${rankName(a, true)} and ${rankName(b, true)}`;
    case CATEGORY.PAIR:
      return `Pair of ${rankName(a, true)}`;
    default:
      return `${rankName(a)} high`;
  }
}

/**
 * Coach-style strength label for Hold'em postflop: "Top pair, good kicker", "Overpair",
 * "Set", "Flush draw"… Falls back to the plain hand name.
 */
export function strengthLabel(hole: readonly Card[], board: readonly Card[]): string {
  if (hole.length !== 2 || board.length < 3) return "";
  const v = evalHoldem(hole, board);
  const h = hole.map(rankValue).sort((x, y) => y - x) as [number, number];
  const bVals = board.map(rankValue).sort((x, y) => y - x);
  const boardTop = bVals[0]!;
  const pocketPair = h[0] === h[1];

  let label = handName(v);
  if (v.category === CATEGORY.PAIR) {
    const pairRank = v.ranks[0]!;
    const boardHasPair = new Set(bVals).size < bVals.length;
    if (boardHasPair && !hole.some((c) => rankValue(c) === pairRank))
      label = `${handName(v)} (on board)`;
    else if (pocketPair) label = h[0] > boardTop ? "Overpair" : "Underpair";
    else if (pairRank === boardTop) {
      const kicker = h[0] === pairRank ? h[1] : h[0];
      label =
        kicker >= 13
          ? "Top pair, top kicker"
          : kicker >= 10
            ? "Top pair, good kicker"
            : "Top pair, weak kicker";
    } else if (pairRank === bVals[bVals.length - 1]) label = "Bottom pair";
    else label = "Middle pair";
  } else if (v.category === CATEGORY.TRIPS) {
    label = pocketPair ? `Set of ${rankName(h[0], true)}` : `Trips, ${rankName(v.ranks[0]!, true)}`;
  }

  if (board.length < 5 && v.category < CATEGORY.STRAIGHT) {
    const draws: string[] = [];
    const all = [...hole, ...board];
    const suitCounts = new Map<string, number>();
    for (const c of all) suitCounts.set(suitOf(c), (suitCounts.get(suitOf(c)) ?? 0) + 1);
    const flushDraw = [...suitCounts.entries()].some(
      ([s, n]) => n === 4 && hole.some((c) => suitOf(c) === s),
    );
    if (flushDraw) draws.push("flush draw");
    const vals = new Set(all.map(rankValue));
    if (vals.has(14)) vals.add(1);
    let oesd = false;
    let gutter = false;
    for (let lo = 1; lo <= 10; lo++) {
      const window = [lo, lo + 1, lo + 2, lo + 3, lo + 4].filter((x) => vals.has(x)).length;
      if (window === 4) {
        const missingInner = [lo + 1, lo + 2, lo + 3].some((x) => !vals.has(x));
        if (missingInner) gutter = true;
        else oesd = true;
      }
    }
    if (oesd) draws.push("open-ender");
    else if (gutter) draws.push("gutshot");
    if (draws.length)
      label =
        v.category === CATEGORY.HIGH_CARD
          ? capitalise(draws.join(" + "))
          : `${label} + ${draws.join(" + ")}`;
  }
  return label;
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

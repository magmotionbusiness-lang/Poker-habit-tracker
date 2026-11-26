/**
 * Cards are two-character strings: rank (23456789TJQKA) + suit (s h d c), e.g. "As", "Td".
 */
export type Suit = "s" | "h" | "d" | "c";
export type Card = string;

export const RANKS = "23456789TJQKA";
export const SUITS: readonly Suit[] = ["s", "h", "d", "c"];

export const DECK: readonly Card[] = SUITS.flatMap((s) => [...RANKS].map((r) => `${r}${s}`));

export function isCard(c: string): c is Card {
  return c.length === 2 && RANKS.includes(c[0]!) && "shdc".includes(c[1]!);
}

/** 2..14 (A = 14). */
export function rankValue(c: Card): number {
  return RANKS.indexOf(c[0]!) + 2;
}

export function suitOf(c: Card): Suit {
  return c[1] as Suit;
}

const RANK_NAMES: Record<number, [string, string]> = {
  2: ["Two", "Twos"],
  3: ["Three", "Threes"],
  4: ["Four", "Fours"],
  5: ["Five", "Fives"],
  6: ["Six", "Sixes"],
  7: ["Seven", "Sevens"],
  8: ["Eight", "Eights"],
  9: ["Nine", "Nines"],
  10: ["Ten", "Tens"],
  11: ["Jack", "Jacks"],
  12: ["Queen", "Queens"],
  13: ["King", "Kings"],
  14: ["Ace", "Aces"],
};
export const rankName = (v: number, plural = false) => RANK_NAMES[v]![plural ? 1 : 0];

/** Parse "AsKd" / "As Kd" / "as,kd" into ["As","Kd"]. Throws on bad input or duplicates. */
export function parseCards(input: string): Card[] {
  const clean = input.replace(/[\s,]/g, "");
  if (clean.length % 2) throw new RangeError(`Bad cards: ${input}`);
  const out: Card[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    const c = clean[i]!.toUpperCase() + clean[i + 1]!.toLowerCase();
    const card = c;
    if (!isCard(card)) throw new RangeError(`Bad card: ${clean.slice(i, i + 2)}`);
    if (out.includes(card)) throw new RangeError(`Duplicate card: ${card}`);
    out.push(card);
  }
  return out;
}

/** "AKs", "QQ", "T9o" — the classic hand-class label for two hole cards. */
export function handClass(cards: readonly Card[]): string {
  if (cards.length !== 2) return cards.join("");
  const [a, b] = [...cards].sort((x, y) => rankValue(y) - rankValue(x)) as [Card, Card];
  if (a[0] === b[0]) return `${a[0]}${b[0]}`;
  return `${a[0]}${b[0]}${suitOf(a) === suitOf(b) ? "s" : "o"}`;
}

/** Deterministic Fisher–Yates shuffle with an injected random source. */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

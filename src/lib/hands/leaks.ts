import type { ISODate, Rule, RuleCategory } from "@/lib/domain/types";

/** Leak Book groups in the order a hand is played, then off-table categories. */
export const CATEGORY_ORDER: RuleCategory[] = [
  "preflop",
  "flop",
  "turn",
  "river",
  "exploitative",
  "multiway",
  "mental",
  "bankroll",
  "other",
];

export function groupRules(
  rules: readonly Rule[],
): Array<{ category: RuleCategory; rules: Rule[] }> {
  return CATEGORY_ORDER.map((category) => ({
    category,
    // Biggest leaks first (seen most), then newest.
    rules: rules
      .filter((r) => r.category === category)
      .sort(
        (a, b) =>
          Number(a.status === "fixed") - Number(b.status === "fixed") ||
          b.times_seen - a.times_seen ||
          (a.created_at < b.created_at ? 1 : -1),
      ),
  })).filter((g) => g.rules.length > 0);
}

/**
 * One rule to resurface today. Rotates through rules you're still working on (fixed ones
 * only if nothing is open), weighted toward leaks seen more often; stable for the whole day.
 */
export function ruleOfTheDay(rules: readonly Rule[], today: ISODate): Rule | null {
  const open = rules.filter((r) => r.status === "working");
  const pool = (open.length ? open : rules).slice().sort((a, b) => (a.id < b.id ? -1 : 1));
  if (!pool.length) return null;
  const weighted = pool.flatMap((r) =>
    Array.from({ length: Math.min(3, Math.max(1, r.times_seen)) }, () => r),
  );
  let h = 0;
  for (const c of today) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return weighted[h % weighted.length]!;
}

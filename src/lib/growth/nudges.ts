export type NudgeContext = {
  rulesCount: number;
  handsReviewed: number;
  streak: number;
  lastWeekNet: number | null;
  status: "student" | "alumni" | null;
};

export type NudgeDef = {
  id: string;
  when: (c: NudgeContext) => boolean;
  /** Sales-adjacent nudges are never shown to students/alumni. */
  promo: boolean;
};

const WEEK = 7 * 86_400_000;
const SHOW_FOR = 86_400_000;

/**
 * At most one nudge a week. `seen` maps `nudge:<id>` → ISO time first shown and
 * `nudge-x:<id>` → dismissed. A nudge stays up for a day after it's first shown.
 */
export function pickNudge(
  defs: readonly NudgeDef[],
  c: NudgeContext,
  seen: Readonly<Record<string, string>>,
  now: number,
): { id: string; isNew: boolean } | null {
  const shown = Object.entries(seen)
    .filter(([k]) => k.startsWith("nudge:"))
    .map(([k, v]) => ({ id: k.slice(6), at: Date.parse(v) }))
    .sort((a, b) => b.at - a.at);
  const last = shown[0];
  if (last && now - last.at < SHOW_FOR && !seen[`nudge-x:${last.id}`])
    return { id: last.id, isNew: false };
  if (last && now - last.at < WEEK) return null;
  const next = defs.find((d) => !seen[`nudge:${d.id}`] && !(d.promo && c.status) && d.when(c));
  return next ? { id: next.id, isNew: true } : null;
}

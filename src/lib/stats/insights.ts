import type { GameRating } from "@/lib/domain/types";
import type { Stats } from "./stats";

/**
 * "Your C-game sessions lose $41/hr; A-game sessions win $28/hr." Needs at least two
 * rated groups with hourly data. Template comes from content (Nelson-editable).
 */
export function ratingInsight(
  rows: ReadonlyArray<{ key: GameRating; stats: Stats }>,
  template: string,
  fmtHourly: (minorPerHour: number) => string,
): string | null {
  const rated = rows.filter((r) => r.stats.hourly !== null && r.stats.sessions >= 2);
  if (rated.length < 2) return null;
  const sorted = [...rated].sort((a, b) => a.stats.hourly! - b.stats.hourly!);
  const worst = sorted[0]!;
  const best = sorted.at(-1)!;
  if (worst.key === best.key) return null;
  const verb = (v: number) => (v >= 0 ? "win" : "lose");
  return template
    .replace("{worst}", worst.key)
    .replace("{worstVerb}", verb(worst.stats.hourly!))
    .replace("{worstRate}", fmtHourly(Math.abs(worst.stats.hourly!)))
    .replace("{best}", best.key)
    .replace("{bestVerb}", verb(best.stats.hourly!))
    .replace("{bestRate}", fmtHourly(Math.abs(best.stats.hourly!)));
}

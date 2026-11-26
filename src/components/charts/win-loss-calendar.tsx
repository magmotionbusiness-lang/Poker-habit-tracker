import type { ISODate } from "@/lib/domain/types";
import { addDays, dateRange, isoWeekday, startOfWeek } from "@/lib/dates/dates";
import { formatMoney } from "@/lib/money";

/**
 * Calendar of win/loss days (last N weeks). Diverging: green wins, red losses, intensity by
 * size; each cell's title carries the signed amount so colour is never the only cue.
 */
export function WinLossCalendar({
  results,
  today,
  currency,
  weeks = 13,
}: {
  results: ReadonlyMap<ISODate, number>;
  today: ISODate;
  currency: string;
  weeks?: number;
}) {
  const start = startOfWeek(addDays(today, -(weeks - 1) * 7));
  const days = dateRange(start, today);
  const max = Math.max(1, ...[...results.values()].map(Math.abs));
  const wins = [...results.entries()].filter(([d, v]) => d >= start && v > 0).length;
  const losses = [...results.entries()].filter(([d, v]) => d >= start && v < 0).length;
  const cell = 14;
  const gap = 3;
  return (
    <figure className="m-0">
      <svg
        width={weeks * (cell + gap)}
        height={7 * (cell + gap)}
        role="img"
        aria-label={`Win/loss calendar: ${wins} winning days, ${losses} losing days in the last ${weeks} weeks`}
      >
        {days.map((d, i) => {
          const v = results.get(d);
          const col = Math.floor(i / 7);
          const row = isoWeekday(d) - 1;
          const intensity = v ? 0.3 + 0.7 * Math.min(1, Math.abs(v) / max) : 0;
          return (
            <rect
              key={d}
              x={col * (cell + gap)}
              y={row * (cell + gap)}
              width={cell}
              height={cell}
              rx={3}
              fill={v === undefined ? "var(--field)" : v >= 0 ? "var(--success)" : "var(--danger)"}
              fillOpacity={v === undefined ? 1 : intensity}
            >
              <title>{`${d}: ${v === undefined ? "no session" : formatMoney({ minor: v, currency }, { signed: true })}`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-[3px] bg-success" aria-hidden />
          {wins} up days
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-[3px] bg-danger" aria-hidden />
          {losses} down days
        </span>
      </figcaption>
    </figure>
  );
}

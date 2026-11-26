import { heatScale } from "@/config/tokens";

/**
 * GitHub-style activity heatmap (weeks as columns, Mon→Sun rows), violet sequential scale.
 * `values[i]` is 0..1 intensity for day i (oldest first); null = before tracking started.
 */
export function Heatmap({
  values,
  label,
  cell = 12,
  gap = 3,
}: {
  values: readonly (number | null)[];
  label: string;
  cell?: number;
  gap?: number;
}) {
  const weeks = Math.ceil(values.length / 7);
  const w = weeks * (cell + gap) - gap;
  const h = 7 * (cell + gap) - gap;
  const active = values.filter((v) => v !== null && v > 0).length;
  return (
    <figure className="m-0">
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`${label}: ${active} active days`}
      >
        {values.map((v, i) => {
          const col = Math.floor(i / 7);
          const row = i % 7;
          const step =
            v === null
              ? -1
              : v <= 0
                ? 0
                : Math.min(heatScale.length - 1, 1 + Math.floor(v * (heatScale.length - 1.001)));
          return (
            <rect
              key={i}
              x={col * (cell + gap)}
              y={row * (cell + gap)}
              width={cell}
              height={cell}
              rx={3}
              fill={step < 0 ? "transparent" : heatScale[step]}
              stroke={step < 0 ? "var(--line)" : "none"}
            >
              <title>
                {v === null
                  ? "Not tracked"
                  : v <= 0
                    ? "No activity"
                    : `${Math.round(v * 100)}% of daily habits`}
              </title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex items-center justify-end gap-1.5 text-xs text-ink-muted">
        Less
        {heatScale.map((c) => (
          <span
            key={c}
            className="inline-block size-2.5 rounded-[3px]"
            style={{ background: c }}
            aria-hidden
          />
        ))}
        More
      </figcaption>
    </figure>
  );
}

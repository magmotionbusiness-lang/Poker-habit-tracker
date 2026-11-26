/** Tiny trend line for cards. Decorative: the card's big number carries the value. */
export function Sparkline({
  data,
  width = 96,
  height = 32,
  className,
}: {
  data: readonly number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map(
    (v, i) =>
      [(i / (data.length - 1)) * width, height - 2 - ((v - min) / span) * (height - 4)] as const,
  );
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1]!;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c5cff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#7c5cff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${width},${height} L0,${height} Z`} fill="url(#spark-fill)" />
      <path
        d={d}
        fill="none"
        stroke="#a892ff"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={last[0]}
        cy={last[1]}
        r={3}
        fill="#c5b6ff"
        stroke="var(--surface)"
        strokeWidth={2}
      />
    </svg>
  );
}

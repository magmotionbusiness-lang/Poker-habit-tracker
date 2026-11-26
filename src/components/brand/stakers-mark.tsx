import { cn } from "@/lib/utils";

/**
 * Stakers app mark: three rising steps (the stake ladder) on a violet tile.
 * Placeholder product mark — NOT the Up The Stakes logo (TODO(nelson): official assets).
 */
export function StakersMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Stakers"
    >
      <defs>
        <linearGradient id="sm-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c5cff" />
          <stop offset="100%" stopColor="#4a2fd0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#sm-bg)" />
      <rect x="13" y="38" width="10" height="13" rx="3" fill="#fff" fillOpacity="0.55" />
      <rect x="27" y="28" width="10" height="23" rx="3" fill="#fff" fillOpacity="0.8" />
      <rect x="41" y="15" width="10" height="36" rx="3" fill="#fff" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <StakersMark size={30} />
      <span className="font-display text-[21px] font-semibold tracking-[-0.02em]">Stakers</span>
    </span>
  );
}

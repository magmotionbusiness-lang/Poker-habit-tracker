"use client";

import { usePathname } from "next/navigation";

/** Which colour scene each part of the app uses (CSS in globals.css → "Ambient background"). */
export function sceneFor(pathname: string): string {
  const top = pathname.split("/")[1] ?? "";
  if (top === "bankroll" || top === "session" || top === "sessions") return "bankroll";
  if (top === "hands") return "hands";
  if (top === "progress") return "progress";
  if (top === "more" || top === "admin") return "more";
  if (top === "today") return "today";
  return "welcome";
}

// Fixed positions so server and client render the same sparkles.
const SPARKS = [
  [6, 12, 0],
  [14, 34, 3.1],
  [22, 8, 6.4],
  [31, 22, 1.7],
  [39, 41, 8.2],
  [47, 5, 4.6],
  [55, 29, 10.3],
  [63, 15, 2.4],
  [71, 37, 7.5],
  [79, 9, 5.2],
  [87, 26, 9.4],
  [94, 18, 1.1],
  [18, 47, 11.6],
  [67, 44, 12.8],
] as const;

/**
 * The living background: drifting aurora glows tinted per tab, a faint drifting pattern of
 * card suits, slowly rising sparkles and fine film grain. CSS-only, transform/opacity
 * animations (GPU), behind everything and never interactive.
 */
export function AmbientBackground() {
  const pathname = usePathname();
  return (
    <div aria-hidden className="ambient" data-scene={sceneFor(pathname)}>
      <div className="ambient-aurora ambient-a" />
      <div className="ambient-aurora ambient-b" />
      <div className="ambient-aurora ambient-c" />
      <div className="ambient-rays" />
      <div className="ambient-suits" />
      <div className="ambient-sparks">
        {SPARKS.map(([x, y, d], i) => (
          <span
            key={i}
            style={{
              left: `${x}%`,
              bottom: `${y}%`,
              animationDelay: `${-d}s`,
              animationDuration: `${14 + (i % 5) * 3}s`,
            }}
          />
        ))}
      </div>
      <div className="ambient-grain" />
      <div className="ambient-vignette" />
    </div>
  );
}

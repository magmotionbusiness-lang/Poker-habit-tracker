/**
 * Design tokens for places CSS variables can't reach (charts, canvas, OG/share images,
 * manifest). Must match `src/app/globals.css` — `tokens.test.ts` enforces it.
 */
export const tokens = {
  canvas: "#06060d",
  elevated: "#0b0b14",
  surface: "#10101b",
  surface2: "#15151f",
  field: "#1a1a26",
  primary: "#7c5cff",
  primaryStrong: "#6847f0",
  primaryDeep: "#5d3fe6",
  lavender: "#a892ff",
  lavenderPale: "#c5b6ff",
  pill: "#1e1941",
  ink: "#f6f6fa",
  inkSoft: "#c8c8d2",
  inkMuted: "#8a8a9a",
  inkSubtle: "#75758a",
  success: "#34d399",
  danger: "#f4544e",
  gold: "#fbbf24",
} as const;

export type TokenName = keyof typeof tokens;

/** Violet intensity scale for heatmaps (empty → max). */
export const heatScale = [
  "#15151f",
  "#2a2257",
  "#41308f",
  "#5d3fe6",
  "#7c5cff",
  "#a892ff",
] as const;

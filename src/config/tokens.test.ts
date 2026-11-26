import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { tokens } from "./tokens";

/** WCAG 2.x relative luminance / contrast ratio. */
function luminance(hex: string): number {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const backgrounds = {
  canvas: tokens.canvas,
  surface: tokens.surface,
  surface2: tokens.surface2,
  field: tokens.field,
};

describe("design tokens", () => {
  it("TS tokens match globals.css", () => {
    const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8").toLowerCase();
    for (const [name, value] of Object.entries(tokens)) {
      expect(css, `token ${name}`).toContain(value.toLowerCase());
    }
  });

  // Body text must meet AA (4.5:1) on every surface it can sit on.
  it.each(Object.entries(backgrounds))("body text tokens meet AA on %s", (_name, bg) => {
    for (const fg of [
      tokens.ink,
      tokens.inkSoft,
      tokens.inkMuted,
      tokens.lavender,
      tokens.success,
      tokens.danger,
    ]) {
      expect(contrast(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  // Subtle ink is for large/bold captions and non-essential text: AA-large (3:1).
  it.each(Object.entries(backgrounds))("subtle ink meets AA-large on %s", (_name, bg) => {
    expect(contrast(tokens.inkSubtle, bg)).toBeGreaterThanOrEqual(3);
  });

  it("white on the primary button gradient meets AA-large", () => {
    expect(contrast("#ffffff", tokens.primary)).toBeGreaterThanOrEqual(3);
    expect(contrast("#ffffff", tokens.primaryDeep)).toBeGreaterThanOrEqual(4.5);
  });
});

"use client";

import { create } from "zustand";
import { haptic } from "@/lib/haptics";
import { play, type Sfx } from "@/lib/sfx/sfx";

export type CelebrationKind = "small" | "day" | "milestone";

/**
 * Global celebration trigger: confetti burst + sound + haptic. Components call
 * `celebrate("day", {x, y})` and the <Celebrations/> overlay renders it.
 */
export const useCelebrations = create<{
  bursts: Array<{ id: number; kind: CelebrationKind; x: number; y: number }>;
  fire: (kind: CelebrationKind, origin?: { x: number; y: number }) => void;
  done: (id: number) => void;
}>((set) => ({
  bursts: [],
  fire: (kind, origin) =>
    set((s) => ({
      bursts: [
        ...s.bursts,
        { id: Date.now() + Math.random(), kind, x: origin?.x ?? 0.5, y: origin?.y ?? 0.4 },
      ],
    })),
  done: (id) => set((s) => ({ bursts: s.bursts.filter((b) => b.id !== id) })),
}));

const SOUND: Record<CelebrationKind, Sfx> = {
  small: "check",
  day: "complete",
  milestone: "milestone",
};
const BUZZ: Record<CelebrationKind, number | number[]> = {
  small: 10,
  day: [12, 40, 18],
  milestone: [20, 50, 20, 50, 30],
};

/** Origin in viewport fractions; pass an element to burst from its centre. */
export function celebrate(kind: CelebrationKind, from?: Element | null) {
  play(SOUND[kind]);
  haptic(BUZZ[kind]);
  let origin: { x: number; y: number } | undefined;
  if (from && typeof window !== "undefined") {
    const r = from.getBoundingClientRect();
    origin = {
      x: (r.left + r.width / 2) / window.innerWidth,
      y: (r.top + r.height / 2) / window.innerHeight,
    };
  }
  useCelebrations.getState().fire(kind, origin);
}

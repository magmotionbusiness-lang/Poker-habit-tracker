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

/** Same burst, a different sound (e.g. "levelup" for the stake ladder, "save" for a log). */
export type CelebrateOptions = { sound?: Sfx | null };
const BUZZ: Record<CelebrationKind, number | number[]> = {
  small: 10,
  day: [12, 40, 18],
  milestone: [20, 50, 20, 50, 30],
};

/** Origin in viewport fractions; pass an element to burst from its centre. */
export function celebrate(kind: CelebrationKind, from?: Element | null, o: CelebrateOptions = {}) {
  if (o.sound !== null) play(o.sound ?? SOUND[kind]);
  haptic(BUZZ[kind]);
  let origin: { x: number; y: number } | undefined;
  if (from && typeof window !== "undefined") {
    const r = from.getBoundingClientRect();
    const y = (r.top + r.height / 2) / window.innerHeight;
    // Off-screen source (scrolled away): burst where the user is looking instead.
    origin = {
      x: Math.min(0.9, Math.max(0.1, (r.left + r.width / 2) / window.innerWidth)),
      y: y < 0.08 || y > 0.92 ? 0.45 : y,
    };
  }
  useCelebrations.getState().fire(kind, origin);
}

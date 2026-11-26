"use client";

import { useSyncExternalStore } from "react";
import { type MotionPref, useAppStore } from "@/lib/store/app-store";

export type MotionMode = "full" | "gentle";

/**
 * Motion policy. "Gentle" (phone's Reduce Motion, or chosen in More) keeps everything that
 * doesn't move across the screen — fades, ring fills, count-ups, glows — and drops slides,
 * bounces and idle wiggles. Nothing ever snaps instantly.
 */
export function effectiveMotion(pref: MotionPref | undefined, osReduce: boolean): MotionMode {
  if (pref === "full" || pref === "gentle") return pref;
  return osReduce ? "gentle" : "full";
}

const QUERY = "(prefers-reduced-motion: reduce)";
function subscribe(cb: () => void) {
  const m = window.matchMedia(QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
const osReduce = () => window.matchMedia(QUERY).matches;

export function useMotionMode(): MotionMode {
  const pref = useAppStore((s) => s.prefs.motion);
  const os = useSyncExternalStore(subscribe, osReduce, () => false);
  return effectiveMotion(pref, os);
}

/** True when big movement should be swapped for fades. */
export const useGentle = () => useMotionMode() === "gentle";

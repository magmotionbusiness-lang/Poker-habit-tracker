"use client";

import { useEffect } from "react";
import { setIgnoreSilentSwitch, setSoundEnabled, unlockAudio } from "@/lib/sfx/sfx";
import { useAppStore } from "@/lib/store/app-store";

/**
 * Keeps the sound engine in sync with the user's settings and unlocks audio on iOS:
 * the first touchend/click/keydown (real user activations; pointerdown is not one on touch)
 * creates and resumes the AudioContext, and we resume again whenever the app returns.
 * No click sounds — sound is reserved for progress (see lib/sfx).
 */
export function SoundSync() {
  const sound = useAppStore((s) => s.prefs.sound);
  const silent = useAppStore((s) => s.prefs.soundInSilentMode);
  useEffect(() => setSoundEnabled(sound !== false), [sound]);
  useEffect(() => setIgnoreSilentSwitch(silent === true), [silent]);
  useEffect(() => {
    const unlock = () => unlockAudio();
    const opts = { capture: true, passive: true } as const;
    window.addEventListener("touchend", unlock, opts);
    window.addEventListener("click", unlock, opts);
    window.addEventListener("keydown", unlock, opts);
    const onVisible = () => {
      if (document.visibilityState === "visible") unlockAudio();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("touchend", unlock, opts);
      window.removeEventListener("click", unlock, opts);
      window.removeEventListener("keydown", unlock, opts);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}

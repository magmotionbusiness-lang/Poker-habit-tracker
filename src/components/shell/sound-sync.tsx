"use client";

import { useEffect } from "react";
import { setSoundEnabled, play } from "@/lib/sfx/sfx";
import { useAppStore } from "@/lib/store/app-store";

/**
 * Keeps the sound engine in sync with the user's setting and adds a soft tick to every
 * button press app-wide (taps feel physical without wiring every button).
 */
export function SoundSync() {
  const sound = useAppStore((s) => s.prefs.sound);
  useEffect(() => setSoundEnabled(sound !== false), [sound]);
  useEffect(() => {
    const onTap = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest("button, a, [role=button], [role=tab]");
      if (el && !(el as HTMLButtonElement).disabled && !el.closest("[data-silent]")) play("tap");
    };
    window.addEventListener("pointerdown", onTap, { passive: true });
    return () => window.removeEventListener("pointerdown", onTap);
  }, []);
  return null;
}

"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type SheetName =
  "start-session" | "study" | "transaction" | "bankroll" | "express-hand" | "quick-add" | null;

/** Which global sheet is open (so any screen can open quick-add flows). */
export const useUi = create<{ sheet: SheetName; open: (s: SheetName) => void; close: () => void }>(
  (set) => ({
    sheet: null,
    open: (sheet) => set({ sheet }),
    close: () => set({ sheet: null }),
  }),
);

/** The study timer survives reloads and app switches. */
export const useStudyTimer = create<{
  startedAt: string | null;
  start: () => void;
  stop: () => void;
}>()(
  persist(
    (set) => ({
      startedAt: null,
      start: () => set({ startedAt: new Date().toISOString() }),
      stop: () => set({ startedAt: null }),
    }),
    { name: "stakers.study-timer.v1", storage: createJSONStorage(() => localStorage) },
  ),
);

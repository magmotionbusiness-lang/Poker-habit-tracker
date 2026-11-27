"use client";

import { create } from "zustand";
import type { PokerSession } from "@/lib/domain/types";

/** The session whose report is showing (survives the live screen unmounting). */
export const useSessionReport = create<{
  session: PokerSession | null;
  show: (s: PokerSession) => void;
  close: () => void;
}>((set) => ({
  session: null,
  show: (session) => set({ session }),
  close: () => set({ session: null }),
}));

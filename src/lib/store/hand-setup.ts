"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Game } from "@/lib/poker/hand-types";

/** The last hand setup, remembered so the next live hand takes seconds to start. */
export type HandSetup = {
  game: Game;
  currency: string;
  sb: number;
  bb: number;
  ante: number;
  straddle: number;
  tableSize: number;
  heroPosition: string;
  stackBb: number;
};

export const DEFAULT_SETUP: HandSetup = {
  game: "NLHE",
  currency: "USD",
  sb: 100,
  bb: 200,
  ante: 0,
  straddle: 0,
  tableSize: 9,
  heroPosition: "BTN",
  stackBb: 100,
};

export const useHandSetup = create<{ setup: HandSetup; save: (s: HandSetup) => void }>()(
  persist((set) => ({ setup: DEFAULT_SETUP, save: (setup) => set({ setup }) }), {
    name: "stakers.hand-setup.v1",
    storage: createJSONStorage(() => localStorage),
  }),
);

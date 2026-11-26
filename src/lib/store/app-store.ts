"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Device-level app state. Guest mode lives entirely in this store (and, from Phase 1,
 * in IndexedDB) so the app works with no account and no network. When a guest signs up
 * their local data is migrated to Supabase (see DECISIONS.md → "Guest mode").
 */
export type AppMode = "guest" | "account";
export type DisplayMode = "money" | "bb";

export type Prefs = {
  currency: string;
  displayMode: DisplayMode;
  fourColorDeck: boolean;
  haptics: boolean;
};

type AppState = {
  mode: AppMode | null;
  onboardingDone: boolean;
  prefs: Prefs;
  dismissed: Record<string, number>;
  setMode: (mode: AppMode | null) => void;
  setPrefs: (patch: Partial<Prefs>) => void;
  dismiss: (key: string) => void;
  reset: () => void;
};

export function detectCurrency(locale?: string): string {
  const loc = locale ?? (typeof navigator !== "undefined" ? navigator.language : "en-US");
  const region = loc.split("-")[1]?.toUpperCase();
  const byRegion: Record<string, string> = {
    US: "USD",
    GB: "GBP",
    CA: "CAD",
    AU: "AUD",
    NZ: "NZD",
    HU: "HUF",
    CH: "CHF",
    SE: "SEK",
    NO: "NOK",
    DK: "DKK",
    PL: "PLN",
    CZ: "CZK",
    JP: "JPY",
    IN: "INR",
    BR: "BRL",
    MX: "MXN",
    SG: "SGD",
    HK: "HKD",
    ZA: "ZAR",
  };
  const euro = [
    "AT",
    "BE",
    "CY",
    "DE",
    "EE",
    "ES",
    "FI",
    "FR",
    "GR",
    "HR",
    "IE",
    "IT",
    "LT",
    "LU",
    "LV",
    "MT",
    "NL",
    "PT",
    "SI",
    "SK",
  ];
  if (region && euro.includes(region)) return "EUR";
  return (region && byRegion[region]) || "USD";
}

const initialPrefs: Prefs = {
  currency: "USD",
  displayMode: "money",
  fourColorDeck: false,
  haptics: true,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      mode: null,
      onboardingDone: false,
      prefs: initialPrefs,
      dismissed: {},
      setMode: (mode) =>
        set((s) => ({
          mode,
          // First time on this device: pick a sensible currency from the locale.
          prefs:
            s.mode === null && mode !== null ? { ...s.prefs, currency: detectCurrency() } : s.prefs,
        })),
      setPrefs: (patch) => set((s) => ({ prefs: { ...s.prefs, ...patch } })),
      dismiss: (key) => set((s) => ({ dismissed: { ...s.dismissed, [key]: Date.now() } })),
      reset: () => set({ mode: null, onboardingDone: false, prefs: initialPrefs, dismissed: {} }),
    }),
    {
      name: "stakers.app.v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        mode: s.mode,
        onboardingDone: s.onboardingDone,
        prefs: s.prefs,
        dismissed: s.dismissed,
      }),
    },
  ),
);

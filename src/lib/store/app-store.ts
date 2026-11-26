"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ALL_CURRENCIES } from "@/lib/money/currencies";

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
  /** Sound effects (taps, chips, celebrations). */
  sound: boolean;
  /** Animations: "auto" follows the phone's Reduce Motion (→ gentle), or force full / gentle. */
  motion: MotionPref;
};
export type MotionPref = "auto" | "full" | "gentle";

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
  if (!region) return "USD";
  if (euro.includes(region)) return "EUR";
  const shared: Record<string, string> = {
    SN: "XOF",
    CI: "XOF",
    CM: "XAF",
    PF: "XPF",
    EC: "USD",
    SV: "USD",
    PA: "USD",
  };
  // ISO 4217 codes start with the issuing country's code (US→USD, NG→NGN, JP→JPY).
  return shared[region] ?? ALL_CURRENCIES.find((c) => c.startsWith(region)) ?? "USD";
}

const initialPrefs: Prefs = {
  currency: "USD",
  displayMode: "money",
  fourColorDeck: false,
  haptics: true,
  sound: true,
  motion: "auto",
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
      version: 3,
      storage: createJSONStorage(() => localStorage),
      // v2 adds prefs.sound, v3 prefs.motion (defaults for existing users).
      migrate: (persisted: unknown) => {
        const p = persisted as { prefs?: Partial<Prefs> } & Record<string, unknown>;
        return { ...p, prefs: { ...initialPrefs, ...(p.prefs ?? {}) } } as never;
      },
      partialize: (s) => ({
        mode: s.mode,
        onboardingDone: s.onboardingDone,
        prefs: s.prefs,
        dismissed: s.dismissed,
      }),
    },
  ),
);

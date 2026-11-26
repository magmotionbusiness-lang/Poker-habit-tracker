import type { Commitment } from "@/lib/habits/habits";
import { deviceTimeZone } from "@/lib/dates/dates";

/** Per-user preferences that sync to `profiles.settings` (plus a few real columns). */
export type UserSettings = {
  timezone: string;
  formats: string[]; // live_cash, live_mtt, online_cash, online_mtt, home
  games: string[]; // NLHE, PLO, other
  stakes: string; // free text, e.g. "1/2 live"
  commitment: Commitment;
  restWeekdays: number[];
  reminderTimes: string[]; // "19:00"
  quietStart: string;
  quietEnd: string;
  onboardingDone: boolean;
  /** Up The Stakes access code entered in onboarding, redeemed once signed in (Phase 3 admin). */
  utsCode: string | null;
  /** Marketing opt-in captured with its exact consent text (GDPR). Sent to the email provider in Phase 3. */
  emailOptIn: { email: string; consent_text: string; consented_at: string; synced: boolean } | null;
  maxFreezes: number;
  updated_at: string;
};

export function defaultSettings(): UserSettings {
  return {
    timezone: deviceTimeZone(),
    formats: [],
    games: ["NLHE"],
    stakes: "",
    commitment: { mode: "any" },
    restWeekdays: [],
    reminderTimes: ["19:00"],
    quietStart: "22:30",
    quietEnd: "08:00",
    onboardingDone: false,
    utsCode: null,
    emailOptIn: null,
    maxFreezes: 2,
    updated_at: new Date(0).toISOString(),
  };
}

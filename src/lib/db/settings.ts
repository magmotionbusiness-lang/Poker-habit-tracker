import type { Commitment } from "@/lib/habits/habits";
import { deviceTimeZone } from "@/lib/dates/dates";
import type { BankrollRule, LadderKind } from "@/lib/ladder/ladder";

export type LadderPreset = "conservative" | "standard" | "aggressive" | "custom";
export type WeeklyReview = { well: string; leak: string; focus: string; at: string };
export type DailyHandAnswer = { id: string; choice: number; correct: boolean };

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
  /** Result of redeeming utsCode on the server. */
  uts: { status: "student" | "alumni"; proUntil: string | null } | null;
  utsCodeError: string | null;
  /** Marketing opt-in captured with its exact consent text (GDPR). Sent to the email provider in Phase 3. */
  emailOptIn: { email: string; consent_text: string; consented_at: string; synced: boolean } | null;
  maxFreezes: number;
  /** Stake ladder: which ladder, which bankroll rule, and the highest rung already celebrated. */
  ladder: {
    kind: LadderKind | null;
    preset: LadderPreset;
    custom: { cash: BankrollRule; mtt: BankrollRule } | null;
    top: Partial<Record<LadderKind, number>>;
  };
  /** Daily Hand answers by local date (last ~90 kept). */
  dailyHand: Record<string, DailyHandAnswer>;
  /** Weekly reviews keyed by the week's Monday (last ~26 kept). */
  weeklyReviews: Record<string, WeeklyReview>;
  /** Contextual nudges / announcements: id → ISO time shown or dismissed. */
  nudges: Record<string, string>;
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
    uts: null,
    utsCodeError: null,
    emailOptIn: null,
    maxFreezes: 2,
    ladder: { kind: null, preset: "standard", custom: null, top: {} },
    dailyHand: {},
    weeklyReviews: {},
    nudges: {},
    updated_at: new Date(0).toISOString(),
  };
}

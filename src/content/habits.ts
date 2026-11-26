import type { HabitUnit } from "@/lib/domain/types";

/**
 * Preset habits (BUILD-PROMPT §4.5). Nelson-editable: names, default targets and which
 * are recommended. `sessionLinked` habits only apply on days you play.
 */
export type HabitPreset = {
  key: string;
  name: string;
  hint: string;
  unit: HabitUnit;
  target: number;
  recommended?: boolean;
  sessionLinked?: boolean;
  auto?: "sessions" | "study";
  lifestyle?: boolean;
};

export const habitPresets: readonly HabitPreset[] = [
  {
    key: "review_hands",
    name: "Review hands",
    hint: "Find the leak, write the rule",
    unit: "count",
    target: 3,
    recommended: true,
  },
  {
    key: "study",
    name: "Study",
    hint: "Solver, course, ranges, group study",
    unit: "minutes",
    target: 30,
    recommended: true,
    auto: "study",
  },
  {
    key: "warm_up",
    name: "Pre-session warm-up",
    hint: "Focus point, check-in, stop-loss",
    unit: "boolean",
    target: 1,
    recommended: true,
    sessionLinked: true,
  },
  {
    key: "cool_down",
    name: "Post-session cool-down",
    hint: "Rate your game, tag hands to review",
    unit: "boolean",
    target: 1,
    sessionLinked: true,
  },
  {
    key: "log_session",
    name: "Log every session",
    hint: "Completes itself when you log",
    unit: "boolean",
    target: 1,
    sessionLinked: true,
    auto: "sessions",
  },
  {
    key: "sleep",
    name: "Sleep 7h+",
    hint: "Rested brain, better decisions",
    unit: "boolean",
    target: 1,
    lifestyle: true,
  },
  {
    key: "gym",
    name: "Train",
    hint: "Gym, run, anything",
    unit: "boolean",
    target: 1,
    lifestyle: true,
  },
  {
    key: "no_alcohol",
    name: "No alcohol at the table",
    hint: "Clear head, A-game",
    unit: "boolean",
    target: 1,
    lifestyle: true,
    sessionLinked: true,
  },
  {
    key: "meditate",
    name: "Meditate",
    hint: "10 minutes of calm",
    unit: "boolean",
    target: 1,
    lifestyle: true,
  },
];

export const presetByKey = (key: string | null | undefined) =>
  habitPresets.find((p) => p.key === key);

import type { RuleCategory } from "@/lib/domain/types";

/**
 * Nelson's review sequence (BUILD-PROMPT §4.4). Keys are stable (stored in reviews);
 * labels and prompts are Nelson-editable.
 */
export const reviewSteps = [
  {
    key: "preflop",
    label: "Preflop",
    prompt: "Was the open / 3-bet / call in line with my ranges?",
  },
  {
    key: "flop",
    label: "Flop",
    prompt: "What's my plan and why? Range or nut advantage, value or bluff?",
  },
  { key: "turn_river", label: "Turn & river", prompt: "Did the line connect street by street?" },
  { key: "opponent", label: "Opponent", prompt: "What profile was villain, and did I exploit it?" },
  { key: "multiway", label: "Multiway", prompt: "If multiway, did I adjust?", onlyIf: "multiway" },
  { key: "mental", label: "Mental state", prompt: "Was I tilted, tired or distracted?" },
] as const;

export const ruleStep = {
  label: "The rule",
  prompt: "Next time in this spot I will…",
  placeholder: "…not call a river raise from a reg without the nuts.",
};

export const ruleCategories: Array<{ value: RuleCategory; label: string }> = [
  { value: "preflop", label: "Preflop" },
  { value: "flop", label: "Flop" },
  { value: "turn", label: "Turn" },
  { value: "river", label: "River" },
  { value: "exploitative", label: "Exploitative play" },
  { value: "multiway", label: "Multiway" },
  { value: "mental", label: "Mental game" },
  { value: "bankroll", label: "Bankroll" },
  { value: "other", label: "Other" },
];

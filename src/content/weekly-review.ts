/** Weekly review prompts (Nelson-editable). Shown from Friday; the Sunday reminder links here. */
export const weeklyReview = {
  title: "Weekly review",
  cta: "Write this week's review",
  done: "Review done. See you next week.",
  edit: "Edit this week's review",
  prompts: [
    { key: "well", label: "What went well?", placeholder: "Stuck to my stop-loss twice." },
    { key: "leak", label: "Biggest leak this week?", placeholder: "Calling river raises light." },
    {
      key: "focus",
      label: "Focus for next week?",
      placeholder: "Fold to river raises unless I block the nuts.",
    },
  ],
  focusEyebrow: "This week's focus",
} as const;

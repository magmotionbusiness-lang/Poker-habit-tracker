import type { NudgeContext, NudgeDef } from "@/lib/growth/nudges";

/**
 * Contextual nudges (Nelson-editable). Tasteful, rate-limited to one a week, dismissible
 * forever. A losing week gets a mindset resource, never a sales pitch.
 */
export const nudges: Array<NudgeDef & { title: string; body: string; cta: string; href: string }> =
  [
    {
      id: "rules-10",
      when: (c: NudgeContext) => c.rulesCount >= 10,
      promo: true,
      title: "10 rules written.",
      body: "You're doing exactly what Nelson's students do: turning hands into rules. See how the cohort builds on it.",
      cta: "How the cohort works",
      href: "/more/up-the-stakes",
    },
    {
      id: "losing-week",
      when: (c: NudgeContext) => c.lastWeekNet !== null && c.lastWeekNet < 0,
      promo: false,
      title: "Rough week? That's poker.",
      body: "Variance is loud; your process is what you control. Review two hands, write one rule, and protect your sleep.",
      cta: "Open your review queue",
      href: "/hands",
    },
    {
      id: "streak-14",
      when: (c: NudgeContext) => c.streak >= 14,
      promo: true,
      title: "Two weeks of showing up.",
      body: "Consistency is the edge most players never build. Nelson's free training shows what to do with it.",
      cta: "Get the free training",
      href: "/more/up-the-stakes#newsletter",
    },
    {
      id: "reviews-25",
      when: (c: NudgeContext) => c.handsReviewed >= 25,
      promo: false,
      title: "25 hands reviewed.",
      body: "Your Leak Book is where those reviews pay off. Pick one rule to focus on this week.",
      cta: "Open the Leak Book",
      href: "/hands/leaks",
    },
  ];

/**
 * Up The Stakes cohort program content. Copied from upthestakes.net (2026-11-26).
 * Nelson-editable — see CONTENT.md. In Phase 3 this moves to a Supabase table
 * edited from the admin panel; this file becomes the seed/fallback.
 */
export type ProgramPhase = {
  number: string;
  title: string;
  tagline: string;
  lessons: string[];
  practical: string | null;
  tools: string[];
};

export const program = {
  eyebrow: "Cohort details",
  heading: "What you'll develop in 6 weeks",
  sub: "This isn't just theory. Over 6 weeks, we'll develop your game phase-by-phase.",
  phases: [
    {
      number: "Phase 1",
      title: "Engine",
      tagline: "The engine that will give you inevitable success.",
      lessons: ["Building Your Money Making Machine", "Groundwork to Mastery of the Game"],
      practical: "Start Your Engines",
      tools: ["P.M.R.I Machine Framework™"],
    },
    {
      number: "Phase 2",
      title: "Foundation",
      tagline: "The foundation that builds the backbone of your decisions.",
      lessons: ["Principles of Pre-Flop Proficiency", "Building Flop Strategy Excellence"],
      practical: "Laying The Foundation",
      tools: ["Lean Decision-Making System™"],
    },
    {
      number: "Phase 3",
      title: "Bridging",
      tagline: "The bridge that connects the dots street-by-street.",
      lessons: ["Grasping Turn Mechanics", "Mastering River Decisions"],
      practical: "Bridging The Gap",
      tools: ["Lean Decision-Making System™", "Street Bridging Playbook™"],
    },
    {
      number: "Phase 4",
      title: "Execution",
      tagline: "The ability to execute on the spot without hesitation.",
      lessons: ["Player Profiling and Exploitative Play", "Navigating Tough Spots Multi-Way"],
      practical: "Perfecting The Execution",
      tools: ["Exploitative Profiling Matrix™", "The Multi-Way Blueprint™"],
    },
    {
      number: "Phase 5",
      title: "Scaling",
      tagline: "How to scale into a long-term winning player.",
      lessons: ["Pathway to Your Future Game", "Roadmap to Success"],
      practical: null,
      tools: ["Evergreen Poker Roadmap™"],
    },
  ] satisfies ProgramPhase[],
} as const;

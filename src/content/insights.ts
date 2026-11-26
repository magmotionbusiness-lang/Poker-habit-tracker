import type { Dimension } from "@/lib/stats/whats-working";

/** "What's working" copy (Nelson-editable). {best}/{worst} are group labels. */
export const insightsCopy = {
  title: "What's working",
  empty: "Log a few more cash sessions (with ratings) and your patterns show up here.",
  lead: {
    rating: "Your mindset is your edge",
    stakes: "Stakes",
    venue: "Where you win",
    length: "Session length",
    weekday: "Best days",
    timeOfDay: "Time of day",
    warmUp: "Warm-up pays",
    sleep: "Sleep matters",
    tilt: "Tilt costs you",
  } satisfies Record<Dimension, string>,
  footnote: "Cash sessions, per hour, at least 3 sessions per group. Patterns, not proof.",
} as const;

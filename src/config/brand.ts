/**
 * Everything that names the product or the coach lives here, so the app can be
 * renamed without touching components. Long-form copy lives in `src/content/`.
 * TODO(nelson): sign-off on all Up The Stakes™ names, claims and links.
 */
export const brand = {
  appName: "Stakers",
  appShortName: "Stakers",
  tagline: "Build the system. Up the stakes.",
  description:
    "The poker habit, bankroll and hand-review tracker built on the Up The Stakes system.",
  byline: "by Up The Stakes",
  shareMark: "Tracked with Stakers · by Up The Stakes",
  coach: {
    name: "Nelson Dong",
    business: "Up The Stakes",
    businessTm: "Up The Stakes™",
    site: "https://upthestakes.net",
    promise: "I help you make your first $50k from poker.",
    pillars: ["Action", "Structure", "Accountability"] as const,
    alumniProgram: "Stakers Club",
    cohortSize: 20,
    cohortWeeks: 6,
  },
  /** TODO(nelson): replace with official logo files in /public/brand/ */
  logo: {
    mark: "/brand/stakers-mark.svg",
    utsPlaceholder: "/brand/uts-logo-placeholder.svg",
  },
  legal: {
    minimumAge: 18,
    supportEmail: "support@example.com", // TODO: real support address
  },
} as const;

export type Brand = typeof brand;

import { onboarding } from "./onboarding";

/**
 * Up The Stakes hub copy + consent texts (Nelson-editable; consent wording needs legal
 * review — TODO(Nelson/legal)). The server only accepts these exact consent strings and
 * stores the one the user saw with a timestamp (GDPR).
 */
export const uts = {
  waitlist: {
    eyebrow: "Secure your spot",
    title: "Join the cohort waitlist",
    body: "Capped at 20 players per cohort. Waitlist members hear first when doors open.",
    consent:
      "Yes, add me to the Up The Stakes cohort waitlist and email me about cohort dates and enrolment. I can unsubscribe any time.",
    submit: "Join the waitlist",
    done: "You're on the waitlist. Nelson's team will be in touch before doors open.",
  },
  newsletter: {
    eyebrow: "Free training",
    title: "Get Nelson's free training",
    body: "Workshops like The Blueprint plus short, practical lessons. No spam.",
    consent: onboarding.emailConsent,
    submit: "Send me the training",
    done: "Check your inbox — confirm your email to get the training.",
  },
  fields: { name: "First name", email: "Email", instagram: "Instagram (optional)" },
  privacy: "Separate from your Stakers account. We never sell your data.",
  unavailable: "Signup isn't available in the app yet — join on upthestakes.net.",
  rateLimited: "Too many tries. Give it a minute.",
} as const;

export type LeadListKey = "waitlist" | "newsletter";
export const consentFor = (list: LeadListKey): string => uts[list].consent;

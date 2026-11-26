/**
 * In-app copy that Nelson (or Máté) may want to change. Voice: direct, confident,
 * coach-like, short sentences. Never gambling hype. See CONTENT.md.
 */
export const copy = {
  welcome: {
    eyebrow: "Up The Stakes",
    headlineLead: "Build the system.",
    headlineAccent: "Up the stakes.",
    sub: "Track every session. Review your own hands. Write the rule. Apply it next time. Most players don't need bigger stakes — they need a system.",
    ctaGuest: "Start without an account",
    ctaSignIn: "Sign in or create account",
    guestNote:
      "Guest mode keeps everything on this device. Create an account any time to back up and sync.",
  },
  tabs: {
    today: "Today",
    bankroll: "Bankroll",
    hands: "Hands",
    progress: "Progress",
    more: "More",
  },
  quickAdd: {
    title: "Add",
    startSession: { label: "Start session", hint: "Live timer, stack updates, quick hands" },
    logSession: { label: "Log finished session", hint: "Result, duration, how you played" },
    logHand: { label: "Log a hand", hint: "10 seconds between hands — or the full table" },
    logStudy: { label: "Log study", hint: "Minutes and what you worked on" },
    transaction: { label: "Add transaction", hint: "Deposit, withdrawal or transfer" },
  },
  empty: {
    today: {
      title: "Your system starts here.",
      body: "Pick your habits, log your first session and the loop begins: play, tag, review, write the rule, apply it next session.",
    },
    bankroll: {
      title: "Results tell a story. Start writing it.",
      body: "Log a session to see your graph, hourly and the stake ladder you're climbing.",
    },
    hands: {
      title: "Your edge is hiding in your own hands.",
      body: "Log your first one — or a quick note — and review it when the session's over.",
    },
    progress: {
      title: "Consistency, made visible.",
      body: "Goals, streaks and your weekly report card live here.",
    },
  },
  stats: {
    sample: {
      none: "No finished sessions match these filters yet.",
      tiny: "Only {n} sessions — this tells you very little yet.",
      small: "Small sample ({n} sessions): treat it as a hint, not a verdict.",
      ok: null,
    },
    ratingInsight:
      "Your {worst}-game sessions {worstVerb} {worstRate}/hr; {best}-game sessions {bestVerb} {bestRate}/hr.",
  },
  install: {
    title: "Add Stakers to your Home Screen",
    body: "Reminders and offline logging work best from the Home Screen app.",
    steps: [
      "Tap the Share button in Safari",
      "Choose “Add to Home Screen”",
      "Open Stakers from your Home Screen",
    ],
  },
  responsibleGaming: {
    notice:
      "18+ only. Stakers is a tracking and study tool. No real-money gambling happens in this app, and nothing here is financial advice or a promise of profit.",
  },
} as const;

/** Onboarding copy (BUILD-PROMPT §4.1). Nelson-editable. */
export const onboarding = {
  steps: {
    formats: {
      eyebrow: "Step 1",
      title: "What do you play?",
      sub: "Pick everything that applies. You can change it later.",
    },
    stakes: {
      eyebrow: "Step 2",
      title: "Where are you now?",
      sub: "Your usual stakes and the currency you think in.",
    },
    bankroll: {
      eyebrow: "Step 3",
      title: "Your starting bankroll",
      sub: "Money set aside for poker only. Skip if you'd rather not say yet.",
    },
    goal: {
      eyebrow: "Step 4",
      title: "Pick your main goal",
      sub: "One target. Everything in the app points at it.",
    },
    habits: {
      eyebrow: "Step 5",
      title: "Your daily habits",
      sub: "Small, daily, measurable. Three is a great start.",
    },
    reminders: {
      eyebrow: "Step 6",
      title: "When should we nudge you?",
      sub: "A daily reminder if your habits aren't done yet.",
    },
    uts: {
      eyebrow: "Step 7",
      title: "Up The Stakes student?",
      sub: "Cohort students and alumni get Pro with their access code.",
    },
    email: {
      eyebrow: "Last step",
      title: "Get Nelson's free training",
      sub: "Optional. The Blueprint workshop and the occasional email from Nelson.",
    },
  },
  formats: [
    { value: "live_cash", label: "Live cash" },
    { value: "live_mtt", label: "Live MTT" },
    { value: "online_cash", label: "Online cash" },
    { value: "online_mtt", label: "Online MTT" },
    { value: "home", label: "Home games" },
  ],
  games: [
    { value: "NLHE", label: "NLHE" },
    { value: "PLO", label: "PLO" },
    { value: "other", label: "Other" },
  ],
  stakeSuggestions: ["1/2", "1/3", "2/5", "5/10", "NL10", "NL25", "NL50", "NL100", "NL200"],
  goals: {
    first50k: { label: "Make my first {amount} from poker", hint: "Nelson's flagship goal" },
    bankroll: { label: "Reach a bankroll of…", hint: "e.g. {amount}" },
    stake: { label: "Move up to a stake", hint: "e.g. play 2/5 by June" },
    monthly: { label: "Profit per month", hint: "A monthly target" },
    study: { label: "Study hours per week", hint: "Build the learning habit" },
    custom: { label: "Something else", hint: "Name it and track it" },
  },
  commitment: {
    any: { label: "At least 1 habit", hint: "Gentle — any habit keeps the streak" },
    all: { label: "All habits", hint: "Strict — every scheduled habit" },
  },
  restDays: "Planned rest days never break your streak.",
  emailConsent:
    "Yes, email me Nelson's free training and occasional updates from Up The Stakes. I can unsubscribe any time.",
  emailPrivacyNote: "Separate from your account. We never sell your data.",
  finish: "Build my system",
  skip: "Skip",
  demo: "Just looking? Load a demo player",
} as const;

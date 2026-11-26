/**
 * Stake ladder copy (Nelson-editable — see CONTENT.md). Bankroll-rule numbers live in
 * src/lib/ladder/ladder.ts (RULE_PRESETS) because tests check them.
 */
export const ladderCopy = {
  title: "Stake ladder",
  kinds: { live: "Live", online: "Online", mtt: "MTT" },
  kindNames: { live: "Live cash", online: "Online cash", mtt: "Tournaments" },
  presets: {
    conservative: "Conservative",
    standard: "Standard",
    aggressive: "Aggressive",
    custom: "Custom",
  },
  ruleLine: (buyIns: number, kind: "cash" | "mtt") =>
    `${buyIns} buy-ins${kind === "cash" ? " (100bb)" : ""} to play a stake`,
  toNext: (amount: string, label: string) => `${amount} to unlock ${label}`,
  top: "Top of the ladder. Respect.",
  shot: (label: string) =>
    `Shot-taking zone: you can take a disciplined shot at ${label}. Pre-set one buy-in to risk — if it goes, move back down. No ego.`,
  moveDown: (label: string) =>
    `Below your move-down line for ${label}. Dropping a stake now protects the climb — it's what pros do.`,
  movedUp: (label: string) => `You moved up the ladder — ${label} unlocked!`,
  noBankroll: "Create a bankroll to see where you stand on the ladder.",
} as const;

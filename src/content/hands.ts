/** Hand journal vocabulary (Nelson-editable). */
export const userTags = [
  "Mistake",
  "Good fold",
  "Hero call",
  "Bluff caught",
  "Bluff worked",
  "Cooler",
  "Tilt hand",
  "Ask a coach",
  "Study later",
] as const;

/** Built-in smart lists. `match` keys are interpreted in lib/hands/lists.ts. */
export const smartLists = [
  { key: "all", label: "All hands" },
  { key: "unreviewed", label: "Unreviewed" },
  { key: "biggest-wins", label: "Biggest wins" },
  { key: "biggest-losses", label: "Biggest losses" },
  { key: "coolers", label: "Coolers" },
  { key: "multiway", label: "Multiway pots" },
  { key: "3bet", label: "3-bet pots" },
  { key: "all-in", label: "All-ins" },
  { key: "mistakes", label: "Marked as mistakes" },
  { key: "starred", label: "Starred" },
  { key: "notes", label: "To finish" },
] as const;

export const sectionEmojis = ["📌", "🎯", "🔥", "🧠", "❓", "💎", "🧊", "📚", "⚠️", "🏆"];

export const handsCopy = {
  emptyTitle: "Your edge is hiding in your own hands.",
  emptyBody: "Log your first one — or a quick note — and review it when the session's over.",
  sectionsHelp: "Your own sections, e.g. “Ask Nelson”, “River spots”, “Big pots vs regs”.",
};

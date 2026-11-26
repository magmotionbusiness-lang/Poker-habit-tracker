/**
 * Share-card content (pure). The canvas renderer draws whatever this returns, so what a
 * card says — and what "hide amounts" removes — is unit-tested here.
 */
export type ShareFormat = "story" | "post";
export const SHARE_SIZE: Record<ShareFormat, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  post: { w: 1080, h: 1350 },
};

export type ShareSubject =
  | { kind: "streak"; days: number; longest: number }
  | { kind: "ladder"; stake: string; ladder: string; bankroll: string | null }
  | { kind: "goal"; title: string; value: string | null; percent: number };

export type ShareContent = {
  eyebrow: string;
  big: string;
  unit: string;
  lines: string[];
  mark: string;
};

export const SHARE_MARK = "Tracked with Stakers · by Up The Stakes";

export function shareContent(s: ShareSubject, hideAmounts: boolean): ShareContent {
  switch (s.kind) {
    case "streak":
      return {
        eyebrow: "Consistency",
        big: String(s.days),
        unit: s.days === 1 ? "day streak" : "day streak",
        lines: [
          s.longest > s.days ? `Best ever: ${s.longest} days` : "New personal best",
          "Build the system. Up the stakes.",
        ],
        mark: SHARE_MARK,
      };
    case "ladder":
      return {
        eyebrow: "Moved up",
        big: s.stake,
        unit: s.ladder,
        lines: [
          !hideAmounts && s.bankroll ? `Bankroll ${s.bankroll}` : "Bankroll rules respected",
          "One rung at a time.",
        ],
        mark: SHARE_MARK,
      };
    case "goal":
      return {
        eyebrow: s.percent >= 100 ? "Goal reached" : "Goal progress",
        big: `${Math.min(999, Math.floor(s.percent))}%`,
        unit: hideAmounts
          ? s.title
              .replace(/\S*\d\S*/g, "")
              .replace(/\s+/g, " ")
              .trim() || "My goal"
          : s.title,
        lines: [
          !hideAmounts && s.value ? s.value : "Tracking every session",
          "Build the system. Up the stakes.",
        ],
        mark: SHARE_MARK,
      };
  }
}

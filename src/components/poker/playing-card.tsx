import { cn } from "@/lib/utils";

export type Suit = "s" | "h" | "d" | "c";
export type Rank = "A" | "K" | "Q" | "J" | "T" | "9" | "8" | "7" | "6" | "5" | "4" | "3" | "2";

const SUIT_GLYPH: Record<Suit, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
const SUIT_NAME: Record<Suit, string> = { s: "spades", h: "hearts", d: "diamonds", c: "clubs" };
const RANK_NAME: Record<Rank, string> = {
  A: "Ace",
  K: "King",
  Q: "Queen",
  J: "Jack",
  T: "Ten",
  "9": "Nine",
  "8": "Eight",
  "7": "Seven",
  "6": "Six",
  "5": "Five",
  "4": "Four",
  "3": "Three",
  "2": "Two",
};

/** Two-colour: black/red. Four-colour: spades black, hearts red, diamonds blue, clubs green. */
function suitColor(suit: Suit, fourColor: boolean): string {
  if (!fourColor) return suit === "h" || suit === "d" ? "text-[#d6323a]" : "text-[#16161f]";
  return { s: "text-[#16161f]", h: "text-[#d6323a]", d: "text-[#2463d1]", c: "text-[#16884a]" }[
    suit
  ];
}

/** Minimal card face: rank + suit, designed for the system (not casino art). */
export function PlayingCard({
  card,
  size = "md",
  fourColor = false,
  faceDown = false,
  className,
}: {
  /** e.g. "As", "Td", "7c" */
  card?: string;
  size?: "xs" | "sm" | "md" | "lg";
  fourColor?: boolean;
  faceDown?: boolean;
  className?: string;
}) {
  const dims =
    size === "xs"
      ? "h-[34px] w-[24px] rounded-[4px]"
      : size === "sm"
        ? "h-[46px] w-[33px] rounded-[6px]"
        : size === "md"
          ? "h-[64px] w-[46px] rounded-[8px]"
          : "h-[92px] w-[66px] rounded-[10px]";
  if (faceDown || !card) {
    return (
      <span
        className={cn(
          dims,
          "inline-block border border-line-accent bg-[repeating-linear-gradient(135deg,#2a2257_0_4px,#1e1941_4px_8px)] shadow-card",
          className,
        )}
        role="img"
        aria-label="Face-down card"
      />
    );
  }
  const rank = card[0] as Rank;
  const suit = card[1] as Suit;
  const rankLabel = rank === "T" ? "10" : rank;
  return (
    <span
      role="img"
      aria-label={`${RANK_NAME[rank]} of ${SUIT_NAME[suit]}`}
      className={cn(
        dims,
        "relative inline-flex flex-col items-center justify-center bg-[#f6f6fa] leading-none font-bold shadow-[0_4px_14px_rgba(0,0,0,0.45)] select-none",
        suitColor(suit, fourColor),
        className,
      )}
    >
      <span
        className={cn(
          "font-sans tracking-[-0.04em]",
          size === "xs"
            ? "text-[13px]"
            : size === "sm"
              ? "text-[17px]"
              : size === "md"
                ? "text-[24px]"
                : "text-[34px]",
        )}
      >
        {rankLabel}
      </span>
      <span
        className={cn(
          size === "xs"
            ? "text-[10px]"
            : size === "sm"
              ? "text-[14px]"
              : size === "md"
                ? "text-[20px]"
                : "text-[28px]",
        )}
        aria-hidden
      >
        {SUIT_GLYPH[suit]}
      </span>
    </span>
  );
}

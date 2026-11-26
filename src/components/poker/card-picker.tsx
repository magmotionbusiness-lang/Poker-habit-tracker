"use client";

import { RANKS, type Card, type Suit } from "@/lib/poker/cards";
import { cn } from "@/lib/utils";

const SUIT_ROWS: Array<{ suit: Suit; glyph: string; two: string; four: string; name: string }> = [
  { suit: "s", glyph: "♠", two: "text-ink", four: "text-ink", name: "spades" },
  { suit: "h", glyph: "♥", two: "text-[#ff5b63]", four: "text-[#ff5b63]", name: "hearts" },
  { suit: "d", glyph: "♦", two: "text-[#ff5b63]", four: "text-[#5b9bff]", name: "diamonds" },
  { suit: "c", glyph: "♣", two: "text-ink", four: "text-[#3fcf7f]", name: "clubs" },
];

const RANK_WORDS: Record<string, string> = { A: "Ace", K: "King", Q: "Queen", J: "Jack", T: "10" };

/**
 * Compact 4×13 card grid. Cards already in use (board, other players) are disabled.
 * Tapping a selected card removes it; once `count` cards are picked, the grid locks.
 */
export function CardPicker({
  selected,
  count,
  dead = [],
  onChange,
  fourColor = false,
  label,
}: {
  selected: Card[];
  count: number;
  dead?: readonly Card[];
  onChange: (cards: Card[]) => void;
  fourColor?: boolean;
  label: string;
}) {
  const ranks = [...RANKS].reverse(); // A K Q … 2
  const full = selected.length >= count;
  return (
    <div role="group" aria-label={label}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-ink-soft">
          {label}{" "}
          <span className="num text-ink-muted">
            · {selected.length}/{count}
          </span>
        </p>
        {selected.length > 0 && (
          <button
            type="button"
            className="text-sm font-semibold text-lavender"
            onClick={() => onChange([])}
          >
            Clear
          </button>
        )}
      </div>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}>
        {SUIT_ROWS.map((row) =>
          ranks.map((r) => {
            const card = `${r}${row.suit}`;
            const on = selected.includes(card);
            const isDead = dead.includes(card) && !on;
            const disabled = isDead || (full && !on);
            return (
              <button
                key={card}
                type="button"
                disabled={disabled}
                aria-pressed={on}
                aria-label={`${RANK_WORDS[r] ?? r} of ${row.name}`}
                onClick={() =>
                  onChange(on ? selected.filter((c) => c !== card) : [...selected, card])
                }
                className={cn(
                  "flex h-[38px] flex-col items-center justify-center rounded-[6px] border text-[12px] leading-none font-bold transition-colors",
                  on
                    ? "border-primary-strong bg-[#f6f6fa] text-[#16161f] shadow-[0_0_12px_rgba(124,92,255,0.6)]"
                    : "border-line bg-field",
                  !on && (fourColor ? row.four : row.two),
                  isDead && "opacity-20",
                  disabled && !isDead && "opacity-40",
                )}
              >
                <span>{r === "T" ? "10" : r}</span>
                <span
                  className={cn(
                    "text-[10px]",
                    on && (row.suit === "h" || row.suit === "d") && "text-[#d6323a]",
                  )}
                >
                  {row.glyph}
                </span>
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}

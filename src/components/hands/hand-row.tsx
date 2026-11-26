import Link from "next/link";
import { ChevronRight, NotebookPen, Star } from "lucide-react";
import { PlayingCard } from "@/components/poker/playing-card";
import { signedChipLabel } from "@/components/poker/amount";
import type { Hand } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const POT_TYPE: Record<string, string> = {
  srp: "SRP",
  "3bet": "3-bet pot",
  "4bet+": "4-bet+ pot",
  limped: "Limped",
  walk: "Walk",
};

export function potTypeLabel(h: Hand): string | null {
  const t = h.auto_tags.find((x) => x in POT_TYPE);
  return t ? POT_TYPE[t]! : null;
}

/** One hand in a list: cards, spot, result (with sign), review state. */
export function HandRow({
  hand,
  mode,
  fourColor,
}: {
  hand: Hand;
  mode: "money" | "bb";
  fourColor: boolean;
}) {
  const cards = hand.hero_cards?.match(/.{2}/g) ?? [];
  const net = hand.net_minor;
  const bb = hand.ohh?.bb ?? 1;
  const detail = [
    hand.hero_position,
    potTypeLabel(hand),
    hand.auto_tags.includes("multiway") ? "Multiway" : null,
    hand.stakes,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link
      href={`/hands/view?id=${hand.id}`}
      className="flex min-h-[64px] items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03]"
    >
      {hand.source === "quick_note" && !hand.hero_cards ? (
        <span className="grid h-[34px] w-[52px] place-items-center rounded-md bg-pill text-lavender">
          <NotebookPen className="size-4" aria-hidden />
        </span>
      ) : (
        <span
          className="flex w-[52px] -space-x-1.5"
          aria-label={`Cards ${hand.hero_cards ?? "unknown"}`}
        >
          {cards.map((c) => (
            <PlayingCard key={c} card={c} size="xs" fourColor={fourColor} />
          ))}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">
          {hand.source === "quick_note" && !hand.hero_cards ? hand.quick_note : detail || hand.game}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-ink-muted">
          <ReviewDot status={hand.review_status} />
          {hand.review_status === "unreviewed"
            ? "To review"
            : hand.review_status === "lesson"
              ? "Lesson written"
              : "Reviewed"}
          {" · "}
          {new Date(hand.played_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
          {hand.user_tags.length > 0 && ` · ${hand.user_tags.join(", ")}`}
        </span>
      </span>
      {hand.starred && <Star className="size-4 fill-lavender text-lavender" aria-label="Starred" />}
      {net !== null && hand.currency && (
        <span
          className={cn(
            "num font-semibold",
            net > 0 ? "text-success" : net < 0 ? "text-danger" : "text-ink-muted",
          )}
        >
          {signedChipLabel(net, hand.currency, bb, mode)}
        </span>
      )}
      <ChevronRight className="size-4 text-ink-subtle" aria-hidden />
    </Link>
  );
}

export function ReviewDot({ status }: { status: Hand["review_status"] }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 rounded-full",
        status === "unreviewed"
          ? "bg-lavender shadow-[0_0_6px_rgba(168,146,255,0.8)]"
          : status === "lesson"
            ? "bg-success"
            : "bg-ink-subtle",
      )}
    />
  );
}

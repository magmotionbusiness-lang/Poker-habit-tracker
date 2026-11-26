import type { Hand } from "@/lib/domain/types";
import { currencyExponent } from "@/lib/money";
import { handHistorySchema, type HandHistory } from "@/lib/poker/hand-types";
import { summarize } from "@/lib/poker/tags";

/** "1/2", "0.25/0.50", "2/5 (10)" in major units. */
export function stakesText(h: Pick<HandHistory, "sb" | "bb" | "straddle" | "currency">): string {
  const exp = currencyExponent(h.currency);
  const major = (m: number) => {
    const v = m / 10 ** exp;
    return Number.isInteger(v) ? String(v) : v.toFixed(exp);
  };
  return `${major(h.sb)}/${major(h.bb)}${h.straddle ? ` (${major(h.straddle)})` : ""}`;
}

export type HandRowMeta = {
  id: string;
  at: string;
  session_id?: string | null;
  played_at?: string;
  source?: Hand["source"];
  quick_note?: string | null;
};

/**
 * Pure: a validated hand history → the stored row with every derived field (stakes,
 * position, result, auto-tags). Keeps user data (tags, sections, review) from `existing`.
 */
export function buildHandRow(hh: HandHistory, meta: HandRowMeta, existing?: Hand): Hand {
  const valid = handHistorySchema.parse(hh) as HandHistory;
  const s = summarize(valid);
  const source = meta.source ?? existing?.source ?? "manual";
  return {
    id: meta.id,
    created_at: existing?.created_at ?? meta.at,
    updated_at: meta.at,
    session_id: meta.session_id ?? existing?.session_id ?? null,
    // A completed quick note becomes a manual hand.
    source: source === "quick_note" ? "manual" : source,
    site: existing?.site ?? null,
    external_hand_id: existing?.external_hand_id ?? null,
    played_at: meta.played_at ?? existing?.played_at ?? meta.at,
    game: valid.game,
    stakes: stakesText(valid),
    hero_position: s.hero_position,
    hero_cards: s.hero_cards,
    ohh: valid,
    quick_note: meta.quick_note ?? existing?.quick_note ?? null,
    net_minor: s.net_minor,
    currency: valid.currency,
    net_bb: s.net_bb,
    pot_bb: s.pot_bb,
    auto_tags: s.auto_tags,
    user_tags: existing?.user_tags ?? [],
    starred: existing?.starred ?? false,
    review_status: existing?.review_status ?? "unreviewed",
    review: existing?.review ?? null,
    share_slug: existing?.share_slug ?? null,
    is_public: existing?.is_public ?? false,
    collection_ids: existing?.collection_ids ?? [],
  };
}

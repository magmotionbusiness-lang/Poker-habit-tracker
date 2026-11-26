import type { Hand } from "@/lib/domain/types";

export type SmartListKey =
  | "all"
  | "unreviewed"
  | "biggest-wins"
  | "biggest-losses"
  | "coolers"
  | "multiway"
  | "3bet"
  | "all-in"
  | "mistakes"
  | "starred"
  | "notes";

export function inSmartList(h: Hand, key: SmartListKey): boolean {
  switch (key) {
    case "all":
      return true;
    case "unreviewed":
      return h.review_status === "unreviewed";
    case "biggest-wins":
      return (h.net_bb ?? 0) > 0;
    case "biggest-losses":
      return (h.net_bb ?? 0) < 0;
    case "coolers":
      return h.user_tags.includes("Cooler");
    case "multiway":
      return h.auto_tags.includes("multiway");
    case "3bet":
      return h.auto_tags.includes("3bet") || h.auto_tags.includes("4bet+");
    case "all-in":
      return h.auto_tags.includes("all-in");
    case "mistakes":
      return h.user_tags.includes("Mistake");
    case "starred":
      return h.starred;
    case "notes":
      return h.source === "quick_note";
  }
}

/** Hands for a smart list, sorted the way that list is meant to be read. */
export function smartList(hands: readonly Hand[], key: SmartListKey, limit?: number): Hand[] {
  const out = hands.filter((h) => inSmartList(h, key));
  if (key === "biggest-wins") out.sort((a, b) => (b.net_bb ?? 0) - (a.net_bb ?? 0));
  else if (key === "biggest-losses") out.sort((a, b) => (a.net_bb ?? 0) - (b.net_bb ?? 0));
  else out.sort((a, b) => (a.played_at < b.played_at ? 1 : -1));
  return limit ? out.slice(0, limit) : out;
}

export function inCollection(hands: readonly Hand[], collectionId: string): Hand[] {
  return hands
    .filter((h) => h.collection_ids.includes(collectionId))
    .sort((a, b) => (a.played_at < b.played_at ? 1 : -1));
}

/** Free-text + tag filter used by the search box. */
export function searchHands(hands: readonly Hand[], query: string): Hand[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...hands];
  return hands.filter((h) =>
    [h.hero_cards, h.hero_position, h.stakes, h.game, h.quick_note, ...h.user_tags, ...h.auto_tags]
      .filter(Boolean)
      .some((x) => String(x).toLowerCase().includes(q)),
  );
}

import type { Hand } from "@/lib/domain/types";
import type { Card } from "@/lib/poker/cards";
import { flopTexture, holeCategory } from "@/lib/poker/tags";
import { stakesText } from "./row";

/**
 * Express log: the 10-second version of a hand for between two hands at a live table.
 * No action sequence — just what you need to find it and review it later. It lands in
 * "To finish" so it can be expanded into a full hand on the table.
 */
export type ExpressPot = "limped" | "srp" | "3bet" | "4bet+";
export type ExpressStreet = "preflop" | "flop" | "turn" | "river" | "showdown";
export type ExpressResult = "won" | "lost" | "chopped";

export type ExpressInput = {
  cards: Card[];
  position: string;
  pot: ExpressPot;
  multiway: boolean;
  street: ExpressStreet;
  result: ExpressResult;
  /** Amount won or lost, in minor units (0 for a chop). */
  amount: number;
  board: Card[];
  note: string;
  tags: string[];
  game: string;
  currency: string;
  sb: number;
  bb: number;
  straddle: number;
};

export const EXPRESS_TAG = "express";

const STREET_TAG: Record<ExpressStreet, string> = {
  preflop: "street:preflop",
  flop: "street:flop",
  turn: "street:turn",
  river: "street:river",
  showdown: "street:showdown",
};

export function buildExpressHand(
  x: ExpressInput,
  meta: { id: string; at: string; session_id?: string | null; played_at?: string },
): Hand {
  if (x.cards.length < 2) throw new Error("Pick your two cards");
  if (!x.position) throw new Error("Pick your position");
  if (x.amount < 0 || !Number.isSafeInteger(x.amount)) throw new Error("Invalid amount");
  const net = x.result === "won" ? x.amount : x.result === "lost" ? -x.amount : 0;
  const tags = new Set<string>([
    EXPRESS_TAG,
    x.pot,
    x.multiway ? "multiway" : "heads-up",
    STREET_TAG[x.street],
    `pos:${x.position}`,
  ]);
  tags.add(x.result);
  if (x.street === "showdown") tags.add(x.result === "won" ? "won-at-showdown" : "showdown");
  else if (x.result === "won") tags.add("won-without-showdown");
  const cat = holeCategory(x.cards);
  if (cat) tags.add(`hand:${cat}`);
  for (const t of flopTexture(x.board)) tags.add(t);
  const netBb = Math.round((net / x.bb) * 100) / 100;
  if (Math.abs(netBb) >= 50) tags.add("big-pot");

  const note = [x.note.trim(), x.board.length ? `Board: ${x.board.join(" ")}` : ""]
    .filter(Boolean)
    .join(" · ");
  return {
    id: meta.id,
    created_at: meta.at,
    updated_at: meta.at,
    session_id: meta.session_id ?? null,
    source: "quick_note",
    site: null,
    external_hand_id: null,
    played_at: meta.played_at ?? meta.at,
    game: x.game,
    stakes: stakesText(x),
    hero_position: x.position,
    hero_cards: x.cards.join(""),
    ohh: null,
    quick_note: note || null,
    net_minor: net,
    currency: x.currency,
    net_bb: netBb,
    pot_bb: null,
    auto_tags: [...tags],
    user_tags: x.tags,
    starred: false,
    review_status: "unreviewed",
    review: null,
    share_slug: null,
    is_public: false,
    collection_ids: [],
  };
}

/** Board cards stored in an express note ("… · Board: Kd 7s 2c"). */
export function expressBoard(h: Pick<Hand, "quick_note">): Card[] {
  const m = h.quick_note?.match(/Board: ((?:[2-9TJQKA][shdc]\s?){3,5})$/);
  return m ? m[1]!.trim().split(/\s+/) : [];
}

export function isExpress(h: Pick<Hand, "auto_tags">): boolean {
  return h.auto_tags.includes(EXPRESS_TAG);
}

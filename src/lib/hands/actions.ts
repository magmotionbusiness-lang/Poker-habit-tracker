"use client";

import { z } from "zod";
import type { Hand, HandCollection, HandReview, Rule, RuleCategory } from "@/lib/domain/types";
import { db } from "@/lib/db/db";
import { deleteRows, newId, nowIso, putRow, putRows } from "@/lib/db/repo";
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

/** Validate, auto-tag and store a hand. Re-saving recomputes every derived field. */
export async function saveHand(
  hh: HandHistory,
  meta: {
    id?: string;
    session_id?: string | null;
    played_at?: string;
    source?: Hand["source"];
    quick_note?: string | null;
  } = {},
): Promise<Hand> {
  const valid = handHistorySchema.parse(hh) as HandHistory;
  const s = summarize(valid);
  const existing = meta.id ? await db().hands.get(meta.id) : undefined;
  const at = nowIso();
  const row: Hand = {
    id: existing?.id ?? newId(),
    created_at: existing?.created_at ?? at,
    updated_at: at,
    session_id: meta.session_id ?? existing?.session_id ?? null,
    source: meta.source ?? existing?.source ?? "manual",
    site: existing?.site ?? null,
    external_hand_id: existing?.external_hand_id ?? null,
    played_at: meta.played_at ?? existing?.played_at ?? at,
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
  // A completed quick note becomes a manual hand.
  if (row.source === "quick_note") row.source = "manual";
  return putRow("hands", row);
}

/** "AKo, 3-bet pot, lost big on river, check later" — goes to the review queue. */
export async function saveQuickNote(text: string, session_id: string | null = null): Promise<Hand> {
  const note = z.string().trim().min(2, "Write a few words").max(1000).parse(text);
  const at = nowIso();
  return putRow("hands", {
    id: newId(),
    created_at: at,
    updated_at: at,
    session_id,
    source: "quick_note",
    site: null,
    external_hand_id: null,
    played_at: at,
    game: "NLHE",
    stakes: null,
    hero_position: null,
    hero_cards: null,
    ohh: null,
    quick_note: note,
    net_minor: null,
    currency: null,
    net_bb: null,
    pot_bb: null,
    auto_tags: ["quick-note"],
    user_tags: [],
    starred: false,
    review_status: "unreviewed",
    review: null,
    share_slug: null,
    is_public: false,
    collection_ids: [],
  } satisfies Hand);
}

export const updateHand = (h: Hand, patch: Partial<Hand>) => putRow("hands", { ...h, ...patch });

export async function deleteHand(id: string) {
  // Drop the hand from Leak Book examples too.
  const rules = (await db().rules.toArray()).filter((r) => r.hand_ids.includes(id));
  if (rules.length)
    await putRows(
      "rules",
      rules.map((r) => ({ ...r, hand_ids: r.hand_ids.filter((x) => x !== id) })),
    );
  await deleteRows("hands", [id]);
}

/* ---------- Custom sections ---------- */

export async function createCollection(
  name: string,
  emoji: string | null = null,
): Promise<HandCollection> {
  const clean = z.string().trim().min(1, "Name your section").max(40).parse(name);
  const at = nowIso();
  const count = await db().handCollections.count();
  return putRow("handCollections", {
    id: newId(),
    name: clean,
    emoji,
    sort_order: count,
    created_at: at,
    updated_at: at,
  });
}

export const updateCollection = (
  c: HandCollection,
  patch: Partial<Pick<HandCollection, "name" | "emoji" | "sort_order">>,
) => putRow("handCollections", { ...c, ...patch });

/** Deleting a section never deletes hands — it just takes them out of it. */
export async function deleteCollection(id: string) {
  const hands = await db().hands.where("collection_ids").equals(id).toArray();
  if (hands.length)
    await putRows(
      "hands",
      hands.map((h) => ({ ...h, collection_ids: h.collection_ids.filter((x) => x !== id) })),
    );
  await deleteRows("handCollections", [id]);
}

export async function toggleInCollection(h: Hand, collectionId: string) {
  const on = h.collection_ids.includes(collectionId);
  return updateHand(h, {
    collection_ids: on
      ? h.collection_ids.filter((x) => x !== collectionId)
      : [...h.collection_ids, collectionId],
  });
}

/* ---------- Review & Leak Book ---------- */

export async function saveReview(
  h: Hand,
  answers: Record<string, string>,
  rule: { category: RuleCategory; text: string } | null,
): Promise<{ hand: Hand; rule: Rule | null }> {
  let saved: Rule | null = null;
  const text = rule?.text.trim() ?? "";
  if (rule && text) {
    const rules = await db().rules.toArray();
    const previous = h.review?.rule?.rule_id
      ? rules.find((r) => r.id === h.review!.rule!.rule_id)
      : undefined;
    const same = rules.find((r) => r.text.trim().toLowerCase() === text.toLowerCase());
    const at = nowIso();
    if (previous && (!same || same.id === previous.id)) {
      saved = await putRow("rules", { ...previous, text, category: rule.category });
    } else if (same) {
      // The same leak showing up again — count it.
      saved = await putRow("rules", {
        ...same,
        times_seen: same.hand_ids.includes(h.id) ? same.times_seen : same.times_seen + 1,
        hand_ids: same.hand_ids.includes(h.id) ? same.hand_ids : [...same.hand_ids, h.id],
        status: "working" as const,
      });
    } else {
      saved = await putRow("rules", {
        id: newId(),
        category: rule.category,
        text,
        status: "working",
        times_seen: 1,
        last_surfaced_at: null,
        hand_ids: [h.id],
        created_at: at,
        updated_at: at,
      } satisfies Rule);
    }
  }
  const review: HandReview = {
    answers,
    rule: saved ? { category: saved.category, text: saved.text, rule_id: saved.id } : null,
    reviewed_at: nowIso(),
  };
  const hand = await updateHand(h, { review, review_status: saved ? "lesson" : "reviewed" });
  return { hand, rule: saved };
}

export const updateRule = (
  r: Rule,
  patch: Partial<Pick<Rule, "text" | "category" | "status" | "last_surfaced_at">>,
) => putRow("rules", { ...r, ...patch });

export const deleteRule = (id: string) => deleteRows("rules", [id]);

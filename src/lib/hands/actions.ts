"use client";

import { z } from "zod";
import type {
  Hand,
  HandCollection,
  HandReview,
  Opponent,
  Rule,
  RuleCategory,
} from "@/lib/domain/types";
import { db } from "@/lib/db/db";
import { deleteRows, getSettings, newId, nowIso, putRow, putRows } from "@/lib/db/repo";
import { localDate } from "@/lib/dates/dates";
import type { HandHistory } from "@/lib/poker/hand-types";
import { buildHandRow, type HandRowMeta } from "./row";

export { stakesText } from "./row";

/** Validate, auto-tag and store a hand. Re-saving recomputes every derived field. */
export async function saveHand(
  hh: HandHistory,
  meta: Omit<HandRowMeta, "id" | "at"> & { id?: string } = {},
): Promise<Hand> {
  const existing = meta.id ? await db().hands.get(meta.id) : undefined;
  return putRow(
    "hands",
    buildHandRow(hh, { ...meta, id: existing?.id ?? newId(), at: nowIso() }, existing),
  );
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
  // A first review counts toward today's "Review hands" habit (and the streak).
  if (h.review_status === "unreviewed") await countReviewHabit();
  return { hand, rule: saved };
}

export const updateRule = (
  r: Rule,
  patch: Partial<Pick<Rule, "text" | "category" | "status" | "last_surfaced_at">>,
) => putRow("rules", { ...r, ...patch });

export const deleteRule = (id: string) => deleteRows("rules", [id]);

async function countReviewHabit() {
  const habit = (await db().habits.toArray()).find((x) => x.key === "review_hands" && x.active);
  if (!habit) return;
  const today = localDate(Date.now(), (await getSettings()).timezone);
  const log = await db().habitLogs.where("[habit_id+date]").equals([habit.id, today]).first();
  await putRow("habitLogs", {
    id: log?.id ?? newId(),
    habit_id: habit.id,
    date: today,
    value: (log?.value ?? 0) + 1,
    source: "manual" as const,
    updated_at: nowIso(),
  });
}

/* ---------- Player database ---------- */

export async function saveOpponent(
  input: Partial<Opponent> & { nickname: string },
): Promise<Opponent> {
  const nickname = input.nickname.trim().slice(0, 60);
  if (!nickname) throw new Error("Give them a name");
  const now = nowIso();
  const existing = input.id ? await db().opponents.get(input.id) : undefined;
  return putRow("opponents", {
    id: input.id ?? newId(),
    nickname,
    venue_id: input.venue_id ?? existing?.venue_id ?? null,
    description: input.description ?? existing?.description ?? null,
    tags: input.tags ?? existing?.tags ?? [],
    notes: input.notes ?? existing?.notes ?? null,
    style: input.style ?? existing?.style ?? "unknown",
    traits: input.traits ?? existing?.traits ?? {},
    avatar: input.avatar ?? existing?.avatar ?? null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  } satisfies Opponent);
}

export async function deleteOpponent(id: string) {
  const linked = await db().hands.where("opponent_ids").equals(id).toArray();
  if (linked.length)
    await putRows(
      "hands",
      linked.map((h) => ({ ...h, opponent_ids: (h.opponent_ids ?? []).filter((x) => x !== id) })),
    );
  await deleteRows("opponents", [id]);
}

export async function toggleOpponentInHand(h: Hand, opponentId: string) {
  const ids = h.opponent_ids ?? [];
  return updateHand(h, {
    opponent_ids: ids.includes(opponentId)
      ? ids.filter((x) => x !== opponentId)
      : [...ids, opponentId],
  });
}

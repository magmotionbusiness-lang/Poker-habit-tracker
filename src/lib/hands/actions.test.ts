import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { StakersDB, setDbForTests } from "@/lib/db/db";
import { act, replay } from "@/lib/poker/engine";
import { cards, newHand } from "@/lib/poker/fixtures";
import {
  createCollection,
  deleteCollection,
  deleteHand,
  saveHand,
  saveQuickNote,
  saveReview,
  stakesText,
  toggleInCollection,
} from "./actions";
import { searchHands, smartList } from "./lists";

let d: StakersDB;
beforeEach(() => {
  d = new StakersDB(`hands-${Math.random()}`);
  setDbForTests(d);
});
afterEach(() => {
  d.close();
  setDbForTests(null);
});

/** Hero (BTN) opens, BB calls, BB checks, hero bets, BB folds: hero +$3. */
function sampleHand() {
  let h = newHand({ hero: 1 });
  h = act(h, "fold");
  h = act(h, "fold");
  h = act(h, "fold");
  h = act(h, "raise", 500);
  h = act(h, "fold");
  h = act(h, "call");
  h = act(h, "check");
  h = act(h, replay(h).maxBet === 0 ? "bet" : "raise", 600);
  h = act(h, "fold");
  return {
    ...h,
    board: cards("Kd7s2c"),
    players: h.players.map((p) => (p.seat === 1 ? { ...p, cards: cards("AhKh") } : p)),
  };
}

describe("hands", () => {
  it("saves with derived fields and auto-tags", async () => {
    const hand = await saveHand(sampleHand());
    expect(hand).toMatchObject({
      stakes: "1/2",
      hero_position: "BTN",
      hero_cards: "AhKh",
      net_minor: 600,
      net_bb: 3,
      review_status: "unreviewed",
    });
    expect(hand.auto_tags).toContain("won-without-showdown");
    expect(stakesText({ sb: 25, bb: 50, straddle: 0, currency: "USD" })).toBe("0.25/0.50");
  });

  it("rejects corrupt hands (duplicate cards)", async () => {
    const bad = { ...sampleHand(), board: cards("AhKd7s") };
    await expect(saveHand(bad)).rejects.toThrow();
  });

  it("quick notes go to the review queue", async () => {
    await saveQuickNote("AKo, 3-bet pot, lost big on river, check later");
    const all = await d.hands.toArray();
    expect(smartList(all, "notes")).toHaveLength(1);
    expect(smartList(all, "unreviewed")).toHaveLength(1);
    expect(searchHands(all, "river")).toHaveLength(1);
  });

  it("custom sections: add, remove, and deleting a section keeps the hands", async () => {
    const hand = await saveHand(sampleHand());
    const c = await createCollection("Ask Nelson", "❓");
    const inSection = await toggleInCollection(hand, c.id);
    expect(inSection.collection_ids).toEqual([c.id]);
    await deleteCollection(c.id);
    expect((await d.hands.get(hand.id))!.collection_ids).toEqual([]);
    expect(await d.handCollections.count()).toBe(0);
  });

  it("review with a rule writes the Leak Book and counts repeats", async () => {
    const a = await saveHand(sampleHand());
    const b = await saveHand(sampleHand());
    const r1 = await saveReview(
      a,
      { preflop: "Standard open" },
      { category: "river", text: "Don't hero-call regs on paired rivers" },
    );
    expect(r1.hand.review_status).toBe("lesson");
    const r2 = await saveReview(
      b,
      {},
      { category: "river", text: "don't hero-call regs on paired rivers " },
    );
    expect(r2.rule!.id).toBe(r1.rule!.id);
    expect(r2.rule!.times_seen).toBe(2);
    expect(r2.rule!.hand_ids).toEqual([a.id, b.id]);
    // Reviewing without a rule is "reviewed", not "lesson".
    const c = await saveHand(sampleHand());
    expect((await saveReview(c, { mental: "Fine" }, null)).hand.review_status).toBe("reviewed");
    // Deleting a hand removes it from the rule's examples.
    await deleteHand(a.id);
    expect((await d.rules.get(r1.rule!.id))!.hand_ids).toEqual([b.id]);
  });
});

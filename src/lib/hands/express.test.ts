import { describe, expect, it } from "vitest";
import { cards } from "@/lib/poker/fixtures";
import { buildExpressHand, expressBoard, isExpress, type ExpressInput } from "./express";
import { smartList } from "./lists";

const base: ExpressInput = {
  cards: cards("AhKh"),
  position: "BTN",
  pot: "3bet",
  multiway: false,
  street: "river",
  result: "won",
  amount: 4800,
  board: cards("Kd7s2c9h3d"),
  note: "Value-bet thin on the river",
  tags: ["Hero call"],
  game: "NLHE",
  currency: "USD",
  sb: 100,
  bb: 200,
  straddle: 0,
};
const meta = { id: "e1", at: "2026-11-26T20:00:00Z" };

describe("express hand log", () => {
  it("captures result, spot and searchable tags in one row", () => {
    const h = buildExpressHand(base, meta);
    expect(h).toMatchObject({
      hero_cards: "AhKh",
      hero_position: "BTN",
      stakes: "1/2",
      net_minor: 4800,
      net_bb: 24,
      ohh: null,
      review_status: "unreviewed",
      user_tags: ["Hero call"],
    });
    for (const t of [
      "express",
      "3bet",
      "heads-up",
      "street:river",
      "won",
      "won-without-showdown",
      "pos:BTN",
      "hand:suited-broadway",
      "flop:rainbow",
    ])
      expect(h.auto_tags).toContain(t);
    expect(isExpress(h)).toBe(true);
    expect(h.quick_note).toBe("Value-bet thin on the river · Board: Kd 7s 2c 9h 3d");
    expect(expressBoard(h)).toEqual(["Kd", "7s", "2c", "9h", "3d"]);
  });

  it("signs losses, zeroes chops and flags big pots", () => {
    expect(
      buildExpressHand({ ...base, result: "lost", amount: 12000, street: "showdown" }, meta),
    ).toMatchObject({ net_minor: -12000, net_bb: -60 });
    const lost = buildExpressHand(
      { ...base, result: "lost", amount: 12000, street: "showdown" },
      meta,
    );
    expect(lost.auto_tags).toEqual(expect.arrayContaining(["lost", "showdown", "big-pot"]));
    expect(buildExpressHand({ ...base, result: "chopped", amount: 999 }, meta).net_minor).toBe(0);
  });

  it("shows up in the right smart lists", () => {
    const hands = [
      buildExpressHand(base, meta),
      buildExpressHand({ ...base, result: "lost", multiway: true }, { ...meta, id: "e2" }),
    ];
    expect(smartList(hands, "notes")).toHaveLength(2); // "to finish"
    expect(smartList(hands, "3bet")).toHaveLength(2);
    expect(smartList(hands, "multiway").map((h) => h.id)).toEqual(["e2"]);
    expect(smartList(hands, "biggest-wins").map((h) => h.id)).toEqual(["e1"]);
  });

  it("needs cards and a position", () => {
    expect(() => buildExpressHand({ ...base, cards: [] }, meta)).toThrow(/cards/);
    expect(() => buildExpressHand({ ...base, position: "" }, meta)).toThrow(/position/);
  });
});

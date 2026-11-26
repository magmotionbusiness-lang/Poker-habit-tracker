import { describe, expect, it } from "vitest";
import { handClass, parseCards, shuffled, DECK } from "./cards";
import { CATEGORY, eval5, evalHoldem, evalOmaha, handName, strengthLabel } from "./evaluator";

const c = parseCards;

describe("cards", () => {
  it("parses, rejects duplicates and labels hand classes", () => {
    expect(c("as kd")).toEqual(["As", "Kd"]);
    expect(() => c("AsAs")).toThrow(/Duplicate/);
    expect(() => c("Zz")).toThrow();
    expect(handClass(c("KdAd"))).toBe("AKs");
    expect(handClass(c("9c Th"))).toBe("T9o");
    expect(handClass(c("QsQh"))).toBe("QQ");
  });
  it("has a 52-card deck and shuffles deterministically", () => {
    expect(new Set(DECK).size).toBe(52);
    let s = 1;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    expect(shuffled(DECK, rnd)).toHaveLength(52);
  });
});

describe("eval5 categories", () => {
  const cases: Array<[string, number, string]> = [
    ["AsKsQsJsTs", CATEGORY.STRAIGHT_FLUSH, "Royal flush"],
    ["5h4h3h2hAh", CATEGORY.STRAIGHT_FLUSH, "Straight flush, Five high"],
    ["9c9d9h9sKd", CATEGORY.QUADS, "Four of a kind, Nines"],
    ["QcQdQh4s4d", CATEGORY.FULL_HOUSE, "Full house, Queens full of Fours"],
    ["Ad9d7d4d2d", CATEGORY.FLUSH, "Flush, Ace high"],
    ["Ts9h8c7d6s", CATEGORY.STRAIGHT, "Straight, Ten high"],
    ["5s4h3c2dAs", CATEGORY.STRAIGHT, "Straight, Five high"],
    ["7s7h7cKdQs", CATEGORY.TRIPS, "Three of a kind, Sevens"],
    ["KsKh7c7dAs", CATEGORY.TWO_PAIR, "Two pair, Kings and Sevens"],
    ["AsAh9c5d2s", CATEGORY.PAIR, "Pair of Aces"],
    ["As Jh 9c 5d 2s", CATEGORY.HIGH_CARD, "Ace high"],
  ];
  it.each(cases)("%s", (cards, cat, name) => {
    const v = eval5(c(cards));
    expect(v.category).toBe(cat);
    expect(handName(v)).toBe(name);
  });
});

describe("comparisons", () => {
  const beats = (a: string, b: string) => eval5(c(a)).score > eval5(c(b)).score;
  it("orders correctly including kickers and the wheel", () => {
    expect(beats("AsAh9c5d3s", "AsAh9c5d2s")).toBe(true); // kicker
    expect(beats("6s5h4c3d2s", "5s4h3c2dAs")).toBe(true); // six-high straight beats wheel
    expect(beats("KsKhKcQdQs", "QsQhQcKdKs")).toBe(true);
    expect(beats("2s3s4s5s7s", "AhKdQcJsTd")).toBe(true); // flush > straight
    expect(eval5(c("AsKd9c5h2s")).score).toBe(eval5(c("AhKc9d5s2h")).score); // exact tie
  });
});

describe("hold'em & omaha", () => {
  it("finds the best 5 of 7", () => {
    expect(handName(evalHoldem(c("AhKh"), c("QhJhTh2c3d")))).toBe("Royal flush");
    expect(handName(evalHoldem(c("2c3d"), c("AsKsQsJsTs")))).toBe("Royal flush"); // board plays
  });
  it("omaha must use exactly two hole cards", () => {
    // Four hearts in hand + one on board is NOT a flush in Omaha.
    const v = evalOmaha(c("AhKhQhJh"), c("2h7c8d9sTc"));
    expect(v.category).toBeLessThan(CATEGORY.FLUSH);
    expect(handName(v)).toBe("Straight, Queen high"); // QJ + T98 (no J on board for K-high)
    // Board quads: Omaha can't play the board.
    expect(evalOmaha(c("2c3d4h5s"), c("AsAhAdAcKs")).category).toBe(CATEGORY.TRIPS); // AAA + two unpaired hole cards
  });
});

describe("strength labels", () => {
  it.each([
    ["AhQd", "Qs7c2d", "Top pair, top kicker"],
    ["JhQd", "Qs7c2d", "Top pair, good kicker"],
    ["Qh5d", "Qs7c2d", "Top pair, weak kicker"],
    ["KhKd", "Qs7c2d", "Overpair"],
    ["5h5d", "Qs7c2d", "Underpair"],
    ["7h6d", "Qs7c2d", "Middle pair"],
    ["2h6d", "Qs7c2d", "Bottom pair"],
    ["7h7d", "Qs7c2d", "Set of Sevens"],
    ["Ah4h", "Kh8h2c", "Flush draw"],
    ["9h8d", "Ts7c2d", "Open-ender"],
    ["9h6d", "Ts7c2d", "Gutshot"],
    ["AhTh", "Th5h2c", "Top pair, top kicker + flush draw"],
  ])("%s on %s → %s", (hole, board, label) => {
    expect(strengthLabel(c(hole), c(board))).toBe(label);
  });
});

import { describe, expect, it } from "vitest";
import { act, replay } from "./engine";
import { cards, newHand } from "./fixtures";
import type { HandHistory } from "./hand-types";
import { flopTexture, holeCategory, summarize } from "./tags";

function play(h: HandHistory, script: Array<"f" | "x" | "c" | number>): HandHistory {
  return script.reduce<HandHistory>((cur, s) => {
    if (s === "f") return act(cur, "fold");
    if (s === "x") return act(cur, "check");
    if (s === "c") return act(cur, "call");
    return act(cur, replay(cur).maxBet === 0 ? "bet" : "raise", s);
  }, h);
}

describe("categories & textures", () => {
  it.each([
    ["QsQh", "pocket-pair"],
    ["AsKs", "suited-broadway"],
    ["KdJc", "offsuit-broadway"],
    ["As5s", "suited-ace"],
    ["8h7h", "suited-connector"],
    ["9h7h", "suited-gapper"],
    ["9c4d", "offsuit-other"],
  ])("%s → %s", (h, cat) => expect(holeCategory(cards(h))).toBe(cat));

  it("describes flops", () => {
    expect(flopTexture(cards("Ah7h2h"))).toEqual(["flop:monotone", "flop:mid"]);
    expect(flopTexture(cards("9s8h7d"))).toEqual(["flop:rainbow", "flop:connected", "flop:mid"]);
    expect(flopTexture(cards("KsKh4d"))).toEqual(["flop:rainbow", "flop:paired", "flop:high"]);
    expect(flopTexture(cards("KsKh4s"))[0]).toBe("flop:two-tone");
    expect(flopTexture(cards("6s4h2d"))).toEqual(["flop:rainbow", "flop:connected", "flop:low"]);
  });
});

describe("summarize", () => {
  it("a 3-bet pot the hero wins without showdown", () => {
    // Hero on BTN (seat 1). UTG opens 500, BTN 3-bets 1500, UTG calls; flop UTG checks, hero bets, UTG folds.
    let h = newHand({ hero: 1 });
    h = play(h, [500, "f", "f", 1500, "f", "f", "c", "x", 2000, "f"]);
    h = {
      ...h,
      board: cards("Kd7s2c"),
      players: h.players.map((p) => (p.seat === 1 ? { ...p, cards: cards("AhKh") } : p)),
    };
    const s = summarize(h);
    expect(s.hero_position).toBe("BTN");
    expect(s.hero_cards).toBe("AhKh");
    expect(s.net_minor).toBe(1500 + 300); // villain's 1500 + blinds
    expect(s.net_bb).toBe(9);
    for (const t of [
      "won",
      "3bet",
      "pf-aggressor",
      "heads-up",
      "street:flop",
      "won-without-showdown",
      "pos:BTN",
      "hand:suited-broadway",
      "flop:rainbow",
    ])
      expect(s.auto_tags).toContain(t);
  });

  it("a multiway limped pot lost at showdown", () => {
    let h = newHand({ hero: 3 }); // hero BB
    h = play(h, [
      "c",
      "f",
      "c",
      "f",
      "c",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
    ]);
    h = {
      ...h,
      board: cards("2c7d9hJc3s"),
      players: h.players.map((p) => ({
        ...p,
        cards:
          p.seat === 3
            ? cards("Tc4c")
            : p.seat === 4
              ? cards("JsJd")
              : p.seat === 6
                ? cards("Ad2d")
                : p.seat === 2
                  ? cards("4s5s")
                  : null,
      })),
    };
    const s = summarize(h);
    expect(s.net_minor).toBe(-200);
    for (const t of ["lost", "limped", "multiway", "street:showdown", "showdown", "pos:BB"])
      expect(s.auto_tags).toContain(t);
  });

  it("flags unresolved results instead of guessing", () => {
    let h = play(newHand(), ["f", "f", 500, "c", "f", "f", "x", "x", "x", "x", "x", "x"]);
    h = { ...h, board: cards("2c7d9hJc3s") };
    const s = summarize(h);
    expect(s.resolved).toBe(false);
    expect(s.net_minor).toBeNull();
    expect(s.auto_tags).toContain("unresolved");
  });
});

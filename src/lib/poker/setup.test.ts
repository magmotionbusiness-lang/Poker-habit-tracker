import { describe, expect, it } from "vitest";
import { act, replay } from "./engine";
import { cards } from "./fixtures";
import { buildHand, HERO_SEAT, undoLast } from "./setup";

const base = {
  game: "NLHE" as const,
  currency: "USD",
  sb: 100,
  bb: 200,
  ante: 0,
  straddle: 0,
  tableSize: 9,
  stackBb: 100,
  heroCards: cards("AhKh"),
};

describe("buildHand", () => {
  it.each(["BTN", "SB", "BB", "UTG", "MP", "CO"])("puts the hero in %s", (pos) => {
    const h = buildHand({ ...base, heroPosition: pos });
    const hero = replay(h).seats.find((s) => s.seat === HERO_SEAT)!;
    expect(hero.position).toBe(pos);
    expect(hero.cards).toEqual(["Ah", "Kh"]);
    expect(hero.stack + hero.committed).toBe(20_000);
  });

  it("names villains by position and applies overrides", () => {
    const h = buildHand({
      ...base,
      heroPosition: "BB",
      players: { 4: { name: "Reg in the hat", stack: 50_000 } },
    });
    expect(h.players.find((p) => p.seat === 4)).toMatchObject({
      name: "Reg in the hat",
      stack: 50_000,
    });
    expect(h.players.find((p) => p.seat === 2)!.name).toMatch(/^(UTG|UTG\+1|MP|LJ|HJ|CO|BTN|SB)$/);
  });

  it("the first to act is UTG, and the hero in the BB acts last preflop", () => {
    const h = buildHand({ ...base, heroPosition: "BB" });
    const t = replay(h);
    expect(t.seats.find((s) => s.seat === t.toAct)!.position).toBe("UTG");
  });
});

describe("undoLast", () => {
  it("removes the last voluntary action but keeps the blinds", () => {
    const h = act(act(buildHand({ ...base, heroPosition: "BTN" }), "fold"), "raise", 600);
    const u = undoLast(h);
    expect(u.actions.length).toBe(h.actions.length - 1);
    const posts = undoLast(undoLast(u));
    expect(posts.actions.every((a) => a.type === "post")).toBe(true);
    expect(undoLast(posts)).toBe(posts);
  });
});

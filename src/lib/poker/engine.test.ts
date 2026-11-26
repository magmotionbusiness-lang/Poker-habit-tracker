import { describe, expect, it } from "vitest";
import {
  act,
  decisionInfo,
  foldTo,
  legalActions,
  replay,
  settle,
  sizePresets,
  streetMarkers,
  totalPot,
} from "./engine";
import { cards, newHand } from "./fixtures";
import type { HandHistory } from "./hand-types";
import { blindSeats, buttonForPosition, positionNames, seatPositions } from "./positions";

/** Apply a script of actions: "f" fold, "x" check, "c" call, number = bet/raise to. */
function play(h: HandHistory, script: Array<"f" | "x" | "c" | number>): HandHistory {
  return script.reduce<HandHistory>((cur, s) => {
    if (s === "f") return act(cur, "fold");
    if (s === "x") return act(cur, "check");
    if (s === "c") return act(cur, "call");
    const t = replay(cur);
    return act(cur, t.maxBet === 0 ? "bet" : "raise", s);
  }, h);
}

describe("positions", () => {
  it("names seats from the button", () => {
    const m = seatPositions([1, 2, 3, 4, 5, 6], 1);
    expect([...m.values()]).toEqual(["BTN", "SB", "BB", "UTG", "HJ", "CO"]);
    expect(seatPositions([1, 2, 3, 4, 5, 6, 7, 8, 9], 4).get(3)).toBe("CO");
    expect(positionNames(2)).toEqual(["BTN", "BB"]);
  });
  it("places the button so the hero gets the chosen position", () => {
    const seats = [1, 2, 3, 4, 5, 6];
    const btn = buttonForPosition(seats, 1, "BB");
    expect(seatPositions(seats, btn).get(1)).toBe("BB");
  });
  it("heads-up: the button posts the small blind", () => {
    expect(blindSeats([3, 7], 3)).toEqual({ sb: 3, bb: 7 });
  });
});

describe("posts and preflop order", () => {
  it("UTG acts first after the blinds", () => {
    const t = replay(newHand());
    expect(t.toAct).toBe(4);
    expect(t.maxBet).toBe(200);
    expect(t.seats.find((s) => s.seat === 2)!.committed).toBe(100);
    expect(totalPot(t)).toBe(300);
  });
  it("antes go straight to the pot", () => {
    const t = replay(newHand({ ante: 25 }));
    expect(t.pot).toBe(150);
    expect(totalPot(t)).toBe(450);
  });
  it("a straddle acts last preflop and doubles the min-raise", () => {
    const h = newHand({ straddle: 400 });
    const t = replay(h);
    expect(t.toAct).toBe(5); // left of the straddler (UTG, seat 4)
    expect(legalActions(t)!.minTo).toBe(600);
    const t2 = replay(play(h, ["f", "f", "f", "f", "c"])); // HJ CO BTN SB fold, BB calls
    expect(t2.toAct).toBe(4); // straddler has the option
    expect(legalActions(t2)!.canCheck).toBe(true);
  });
  it("big blind gets the option after a limp", () => {
    const h = play(newHand(), ["f", "f", "f", "f", "c"]); // SB completes
    const l = legalActions(replay(h))!;
    expect(l.seat).toBe(3);
    expect(l.canCheck).toBe(true);
    expect(l.aggressive).toBe("raise");
  });
  it("heads-up: button/SB acts first preflop, BB first postflop", () => {
    const h = newHand({ n: 2 });
    expect(replay(h).toAct).toBe(1);
    const flop = replay(play(h, ["c", "x"]));
    expect(flop.street).toBe("flop");
    expect(flop.toAct).toBe(2);
  });
});

describe("a full single-raised pot", () => {
  // CO opens 500, BB calls; flop BB checks, CO bets 600, BB raises 1800, CO calls; turn x x; river BB bets 4000, CO folds.
  const h = play(newHand(), [
    "f",
    "f",
    500,
    "f",
    "f",
    "c",
    "x",
    600,
    1800,
    "c",
    "x",
    "x",
    4000,
    "f",
  ]);
  it("tracks streets, pot and stacks", () => {
    const flop = replay(h, 2 + 6); // posts + 6 preflop actions
    expect(flop.street).toBe("flop");
    expect(flop.pot).toBe(1100);
    expect(flop.toAct).toBe(3);
    const end = replay(h);
    expect(end.handOver).toBe(true);
    expect(end.showdown).toBe(false);
  });
  it("settles with the uncalled river bet returned", () => {
    const r = settle(h);
    expect(r.refund).toEqual({ seat: 3, amount: 4000 });
    expect(r.resolved).toBe(true);
    expect(r.net[3]).toBe(500 + 1800 + 100); // BB wins CO's money + SB's blind
    expect(r.net[6]).toBe(-(500 + 1800));
    expect(r.net[2]).toBe(-100);
    expect(Object.values(r.net).reduce((a, b) => a + b, 0)).toBe(0);
  });
  it("marks streets for the scrub bar", () => {
    expect(streetMarkers(h).map((m) => m.street)).toEqual(["preflop", "flop", "turn", "river"]);
  });
});

describe("min-raises and presets", () => {
  it("the min re-raise is the last raise size", () => {
    const h = play(newHand(), [600]); // UTG raises to 600 (+400)
    expect(legalActions(replay(h))!.minTo).toBe(1000);
  });
  it("offers sensible size chips", () => {
    const pre = sizePresets(replay(newHand()), { bb: 200, sb: 100, game: "NLHE" });
    expect(pre.map((p) => [p.label, p.to])).toEqual([
      ["2.5x", 500],
      ["3x", 600],
      ["Pot", 700],
      ["All-in", 20000],
    ]);
    const flop = replay(play(newHand(), ["f", "f", 500, "f", "f", "c"]));
    const bets = sizePresets(flop, { bb: 200, sb: 100, game: "NLHE" });
    expect(bets.find((b) => b.label === "½")!.to).toBe(600); // pot 1100 → 550 → rounded to 600 (whole chips)
  });
  it("pot-limit caps raises at the pot", () => {
    const h = newHand({ game: "PLO" });
    const p = sizePresets(replay(h), { bb: 200, sb: 100, game: "PLO" });
    expect(p.at(-1)).toEqual({ label: "Pot (max)", to: 700 });
  });
});

describe("all-ins, side pots and showdowns", () => {
  const base = (stacks: number[]) =>
    newHand({
      n: 3,
      players: stacks.map((stack, i) => ({ seat: i + 1, name: `P${i + 1}`, stack, cards: null })),
    });

  it("builds side pots and pays the best hands", () => {
    let h = base([5000, 1000, 5000]);
    h = play(h, [5000, "c", "c"]); // BTN jams, SB calls all-in 1000, BB calls
    const t = replay(h);
    expect(t.handOver).toBe(true);
    expect(t.showdown).toBe(true);
    h = {
      ...h,
      board: cards("2c7d9hJc3s"),
      players: h.players.map((p) => ({
        ...p,
        cards: cards(["KsKh", "AsAh", "QsQh"][p.seat - 1]!),
      })),
    };
    const r = settle(h);
    expect(r.pots.map((p) => [p.amount, p.eligible, p.winners])).toEqual([
      [3000, [1, 2, 3], [2]],
      [8000, [1, 3], [1]],
    ]);
    expect(r.net).toEqual({ 1: 3000, 2: 2000, 3: -5000 });
    expect(r.values[2]!.name).toBe("Pair of Aces");
  });

  it("splits a chopped pot and gives the odd chip left of the button", () => {
    let h = newHand({ n: 3, sb: 50, bb: 100 });
    h = play(h, ["c", "c", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x"]);
    h = {
      ...h,
      board: cards("AsKdQhJcTs"),
      players: h.players.map((p) => ({
        ...p,
        cards: cards(["2c3d", "4h5h", "6s7s"][p.seat - 1]!),
      })),
    };
    const r = settle({ ...h, rake: 1 }); // 300 − 1 rake = 299 between three
    expect(r.payouts).toEqual({ 1: 99, 2: 100, 3: 100 });
  });

  it("uses the manual result when villain cards are unknown", () => {
    let h = play(newHand(), ["f", "f", 500, "f", "f", "c", "x", "x", "x", "x", "x", "x"]);
    h = {
      ...h,
      board: cards("2c7d9hJc3s"),
      players: h.players.map((p) => (p.seat === 1 ? { ...p, cards: cards("AsAh") } : p)),
    };
    expect(settle(h).resolved).toBe(false);
    const r = settle({ ...h, winners: [3] });
    expect(r.resolved).toBe(true);
    expect(r.net[3]).toBe(600);
  });

  it("runs it twice", () => {
    let h = base([5000, 5000, 5000]);
    h = play(h, ["f", 5000, "c"]); // SB jams, BB calls
    h = {
      ...h,
      board: cards("2c7d9hJc3s"),
      board2: cards("2c7d9hAcAd"),
      players: h.players.map((p) => ({
        ...p,
        cards: p.seat === 2 ? cards("AsKh") : p.seat === 3 ? cards("QsQh") : null,
      })),
    };
    const r = settle(h);
    expect(r.payouts[2]).toBe(5000); // wins run 2 (trips aces)
    expect(r.payouts[3]).toBe(5000); // wins run 1 (queens)
  });
});

describe("bomb pots, folds-to and decisions", () => {
  it("bomb pot starts on the flop with everyone's ante in", () => {
    const t = replay(newHand({ bomb_pot: 1000, n: 4 }));
    expect(t.street).toBe("flop");
    expect(t.pot).toBe(4000);
    expect(t.toAct).toBe(2);
  });
  it("folds to the hero", () => {
    const h = foldTo(newHand(), 1); // hero on the button
    expect(replay(h).toAct).toBe(1);
    expect(h.actions.filter((a) => a.type === "fold")).toHaveLength(3);
  });
  it("computes pot odds and SPR", () => {
    const h = play(newHand(), ["f", "f", "f", 500, "f"]); // BTN opens, SB folds, BB to act
    const d = decisionInfo(replay(h))!;
    expect(d.toCall).toBe(300);
    expect(d.potOdds).toBeCloseTo(300 / (800 + 300), 6);
    const flop = replay(play(h, ["c", "x"]));
    expect(decisionInfo(flop)!.spr).toBeCloseTo(19500 / 1100, 0);
  });
  it("won't let a player check facing a bet", () => {
    expect(() => act(newHand(), "check")).toThrow();
  });
});

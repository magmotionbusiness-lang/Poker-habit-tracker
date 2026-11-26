import { describe, expect, it } from "vitest";
import {
  fromLadderUnits,
  guessKind,
  ladderView,
  RULE_PRESETS,
  toLadderUnits,
  typicalStake,
} from "./ladder";

const std = RULE_PRESETS.standard.cash;

describe("stake ladder", () => {
  it("unlocks stakes by buy-ins (standard: 30 × 100bb)", () => {
    // $6,400 → 1/2 needs $6,000 (30 × $200) ✓, 1/3 needs $9,000 ✗
    const v = ladderView("live", 640_000, std, 200);
    expect(v.rungs.filter((r) => r.unlocked).map((r) => r.label)).toEqual(["1/2"]);
    expect(v.maxIndex).toBe(0);
    expect(v.currentIndex).toBe(0);
    expect(v.buyInsAtCurrent).toBe(32);
    expect(v.next).toEqual({ index: 1, needed: 260_000, fraction: 640_000 / 900_000 });
    expect(v.shot).toBe(false); // shot at 1/3 needs 25 × $300 = $7,500
    expect(v.moveDown).toBe(false);
  });

  it("offers a shot at 25 buy-ins and warns to move down below 20", () => {
    expect(ladderView("live", 760_000, std, 200).shot).toBe(true);
    const down = ladderView("live", 700_000, std, 300); // playing 1/3 with $7,000 = 23 BI → fine
    expect(down.moveDown).toBe(false);
    expect(ladderView("live", 590_000, std, 300).moveDown).toBe(true); // < 20 × $300
  });

  it("presets change the requirement; MTTs need more buy-ins", () => {
    expect(ladderView("live", 640_000, RULE_PRESETS.aggressive.cash, null).maxIndex).toBe(1); // 20 × $300 = $6,000
    expect(ladderView("live", 640_000, RULE_PRESETS.conservative.cash, null).maxIndex).toBe(-1); // needs $10,000
    const m = ladderView("mtt", 300_000, RULE_PRESETS.standard.mtt, null); // $3,000 / 100 BI → $22 tier max? $22×100 = $2,200 ✓, $55 ✗
    expect(m.rungs[m.maxIndex]!.label).toBe("$22");
  });

  it("current stake follows where you actually play", () => {
    expect(
      ladderView("online", 600_000, std, 50).rungs[
        ladderView("online", 600_000, std, 50).currentIndex
      ]!.label,
    ).toBe("NL50");
    expect(ladderView("online", 0, std, null).next!.index).toBe(0);
  });
});

describe("ladder inputs", () => {
  const s = (o: Partial<Parameters<typeof typicalStake>[0][number]>) => ({
    format: "cash",
    is_live: true,
    stakes_bb_minor: 200,
    buy_in_minor: 30_000,
    status: "finished",
    started_at: "2026-11-01T18:00:00Z",
    ...o,
  });

  it("guesses the ladder from recent sessions", () => {
    expect(guessKind([])).toBe("live");
    expect(guessKind([s({}), s({ is_live: false }), s({ is_live: false })])).toBe("online");
    expect(guessKind([s({ format: "mtt" }), s({ format: "mtt" }), s({})])).toBe("mtt");
  });

  it("uses the median stake of the last 10 sessions", () => {
    const list = [
      s({ stakes_bb_minor: 200, started_at: "2026-11-01T00:00:00Z" }),
      s({ stakes_bb_minor: 500, started_at: "2026-11-02T00:00:00Z" }),
      s({ stakes_bb_minor: 300, started_at: "2026-11-03T00:00:00Z" }),
      s({ stakes_bb_minor: 5000, status: "running" }),
    ];
    expect(typicalStake(list, "live")).toBe(300);
    expect(typicalStake(list, "online")).toBeNull();
  });

  it("scales other currency exponents to ladder units", () => {
    expect(toLadderUnits(640_000, 2)).toBe(640_000);
    expect(toLadderUnits(6_400, 0)).toBe(640_000); // ¥6,400
    expect(fromLadderUnits(640_000, 0)).toBe(6_400);
    expect(toLadderUnits(6_400_000, 3)).toBe(640_000);
  });
});

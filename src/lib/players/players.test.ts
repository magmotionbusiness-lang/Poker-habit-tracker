import { describe, expect, it } from "vitest";
import type { Hand, Opponent } from "@/lib/domain/types";
import { bumpTrait, readConfidence, recordVs } from "./players";

const hand = (o: Partial<Hand>): Hand =>
  ({
    id: Math.random().toString(),
    played_at: "2026-11-01T20:00:00Z",
    net_bb: null,
    net_minor: null,
    currency: "USD",
    opponent_ids: [],
    ...o,
  }) as Hand;

describe("player database", () => {
  it("record vs a player from tagged hands", () => {
    const hs = [
      hand({ opponent_ids: ["m"], net_bb: 40, net_minor: 8000, played_at: "2026-11-02T20:00:00Z" }),
      hand({ opponent_ids: ["m", "a"], net_bb: -12.5, net_minor: -2500 }),
      hand({ opponent_ids: ["a"], net_bb: 99, net_minor: 9900 }),
    ];
    expect(recordVs("m", hs)).toEqual({
      hands: 2,
      netBb: 27.5,
      net: { USD: 5500 },
      won: 1,
      lost: 1,
      lastPlayed: "2026-11-02T20:00:00Z",
    });
  });

  it("distinguishes assumption from a solid read", () => {
    expect(readConfidence(1).label).toBe("Assumption");
    expect(readConfidence(4).label).toBe("Some evidence");
    expect(readConfidence(9).label).toBe("Solid read");
  });

  it("each sighting adds evidence", () => {
    const o = { traits: { river_bluffs: { level: "high", evidence: 2 } } } as unknown as Opponent;
    expect(bumpTrait(o, "river_bluffs", "high").river_bluffs).toEqual({
      level: "high",
      evidence: 3,
    });
    expect(bumpTrait(o, "limps", "medium").limps).toEqual({ level: "medium", evidence: 1 });
  });
});

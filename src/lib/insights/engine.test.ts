import { describe, expect, it } from "vitest";
import { makeSession } from "@/lib/test/factories";
import { confidenceFor, generateInsights, tournamentBuckets } from "./engine";

const fmt = (m: number, signed?: boolean) =>
  `${signed && m >= 0 ? "+" : m < 0 ? "-" : ""}$${Math.abs(m / 100)}`;
const base = {
  currency: "USD",
  rates: {},
  tz: "UTC",
  now: Date.parse("2026-11-27T12:00:00Z"),
  fmt,
};
const day = (i: number, hour = 19) => new Date(Date.UTC(2026, 9, 1 + i, hour)).toISOString();

describe("insight engine", () => {
  it("first sessions get an 'aha' hourly", () => {
    const s = [
      makeSession({ buy_in_minor: 20_000, cash_out_minor: 30_000, hours: 4, started_at: day(0) }),
    ];
    const ins = generateInsights({ ...base, sessions: s });
    expect(ins[0]).toMatchObject({
      kind: "aha",
      title: "You're averaging +$25/hour",
      confidence: "low",
    });
  });

  it("finds the strongest stake with an exact comparison", () => {
    const s = [
      ...[0, 1, 2, 3].map((i) =>
        makeSession({
          id: `a${i}`,
          stakes_sb_minor: 100,
          stakes_bb_minor: 200,
          buy_in_minor: 20_000,
          cash_out_minor: 29_600,
          hours: 4,
          started_at: day(i),
        }),
      ),
      ...[4, 5, 6, 7].map((i) =>
        makeSession({
          id: `b${i}`,
          stakes_sb_minor: 100,
          stakes_bb_minor: 300,
          buy_in_minor: 30_000,
          cash_out_minor: 34_400,
          hours: 4,
          started_at: day(i),
        }),
      ),
    ];
    const stake = generateInsights({ ...base, sessions: s }).find((x) => x.kind === "stake")!;
    expect(stake.title).toBe("1/2 is currently your strongest game");
    expect(stake.body).toContain("+$24/h vs +$11/h at 1/3");
    expect(stake.confidence).toBe("low");
  });

  it("spots that losses are concentrated in a few sessions", () => {
    const s = Array.from({ length: 30 }, (_, i) =>
      makeSession({
        id: `s${i}`,
        buy_in_minor: 20_000,
        cash_out_minor: i < 5 ? 0 : i < 15 ? 18_000 : 26_000,
        started_at: day(i),
      }),
    );
    const c = generateInsights({ ...base, sessions: s }).find((x) => x.kind === "concentration")!;
    // 5 × -200 = -1000 of (-1000 + 10 × -20 = -1200) → 83%
    expect(c.title).toBe("83% of your losses come from 5 sessions");
    expect(c.tone).toBe("warn");
  });

  it("detects results dropping in long sessions, and mood correlation", () => {
    const s = [
      ...[0, 1, 2].map((i) =>
        makeSession({
          id: `s${i}`,
          hours: 3,
          buy_in_minor: 20_000,
          cash_out_minor: 29_000,
          started_at: day(i),
          mood: 5,
        }),
      ),
      ...[3, 4, 5].map((i) =>
        makeSession({
          id: `l${i}`,
          hours: 7,
          buy_in_minor: 20_000,
          cash_out_minor: 13_000,
          started_at: day(i),
          mood: 1,
        }),
      ),
    ];
    const ins = generateInsights({ ...base, sessions: s });
    expect(ins.find((x) => x.kind === "length")!.title).toBe("Your results drop after 4h");
    expect(ins.find((x) => x.kind === "mood")!.title).toBe("Frustrated sessions cost you");
  });

  it("confidence grows with sample size", () => {
    expect(confidenceFor(5)).toBe("low");
    expect(confidenceFor(12)).toBe("medium");
    expect(confidenceFor(40, 120)).toBe("high");
  });

  it("tournament buckets: ROI and ITM per buy-in range", () => {
    const t = (cost: number, prize: number) =>
      makeSession({ format: "mtt", buy_in_minor: cost, prize_minor: prize });
    const rows = tournamentBuckets([t(1100, 0), t(1100, 4400), t(5500, 0), t(5500, 11000)], base);
    expect(rows).toEqual([
      { label: "Up to 15", count: 2, cost: 2200, net: 2200, roi: 1, itm: 0.5 },
      { label: "15 to 55", count: 2, cost: 11000, net: 0, roi: 0, itm: 0.5 },
    ]);
  });
});

import { describe, expect, it } from "vitest";
import type { Goal } from "@/lib/domain/types";
import { makeSession } from "@/lib/test/factories";
import { goalCurrentValue, goalProgress } from "./goals";

const goal = (o: Partial<Goal>): Goal => ({
  id: "g",
  created_at: "",
  updated_at: "",
  type: "profit",
  title: "Make my first $50k from poker",
  target_value: 5_000_000,
  start_value: 0,
  manual_value: null,
  currency: "USD",
  unit: "minor",
  starts_at: "2026-09-01T00:00:00Z",
  deadline: null,
  is_main: true,
  status: "active",
  achieved_at: null,
  ...o,
});
const ctx = { sessions: [], studySessions: [], bankrollTotal: null, rates: {} };

describe("goalCurrentValue", () => {
  it("profit = prior profit + results after costs since the goal started", () => {
    const sessions = [
      makeSession({
        buy_in_minor: 30000,
        cash_out_minor: 80000,
        tips_minor: 1000,
        started_at: "2026-10-01T18:00:00Z",
      }),
      makeSession({ buy_in_minor: 30000, cash_out_minor: 0, started_at: "2026-08-01T18:00:00Z" }), // before start
    ];
    expect(goalCurrentValue(goal({ start_value: 100000 }), { ...ctx, sessions })).toBe(
      100000 + 49000,
    );
  });
  it("bankroll uses the converted total; study sums minutes; manual goals use manual_value", () => {
    expect(goalCurrentValue(goal({ type: "bankroll" }), { ...ctx, bankrollTotal: 640000 })).toBe(
      640000,
    );
    const studySessions = [
      {
        id: "s",
        started_at: "2026-10-01T10:00:00Z",
        minutes: 45,
        category: "solver" as const,
        note: null,
        created_at: "",
      },
    ];
    expect(
      goalCurrentValue(goal({ type: "study", unit: "minutes" }), { ...ctx, studySessions }),
    ).toBe(45);
    expect(goalCurrentValue(goal({ type: "stake", manual_value: 2 }), ctx)).toBe(2);
  });
  it("volume in hours and sessions", () => {
    const sessions = [
      makeSession({ hours: 5, started_at: "2026-10-01T18:00:00Z" }),
      makeSession({ hours: 4, started_at: "2026-10-02T18:00:00Z" }),
    ];
    expect(goalCurrentValue(goal({ type: "volume", unit: "hours" }), { ...ctx, sessions })).toBe(9);
    expect(goalCurrentValue(goal({ type: "volume", unit: "sessions" }), { ...ctx, sessions })).toBe(
      2,
    );
  });
});

describe("goalProgress", () => {
  // $10k bankroll goal at 64% (the demo player): started at $4,000 on Sep 1, now $6,400 on Nov 30.
  const g = goal({
    type: "bankroll",
    target_value: 1_000_000,
    start_value: 400_000,
    deadline: "2027-06-30",
  });
  it("computes fraction, pace and projection", () => {
    const p = goalProgress(g, 640_000, "2026-11-30", "UTC");
    expect(p.fraction).toBe(0.64);
    expect(p.daysElapsed).toBe(90);
    expect(p.pacePerDay).toBeCloseTo(240_000 / 90, 6);
    expect(p.remaining).toBe(360_000);
    expect(p.projectedDate).toBe("2027-04-14"); // ceil(360000 / 2666.67) = 135 days after Nov 30
    expect(p.onTrack).toBe(true);
    expect(p.requiredPerDay).toBeCloseTo(360_000 / 212, 6);
  });
  it("no projection with too little history or a flat/negative pace", () => {
    expect(goalProgress(g, 410_000, "2026-09-04", "UTC").projectedDate).toBeNull();
    expect(goalProgress(g, 380_000, "2026-11-30", "UTC").projectedDate).toBeNull();
    expect(goalProgress(g, 380_000, "2026-11-30", "UTC").onTrack).toBe(false);
  });
  it("achieved goals clamp at 100%", () => {
    expect(goalProgress(g, 1_200_000, "2026-11-30", "UTC")).toMatchObject({
      fraction: 1,
      achieved: true,
      remaining: 0,
    });
  });
});

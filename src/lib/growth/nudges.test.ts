import { describe, expect, it } from "vitest";
import { type NudgeContext, type NudgeDef, pickNudge } from "./nudges";

const defs: NudgeDef[] = [
  { id: "promo", when: (c) => c.rulesCount >= 10, promo: true },
  { id: "mind", when: (c) => (c.lastWeekNet ?? 0) < 0, promo: false },
];
const ctx: NudgeContext = {
  rulesCount: 12,
  handsReviewed: 0,
  streak: 0,
  lastWeekNet: -500,
  status: null,
};
const now = Date.parse("2026-11-26T12:00:00Z");
const ago = (h: number) => new Date(now - h * 3_600_000).toISOString();

describe("nudges", () => {
  it("picks the first eligible unseen nudge", () => {
    expect(pickNudge(defs, ctx, {}, now)).toEqual({ id: "promo", isNew: true });
    expect(pickNudge(defs, { ...ctx, status: "student" }, {}, now)).toEqual({
      id: "mind",
      isNew: true,
    });
  });

  it("keeps showing for a day, then rate-limits to one a week", () => {
    expect(pickNudge(defs, ctx, { "nudge:promo": ago(3) }, now)).toEqual({
      id: "promo",
      isNew: false,
    });
    expect(
      pickNudge(defs, ctx, { "nudge:promo": ago(3), "nudge-x:promo": ago(2) }, now),
    ).toBeNull();
    expect(pickNudge(defs, ctx, { "nudge:promo": ago(48) }, now)).toBeNull();
    expect(pickNudge(defs, ctx, { "nudge:promo": ago(24 * 8) }, now)).toEqual({
      id: "mind",
      isNew: true,
    });
  });
});

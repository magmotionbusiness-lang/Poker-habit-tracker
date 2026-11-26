import { describe, expect, it } from "vitest";
import type { ISODate } from "@/lib/domain/types";
import { addDays } from "@/lib/dates/dates";
import {
  computeStreak,
  milestoneCrossed,
  nextMilestone,
  type DayInput,
  type StreakConfig,
} from "./streaks";

const cfg: StreakConfig = { restWeekdays: [], maxFreezes: 2 };
const START = "2026-11-02"; // a Monday

/** Build input from a pattern: x = met, . = missed, d = doubled, r = met-but-nothing-scheduled */
function pattern(p: string, start: ISODate = START, required = 1): Map<ISODate, DayInput> {
  const m = new Map<ISODate, DayInput>();
  [...p].forEach((c, i) => {
    const date = addDays(start, i);
    if (c === "x") m.set(date, { done: required, doubled: 0, required });
    if (c === "d") m.set(date, { done: required, doubled: required, required });
    if (c === ".") m.set(date, { done: 0, doubled: 0, required });
    if (c === "0") m.set(date, { done: 0, doubled: 0, required: 0 });
  });
  return m;
}
const run = (p: string, c: StreakConfig = cfg, today?: ISODate) =>
  computeStreak(pattern(p), c, START, today ?? addDays(START, p.length - 1));

describe("basic counting", () => {
  it("counts consecutive met days", () => {
    expect(run("xxxx")).toMatchObject({ current: 4, longest: 4, totalActiveDays: 4 });
  });
  it("today is pending, never a break", () => {
    const r = run("xxx.");
    expect(r.current).toBe(3);
    expect(r.days.at(-1)!.status).toBe("pending");
    expect(r.todayDone).toBe(false);
  });
  it("breaks on a missed past day with no freeze, keeping longest and total", () => {
    const r = run("xxx.xx", { ...cfg, repair: false });
    expect(r).toMatchObject({ current: 2, longest: 3, totalActiveDays: 5 });
  });
});

describe("rest days", () => {
  it("planned rest weekdays never break the streak", () => {
    // Mon..Sun with Sat (6) and Sun (7) as rest days, missed both, then Mon met.
    const r = run("xxxxx..x", { ...cfg, restWeekdays: [6, 7] });
    expect(r.current).toBe(6);
    expect(r.days.slice(5, 7).map((d) => d.status)).toEqual(["rest", "rest"]);
  });
  it("a rest day where the user still played counts", () => {
    expect(run("xxxxxxx", { ...cfg, restWeekdays: [6, 7] }).current).toBe(7);
  });
  it("a day with nothing scheduled is treated as rest", () => {
    expect(run("xx0x").current).toBe(3);
  });
});

describe("freezes", () => {
  it("earns one per 7 counted days and spends it on a missed day", () => {
    const r = run("xxxxxxx.x"); // 7 days → 1 freeze, miss, continue
    expect(r.current).toBe(8);
    expect(r.freezesAvailable).toBe(0);
    expect(r.freezesUsedOn).toEqual([addDays(START, 7)]);
    expect(r.days[7]!.status).toBe("frozen");
  });
  it("caps at maxFreezes (2 free, 5 Pro)", () => {
    expect(run("x".repeat(35)).freezesAvailable).toBe(2);
    expect(run("x".repeat(35), { ...cfg, maxFreezes: 5 }).freezesAvailable).toBe(5);
  });
  it("two misses with two freezes survive", () => {
    const r = run("x".repeat(14) + ".." + "x");
    expect(r.current).toBe(15);
    expect(r.freezesAvailable).toBe(0);
  });
});

describe("repair (double tomorrow)", () => {
  it("a missed day is repaired by doubling the next day", () => {
    const r = run("xxx.dx");
    expect(r.current).toBe(5);
    expect(r.days[3]!.status).toBe("repaired");
  });
  it("only once per streak run", () => {
    const r = run("xxx.dx.dx"); // second miss can't be repaired → reset, then 2 new days
    expect(r.current).toBe(2);
    expect(r.days[6]!.status).toBe("missed");
    expect(r.longest).toBe(5);
  });
  it("is offered (at risk) when yesterday was missed and today isn't doubled yet", () => {
    const r = run("xxx..");
    expect(r.current).toBe(3);
    expect(r.repair).toEqual({
      missed: addDays(START, 3),
      deadline: addDays(START, 4),
      requiredDoubled: 1,
    });
    expect(r.days[3]!.status).toBe("at_risk");
  });
  it("breaks once the repair window has passed", () => {
    const r = run("xxx.x.");
    expect(r.current).toBe(1); // day 4 met normally, didn't repair day 3
    expect(r.repair).toBeNull();
  });
  it("no repair offered when there was no streak to save", () => {
    expect(run("..").repair).toBeNull();
  });
});

describe("timezone & travel", () => {
  it("the engine works on local dates; a flight that skips a calendar day is just a missed day", () => {
    // Input dates are computed upstream with localDate(…, tz); engine is tz-agnostic.
    const r = computeStreak(pattern("xx"), cfg, START, addDays(START, 1));
    expect(r.current).toBe(2);
  });
});

describe("milestones", () => {
  it("detects crossings", () => {
    expect(milestoneCrossed(6, 7)).toBe(7);
    expect(milestoneCrossed(7, 8)).toBeNull();
    expect(milestoneCrossed(2, 14)).toBe(14);
    expect(nextMilestone(23)).toBe(30);
    expect(nextMilestone(400)).toBeNull();
  });
});

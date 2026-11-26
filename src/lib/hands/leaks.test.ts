import { describe, expect, it } from "vitest";
import type { Rule } from "@/lib/domain/types";
import { groupRules, ruleOfTheDay } from "./leaks";

const rule = (o: Partial<Rule>): Rule => ({
  id: o.id ?? "r",
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
  category: "river",
  text: "x",
  status: "working",
  times_seen: 1,
  last_surfaced_at: null,
  hand_ids: [],
  ...o,
});

describe("Leak Book", () => {
  it("groups by street order with open, frequent leaks first", () => {
    const g = groupRules([
      rule({ id: "a", category: "river", times_seen: 1 }),
      rule({ id: "b", category: "preflop" }),
      rule({ id: "c", category: "river", times_seen: 4 }),
      rule({ id: "d", category: "river", times_seen: 9, status: "fixed" }),
    ]);
    expect(g.map((x) => x.category)).toEqual(["preflop", "river"]);
    expect(g[1]!.rules.map((r) => r.id)).toEqual(["c", "a", "d"]);
  });

  it("rule of the day: stable per day, prefers open leaks, null when empty", () => {
    const rules = [
      rule({ id: "a" }),
      rule({ id: "b", status: "fixed" }),
      rule({ id: "c", times_seen: 3 }),
    ];
    const today = ruleOfTheDay(rules, "2026-11-26");
    expect(today).toBe(ruleOfTheDay(rules, "2026-11-26"));
    expect(today!.status).toBe("working");
    const seen = new Set(
      Array.from(
        { length: 30 },
        (_, i) => ruleOfTheDay(rules, `2026-12-${String(i + 1).padStart(2, "0")}`)!.id,
      ),
    );
    expect(seen).toEqual(new Set(["a", "c"]));
    expect(ruleOfTheDay([], "2026-11-26")).toBeNull();
    expect(ruleOfTheDay([rule({ id: "z", status: "fixed" })], "2026-11-26")!.id).toBe("z");
  });
});

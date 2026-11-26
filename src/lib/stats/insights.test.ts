import { describe, expect, it } from "vitest";
import { makeSession } from "@/lib/test/factories";
import { breakdown } from "./stats";
import { ratingInsight } from "./insights";

const T =
  "Your {worst}-game sessions {worstVerb} {worstRate}/hr; {best}-game sessions {bestVerb} {bestRate}/hr.";
const fmt = (m: number) => `$${m / 100}`;

describe("ratingInsight", () => {
  it("compares the best and worst rated groups", () => {
    const sessions = [
      makeSession({ game_rating: "A", buy_in_minor: 10000, cash_out_minor: 21200, hours: 4 }),
      makeSession({ game_rating: "A", buy_in_minor: 10000, cash_out_minor: 21200, hours: 4 }),
      makeSession({ game_rating: "C", buy_in_minor: 20000, cash_out_minor: 3600, hours: 4 }),
      makeSession({ game_rating: "C", buy_in_minor: 20000, cash_out_minor: 3600, hours: 4 }),
    ];
    const rows = breakdown(sessions, (s) => s.game_rating, "USD");
    expect(ratingInsight(rows, T, fmt)).toBe(
      "Your C-game sessions lose $41/hr; A-game sessions win $28/hr.",
    );
  });

  it("needs two groups with at least two sessions each", () => {
    const rows = breakdown(
      [makeSession({ game_rating: "A", hours: 2 })],
      (s) => s.game_rating,
      "USD",
    );
    expect(ratingInsight(rows, T, fmt)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { dailyHands } from "@/content/daily-hands";
import { parseCards } from "@/lib/poker/cards";
import { dailyHandStreak, spotIndexFor, withDailyAnswer } from "./daily-hand";

describe("daily hand", () => {
  it("rotates one spot per day", () => {
    const a = spotIndexFor("2026-11-26", 30);
    expect(spotIndexFor("2026-11-27", 30)).toBe((a + 1) % 30);
    expect(spotIndexFor("2026-12-26", 30)).toBe(a);
  });

  it("counts a streak through today or yesterday", () => {
    const ans = { "2026-11-24": 1, "2026-11-25": 1 };
    expect(dailyHandStreak(ans, "2026-11-26")).toBe(2);
    expect(dailyHandStreak({ ...ans, "2026-11-26": 1 }, "2026-11-26")).toBe(3);
    expect(dailyHandStreak(ans, "2026-11-27")).toBe(0);
  });

  it("keeps 90 days of answers", () => {
    let all: Record<string, number> = {};
    for (let i = 0; i < 100; i++)
      all = withDailyAnswer(
        all,
        `2026-0${1 + Math.floor(i / 28)}-${String((i % 28) + 1).padStart(2, "0")}`,
        i,
      );
    expect(Object.keys(all)).toHaveLength(90);
  });

  it("seed spots are well-formed and unapproved", () => {
    expect(dailyHands).toHaveLength(30);
    for (const h of dailyHands) {
      expect(h.approved).toBe(false);
      expect(h.answer).toBeLessThan(h.options.length);
      expect(h.cards).toHaveLength(4);
      expect(parseCards(h.cards + h.board)).toHaveLength(2 + h.board.length / 2);
    }
    expect(new Set(dailyHands.map((h) => h.id)).size).toBe(30);
  });
});

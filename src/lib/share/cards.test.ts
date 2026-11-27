import { describe, expect, it } from "vitest";
import { SHARE_MARK, SHARE_SIZE, shareContent } from "./cards";

describe("share cards", () => {
  it("has story and post sizes", () => {
    expect(SHARE_SIZE.story).toEqual({ w: 1080, h: 1920 });
    expect(SHARE_SIZE.post).toEqual({ w: 1080, h: 1350 });
  });

  it("streak card always carries the mark", () => {
    const c = shareContent({ kind: "streak", days: 30, longest: 30 }, false);
    expect(c).toMatchObject({ big: "30", unit: "day streak", mark: SHARE_MARK });
    expect(c.lines[0]).toBe("New personal best");
  });

  it("hide amounts removes every money figure", () => {
    const ladder = {
      kind: "ladder" as const,
      stake: "2/5",
      ladder: "Live cash",
      bankroll: "$15,000",
    };
    expect(shareContent(ladder, false).lines.join(" ")).toContain("$15,000");
    expect(shareContent(ladder, true).lines.join(" ")).not.toContain("$");
    const goal = {
      kind: "goal" as const,
      title: "Reach $10k bankroll",
      value: "$6,400 of $10,000",
      percent: 64,
    };
    expect(shareContent(goal, true).lines.join(" ")).not.toContain("6,400");
    expect(shareContent(goal, true).unit).toBe("Reach bankroll");
    expect(shareContent(goal, false).big).toBe("64%");
  });

  it("year card hides money when asked", () => {
    const y = {
      kind: "year" as const,
      year: "2027",
      hours: 412,
      net: "+$8,240",
      hourly: "+$20",
      winRate: 0.61,
    };
    expect(shareContent(y, false).lines[0]).toBe("+$8,240 · +$20/h");
    expect(shareContent(y, true).lines.join(" ")).not.toContain("$");
    expect(shareContent(y, true).big).toBe("412h");
  });
});

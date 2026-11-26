import { describe, expect, it } from "vitest";
import { formatClock, formatDuration } from "./timer";

describe("timer formatting", () => {
  it("formats clocks and durations", () => {
    expect(formatClock(0)).toBe("0:00:00");
    expect(formatClock(3 * 3_600_000 + 7 * 60_000 + 42_000)).toBe("3:07:42");
    expect(formatDuration(4 * 3_600_000 + 10 * 60_000)).toBe("4h 10m");
    expect(formatDuration(45 * 60_000)).toBe("45m");
  });
});

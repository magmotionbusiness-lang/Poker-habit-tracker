import { describe, expect, it } from "vitest";
import {
  addDays,
  dateRange,
  diffDays,
  isoWeekday,
  localDate,
  localHour,
  startOfWeek,
} from "./dates";

describe("localDate", () => {
  it("uses the user's timezone, not UTC", () => {
    const at = "2026-11-26T23:30:00Z";
    expect(localDate(at, "UTC")).toBe("2026-11-26");
    expect(localDate(at, "Europe/Budapest")).toBe("2026-11-27"); // UTC+1
    expect(localDate(at, "America/Los_Angeles")).toBe("2026-11-26");
    expect(localDate("2026-11-26T03:00:00Z", "America/Los_Angeles")).toBe("2026-11-25");
  });

  it("handles DST transitions (Europe spring forward / fall back)", () => {
    // 2026-03-29 01:00 UTC clocks jump 02:00 → 03:00 in Budapest
    expect(localDate("2026-03-28T22:59:00Z", "Europe/Budapest")).toBe("2026-03-28");
    expect(localDate("2026-03-28T23:00:00Z", "Europe/Budapest")).toBe("2026-03-29");
    expect(localHour("2026-03-29T01:00:00Z", "Europe/Budapest")).toBe(3);
    // 2026-10-25 01:00 UTC clocks fall back 03:00 → 02:00
    expect(localDate("2026-10-24T21:59:00Z", "Europe/Budapest")).toBe("2026-10-24");
    expect(localDate("2026-10-24T22:00:00Z", "Europe/Budapest")).toBe("2026-10-25");
    expect(localDate("2026-10-25T22:59:00Z", "Europe/Budapest")).toBe("2026-10-25");
    expect(localDate("2026-10-25T23:00:00Z", "Europe/Budapest")).toBe("2026-10-26");
  });

  it("handles a late-night session for a traveller (same instant, two zones)", () => {
    const at = "2026-07-10T04:30:00Z";
    expect(localDate(at, "America/New_York")).toBe("2026-07-10"); // 00:30 EDT
    expect(localDate(at, "America/Los_Angeles")).toBe("2026-07-09");
  });
});

describe("date arithmetic", () => {
  it("adds days across month, year and DST boundaries", () => {
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
  it("diffs, ranges and weekdays", () => {
    expect(diffDays("2026-10-20", "2026-10-27")).toBe(7);
    expect(dateRange("2026-11-29", "2026-12-02")).toEqual([
      "2026-11-29",
      "2026-11-30",
      "2026-12-01",
      "2026-12-02",
    ]);
    expect(dateRange("2026-12-02", "2026-11-29")).toEqual([]);
    expect(isoWeekday("2026-11-26")).toBe(4); // Thursday
    expect(isoWeekday("2026-11-29")).toBe(7); // Sunday
    expect(startOfWeek("2026-11-29")).toBe("2026-11-23");
  });
  it("rejects malformed dates", () => {
    expect(() => addDays("26-11-2026", 1)).toThrow();
  });
});

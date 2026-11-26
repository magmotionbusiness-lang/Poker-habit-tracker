import { describe, expect, it } from "vitest";
import { inQuietHours, isReminderDue, reminderBody } from "./reminders";

const base = {
  timezone: "Europe/Budapest",
  reminderTimes: ["19:00"],
  quietStart: "22:30",
  quietEnd: "08:00",
  lastRemindedOn: null,
};

describe("quiet hours", () => {
  it("handles windows that wrap midnight", () => {
    expect(inQuietHours("23:00", "22:30", "08:00")).toBe(true);
    expect(inQuietHours("07:59", "22:30", "08:00")).toBe(true);
    expect(inQuietHours("08:00", "22:30", "08:00")).toBe(false);
    expect(inQuietHours("13:00", "12:00", "14:00")).toBe(true);
    expect(inQuietHours("13:00", "10:00", "10:00")).toBe(false);
  });
});

describe("isReminderDue", () => {
  it("is due after the local reminder time, in the user's timezone", () => {
    // 18:05 UTC = 19:05 in Budapest (winter, UTC+1)
    expect(isReminderDue(base, new Date("2026-11-26T18:05:00Z"))).toEqual({
      due: true,
      today: "2026-11-26",
    });
    expect(isReminderDue(base, new Date("2026-11-26T17:55:00Z")).due).toBe(false);
  });
  it("tolerates a late scheduler but sends only once a day", () => {
    expect(isReminderDue(base, new Date("2026-11-26T20:40:00Z")).due).toBe(true); // 21:40 local
    expect(
      isReminderDue({ ...base, lastRemindedOn: "2026-11-26" }, new Date("2026-11-26T20:40:00Z"))
        .due,
    ).toBe(false);
  });
  it("never sends in quiet hours", () => {
    expect(isReminderDue(base, new Date("2026-11-26T22:00:00Z")).due).toBe(false); // 23:00 local
  });
  it("respects DST (summer: UTC+2)", () => {
    expect(isReminderDue(base, new Date("2026-07-10T17:05:00Z")).due).toBe(true); // 19:05 CEST
    expect(isReminderDue(base, new Date("2026-07-10T16:55:00Z")).due).toBe(false); // 18:55 CEST
  });
  it("is never due without a reminder time", () => {
    expect(
      isReminderDue({ ...base, reminderTimes: [] }, new Date("2026-11-26T18:05:00Z")).due,
    ).toBe(false);
  });
});

describe("reminderBody", () => {
  it("pluralises", () => {
    const t = { one: "{n} habit left today.", many: "{n} habits left today." };
    expect(reminderBody(1, t)).toBe("1 habit left today.");
    expect(reminderBody(3, t)).toBe("3 habits left today.");
  });
});

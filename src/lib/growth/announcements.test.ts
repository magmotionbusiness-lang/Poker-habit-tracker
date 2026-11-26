import { describe, expect, it } from "vitest";
import { activeAnnouncements, type Announcement, countdownParts } from "./announcements";

const now = Date.parse("2026-11-26T12:00:00Z");
const a = (o: Partial<Announcement>): Announcement => ({
  id: "x",
  type: "workshop",
  title: "T",
  body: null,
  image_url: null,
  starts_at: "2026-11-28T18:00:00Z",
  ends_at: null,
  cta_label: null,
  cta_url: null,
  audience: "everyone",
  priority: "normal",
  ...o,
});

describe("announcements", () => {
  it("shows upcoming within 30 days, live until it ends, then hides", () => {
    expect(activeAnnouncements([a({})], now, null)[0]!.phase).toBe("upcoming");
    expect(activeAnnouncements([a({ starts_at: "2027-02-01T00:00:00Z" })], now, null)).toEqual([]);
    expect(
      activeAnnouncements([a({ starts_at: "2026-11-26T11:00:00Z" })], now, null)[0]!.phase,
    ).toBe("live");
    expect(activeAnnouncements([a({ starts_at: "2026-11-26T09:00:00Z" })], now, null)).toEqual([]); // 2h default run
    expect(
      activeAnnouncements(
        [a({ starts_at: "2026-11-20T00:00:00Z", ends_at: "2026-12-01T00:00:00Z" })],
        now,
        null,
      )[0]!.phase,
    ).toBe("live");
  });

  it("filters by audience and dismissals, sorts by priority then start", () => {
    const list = [
      a({ id: "s", audience: "students" }),
      a({ id: "n", audience: "non_students", starts_at: "2026-11-29T00:00:00Z" }),
      a({ id: "h", priority: "high", starts_at: "2026-12-05T00:00:00Z" }),
      a({ id: "e" }),
    ];
    expect(activeAnnouncements(list, now, null).map((x) => x.id)).toEqual(["h", "e", "n"]);
    expect(activeAnnouncements(list, now, "student").map((x) => x.id)).toEqual(["h", "s", "e"]);
    expect(
      activeAnnouncements(list, now, null, { "ann:h": "2026-11-26" }).map((x) => x.id),
    ).toEqual(["e", "n"]);
  });

  it("splits a countdown", () => {
    expect(countdownParts(2 * 86_400_000 + 3 * 3_600_000 + 4 * 60_000 + 5_000)).toEqual({
      d: 2,
      h: 3,
      m: 4,
      s: 5,
    });
    expect(countdownParts(-5)).toEqual({ d: 0, h: 0, m: 0, s: 0 });
  });
});

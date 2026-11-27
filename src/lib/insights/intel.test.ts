import { describe, expect, it } from "vitest";
import { makeSession } from "@/lib/test/factories";
import { forecast, riskBand, riskOfRuin, sessionMoments, sessionsPerMonth } from "./bankroll-intel";
import { journey, monthReport, sessionReport, yearInPoker } from "./reports";
import { maxBuyIn, playingTonight, usualGame } from "./smart-defaults";
import { tiltSignals } from "./tilt-guard";

const ctx = { currency: "USD", rates: {}, tz: "UTC" };
const at = (d: string, h = 19) => `${d}T${String(h).padStart(2, "0")}:00:00.000Z`;

describe("bankroll intelligence", () => {
  it("risk of ruin follows exp(-2·μ·B/σ²)", () => {
    // μ = 50, σ = 500, B = 5000 → exp(-2·50·5000/250000) = exp(-2) ≈ 0.1353
    expect(riskOfRuin(5000, 50, 500)).toBeCloseTo(Math.exp(-2), 6);
    expect(riskOfRuin(5000, -10, 500)).toBe(1);
    expect(riskBand(0.004)).toBe("very low");
    expect(riskBand(0.13)).toBe("moderate");
  });

  it("session moments use the sample SD", () => {
    expect(sessionMoments([100, -100, 300])).toEqual({ mean: 100, sd: 200 });
    expect(sessionMoments([1])).toBeNull();
  });

  it("forecast is deterministic, ordered, and centred on the expected drift", () => {
    const results = [200, -100, 300, -200, 100, 50, -50, 150];
    const f = forecast(10_000, results, 30)!;
    expect(f).toEqual(forecast(10_000, results, 30));
    expect(f.conservative).toBeLessThan(f.expected);
    expect(f.expected).toBeLessThan(f.strong);
    // mean 56.25 × 30 sessions ≈ +1687 → median near 11,687
    expect(Math.abs(f.expected - 11_687)).toBeLessThan(400);
    expect(forecast(10_000, [1, 2], 30)).toBeNull();
  });

  it("sessions per month from the last 90 days", () => {
    const now = Date.parse("2026-11-27T00:00:00Z");
    const starts = Array.from({ length: 24 }, (_, i) =>
      new Date(now - i * 3 * 86_400_000).toISOString(),
    );
    expect(sessionsPerMonth(starts, now)).toBe(8); // 24 sessions in 90 days
  });

  it("bankroll rule → max buy-in", () => {
    expect(maxBuyIn(200_000, 20)).toBe(10_000);
  });
});

describe("tilt guard", () => {
  const hist = Array.from({ length: 6 }, (_, i) =>
    makeSession({
      id: `h${i}`,
      hours: 3,
      stakes_bb_minor: 200,
      started_at: at(`2026-11-0${i + 1}`),
    }),
  );
  const fmt = (ms: number) => `${Math.round(ms / 3_600_000)}h`;

  it("flags rebuys, a long session, a higher stake and a deep loss — neutrally", () => {
    const now = Date.parse("2026-11-20T23:30:00Z");
    const s = makeSession({
      id: "live",
      status: "running",
      started_at: "2026-11-20T16:00:00Z",
      buy_in_minor: 30_000,
      rebuys_minor: 60_000,
      stakes_bb_minor: 500,
    });
    const ids = tiltSignals(s, hist, now, "UTC", 0, fmt).map((x) => x.id);
    expect(ids).toEqual(expect.arrayContaining(["rebuys", "length", "stake", "down"]));
    const text = tiltSignals(s, hist, now, "UTC", 0, fmt)
      .map((x) => x.text)
      .join(" ");
    expect(text).toContain("You've bought in 3 times");
    expect(text).toContain("Your normal session is 3h. You're at 8h.");
    expect(text).not.toMatch(/tilt/i);
  });

  it("stays quiet in a normal session", () => {
    const now = Date.parse("2026-11-20T18:00:00Z");
    const s = makeSession({
      id: "live",
      status: "running",
      started_at: "2026-11-20T16:00:00Z",
      buy_in_minor: 20_000,
      stakes_bb_minor: 200,
    });
    expect(tiltSignals(s, hist, now, "UTC", 22_000, fmt)).toEqual([]);
  });
});

describe("smart defaults", () => {
  it("learns the usual game and median buy-in", () => {
    const s = [
      makeSession({ id: "1", venue_id: "v1", buy_in_minor: 20_000, started_at: at("2026-11-01") }),
      makeSession({ id: "2", venue_id: "v1", buy_in_minor: 30_000, started_at: at("2026-11-02") }),
      makeSession({ id: "3", venue_id: "v1", buy_in_minor: 20_000, started_at: at("2026-11-03") }),
      makeSession({ id: "4", venue_id: "v2", buy_in_minor: 50_000, started_at: at("2026-11-04") }),
    ];
    expect(usualGame(s)).toMatchObject({ venue_id: "v1", buy_in_minor: 20_000, count: 3 });
  });

  it("suggests 'playing tonight?' before the usual start on the usual weekday", () => {
    // Fridays (2026-11-06, 13, 20) at 20:00; now = Friday 27th 18:30.
    const s = ["2026-11-06", "2026-11-13", "2026-11-20"].map((d, i) =>
      makeSession({ id: `f${i}`, started_at: at(d, 20) }),
    );
    expect(playingTonight(s, Date.parse("2026-11-27T18:30:00Z"), "UTC")).toEqual({
      usualHour: 20,
      times: 3,
    });
    expect(playingTonight(s, Date.parse("2026-11-27T12:00:00Z"), "UTC")).toBeNull();
    expect(playingTonight(s, Date.parse("2026-11-26T19:00:00Z"), "UTC")).toBeNull(); // Thursday
  });
});

describe("reports", () => {
  const s = [
    makeSession({
      id: "a",
      buy_in_minor: 20_000,
      cash_out_minor: 30_000,
      hours: 4,
      started_at: at("2026-10-05"),
    }),
    makeSession({
      id: "b",
      buy_in_minor: 20_000,
      cash_out_minor: 10_000,
      hours: 2,
      started_at: at("2026-10-12"),
    }),
    makeSession({
      id: "c",
      buy_in_minor: 20_000,
      cash_out_minor: 40_000,
      hours: 4,
      started_at: at("2026-11-03"),
    }),
    makeSession({
      id: "d",
      buy_in_minor: 20_000,
      cash_out_minor: 25_000,
      hours: 4,
      started_at: at("2026-11-10"),
    }),
  ];

  it("session report: hourly, badges, variance note", () => {
    const now = Date.parse("2026-11-12T00:00:00Z");
    const win = makeSession({
      id: "w",
      buy_in_minor: 20_000,
      cash_out_minor: 50_000,
      hours: 3,
      started_at: at("2026-11-11"),
    });
    const r = sessionReport(win, [...s, win], ctx, now);
    expect(r.result).toBe(30_000);
    expect(r.hourly).toBe(10_000);
    expect(r.badges).toContain("Best result this month");
    expect(r.varianceNote).toBeNull();
    const loss = makeSession({
      id: "l",
      buy_in_minor: 20_000,
      cash_out_minor: 0,
      hours: 3,
      started_at: at("2026-11-11"),
    });
    expect(sessionReport(loss, [...s, loss], ctx, now).varianceNote).toMatch(/Judge the decisions/);
  });

  it("month report compares with the previous month", () => {
    const m = monthReport(s, "2026-11", ctx);
    expect(m.stats.net).toBe(25_000);
    expect(m.prev!.net).toBe(0);
    expect(m.delta.hours).toBe(33); // 8h vs 6h
  });

  it("journey: totals, best month, streaks, cumulative timeline", () => {
    const j = journey(s, ctx);
    expect(j).toMatchObject({
      sessions: 4,
      net: 25_000,
      longestWinningStreak: 2,
      longestLosingStreak: 1,
    });
    expect(j.bestMonth).toEqual({ month: "2026-11", net: 25_000 });
    expect(j.timeline).toEqual([
      { month: "2026-10", cumulative: 0, sessions: 2 },
      { month: "2026-11", cumulative: 25_000, sessions: 2 },
    ]);
  });

  it("year in poker", () => {
    const y = yearInPoker(s, "2026", ctx);
    expect(y).toMatchObject({
      sessions: 4,
      net: 25_000,
      bestMonth: "2026-11",
      mostPlayedStake: "1/2",
    });
    expect(y.longestSessionMs).toBe(4 * 3_600_000);
  });
});

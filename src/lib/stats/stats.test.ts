import { describe, expect, it } from "vitest";
import { makeSession } from "@/lib/test/factories";
import {
  breakdown,
  computeStats,
  filterSessions,
  lengthBucket,
  sampleLevel,
  timeOfDay,
} from "./stats";
import {
  resultIn,
  sessionCosts,
  sessionDurationMs,
  sessionResult,
  stakesLabel,
} from "./session-math";

/*
 * Hand-calculated reference ("the spreadsheet"):
 *  #  type                         in            out              result   hours  bb
 *  1  live 1/2 cash               300.00        512.00           +212.00    4   +106
 *  2  live 1/2 cash  (rebuy 200)  200+200         0.00           −400.00    2   −200
 *  3  live 1/2 cash               300.00        345.00            +45.00    6   +22.5
 *  4  online NL50, 300 hands       50.00         75.00            +25.00    1   +50  → 16.67 bb/100
 *  5  MTT 100+10, 120th/400       110.00          0.00           −110.00    5
 *  6  MTT 100+10, 9th/400         110.00    450 + 50 bty         +390.00    7
 *  net = +162.00 over 25h → $6.48/h · win rate 4/6 · live bb/h = −71.5/12 = −5.96
 *  ROI = 280/220 = 127.27% · ITM 1/2 · avg finish 64.5 · avg buy-in 110.00
 *  sample SD of results = sqrt(3,674,200,000 / 5) = 27,107.9 → 27,108 minor
 */
const sheet = [
  makeSession({ buy_in_minor: 30000, cash_out_minor: 51200, hours: 4 }),
  makeSession({ buy_in_minor: 20000, rebuys_minor: 20000, cash_out_minor: 0, hours: 2 }),
  makeSession({ buy_in_minor: 30000, cash_out_minor: 34500, hours: 6 }),
  makeSession({
    is_live: false,
    stakes_sb_minor: 25,
    stakes_bb_minor: 50,
    buy_in_minor: 5000,
    cash_out_minor: 7500,
    hands_played: 300,
    hours: 1,
  }),
  makeSession({
    format: "mtt",
    stakes_sb_minor: null,
    stakes_bb_minor: null,
    buy_in_minor: 10000,
    fees_minor: 1000,
    finish_position: 120,
    field_size: 400,
    hours: 5,
  }),
  makeSession({
    format: "mtt",
    stakes_sb_minor: null,
    stakes_bb_minor: null,
    buy_in_minor: 10000,
    fees_minor: 1000,
    prize_minor: 45000,
    bounties_minor: 5000,
    finish_position: 9,
    field_size: 400,
    hours: 7,
  }),
];

describe("session maths", () => {
  it("computes results and costs", () => {
    expect(sheet.map(sessionResult)).toEqual([21200, -40000, 4500, 2500, -11000, 39000]);
    const s = makeSession({
      tips_minor: 1500,
      expenses: [
        { kind: "food", amount_minor: 2000 },
        { kind: "travel", amount_minor: 800 },
      ],
    });
    expect(sessionCosts(s)).toBe(4300);
  });
  it("subtracts pauses and counts running sessions up to now", () => {
    const s = makeSession({ hours: 3, paused_ms: 30 * 60_000 });
    expect(sessionDurationMs(s)).toBe(2.5 * 3_600_000);
    const running = makeSession({ status: "running", started_at: "2026-11-26T10:00:00Z" });
    expect(sessionDurationMs(running, Date.parse("2026-11-26T11:30:00Z"))).toBe(1.5 * 3_600_000);
    const paused = { ...running, paused_at: "2026-11-26T11:00:00Z" };
    expect(sessionDurationMs(paused, Date.parse("2026-11-26T11:30:00Z"))).toBe(3_600_000);
  });
  it("labels stakes", () => {
    expect(stakesLabel(sheet[0]!)).toBe("1/2");
    expect(stakesLabel(sheet[3]!)).toBe("0.25/0.50");
    expect(
      stakesLabel(
        makeSession({ stakes_sb_minor: 200, stakes_bb_minor: 500, straddle_minor: 1000 }),
      ),
    ).toBe("2/5 (10)");
    expect(stakesLabel(sheet[4]!)).toBe("100+10");
  });
  it("converts with explicit rates or reports missing", () => {
    const eur = makeSession({ currency: "EUR", buy_in_minor: 10000, cash_out_minor: 20000 });
    expect(resultIn(eur, "USD", { "EUR:USD": "1.10" })).toBe(11000);
    expect(resultIn(eur, "USD")).toBeNull();
  });
});

describe("computeStats", () => {
  const st = computeStats(sheet, "USD");
  it("matches the hand-calculated sheet", () => {
    expect(st.sessions).toBe(6);
    expect(st.net).toBe(16200);
    expect(st.hours).toBe(25);
    expect(st.hourly).toBe(648);
    expect(st.winRate).toBeCloseTo(4 / 6, 10);
    expect(st.biggestWin).toBe(39000);
    expect(st.biggestLoss).toBe(-40000);
    expect(st.stdDev).toBe(27108);
    expect(st.bbPerHour).toBe(-5.96);
    expect(st.bbPer100).toBe(16.67);
    expect(st.roi).toBe(1.2727);
    expect(st.itm).toBe(0.5);
    expect(st.avgFinish).toBe(64.5);
    expect(st.avgBuyIn).toBe(11000);
    expect(st.tournaments).toBe(2);
    expect(st.sample).toBe("tiny");
  });
  it("excludes (and counts) sessions it can't convert", () => {
    const withEur = [
      ...sheet,
      makeSession({ currency: "EUR", buy_in_minor: 100, cash_out_minor: 200 }),
    ];
    const r = computeStats(withEur, "USD");
    expect(r.sessions).toBe(6);
    expect(r.excluded).toBe(1);
    expect(computeStats(withEur, "USD", { "EUR:USD": "2" }).net).toBe(16200 + 200);
  });
  it("can subtract tips and expenses", () => {
    const s = [makeSession({ buy_in_minor: 10000, cash_out_minor: 15000, tips_minor: 500 })];
    expect(computeStats(s, "USD").net).toBe(5000);
    expect(computeStats(s, "USD", {}, { includeCosts: true }).net).toBe(4500);
  });
  it("handles empty input and ignores running sessions", () => {
    const e = computeStats([makeSession({ status: "running" })], "USD");
    expect(e).toMatchObject({
      sessions: 0,
      net: 0,
      hourly: null,
      winRate: null,
      stdDev: null,
      sample: "none",
    });
  });
});

describe("filters & grouping", () => {
  it("filters by format, live/online, stakes, tags, rating", () => {
    const tagged = makeSession({
      tags: ["crown"],
      game_rating: "A",
      buy_in_minor: 100,
      cash_out_minor: 300,
    });
    const all = [...sheet, tagged];
    expect(filterSessions(all, { formats: ["mtt"] }, "UTC")).toHaveLength(2);
    expect(filterSessions(all, { live: false }, "UTC")).toHaveLength(1); // MTT fixtures are live
    expect(filterSessions(all, { stakes: ["1/2"] }, "UTC")).toHaveLength(4);
    expect(filterSessions(all, { tags: ["crown"] }, "UTC")).toEqual([tagged]);
    expect(filterSessions(all, { gameRatings: ["A"] }, "UTC")).toEqual([tagged]);
  });
  it("filters dates in the user's timezone", () => {
    const late = makeSession({ started_at: "2026-11-02T23:30:00Z" });
    expect(filterSessions([late], { from: "2026-11-03" }, "Europe/Budapest")).toHaveLength(1);
    expect(filterSessions([late], { from: "2026-11-03" }, "UTC")).toHaveLength(0);
  });
  it("buckets time of day and length", () => {
    expect([3, 9, 14, 20, 23].map(timeOfDay)).toEqual([
      "night",
      "morning",
      "afternoon",
      "evening",
      "night",
    ]);
    expect([1, 3, 5, 9].map((h) => lengthBucket(h * 3_600_000))).toEqual([
      "lt2",
      "2to4",
      "4to6",
      "6plus",
    ]);
    expect([0, 6, 12, 40].map(sampleLevel)).toEqual(["none", "tiny", "small", "ok"]);
  });
  it("breaks down hourly by A/B/C game", () => {
    const sessions = [
      makeSession({ game_rating: "A", buy_in_minor: 10000, cash_out_minor: 21200, hours: 4 }), // +28/h
      makeSession({ game_rating: "C", buy_in_minor: 20000, cash_out_minor: 3600, hours: 4 }), // −41/h
    ];
    const b = breakdown(sessions, (s) => s.game_rating, "USD");
    expect(b.map((x) => [x.key, x.stats.hourly])).toEqual([
      ["A", 2800],
      ["C", -4100],
    ]);
  });
});

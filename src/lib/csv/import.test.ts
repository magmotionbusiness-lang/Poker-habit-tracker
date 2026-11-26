import { describe, expect, it } from "vitest";
import { zonedToUtc } from "@/lib/dates/dates";
import { sessionResult } from "@/lib/stats/session-math";
import {
  detectDateOrder,
  guessMapping,
  importKey,
  parseCsv,
  parseDate,
  parseHours,
  parseStakes,
  rowsToSessions,
} from "./import";

const opts = {
  currency: "USD",
  bankroll_id: "br1",
  tz: "Europe/Budapest",
  dateOrder: "dmy" as const,
  defaultLive: true,
};

describe("csv import", () => {
  it("parses quotes, escaped quotes, CRLF and semicolons", () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\r\n\r\n')).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"'],
    ]);
    expect(parseCsv("date;profit\n01/02/2026;-50,5")).toEqual([
      ["date", "profit"],
      ["01/02/2026", "-50,5"],
    ]);
  });

  it("guesses a mapping from common headers", () => {
    const m = guessMapping(["Date", "Venue", "Stakes", "Buy-in", "Cash out", "Hours", "Notes"]);
    expect(m).toEqual({ date: 0, venue: 1, stakes: 2, buy_in: 3, cash_out: 4, hours: 5, notes: 6 });
    expect(guessMapping(["Day", "Result", "Duration"])).toMatchObject({
      date: 0,
      profit: 1,
      hours: 2,
    });
  });

  it("reads dates, hours and stakes", () => {
    expect(detectDateOrder(["13/02/2026"])).toBe("dmy");
    expect(detectDateOrder(["02/13/2026"])).toBe("mdy");
    expect(detectDateOrder(["2026-02-13"])).toBe("ymd");
    expect(parseDate("02/03/26", "dmy")).toBe("2026-03-02");
    expect(parseDate("02/03/26", "mdy")).toBe("2026-02-03");
    expect(parseDate("31/31/2026", "dmy")).toBeNull();
    expect(parseHours("4:30")).toBe(4.5);
    expect(parseHours("4,5")).toBe(4.5);
    expect(parseHours("90min")).toBe(1.5);
    expect(parseStakes("$1/$2", "USD")).toEqual({ sb: 100, bb: 200 });
    expect(parseStakes("NL50", "USD")).toEqual({ sb: 25, bb: 50 });
    expect(parseStakes("0.25/0.50", "EUR")).toEqual({ sb: 25, bb: 50 });
  });

  it("converts local wall time to UTC across DST", () => {
    expect(zonedToUtc("2026-07-01", "19:00", "Europe/Budapest").toISOString()).toBe(
      "2026-07-01T17:00:00.000Z",
    );
    expect(zonedToUtc("2026-01-15", "19:00", "Europe/Budapest").toISOString()).toBe(
      "2026-01-15T18:00:00.000Z",
    );
  });

  it("turns rows into finished sessions with exact results", () => {
    const rows = parseCsv(
      "Date,Time,Hours,Stakes,Buy-in,Cash out,Venue\n01/07/2026,20:00,4.5,1/2,300,512,Kings\n02/07/2026,,3,1/2,,,\nxx,,1,,100,0,",
    );
    const m = guessMapping(rows[0]!);
    const r = rowsToSessions(rows.slice(1), m, opts);
    expect(r.errors).toEqual([
      { row: 3, message: "Needs a result: buy-in + cash-out, or profit" },
      { row: 4, message: "Missing or unreadable date" },
    ]);
    const s = r.sessions[0]!;
    expect(s).toMatchObject({
      started_at: "2026-07-01T18:00:00.000Z",
      ended_at: "2026-07-01T22:30:00.000Z",
      stakes_bb_minor: 200,
      venue_name: "Kings",
      tags: ["imported"],
    });
    expect(sessionResult(s)).toBe(21_200);
  });

  it("profit-only rows and tournaments", () => {
    const rows = [
      ["2026-03-01", "-150.25", "MTT"],
      ["2026-03-02", "80", "cash"],
    ];
    const r = rowsToSessions(
      rows,
      { date: 0, profit: 1, format: 2 },
      { ...opts, dateOrder: "ymd" },
    );
    expect(r.sessions.map((s) => [s.format, sessionResult(s)])).toEqual([
      ["mtt", -15_025],
      ["cash", 8_000],
    ]);
    expect(importKey(r.sessions[0]!)).toBe(`${r.sessions[0]!.started_at}|15025|0|0`);
  });
});

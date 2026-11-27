import type { PokerSession } from "@/lib/domain/types";
import { isoWeekday, localDate } from "@/lib/dates/dates";
import { computeStats, type Stats } from "@/lib/stats/stats";
import { resultIn, sessionDurationMs, stakesLabel } from "@/lib/stats/session-math";

type Ctx = { currency: string; rates: Readonly<Record<string, string | number>>; tz: string };

const finishedOf = (s: readonly PokerSession[]) =>
  s.filter((x) => x.status === "finished").sort((a, b) => (a.started_at < b.started_at ? -1 : 1));
const net = (s: PokerSession, c: Ctx) => resultIn(s, c.currency, c.rates, true) ?? 0;

/* ---------- Session report (right after cash-out) ---------- */

export type SessionReport = {
  result: number;
  hourly: number | null;
  durationMs: number;
  /** % vs the player's 30-day hourly (null when not enough history). */
  vs30d: number | null;
  badges: string[];
  /** Shown on losing sessions: results ≠ decisions. */
  varianceNote: string | null;
};

export function sessionReport(
  s: PokerSession,
  all: readonly PokerSession[],
  c: Ctx,
  now: number,
): SessionReport {
  const result = net(s, c);
  const durationMs = sessionDurationMs(s);
  const hours = durationMs / 3_600_000;
  const hourly = hours > 0.05 ? Math.round(result / hours) : null;
  const others = finishedOf(all).filter((x) => x.id !== s.id);
  const last30 = others.filter((x) => Date.parse(x.started_at) >= now - 30 * 86_400_000);
  const st = computeStats(last30, c.currency, c.rates, { includeCosts: true });
  const vs30d =
    hourly !== null && st.hourly !== null && st.sessions >= 3 && st.hourly !== 0
      ? Math.round(((hourly - st.hourly) / Math.abs(st.hourly)) * 100)
      : null;
  const badges: string[] = [];
  const month = localDate(s.started_at, c.tz).slice(0, 7);
  const monthResults = others
    .filter((x) => localDate(x.started_at, c.tz).startsWith(month))
    .map((x) => net(x, c));
  if (result > 0 && monthResults.length >= 2 && result > Math.max(...monthResults))
    badges.push("Best result this month");
  const lifetime = others.map((x) => net(x, c));
  if (result > 0 && lifetime.length >= 10 && result > Math.max(...lifetime))
    badges.push("Biggest win ever");
  if (vs30d !== null && vs30d >= 25 && result > 0)
    badges.push(`${vs30d}% above your 30-day hourly`);
  const longest = Math.max(0, ...others.map((x) => sessionDurationMs(x)));
  if (others.length >= 5 && durationMs > longest) badges.push("Longest session yet");
  const varianceNote =
    result < 0
      ? "Losing sessions are part of every winning player's graph. Judge the decisions, not the result."
      : null;
  return { result, hourly, durationMs, vs30d, badges, varianceNote };
}

/* ---------- Monthly report ---------- */

export type MonthReport = {
  month: string; // "2026-11"
  stats: Stats;
  prev: Stats | null;
  delta: { net: number | null; hourly: number | null; hours: number | null };
  bestSession: number | null;
  worstSession: number | null;
  biggestLesson: string | null;
};

export function monthReport(sessions: readonly PokerSession[], month: string, c: Ctx): MonthReport {
  const fin = finishedOf(sessions);
  const inMonth = (m: string) => fin.filter((s) => localDate(s.started_at, c.tz).startsWith(m));
  const [y, m] = month.split("-").map(Number) as [number, number];
  const prevMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const cur = inMonth(month);
  const prv = inMonth(prevMonth);
  const stats = computeStats(cur, c.currency, c.rates, { includeCosts: true });
  const prev = prv.length ? computeStats(prv, c.currency, c.rates, { includeCosts: true }) : null;
  const ch = (a: number | null, b: number | null | undefined) =>
    a === null || b === null || b === undefined || b === 0
      ? null
      : Math.round(((a - b) / Math.abs(b)) * 100);
  const results = cur.map((s) => net(s, c));
  const losses = results.filter((r) => r < 0).sort((a, b) => a - b);
  const totalLoss = losses.reduce((a, b) => a + b, 0);
  const worst3 = losses.slice(0, 3).reduce((a, b) => a + b, 0);
  const biggestLesson =
    losses.length >= 5 && totalLoss < 0 && worst3 / totalLoss >= 0.5
      ? `Your 3 worst sessions made up ${Math.round((worst3 / totalLoss) * 100)}% of this month's losses. The downside is where your edge leaks.`
      : stats.hourly !== null && prev?.hourly != null && stats.hourly > prev.hourly
        ? "Your hourly improved on last month. Keep the same routine."
        : null;
  return {
    month,
    stats,
    prev,
    delta: {
      net: ch(stats.net, prev?.net),
      hourly: ch(stats.hourly, prev?.hourly),
      hours: ch(stats.hours, prev?.hours),
    },
    bestSession: results.length ? Math.max(...results) : null,
    worstSession: results.length ? Math.min(...results) : null,
    biggestLesson,
  };
}

/* ---------- The journey (personal poker story) ---------- */

export type Journey = {
  firstDate: string | null;
  sessions: number;
  hours: number;
  net: number;
  hourly: number | null;
  bestMonth: { month: string; net: number } | null;
  worstMonth: { month: string; net: number } | null;
  longestLosingStreak: number;
  longestWinningStreak: number;
  biggestWin: number | null;
  biggestLoss: number | null;
  /** Cumulative results at the end of each month (for the story timeline). */
  timeline: Array<{ month: string; cumulative: number; sessions: number }>;
};

export function journey(sessions: readonly PokerSession[], c: Ctx): Journey {
  const fin = finishedOf(sessions);
  const st = computeStats(fin, c.currency, c.rates, { includeCosts: true });
  const byMonth = new Map<string, { net: number; n: number }>();
  let run = 0;
  let lose = 0;
  let win = 0;
  let maxLose = 0;
  let maxWin = 0;
  for (const s of fin) {
    const r = net(s, c);
    const m = localDate(s.started_at, c.tz).slice(0, 7);
    const cur = byMonth.get(m) ?? { net: 0, n: 0 };
    byMonth.set(m, { net: cur.net + r, n: cur.n + 1 });
    if (r < 0) {
      lose++;
      win = 0;
    } else if (r > 0) {
      win++;
      lose = 0;
    }
    maxLose = Math.max(maxLose, lose);
    maxWin = Math.max(maxWin, win);
  }
  const months = [...byMonth.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  const timeline = months.map(([month, v]) => {
    run += v.net;
    return { month, cumulative: run, sessions: v.n };
  });
  const sortedM = [...months].sort((a, b) => b[1].net - a[1].net);
  return {
    firstDate: fin[0] ? localDate(fin[0].started_at, c.tz) : null,
    sessions: fin.length,
    hours: st.hours,
    net: st.net,
    hourly: st.hourly,
    bestMonth: sortedM[0] ? { month: sortedM[0][0], net: sortedM[0][1].net } : null,
    worstMonth:
      sortedM.length > 1 ? { month: sortedM.at(-1)![0], net: sortedM.at(-1)![1].net } : null,
    longestLosingStreak: maxLose,
    longestWinningStreak: maxWin,
    biggestWin: st.biggestWin,
    biggestLoss: st.biggestLoss,
    timeline,
  };
}

/* ---------- Year in poker (shareable) ---------- */

export type YearInPoker = {
  year: string;
  sessions: number;
  hours: number;
  net: number;
  hourly: number | null;
  winRate: number | null;
  bestMonth: string | null;
  mostPlayedStake: string | null;
  favoriteVenueId: string | null;
  bestWeekday: string | null;
  longestSessionMs: number;
  biggestWin: number | null;
};

const WD = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function yearInPoker(sessions: readonly PokerSession[], year: string, c: Ctx): YearInPoker {
  const fin = finishedOf(sessions).filter((s) => localDate(s.started_at, c.tz).startsWith(year));
  const st = computeStats(fin, c.currency, c.rates, { includeCosts: true });
  const top = <K>(f: (s: PokerSession) => K | null, score: (xs: PokerSession[]) => number) => {
    const g = new Map<K, PokerSession[]>();
    for (const s of fin) {
      const k = f(s);
      if (k !== null && k !== "") g.set(k, [...(g.get(k) ?? []), s]);
    }
    return [...g.entries()].sort((a, b) => score(b[1]) - score(a[1]))[0]?.[0] ?? null;
  };
  const sum = (xs: PokerSession[]) => xs.reduce((a, s) => a + net(s, c), 0);
  const month = top((s) => localDate(s.started_at, c.tz).slice(0, 7), sum);
  const wd = top((s) => isoWeekday(localDate(s.started_at, c.tz)), sum);
  return {
    year,
    sessions: fin.length,
    hours: st.hours,
    net: st.net,
    hourly: st.hourly,
    winRate: st.winRate,
    bestMonth: month,
    mostPlayedStake: top(
      (s) => (s.format === "cash" ? stakesLabel(s) : null),
      (xs) => xs.length,
    ),
    favoriteVenueId: top(
      (s) => s.venue_id,
      (xs) => xs.length,
    ),
    bestWeekday: wd ? WD[wd]! : null,
    longestSessionMs: Math.max(0, ...fin.map((s) => sessionDurationMs(s))),
    biggestWin: st.biggestWin,
  };
}

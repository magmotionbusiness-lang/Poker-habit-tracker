import type { Hand, PokerSession } from "@/lib/domain/types";
import { isoWeekday, localDate, localHour } from "@/lib/dates/dates";
import { breakdown, computeStats, lengthBucket, timeOfDay, type Stats } from "@/lib/stats/stats";
import { isTournament, resultIn, sessionDurationMs, stakesLabel } from "@/lib/stats/session-math";

/**
 * The insight engine: turns sessions and hands into a ranked list of plain-language
 * findings about THIS player ("Here's what I noticed"). Every insight carries a sample-size
 * confidence and is phrased as an association, never a cause. Pure + deterministic.
 */
export type Confidence = "low" | "medium" | "high";
export type InsightKind =
  | "aha"
  | "stake"
  | "weekday"
  | "time"
  | "length"
  | "venue"
  | "mood"
  | "rating"
  | "form"
  | "concentration"
  | "anomaly"
  | "position"
  | "tournament";

export type Insight = {
  id: string;
  kind: InsightKind;
  title: string;
  body: string;
  confidence: Confidence;
  /** Ranking weight: effect size × confidence. */
  score: number;
  /** A concrete next step ("the one thing"). */
  action?: string;
  tone: "good" | "warn" | "neutral";
};

export type InsightInput = {
  sessions: readonly PokerSession[];
  hands?: readonly Hand[];
  currency: string;
  rates: Readonly<Record<string, string | number>>;
  tz: string;
  now: number;
  venueName?: (id: string) => string | undefined;
  /** Minor units → "$24" (signed when asked). */
  fmt: (minor: number, signed?: boolean) => string;
};

export function confidenceFor(sessions: number, hours = sessions * 3): Confidence {
  if (sessions >= 30 && hours >= 80) return "high";
  if (sessions >= 10) return "medium";
  return "low";
}
const WEIGHT: Record<Confidence, number> = { low: 0.4, medium: 0.75, high: 1 };
export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  low: "Small sample",
  medium: "Moderate confidence",
  high: "High confidence",
};

const DAYS = [
  "",
  "Mondays",
  "Tuesdays",
  "Wednesdays",
  "Thursdays",
  "Fridays",
  "Saturdays",
  "Sundays",
];
const TIMES = {
  morning: "mornings",
  afternoon: "afternoons",
  evening: "evenings",
  night: "late nights",
} as const;
const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round(((a - b) / Math.abs(b)) * 100));

type Group = { key: string; stats: Stats & { hourly: number } };

function groups(
  sessions: readonly PokerSession[],
  key: (s: PokerSession) => string | null,
  i: InsightInput,
  min = 3,
): Group[] {
  return breakdown(sessions, key, i.currency, i.rates)
    .filter(
      (g): g is Group => g.stats.hourly !== null && g.stats.sessions >= min && g.stats.hours >= 3,
    )
    .sort((a, b) => b.stats.hourly - a.stats.hourly);
}

export function generateInsights(i: InsightInput): Insight[] {
  const finished = i.sessions.filter((s) => s.status === "finished");
  const cash = finished.filter((s) => !isTournament(s));
  const out: Insight[] = [];
  const lifetime = computeStats(cash, i.currency, i.rates);
  const h = (g: Group) => `${i.fmt(g.stats.hourly, true)}/h`;
  const push = (x: Omit<Insight, "score"> & { effect: number; n: number }) => {
    const { effect, n, ...rest } = x;
    out.push({
      ...rest,
      score: Math.min(1, Math.abs(effect)) * WEIGHT[rest.confidence] * (n > 0 ? 1 : 0),
    });
  };

  // "Aha" for new players: their first real number.
  if (finished.length >= 1 && finished.length < 10 && lifetime.hourly !== null) {
    push({
      id: "aha-hourly",
      kind: "aha",
      title: `You're averaging ${i.fmt(lifetime.hourly, true)}/hour`,
      body: `Across your first ${finished.length} session${finished.length === 1 ? "" : "s"} (${Math.round(lifetime.hours)}h). Keep logging — patterns about your game start showing after about 10 sessions.`,
      confidence: "low",
      tone: lifetime.hourly >= 0 ? "good" : "neutral",
      effect: 0.5,
      n: finished.length,
    });
  }

  const compare = (
    kind: InsightKind,
    gs: Group[],
    label: (k: string) => string,
    phrase: (best: Group, worst: Group) => { title: string; body: string; action?: string },
  ) => {
    if (gs.length < 2) return;
    const best = gs[0]!;
    const worst = gs.at(-1)!;
    if (best.stats.hourly <= worst.stats.hourly) return;
    const n = best.stats.sessions + worst.stats.sessions;
    const scale = Math.max(1, Math.abs(lifetime.hourly ?? 0), Math.abs(best.stats.hourly) / 2);
    const p = phrase(best, worst);
    push({
      id: `${kind}-${label(best.key)}`,
      kind,
      ...p,
      confidence: confidenceFor(n, best.stats.hours + worst.stats.hours),
      tone: "neutral",
      effect: (best.stats.hourly - worst.stats.hourly) / scale / 3,
      n,
    });
  };

  compare(
    "stake",
    groups(cash, (s) => stakesLabel(s) || null, i),
    (k) => k,
    (b, w) => ({
      title: `${b.key} is currently your strongest game`,
      body: `Your ${b.key} sessions are producing ${h(b)} vs ${h(w)} at ${w.key} (${b.stats.sessions} vs ${w.stats.sessions} sessions).`,
      action: `Make ${b.key} your default game this week.`,
    }),
  );

  compare(
    "weekday",
    groups(cash, (s) => DAYS[isoWeekday(localDate(s.started_at, i.tz))] ?? null, i),
    (k) => k,
    (b, w) => ({
      title: `${b.key} are your best days`,
      body: `${b.key} average ${h(b)}; ${w.key} ${h(w)}. Results are associated with when you play — not caused by the day itself.`,
    }),
  );

  compare(
    "time",
    groups(cash, (s) => TIMES[timeOfDay(localHour(Date.parse(s.started_at), i.tz))], i),
    (k) => k,
    (b, w) => ({
      title: `You do best in ${b.key}`,
      body: `Sessions started in ${b.key} average ${h(b)}; ${w.key} ${h(w)}${w.key === "late nights" ? ". Fatigue is a common reason late sessions underperform." : "."}`,
      action: w.key === "late nights" ? "Set a cut-off time for your next session." : undefined,
    }),
  );

  const LENGTH = { lt2: "under 2h", "2to4": "2–4h", "4to6": "4–6h", "6plus": "6h+" } as const;
  const lens = groups(cash, (s) => LENGTH[lengthBucket(sessionDurationMs(s))], i);
  if (lens.length >= 2) {
    const order = ["under 2h", "2–4h", "4–6h", "6h+"];
    const sorted = [...lens].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
    const peak = lens[0]!;
    const longer = sorted.filter((g) => order.indexOf(g.key) > order.indexOf(peak.key));
    const drop = longer.find((g) => g.stats.hourly < peak.stats.hourly * 0.6);
    if (drop) {
      const n = peak.stats.sessions + drop.stats.sessions;
      push({
        id: "length-drop",
        kind: "length",
        title: `Your results drop after ${peak.key.replace(/.*–|under /, "")}`,
        body: `${peak.key} sessions: ${h(peak)}. ${drop.key} sessions: ${h(drop)}.`,
        action: `Try a max session length of ${peak.key.replace(/.*–|under /, "")} next time.`,
        confidence: confidenceFor(n, peak.stats.hours + drop.stats.hours),
        tone: "warn",
        effect:
          (peak.stats.hourly - drop.stats.hourly) / Math.max(1, Math.abs(peak.stats.hourly)) / 2,
        n,
      });
    }
  }

  if (i.venueName)
    compare(
      "venue",
      groups(cash, (s) => (s.venue_id ? (i.venueName!(s.venue_id) ?? null) : null), i),
      (k) => k,
      (b, w) => ({
        title: `${b.key} is your most profitable room`,
        body: `${b.key}: ${h(b)}. ${w.key}: ${h(w)}.`,
      }),
    );

  compare(
    "mood",
    groups(
      cash,
      (s) =>
        s.mood == null ? null : s.mood >= 4 ? "good-mood" : s.mood <= 2 ? "frustrated" : null,
      i,
    ),
    (k) => k,
    (b, w) => ({
      title:
        w.key === "frustrated"
          ? "Frustrated sessions cost you"
          : "Your mood and results move together",
      body: `Sessions you rated ${b.key === "good-mood" ? "good/great" : "frustrated"} average ${h(b)}; ${w.key === "frustrated" ? "frustrated/tilted" : "good"} ones ${h(w)}. An association, not proof — but worth a stop rule.`,
      action: w.key === "frustrated" ? "When you feel frustrated, end the session." : undefined,
    }),
  );

  compare(
    "rating",
    groups(cash, (s) => (s.game_rating ? `${s.game_rating}-game` : null), i),
    (k) => k,
    (b, w) => ({
      title: `Your ${w.key} costs ${i.fmt(Math.round(b.stats.hourly - w.stats.hourly))}/h`,
      body: `${b.key}: ${h(b)}. ${w.key}: ${h(w)}. Your mental game is a measurable edge.`,
      action: "Use the warm-up before every session.",
    }),
  );

  // Form: last 10 vs lifetime, with variance education.
  const recent = [...cash].sort((a, b) => (a.started_at < b.started_at ? 1 : -1)).slice(0, 10);
  const rs = computeStats(recent, i.currency, i.rates);
  if (cash.length >= 15 && rs.hourly !== null && lifetime.hourly !== null) {
    const diff = pct(rs.hourly, lifetime.hourly);
    if (Math.abs(diff) >= 25) {
      const hot = rs.hourly > lifetime.hourly;
      push({
        id: `form-${hot ? "hot" : "cold"}`,
        kind: "form",
        title: hot ? "You're in form" : "A cold stretch",
        body: `Your last 10 sessions average ${i.fmt(rs.hourly, true)}/h vs ${i.fmt(lifetime.hourly, true)}/h lifetime. 10 sessions is mostly variance — ${hot ? "don't move up on a heater alone" : "your long-run numbers matter more than this run"}.`,
        confidence: "medium",
        tone: hot ? "good" : "neutral",
        effect: Math.min(1, Math.abs(diff) / 100),
        n: 10,
      });
    }
  }

  // Concentration: how much of the damage comes from the worst sessions.
  const results = finished
    .map((s) => resultIn(s, i.currency, i.rates, true))
    .filter((v): v is number => v !== null);
  const losses = results.filter((v) => v < 0).sort((a, b) => a - b);
  if (losses.length >= 12) {
    const total = losses.reduce((a, b) => a + b, 0);
    const worst = losses.slice(0, 5).reduce((a, b) => a + b, 0);
    const share = Math.round((worst / total) * 100);
    if (share >= 30)
      push({
        id: "concentration",
        kind: "concentration",
        title: `${share}% of your losses come from 5 sessions`,
        body: `Your results are being driven by your worst sessions, not your best. Protecting the downside (stop-loss, walking away) is worth more than finding more wins.`,
        action: "Set a stop-loss of 2–3 buy-ins on your next session.",
        confidence: confidenceFor(losses.length * 2),
        tone: "warn",
        effect: share / 100,
        n: losses.length,
      });
  }

  // Anomalies: this month vs the 3 before it.
  const month = localDate(i.now, i.tz).slice(0, 7);
  const thisM = finished.filter((s) => localDate(s.started_at, i.tz).startsWith(month));
  const prev = finished.filter((s) => {
    const m = localDate(s.started_at, i.tz).slice(0, 7);
    return m < month && monthsBetween(m, month) <= 3;
  });
  if (thisM.length >= 3 && prev.length >= 6) {
    const avg = (xs: readonly PokerSession[], f: (s: PokerSession) => number) =>
      xs.reduce((a, s) => a + f(s), 0) / xs.length;
    const len = (s: PokerSession) => sessionDurationMs(s) / 3_600_000;
    const bi = (s: PokerSession) => s.buy_in_minor + s.rebuys_minor;
    const lenUp = pct(avg(thisM, len), avg(prev, len));
    const biUp = pct(avg(thisM, bi), avg(prev, bi));
    if (biUp >= 35)
      push({
        id: "anomaly-buyin",
        kind: "anomaly",
        title: `Your average buy-in is up ${biUp}% this month`,
        body: "Outside your usual pattern. Check it fits your bankroll rule before your next session.",
        confidence: "medium",
        tone: "warn",
        effect: Math.min(1, biUp / 100),
        n: thisM.length,
      });
    if (lenUp >= 35)
      push({
        id: "anomaly-length",
        kind: "anomaly",
        title: `Your sessions are ${lenUp}% longer this month`,
        body: `${avg(thisM, len).toFixed(1)}h on average vs ${avg(prev, len).toFixed(1)}h before.`,
        confidence: "medium",
        tone: "neutral",
        effect: Math.min(1, lenUp / 100) * 0.8,
        n: thisM.length,
      });
  }

  // Position (from logged hands, in big blinds — currency-free).
  const pos = new Map<string, { bb: number; n: number }>();
  for (const hd of i.hands ?? []) {
    if (!hd.hero_position || hd.net_bb == null) continue;
    const cur = pos.get(hd.hero_position) ?? { bb: 0, n: 0 };
    pos.set(hd.hero_position, { bb: cur.bb + hd.net_bb, n: cur.n + 1 });
  }
  const posRows = [...pos.entries()]
    .filter(([, v]) => v.n >= 5)
    .map(([k, v]) => ({ k, avg: v.bb / v.n, n: v.n }));
  if (posRows.length >= 2) {
    posRows.sort((a, b) => a.avg - b.avg);
    const worst = posRows[0]!;
    if (worst.avg < 0)
      push({
        id: `position-${worst.k}`,
        kind: "position",
        title: `${worst.k} is where your logged hands lose most`,
        body: `${worst.avg.toFixed(1)} bb per logged hand from the ${worst.k} (${worst.n} hands). Logged hands skew toward big pots, so treat this as a review list, not a win rate.`,
        action: `Review your ${worst.k} hands this week.`,
        confidence: worst.n >= 40 ? "high" : worst.n >= 15 ? "medium" : "low",
        tone: "warn",
        effect: Math.min(1, Math.abs(worst.avg) / 20),
        n: worst.n,
      });
  }

  // Tournaments by buy-in bucket.
  const mtt = finished.filter(isTournament);
  if (mtt.length >= 8) {
    const rows = tournamentBuckets(mtt, i).filter((r) => r.count >= 3);
    if (rows.length >= 2) {
      const best = [...rows].sort((a, b) => b.roi - a.roi)[0]!;
      push({
        id: `mtt-${best.label}`,
        kind: "tournament",
        title: `${best.label} buy-ins are your strongest tournaments`,
        body: `ROI ${Math.round(best.roi * 100)}% and ${Math.round(best.itm * 100)}% ITM across ${best.count} events.`,
        confidence: confidenceFor(mtt.length),
        tone: "good",
        effect: Math.min(1, Math.abs(best.roi)),
        n: best.count,
      });
    }
  }

  return out.sort((a, b) => b.score - a.score);
}

function monthsBetween(a: string, b: string) {
  const [ay, am] = a.split("-").map(Number) as [number, number];
  const [by, bm] = b.split("-").map(Number) as [number, number];
  return (by - ay) * 12 + (bm - am);
}

export type BucketRow = {
  label: string;
  count: number;
  cost: number;
  net: number;
  roi: number;
  itm: number;
};

const BUCKETS: Array<[number, string]> = [
  [1500, "Up to 15"],
  [5500, "15 to 55"],
  [11000, "55 to 110"],
  [Infinity, "110+"],
];

/** ROI / ITM per buy-in bucket (amounts in the reporting currency's minor units). */
export function tournamentBuckets(
  mtt: readonly PokerSession[],
  i: Pick<InsightInput, "currency" | "rates" | "fmt">,
): BucketRow[] {
  const rows = new Map<string, BucketRow & { cashes: number }>();
  for (const s of mtt) {
    const cost = s.buy_in_minor + s.rebuys_minor + s.fees_minor;
    const b = BUCKETS.find(([max]) => cost <= max)!;
    const net = resultIn(s, i.currency, i.rates, false) ?? 0;
    const r = rows.get(b[1]) ?? {
      label: b[1],
      count: 0,
      cost: 0,
      net: 0,
      roi: 0,
      itm: 0,
      cashes: 0,
    };
    r.count++;
    r.cost += cost;
    r.net += net;
    if (s.prize_minor > 0) r.cashes++;
    rows.set(b[1], r);
  }
  return BUCKETS.map(([, l]) => rows.get(l))
    .filter((r): r is BucketRow & { cashes: number } => Boolean(r))
    .map(({ cashes, ...r }) => ({
      ...r,
      roi: r.cost ? r.net / r.cost : 0,
      itm: r.count ? cashes / r.count : 0,
    }));
}

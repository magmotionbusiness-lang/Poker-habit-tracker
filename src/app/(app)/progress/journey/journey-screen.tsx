"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Award,
  Flag,
  Lightbulb,
  Share2,
  TrendingUp,
} from "lucide-react";
import { Sparkline } from "@/components/charts/sparkline";
import { CountUp } from "@/components/fx/count-up";
import { formatDuration } from "@/components/sessions/timer";
import { ShareSheet } from "@/components/share/share-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartArt } from "@/components/ui/illustrations";
import { Segmented } from "@/components/ui/segmented";
import { useRates } from "@/lib/db/derived";
import { useSessions, useToday, useVenues } from "@/lib/db/hooks";
import { journey, monthReport, yearInPoker } from "@/lib/insights/reports";
import { useFmt } from "@/lib/insights/use-insights";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";

const monthName = (m: string, long = true) =>
  new Date(`${m}-15T12:00:00Z`).toLocaleDateString(undefined, {
    month: long ? "long" : "short",
    year: "numeric",
  });

/** The player's poker story: journey, monthly report vs last month, and their year. */
export function JourneyScreen() {
  const currency = useAppStore((s) => s.prefs.currency);
  const sessions = useSessions();
  const venues = useVenues();
  const { tz, today } = useToday();
  const fmt = useFmt();
  const rates = useRates([currency, ...new Set((sessions ?? []).map((s) => s.currency))]);
  const [which, setWhich] = useState<"this" | "last">("this");
  const [sharing, setSharing] = useState(false);

  const thisMonth = today.slice(0, 7);
  const [y, m] = thisMonth.split("-").map(Number) as [number, number];
  const lastMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;

  const data = useMemo(() => {
    if (!sessions) return null;
    const c = { currency, rates, tz };
    return {
      j: journey(sessions, c),
      month: monthReport(sessions, which === "this" ? thisMonth : lastMonth, c),
      year: yearInPoker(sessions, today.slice(0, 4), c),
    };
  }, [sessions, currency, rates, tz, which, thisMonth, lastMonth, today]);

  const back = (
    <Link
      href="/progress"
      className="-ml-2 inline-flex h-11 items-center gap-1.5 px-2 text-sm font-semibold text-ink-soft"
    >
      <ArrowLeft className="size-4" aria-hidden /> Progress
    </Link>
  );
  if (!data) return <div className="pt-3">{back}</div>;
  const { j, month, year } = data;
  if (j.sessions === 0)
    return (
      <div className="space-y-4 pt-3">
        {back}
        <EmptyState
          art={<ChartArt />}
          title="Your story starts with one session"
          body="Every session you log becomes part of your poker journey — your best months, your streaks, how far you've come."
        />
      </div>
    );

  const venue = venues?.find((v) => v.id === year.favoriteVenueId)?.name ?? null;
  const delta = (v: number | null, label: string) =>
    v === null ? null : (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-xs font-semibold",
          v >= 0 ? "text-success" : "text-danger",
        )}
      >
        {v >= 0 ? (
          <ArrowUpRight className="size-3.5" aria-hidden />
        ) : (
          <ArrowDownRight className="size-3.5" aria-hidden />
        )}
        {Math.abs(v)}% {label}
      </span>
    );

  return (
    <div className="space-y-4 pt-3">
      {back}
      <header>
        <p className="eyebrow mb-1.5">
          Since{" "}
          {new Date(`${j.firstDate}T12:00:00Z`).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <h1 className="text-[34px] leading-tight font-semibold">Your poker journey</h1>
      </header>

      <Card glow>
        <p className="text-sm text-ink-muted">Lifetime result</p>
        <p
          className={cn(
            "num font-display text-5xl font-semibold",
            j.net >= 0 ? "text-success" : "text-danger",
          )}
        >
          <CountUp value={j.net} duration={1.6} format={(v) => fmt(Math.round(v), true)} />
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            ["Sessions", String(j.sessions)],
            ["Hours", String(Math.round(j.hours))],
            ["Hourly", j.hourly === null ? "—" : `${fmt(j.hourly, true)}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-field py-2">
              <dt className="text-[11px] text-ink-muted">{k}</dt>
              <dd className="num font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        {j.timeline.length >= 2 && (
          <div className="mt-4">
            <Sparkline
              data={j.timeline.map((t) => t.cumulative)}
              width={320}
              height={64}
              className="w-full"
            />
            <div className="mt-1 flex justify-between text-[11px] text-ink-subtle">
              <span>{monthName(j.timeline[0]!.month, false)}</span>
              <span>{monthName(j.timeline.at(-1)!.month, false)}</span>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          eyebrow="Highlights"
          action={<Award className="anim-wiggle size-5 text-gold" aria-hidden />}
        />
        <ul className="stagger grid grid-cols-2 gap-2 text-sm">
          {[
            j.bestMonth && [
              "Best month",
              `${monthName(j.bestMonth.month, false)} · ${fmt(j.bestMonth.net, true)}`,
            ],
            j.biggestWin !== null && ["Biggest win", fmt(j.biggestWin, true)],
            ["Longest winning run", `${j.longestWinningStreak} sessions`],
            ["Longest losing run", `${j.longestLosingStreak} sessions`],
            j.worstMonth && [
              "Toughest month",
              `${monthName(j.worstMonth.month, false)} · ${fmt(j.worstMonth.net, true)}`,
            ],
            j.biggestLoss !== null && ["Biggest loss", fmt(j.biggestLoss, true)],
          ]
            .filter((x): x is [string, string] => Boolean(x))
            .map(([k, v]) => (
              <li key={k} className="rounded-lg border border-line bg-surface-2 px-3 py-2.5">
                <p className="text-[11px] text-ink-muted">{k}</p>
                <p className="num font-semibold">{v}</p>
              </li>
            ))}
        </ul>
        <p className="mt-3 text-xs text-ink-muted">
          Losing runs happen to every winning player. What matters is the line going up over time.
        </p>
      </Card>

      <Card>
        <CardHeader
          eyebrow="Monthly report"
          action={
            <Segmented
              ariaLabel="Month"
              value={which}
              onValueChange={setWhich}
              options={[
                { value: "this", label: "This month" },
                { value: "last", label: "Last month" },
              ]}
            />
          }
        />
        <p className="font-display text-xl font-semibold">{monthName(month.month)}</p>
        {month.stats.sessions === 0 ? (
          <p className="mt-1 text-sm text-ink-muted">No sessions yet this month.</p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-field px-3 py-2.5">
                <p className="text-[11px] text-ink-muted">Profit</p>
                <p
                  className={cn(
                    "num font-display text-2xl font-semibold",
                    month.stats.net >= 0 ? "text-success" : "text-danger",
                  )}
                >
                  <CountUp value={month.stats.net} format={(v) => fmt(Math.round(v), true)} />
                </p>
                {delta(month.delta.net, "vs last month")}
              </div>
              <div className="rounded-lg bg-field px-3 py-2.5">
                <p className="text-[11px] text-ink-muted">Hourly</p>
                <p className="num font-display text-2xl font-semibold">
                  {month.stats.hourly === null ? "—" : `${fmt(month.stats.hourly, true)}`}
                </p>
                {delta(month.delta.hourly, "hourly")}
              </div>
              <div className="rounded-lg bg-field px-3 py-2.5">
                <p className="text-[11px] text-ink-muted">Volume</p>
                <p className="num font-semibold">
                  {month.stats.sessions} sessions · {Math.round(month.stats.hours)}h
                </p>
                {delta(month.delta.hours, "hours")}
              </div>
              <div className="rounded-lg bg-field px-3 py-2.5">
                <p className="text-[11px] text-ink-muted">Winning sessions</p>
                <p className="num font-semibold">
                  {month.stats.winRate === null ? "—" : `${Math.round(month.stats.winRate * 100)}%`}
                </p>
              </div>
            </div>
            {month.biggestLesson && (
              <p className="mt-3 flex gap-2 rounded-md bg-pill px-3 py-2.5 text-sm text-ink-soft">
                <Lightbulb className="anim-pulse mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                <span>
                  <span className="font-semibold text-ink">Biggest lesson: </span>
                  {month.biggestLesson}
                </span>
              </p>
            )}
          </>
        )}
      </Card>

      {year.sessions > 0 && (
        <Card className="overflow-hidden bg-[radial-gradient(ellipse_at_100%_0%,rgba(124,92,255,0.32),transparent_60%),var(--surface)]">
          <CardHeader
            eyebrow={`Your ${year.year} in poker`}
            action={
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Share your year"
                onClick={() => setSharing(true)}
              >
                <Share2 aria-hidden />
              </Button>
            }
          />
          <p className="num font-display text-4xl font-semibold">
            <CountUp value={year.hours} format={(v) => `${Math.round(v)}h`} />
            <span className="ml-2 text-base font-normal text-ink-muted">at the tables</span>
          </p>
          <ul className="stagger mt-3 space-y-1.5 text-sm">
            {[
              [
                TrendingUp,
                `Result ${fmt(year.net, true)}${year.hourly !== null ? ` · ${fmt(year.hourly, true)}/h` : ""}`,
              ],
              year.bestMonth && [Award, `Best month: ${monthName(year.bestMonth)}`],
              year.mostPlayedStake && [
                Flag,
                `Most played: ${year.mostPlayedStake}${venue ? ` · favourite room ${venue}` : ""}`,
              ],
              year.bestWeekday && [Flag, `Most profitable day: ${year.bestWeekday}`],
              year.longestSessionMs > 0 && [
                Flag,
                `Longest session: ${formatDuration(year.longestSessionMs)}`,
              ],
              year.winRate !== null && [
                Flag,
                `${Math.round(year.winRate * 100)}% winning sessions`,
              ],
            ]
              .filter((x): x is [typeof Flag, string] => Boolean(x))
              .map(([Icon, text]) => (
                <li key={text} className="flex items-center gap-2">
                  <Icon className="size-4 text-lavender" aria-hidden /> {text}
                </li>
              ))}
          </ul>
          <Button className="mt-4" block variant="outline" onClick={() => setSharing(true)}>
            <Share2 aria-hidden /> Share my year
          </Button>
          {sharing && (
            <ShareSheet
              open
              onClose={() => setSharing(false)}
              subject={{
                kind: "year",
                year: year.year,
                hours: year.hours,
                net: fmt(year.net, true),
                hourly: year.hourly === null ? null : fmt(year.hourly, true),
                winRate: year.winRate,
              }}
            />
          )}
        </Card>
      )}
    </div>
  );
}

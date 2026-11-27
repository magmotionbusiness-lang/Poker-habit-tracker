"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { ChevronRight, Play, Settings, Target } from "lucide-react";
import { StreakFlame } from "@/components/brand/streak-flame";
import { Sparkline } from "@/components/charts/sparkline";
import { CountUp } from "@/components/fx/count-up";
import { TopInsightCard } from "@/components/insights/insight-card";
import { PlayingTonight } from "@/components/insights/playing-tonight";
import { formatDuration } from "@/components/sessions/timer";
import { PageHeader } from "@/components/shell/page-header";
import { QuickAddButton } from "@/components/shell/quick-add";
import { NudgeCard } from "@/components/today/nudge-card";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { AnnouncementSlot } from "@/components/uts/announcements";
import { useBankrollSummary, useHabitEngine } from "@/lib/db/derived";
import { useGoalViews } from "@/lib/db/goal-hooks";
import { useVenues } from "@/lib/db/hooks";
import { addDays, localDate, startOfWeek } from "@/lib/dates/dates";
import { useFmt } from "@/lib/insights/use-insights";
import { useAppStore } from "@/lib/store/app-store";
import { useUi } from "@/lib/store/ui-store";
import { computeStats } from "@/lib/stats/stats";
import { resultIn, sessionDurationMs, stakesLabel } from "@/lib/stats/session-math";
import { cn } from "@/lib/utils";
import { RunningBanner } from "../today/today-screen";

type Period = "week" | "month" | "all";
const noop = () => () => {};
const greetingFor = (h: number) =>
  h < 5 ? "Late night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";

/**
 * Home: "How is my poker going?" in one screen — bankroll, results for the period you pick,
 * the one insight that matters, streak + main goal, and your latest sessions.
 */
export function HomeScreen() {
  const currency = useAppStore((s) => s.prefs.currency);
  const summary = useBankrollSummary(currency);
  const engine = useHabitEngine();
  const goals = useGoalViews(currency);
  const venues = useVenues();
  const open = useUi((s) => s.open);
  const fmt = useFmt();
  const [period, setPeriod] = useState<Period>("month");
  const greeting = useSyncExternalStore(
    noop,
    () => greetingFor(new Date().getHours()),
    () => "Welcome back",
  );

  const view = useMemo(() => {
    if (!summary || !engine) return null;
    const { today, tz } = engine;
    const finished = summary.sessions
      .filter((s) => s.status === "finished")
      .sort((a, b) => (a.started_at < b.started_at ? -1 : 1));
    const from =
      period === "week"
        ? startOfWeek(today)
        : period === "month"
          ? `${today.slice(0, 7)}-01`
          : null;
    const inPeriod = from ? finished.filter((s) => localDate(s.started_at, tz) >= from) : finished;
    const stats = computeStats(inPeriod, currency, summary.rates, { includeCosts: true });
    let run = 0;
    const curve = finished
      .slice(-40)
      .map((s) => (run += resultIn(s, currency, summary.rates, true) ?? 0));
    const todayNet = finished
      .filter((s) => localDate(s.started_at, tz) === today)
      .reduce((a, s) => a + (resultIn(s, currency, summary.rates, true) ?? 0), 0);
    return {
      stats,
      curve,
      recent: [...finished].reverse().slice(0, 3),
      todayNet,
      total: finished.length,
      yesterday: addDays(today, -1),
    };
  }, [summary, engine, period, currency]);

  if (!summary || !engine || !view || !goals) {
    return (
      <div className="space-y-4 pt-5">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  const main = goals.find((g) => g.goal.is_main) ?? goals[0];
  const st = view.stats;
  const periodLabel =
    period === "week" ? "this week" : period === "month" ? "this month" : "all time";
  const venueName = (id: string | null) => venues?.find((v) => v.id === id)?.name;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={greeting}
        title="Home"
        action={
          <div className="flex gap-2">
            <Button size="icon-sm" variant="secondary" aria-label="Settings & more" asChild>
              <Link href="/more">
                <Settings />
              </Link>
            </Button>
            <QuickAddButton />
          </div>
        }
      />

      <RunningBanner />
      <PlayingTonight />

      {/* The one number that matters, then the period you're looking at. */}
      <Card glow className="overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Bankroll</p>
            <p className="num font-display text-[44px] leading-none font-semibold tracking-[-0.02em]">
              {summary.total === null ? (
                "—"
              ) : (
                <CountUp value={summary.total} format={(v) => fmt(Math.round(v))} />
              )}
            </p>
            {view.todayNet !== 0 && (
              <p
                className={cn(
                  "num mt-1 text-sm font-semibold",
                  view.todayNet > 0 ? "text-success" : "text-danger",
                )}
              >
                {fmt(view.todayNet, true)} today
              </p>
            )}
          </div>
          {view.curve.length >= 2 && <Sparkline data={view.curve} width={110} height={44} />}
        </div>

        <Segmented
          ariaLabel="Period"
          value={period}
          onValueChange={setPeriod}
          options={[
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
            { value: "all", label: "All time" },
          ]}
          className="mt-4 w-full [&>*]:flex-1"
        />
        <dl key={period} className="stagger mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-field px-2 py-2.5">
            <dt className="text-[11px] text-ink-muted">Result</dt>
            <dd
              className={cn(
                "num font-display text-lg font-semibold",
                st.net > 0 ? "text-success" : st.net < 0 ? "text-danger" : "",
              )}
            >
              <CountUp value={st.net} format={(v) => fmt(Math.round(v), true)} />
            </dd>
          </div>
          <div className="rounded-lg bg-field px-2 py-2.5">
            <dt className="text-[11px] text-ink-muted">Hourly</dt>
            <dd className="num font-display text-lg font-semibold">
              {st.hourly === null ? "—" : fmt(st.hourly, true)}
            </dd>
          </div>
          <div className="rounded-lg bg-field px-2 py-2.5">
            <dt className="text-[11px] text-ink-muted">Volume</dt>
            <dd className="num font-display text-lg font-semibold">
              {st.sessions}
              <span className="text-xs font-normal text-ink-muted"> · {Math.round(st.hours)}h</span>
            </dd>
          </div>
        </dl>
        {st.sessions === 0 && (
          <p className="mt-2 text-center text-xs text-ink-muted">No sessions {periodLabel} yet.</p>
        )}
      </Card>

      {view.total === 0 ? (
        <Card className="text-center">
          <p className="font-display text-xl font-semibold">Log your first session</p>
          <p className="mt-1 text-sm text-ink-muted">
            After 3 sessions you&apos;ll see your hourly rate. After 10, Stakers starts telling you
            what it notices about your game.
          </p>
          <Button className="mt-4" onClick={() => open("start-session")}>
            <Play aria-hidden /> Start a session
          </Button>
        </Card>
      ) : (
        <TopInsightCard today={engine.today} />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link href="/today" className="press block">
          <Card className="flex h-full flex-col items-center justify-center gap-1 py-5 text-center">
            <StreakFlame count={engine.streak.current} size="md" />
            <p className="text-xs text-ink-muted">day streak</p>
            <p className="num text-[11px] text-ink-subtle">
              {engine.todayInput.done}/{engine.todayInput.required} habits today
            </p>
          </Card>
        </Link>
        <Link href="/progress" className="press block">
          <Card className="flex h-full flex-col items-center justify-center gap-1.5 py-5 text-center">
            {main ? (
              <>
                <ProgressRing
                  value={main.progress.fraction}
                  size={64}
                  stroke={6}
                  label={`${main.goal.title}: ${Math.round(main.progress.fraction * 100)}%`}
                >
                  <span className="num text-sm font-semibold">
                    {Math.round(main.progress.fraction * 100)}%
                  </span>
                </ProgressRing>
                <p className="line-clamp-2 text-xs text-ink-muted">{main.goal.title}</p>
              </>
            ) : (
              <>
                <Target className="size-7 text-lavender" aria-hidden />
                <p className="text-xs text-ink-muted">Set a main goal</p>
              </>
            )}
          </Card>
        </Link>
      </div>

      {view.recent.length > 0 && (
        <Card>
          <CardHeader
            eyebrow="Recent sessions"
            action={
              <Link href="/bankroll" className="text-xs font-semibold text-lavender">
                All →
              </Link>
            }
          />
          <ul className="stagger divide-y divide-line">
            {view.recent.map((s) => {
              const r = resultIn(s, currency, summary.rates, true) ?? 0;
              return (
                <li key={s.id}>
                  <Link
                    href={`/sessions/edit?id=${s.id}`}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {s.format === "cash" ? stakesLabel(s) : "Tournament"} {s.game}
                        {venueName(s.venue_id) ? ` · ${venueName(s.venue_id)}` : ""}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {new Date(s.started_at).toLocaleDateString(undefined, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        · {formatDuration(sessionDurationMs(s))}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "num text-sm font-semibold",
                        r > 0 ? "text-success" : r < 0 ? "text-danger" : "text-ink-muted",
                      )}
                    >
                      {fmt(r, true)}
                    </span>
                    <ChevronRight className="size-4 text-ink-subtle" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <AnnouncementSlot />
      <NudgeCard today={engine.today} tz={engine.tz} streak={engine.streak.current} />
    </div>
  );
}

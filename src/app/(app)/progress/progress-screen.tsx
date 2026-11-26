"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Snowflake } from "lucide-react";
import { StreakFlame } from "@/components/brand/streak-flame";
import { Heatmap } from "@/components/charts/heatmap";
import { GoalCard } from "@/components/goals/goal-card";
import { GoalSheet } from "@/components/goals/goal-sheet";
import { formatDuration } from "@/components/sessions/timer";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { saveGoal } from "@/lib/db/actions";
import { useHabitEngine } from "@/lib/db/derived";
import { useGoalViews } from "@/lib/db/goal-hooks";
import { useSessions, useStudySessions } from "@/lib/db/hooks";
import { addDays, dateRange, localDate, startOfWeek } from "@/lib/dates/dates";
import type { Goal } from "@/lib/domain/types";
import { formatMoney } from "@/lib/money";
import { resultIn, sessionDurationMs } from "@/lib/stats/session-math";
import { nextMilestone } from "@/lib/streaks/streaks";
import { useAppStore } from "@/lib/store/app-store";

export function ProgressScreen() {
  const engine = useHabitEngine();
  const currency = useAppStore((s) => s.prefs.currency);
  const goals = useGoalViews(currency);
  const [editing, setEditing] = useState<Goal | null | "new">(null);

  if (!engine || !goals) {
    return (
      <div className="space-y-4 pt-5">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  const { streak, studyStreak, days, today } = engine;
  const heatStart = addDays(startOfWeek(today), -25 * 7);
  const heat = dateRange(heatStart, today).map((d) => {
    const input = days.get(d);
    if (!input || d < engine.start) return null;
    return input.required ? Math.min(1, input.done / input.required) : input.done > 0 ? 1 : 0;
  });
  const next = nextMilestone(streak.current);

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Consistency" title="Progress" />

      <Card glow>
        <CardHeader eyebrow="Streak" />
        <div className="flex items-center justify-between gap-4">
          <StreakFlame count={streak.current} size="lg" />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-right">
            <Mini label="Longest" value={`${streak.longest}d`} />
            <Mini label="Active days" value={String(streak.totalActiveDays)} />
            <Mini
              label="Freezes"
              value={
                <span className="inline-flex items-center gap-1">
                  <Snowflake className="size-3.5 text-lavender" aria-hidden />
                  {streak.freezesAvailable}/{engine.settings.maxFreezes}
                </span>
              }
            />
            <Mini label="Study streak" value={studyStreak ? `${studyStreak.current}d` : "—"} />
          </dl>
        </div>
        {next && (
          <p className="mt-4 text-sm text-ink-muted">
            {next - streak.current} day{next - streak.current === 1 ? "" : "s"} to your {next}-day
            milestone. Earn a freeze every 7 days.
          </p>
        )}
      </Card>

      <Card>
        <CardHeader eyebrow="Habit heatmap · 26 weeks" />
        <div className="-mx-1 scrollbar-none overflow-x-auto px-1">
          <Heatmap values={heat} label="Daily habit completion" />
        </div>
      </Card>

      <WeekReport today={today} tz={engine.tz} />

      <div className="flex items-center justify-between px-1 pt-2">
        <h2 className="eyebrow !font-sans">Goals</h2>
        <Button size="sm" variant="ghost" onClick={() => setEditing("new")}>
          <Plus aria-hidden /> Add goal
        </Button>
      </div>
      {goals.length === 0 && (
        <p className="px-1 text-sm text-ink-muted">
          No goals yet. Pick one target — everything points at it.
        </p>
      )}
      {goals.map((view) => (
        <div key={view.goal.id} className="space-y-2">
          <GoalCard
            view={view}
            eyebrow={view.goal.is_main ? "Main goal" : view.goal.type}
            action={
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Edit ${view.goal.title}`}
                onClick={() => setEditing(view.goal)}
              >
                <Pencil />
              </Button>
            }
          />
          {(view.goal.type === "stake" || view.goal.type === "custom") &&
            !view.progress.achieved && <ManualProgress goal={view.goal} />}
        </div>
      ))}

      <GoalSheet
        key={editing === "new" ? "new" : (editing?.id ?? "none")}
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        goal={editing === "new" ? null : editing}
      />
    </div>
  );
}

function ManualProgress({ goal }: { goal: Goal }) {
  const value = goal.manual_value ?? 0;
  const set = (v: number) =>
    saveGoal({
      ...goal,
      manual_value: v,
      status: v >= goal.target_value ? "achieved" : "active",
      achieved_at: v >= goal.target_value ? new Date().toISOString() : null,
    });
  return goal.type === "stake" ? (
    <Button variant="outline" block onClick={() => set(1)}>
      I&apos;ve moved up — mark reached
    </Button>
  ) : (
    <div className="flex gap-2">
      <Button variant="secondary" block onClick={() => set(Math.max(0, value - 1))}>
        −1
      </Button>
      <Button variant="outline" block onClick={() => set(value + 1)}>
        +1 progress
      </Button>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="num font-semibold">{value}</dd>
    </div>
  );
}

function WeekReport({ today, tz }: { today: string; tz: string }) {
  const sessions = useSessions();
  const study = useStudySessions();
  const currency = useAppStore((s) => s.prefs.currency);
  const weeks = useMemo(() => {
    if (!sessions || !study) return null;
    const calc = (from: string, to: string) => {
      const ss = sessions.filter(
        (s) =>
          s.status === "finished" &&
          localDate(s.started_at, tz) >= from &&
          localDate(s.started_at, tz) <= to,
      );
      const ms = ss.reduce((a, s) => a + sessionDurationMs(s), 0);
      const net = ss.reduce((a, s) => a + (resultIn(s, currency, {}, true) ?? 0), 0);
      const minutes = study
        .filter((s) => localDate(s.started_at, tz) >= from && localDate(s.started_at, tz) <= to)
        .reduce((a, s) => a + s.minutes, 0);
      return {
        count: ss.length,
        ms,
        net,
        hourly: ms ? Math.round(net / (ms / 3_600_000)) : null,
        minutes,
      };
    };
    const thisFrom = startOfWeek(today);
    return { now: calc(thisFrom, today), prev: calc(addDays(thisFrom, -7), addDays(thisFrom, -1)) };
  }, [sessions, study, today, tz, currency]);
  if (!weeks) return null;
  const money = (m: number, signed = true) =>
    formatMoney({ minor: m, currency }, { signed, trimZeroCents: true });
  const rows: Array<[string, string, string]> = [
    ["Sessions", String(weeks.now.count), String(weeks.prev.count)],
    ["Hours", formatDuration(weeks.now.ms), formatDuration(weeks.prev.ms)],
    ["Profit", money(weeks.now.net), money(weeks.prev.net)],
    [
      "Hourly",
      weeks.now.hourly === null ? "—" : `${money(weeks.now.hourly)}/h`,
      weeks.prev.hourly === null ? "—" : `${money(weeks.prev.hourly)}/h`,
    ],
    ["Study", `${weeks.now.minutes} min`, `${weeks.prev.minutes} min`],
  ];
  return (
    <Card>
      <CardHeader eyebrow="Weekly report card" />
      <table className="num w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-ink-muted">
            <th className="pb-2 font-medium">&nbsp;</th>
            <th className="pb-2 text-right font-medium">This week</th>
            <th className="pb-2 text-right font-medium">Last week</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(([label, a, b]) => (
            <tr key={label}>
              <th scope="row" className="py-2 text-left font-medium text-ink-soft">
                {label}
              </th>
              <td className="py-2 text-right font-semibold">{a}</td>
              <td className="py-2 text-right text-ink-muted">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-ink-subtle">
        Hands reviewed, rules written and best decision of the week join this card with hand reviews
        (Phase 2) and the Sunday Weekly Review (Phase 3).
      </p>
    </Card>
  );
}

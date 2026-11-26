"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Snowflake, Trophy } from "lucide-react";
import { StreakFlame } from "@/components/brand/streak-flame";
import { Heatmap } from "@/components/charts/heatmap";
import { CountUp } from "@/components/fx/count-up";
import { MilestoneBadges } from "@/components/progress/milestone-badges";
import { FireOnMount } from "@/components/fx/fire-on-mount";
import { Dialog } from "@/components/ui/dialog";
import { ProgressBar } from "@/components/ui/progress";
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
import { useHands, useRules, useSessions, useStudySessions } from "@/lib/db/hooks";
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
  const dismissed = useAppStore((s) => s.dismissed);
  const dismiss = useAppStore((s) => s.dismiss);

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

      <Card glow className="overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="grid size-24 shrink-0 place-items-center rounded-full bg-[radial-gradient(circle,rgba(124,92,255,0.45),transparent_70%)]">
            <StreakFlame count={streak.current} size="lg" hideCount />
          </div>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Current streak</p>
            <p className="num font-display text-4xl leading-none font-semibold">
              <CountUp value={streak.current} />
              <span className="ml-1 text-lg text-ink-muted">days</span>
            </p>
            {next && (
              <>
                <ProgressBar
                  className="mt-3"
                  value={streak.current / next}
                  label={`${streak.current} of ${next} days to the next milestone`}
                />
                <p className="num mt-1.5 text-xs text-ink-muted">
                  {next - streak.current} to your {next}-day badge
                </p>
              </>
            )}
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-4 gap-2 border-t border-line pt-4 text-center">
          <Mini
            label="Longest"
            value={
              <>
                <CountUp value={streak.longest} />d
              </>
            }
          />
          <Mini label="Active" value={<CountUp value={streak.totalActiveDays} />} />
          <Mini
            label="Freezes"
            value={
              <span className="inline-flex items-center gap-0.5">
                {Array.from({ length: engine.settings.maxFreezes }, (_, i) => (
                  <Snowflake
                    key={i}
                    className={`size-3.5 ${i < streak.freezesAvailable ? "text-lavender" : "text-ink-subtle/40"}`}
                    aria-hidden
                  />
                ))}
              </span>
            }
          />
          <Mini
            label="Study"
            value={
              studyStreak ? (
                <>
                  <CountUp value={studyStreak.current} />d
                </>
              ) : (
                "—"
              )
            }
          />
        </dl>
      </Card>

      <Card>
        <CardHeader
          eyebrow="Milestones"
          action={<Trophy className="size-5 text-lavender" strokeWidth={1.6} aria-hidden />}
        />
        <MilestoneBadges longest={streak.longest} />
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

      {(() => {
        const reached = goals.find(
          (v) =>
            v.progress.achieved &&
            v.goal.status === "active" &&
            !dismissed[`goal-reached:${v.goal.id}`],
        );
        if (!reached) return null;
        const key = `goal-reached:${reached.goal.id}`;
        return (
          <Dialog
            open
            onOpenChange={() => dismiss(key)}
            title="Goal reached"
            description={reached.goal.title}
          >
            <FireOnMount kind="milestone" />
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="pop-in grid size-24 place-items-center rounded-full border border-gold/50 bg-[radial-gradient(circle_at_30%_25%,rgba(251,191,36,0.4),rgba(30,25,65,0.9))] text-gold shadow-[0_0_40px_rgba(251,191,36,0.35)]">
                <Trophy className="size-10" strokeWidth={1.6} aria-hidden />
              </div>
              <p className="text-center text-ink-muted">
                That&apos;s the system working. Set the next one while the momentum is here.
              </p>
              <Button
                block
                onClick={async () => {
                  await saveGoal({
                    ...reached.goal,
                    status: "achieved",
                    achieved_at: new Date().toISOString(),
                    is_main: false,
                  });
                  dismiss(key);
                  setEditing("new");
                }}
              >
                Set the next goal
              </Button>
              <Button variant="ghost" block onClick={() => dismiss(key)}>
                Later
              </Button>
            </div>
          </Dialog>
        );
      })()}

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
  const hands = useHands();
  const rules = useRules();
  const currency = useAppStore((s) => s.prefs.currency);
  const weeks = useMemo(() => {
    if (!sessions || !study || !hands || !rules) return null;
    const inRange = (iso: string | null | undefined, from: string, to: string) =>
      Boolean(iso) && localDate(iso!, tz) >= from && localDate(iso!, tz) <= to;
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
        reviewed: hands.filter((h) => inRange(h.review?.reviewed_at, from, to)).length,
        rulesWritten: rules.filter((r) => inRange(r.created_at, from, to)).length,
      };
    };
    const thisFrom = startOfWeek(today);
    return { now: calc(thisFrom, today), prev: calc(addDays(thisFrom, -7), addDays(thisFrom, -1)) };
  }, [sessions, study, hands, rules, today, tz, currency]);
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
    ["Hands reviewed", String(weeks.now.reviewed), String(weeks.prev.reviewed)],
    ["Rules written", String(weeks.now.rulesWritten), String(weeks.prev.rulesWritten)],
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
    </Card>
  );
}

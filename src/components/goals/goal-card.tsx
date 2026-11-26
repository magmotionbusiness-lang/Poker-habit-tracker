"use client";

import { Target } from "lucide-react";
import type { ReactNode } from "react";
import { Sparkline } from "@/components/charts/sparkline";
import { CountUp } from "@/components/fx/count-up";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { formatGoalValue, type GoalView } from "@/lib/db/goal-hooks";
import { formatMoney } from "@/lib/money";

const fmtMoney = (m: number, c: string) =>
  formatMoney({ minor: m, currency: c }, { trimZeroCents: true });
const fmtDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

/** Two-tone title: the amount (or last words) in the gradient, like the site's headlines. */
function TwoTone({ title }: { title: string }) {
  const m = title.match(/^(.*?)([$€£¥]?[\d.,]+[kKmM]?\s?[A-Z]{0,3}.*)$/);
  if (!m || !m[1]) return <>{title}</>;
  return (
    <>
      {m[1]}
      <span className="text-gradient">{m[2]}</span>
    </>
  );
}

export function GoalCard({
  view,
  eyebrow = "Main goal",
  action,
}: {
  view: GoalView;
  eyebrow?: string;
  action?: ReactNode;
}) {
  const { goal, progress: p, spark } = view;
  const pct = Math.round(p.fraction * 100);
  const projection = p.achieved
    ? "Achieved. Set the next one."
    : p.projectedDate
      ? `At your current pace: ${fmtDate(p.projectedDate)}`
      : p.daysElapsed < 7
        ? "Projected date appears after a week of data"
        : "Not moving toward it yet — this is where the system helps";
  return (
    <Card glow={goal.is_main}>
      <CardHeader
        eyebrow={eyebrow}
        action={action ?? <Target className="size-5 text-lavender" strokeWidth={1.6} aria-hidden />}
      />
      <p className="mb-3 font-display text-xl font-semibold tracking-[-0.01em]">
        <TwoTone title={goal.title} />
      </p>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="num font-display text-[34px] leading-none font-semibold tracking-[-0.02em]">
            <CountUp
              value={p.current}
              format={(v) => formatGoalValue(goal, Math.round(v), fmtMoney)}
            />
          </p>
          <p className="mt-1.5 text-sm text-ink-muted">
            of {formatGoalValue(goal, goal.target_value, fmtMoney)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {spark.length > 2 && <Sparkline data={spark} />}
          <span className="num text-sm font-semibold text-lavender">{pct}%</span>
        </div>
      </div>
      <ProgressBar className="mt-3" value={p.fraction} label={`${goal.title}: ${pct}%`} />
      <p className="mt-2.5 text-xs text-ink-subtle">
        {projection}
        {goal.deadline &&
          !p.achieved &&
          ` · deadline ${fmtDate(goal.deadline)}${p.onTrack === false ? " (behind pace)" : p.onTrack ? " (on track)" : ""}`}
      </p>
    </Card>
  );
}

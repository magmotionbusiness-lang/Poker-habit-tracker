"use client";

import { useMemo } from "react";
import type { Goal } from "@/lib/domain/types";
import { ledger } from "@/lib/bankroll/bankroll";
import { goalCurrentValue, goalProgress, type GoalProgress } from "@/lib/goals/goals";
import { resultIn } from "@/lib/stats/session-math";
import { convertMoney } from "@/lib/money";
import { useBankrollSummary, useRates } from "./derived";
import { useGoals, useStudySessions, useToday } from "./hooks";

export type GoalView = { goal: Goal; progress: GoalProgress; spark: number[] };

/** Every active goal with its live progress (and a small trend for the sparkline). */
export function useGoalViews(displayCurrency: string): GoalView[] | null {
  const goals = useGoals();
  const study = useStudySessions();
  const { today, tz } = useToday();
  const currencies = [...new Set((goals ?? []).map((g) => g.currency).filter(Boolean) as string[])];
  const summary = useBankrollSummary(currencies[0] ?? displayCurrency);
  const rates = useRates([
    displayCurrency,
    ...currencies,
    ...(summary?.bankrolls ?? []).map((b) => b.currency),
  ]);

  return useMemo(() => {
    if (!goals || !study || !summary) return null;
    const { sessions, txs, bankrolls } = summary;
    return goals
      .filter((g) => g.status !== "archived")
      .sort((a, b) => Number(b.is_main) - Number(a.is_main))
      .map((goal) => {
        let bankrollTotal: number | null = null;
        if (goal.type === "bankroll" && goal.currency) {
          bankrollTotal = 0;
          for (const it of summary.items) {
            if (it.bankroll.currency === goal.currency) bankrollTotal += it.balance;
            else {
              const r = rates[`${it.bankroll.currency}:${goal.currency}`];
              if (!r) {
                bankrollTotal = null;
                break;
              }
              bankrollTotal += convertMoney(
                { minor: it.balance, currency: it.bankroll.currency },
                goal.currency,
                r,
              ).minor;
            }
          }
        }
        const current = goalCurrentValue(goal, {
          sessions,
          studySessions: study,
          bankrollTotal,
          rates,
        });
        let spark: number[] = [];
        if (goal.type === "profit" && goal.currency) {
          let acc = goal.start_value;
          spark = [
            acc,
            ...[...sessions]
              .filter(
                (s) => s.status === "finished" && (s.ended_at ?? s.started_at) >= goal.starts_at,
              )
              .reverse()
              .map((s) => (acc += resultIn(s, goal.currency!, rates, true) ?? 0)),
          ];
        } else if (goal.type === "bankroll" && bankrolls.length === 1) {
          spark = ledger(bankrolls[0]!, txs, sessions).map((e) => e.balance);
        }
        return { goal, progress: goalProgress(goal, current, today, tz), spark: spark.slice(-30) };
      });
  }, [goals, study, summary, rates, today, tz]);
}

export function formatGoalValue(
  goal: Goal,
  value: number,
  fmtMoney: (m: number, c: string) => string,
): string {
  switch (goal.unit) {
    case "minor":
      return fmtMoney(value, goal.currency ?? "USD");
    case "hours":
      return `${value}h`;
    case "minutes":
      return value >= 120 ? `${Math.round((value / 60) * 10) / 10}h` : `${value} min`;
    case "sessions":
      return `${value} sessions`;
    default:
      return goal.type === "stake"
        ? value >= goal.target_value
          ? "Reached"
          : "Not yet"
        : String(value);
  }
}

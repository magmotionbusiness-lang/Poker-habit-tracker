"use client";

import { useMemo, useState } from "react";
import { ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import { CountUp } from "@/components/fx/count-up";
import { Card, CardHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { useBankrollSummary } from "@/lib/db/derived";
import { useNow } from "@/lib/db/hooks";
import { tournamentBuckets } from "@/lib/insights/engine";
import {
  forecast,
  riskBand,
  riskOfRuin,
  sessionMoments,
  sessionsPerMonth,
} from "@/lib/insights/bankroll-intel";
import { useFmt } from "@/lib/insights/use-insights";
import { convertMoney } from "@/lib/money";
import { useAppStore } from "@/lib/store/app-store";
import { isTournament, resultIn } from "@/lib/stats/session-math";
import { cn } from "@/lib/utils";

const BAR = ["#7c5cff", "#a892ff", "#34d399", "#fbbf24", "#60a5fa", "#f472b6"];

/**
 * Bankroll intelligence: total poker net worth across bankrolls, risk of ruin from your own
 * results, a 1/3/6-month range (your sessions resampled — variance included), and
 * tournament ROI by buy-in. Estimates, never promises.
 */
export function BankrollIntel() {
  const currency = useAppStore((s) => s.prefs.currency);
  const summary = useBankrollSummary(currency);
  const fmt = useFmt();
  const now = useNow(10 * 60_000);
  const [months, setMonths] = useState<"1" | "3" | "6">("3");

  const data = useMemo(() => {
    if (!summary || summary.total === null) return null;
    const results = summary.sessions
      .filter((s) => s.status === "finished")
      .map((s) => resultIn(s, currency, summary.rates, true))
      .filter((v): v is number => v !== null);
    const m = sessionMoments(results);
    const perMonth = sessionsPerMonth(
      summary.sessions.filter((s) => s.status === "finished").map((s) => s.started_at),
      now,
    );
    const parts = summary.items.map((it) => ({
      name: it.bankroll.name,
      value:
        it.bankroll.currency === currency
          ? it.balance
          : summary.rates[`${it.bankroll.currency}:${currency}`]
            ? convertMoney(
                { minor: it.balance, currency: it.bankroll.currency },
                currency,
                summary.rates[`${it.bankroll.currency}:${currency}`]!,
              ).minor
            : 0,
    }));
    const mtt = summary.sessions.filter((s) => s.status === "finished" && isTournament(s));
    return { results, m, perMonth, parts, total: summary.total, mtt };
  }, [summary, currency, now]);

  const fc = useMemo(
    () => (data ? forecast(data.total, data.results, data.perMonth * Number(months)) : null),
    [data, months],
  );
  if (!data || !summary) return null;
  const ror = data.m ? riskOfRuin(data.total, data.m.mean, data.m.sd) : null;
  const buckets =
    data.mtt.length >= 8
      ? tournamentBuckets(data.mtt, { currency, rates: summary.rates, fmt })
      : [];
  const positive = data.parts.filter((p) => p.value > 0);
  const sum = positive.reduce((a, p) => a + p.value, 0) || 1;

  return (
    <Card>
      <CardHeader
        eyebrow="Bankroll intelligence"
        action={<ShieldCheck className="anim-pulse size-5 text-lavender" aria-hidden />}
      />

      <div className="mb-4">
        <p className="flex items-center gap-1.5 text-sm text-ink-muted">
          <Wallet className="size-4" aria-hidden /> Total poker net worth
        </p>
        <p className="num font-display text-3xl font-semibold">
          <CountUp value={data.total} format={(v) => fmt(Math.round(v))} />
        </p>
        {data.parts.length > 1 && (
          <>
            <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-field">
              {positive.map((p, i) => (
                <span
                  key={p.name}
                  className="progress-grow h-full"
                  style={{
                    width: `${(p.value / sum) * 100}%`,
                    background: BAR[i % BAR.length],
                    animationDelay: `${i * 80}ms`,
                  }}
                />
              ))}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
              {data.parts.map((p, i) => (
                <li key={p.name} className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: BAR[i % BAR.length] }}
                    aria-hidden
                  />
                  {p.name} <span className="num font-semibold">{fmt(p.value)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {ror !== null && data.results.length >= 10 && (
        <div className="mb-4 rounded-lg bg-field px-3 py-3">
          <p className="text-sm text-ink-muted">Risk of ruin</p>
          <p className="font-display text-xl font-semibold capitalize">
            {riskBand(ror)}{" "}
            <span className="num text-sm font-normal text-ink-muted">
              · {ror < 0.001 ? "<0.1" : (ror * 100).toFixed(1)}%
            </span>
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            The chance of losing this bankroll if your future sessions look like your past{" "}
            {data.results.length}. A model, not a promise.
          </p>
        </div>
      )}

      {fc && (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm whitespace-nowrap text-ink-muted">
              <TrendingUp className="size-4" aria-hidden /> Where you could be
            </p>
            <Segmented
              ariaLabel="Forecast horizon"
              value={months}
              onValueChange={setMonths}
              options={[
                { value: "1", label: "1M" },
                { value: "3", label: "3M" },
                { value: "6", label: "6M" },
              ]}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {(
              [
                ["Rough run", fc.conservative, "text-ink-soft"],
                ["Expected", fc.expected, "text-ink"],
                ["Good run", fc.strong, "text-success"],
              ] as const
            ).map(([label, v, cls]) => (
              <div key={label} className="rounded-lg border border-line bg-surface-2 px-2 py-2.5">
                <p className="text-[11px] text-ink-muted">{label}</p>
                <p className={cn("num font-display text-lg font-semibold", cls)}>
                  <CountUp value={v} format={(x) => fmt(Math.round(x))} />
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            ~{fc.sessions} sessions at your recent pace, your own results resampled 2,000 times
            (10th / 50th / 90th percentile). Variance is real: good players have losing months.
          </p>
        </div>
      )}

      {buckets.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm text-ink-muted">Tournaments by buy-in</p>
          <table className="num w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-muted">
                <th className="pb-1.5 font-medium">Buy-in</th>
                <th className="pb-1.5 text-right font-medium">Events</th>
                <th className="pb-1.5 text-right font-medium">ROI</th>
                <th className="pb-1.5 text-right font-medium">ITM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {buckets.map((b) => (
                <tr key={b.label}>
                  <td className="py-1.5">{b.label}</td>
                  <td className="py-1.5 text-right">{b.count}</td>
                  <td
                    className={cn(
                      "py-1.5 text-right font-semibold",
                      b.roi >= 0 ? "text-success" : "text-danger",
                    )}
                  >
                    {b.roi >= 0 ? "+" : "−"}
                    {Math.abs(Math.round(b.roi * 100))}%
                  </td>
                  <td className="py-1.5 text-right">{Math.round(b.itm * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

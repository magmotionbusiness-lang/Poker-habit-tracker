"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { tokens } from "@/config/tokens";
import type { LedgerEvent } from "@/lib/bankroll/bankroll";
import { formatMoney } from "@/lib/money";

const KIND_LABEL: Record<LedgerEvent["kind"], string> = {
  session: "Session",
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  transfer: "Transfer",
  adjustment: "Adjustment",
};

/**
 * Bankroll over time. Deposits/withdrawals are hollow markers so money moved in and out is
 * visually distinct from results; "results" mode plots only the session-result line.
 */
export function LedgerChart({
  events,
  currency,
  mode,
  height = 210,
}: {
  events: readonly LedgerEvent[];
  currency: string;
  mode: "balance" | "results";
  height?: number;
}) {
  const data = events
    .filter((e) => mode === "balance" || e.kind === "session")
    .map((e, i) => ({
      i,
      value: mode === "balance" ? e.balance : e.results,
      kind: e.kind,
      delta: e.delta,
      at: e.at,
    }));
  if (mode === "results")
    data.unshift({ i: -1, value: 0, kind: "session", delta: 0, at: events[0]?.at ?? "" });
  if (data.length < 2)
    return (
      <p className="py-10 text-center text-sm text-ink-muted">
        Log a couple of sessions to see the graph.
      </p>
    );
  const fmt = (m: number) => formatMoney({ minor: m, currency }, { compact: true });
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <figure
      className="m-0"
      aria-label={`${mode === "balance" ? "Bankroll balance" : "Cumulative results"} over ${data.length} events`}
    >
      <div style={{ height }} className="-mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="ledger-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={tokens.primary} stopOpacity={0.35} />
                <stop offset="100%" stopColor={tokens.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="at"
              tickFormatter={date}
              tickLine={false}
              axisLine={false}
              tick={{ fill: tokens.inkMuted, fontSize: 11 }}
              minTickGap={36}
            />
            <YAxis
              tickFormatter={fmt}
              width={50}
              tickLine={false}
              axisLine={false}
              tick={{ fill: tokens.inkMuted, fontSize: 11 }}
            />
            <Tooltip
              cursor={{ stroke: tokens.lavender, strokeWidth: 1, strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
                if (!active || !p) return null;
                return (
                  <div className="rounded-md border border-line-accent bg-surface-2/95 px-3 py-2 text-sm shadow-accent backdrop-blur">
                    <p className="text-ink-muted">
                      {p.at ? date(p.at) : "Start"} · {KIND_LABEL[p.kind]}
                    </p>
                    <p className="num font-semibold text-ink">
                      {formatMoney({ minor: p.value, currency })}
                    </p>
                    {p.i >= 0 && (
                      <p className="num text-xs text-ink-soft">
                        {formatMoney({ minor: p.delta, currency }, { signed: true })}
                      </p>
                    )}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={tokens.lavender}
              strokeWidth={2}
              fill="url(#ledger-fill)"
              isAnimationActive
              animationDuration={1300}
              animationEasing="ease-out"
              activeDot={{
                r: 5,
                fill: tokens.lavenderPale,
                stroke: tokens.surface,
                strokeWidth: 2,
              }}
              dot={(props: {
                cx?: number;
                cy?: number;
                index?: number;
                payload?: { kind: string };
              }) => {
                const { cx, cy, payload, index } = props;
                if (cx == null || cy == null || !payload || payload.kind === "session")
                  return <g key={index} />;
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={tokens.surface}
                    stroke={tokens.inkSoft}
                    strokeWidth={2}
                  />
                );
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {mode === "balance" && (
        <figcaption className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
          <span
            className="inline-block size-2.5 rounded-full border-2 border-ink-soft"
            aria-hidden
          />{" "}
          Deposit / withdrawal
        </figcaption>
      )}
    </figure>
  );
}

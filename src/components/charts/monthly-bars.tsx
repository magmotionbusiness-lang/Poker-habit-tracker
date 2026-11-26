"use client";

import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { tokens } from "@/config/tokens";
import { formatMoney } from "@/lib/money";

/** Monthly net results. Diverging by sign (profit/loss tokens), sign also in the tooltip text. */
export function MonthlyBars({
  data,
  currency,
  height = 170,
}: {
  data: ReadonlyArray<{ month: string; net: number }>;
  currency: string;
  height?: number;
}) {
  if (!data.length) return null;
  const label = (m: string) =>
    new Date(`${m}-15T12:00:00`).toLocaleDateString(undefined, { month: "short" });
  return (
    <div style={{ height }} className="-mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={[...data]} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <XAxis
            dataKey="month"
            tickFormatter={label}
            tickLine={false}
            axisLine={false}
            tick={{ fill: tokens.inkMuted, fontSize: 11 }}
          />
          <YAxis
            tickFormatter={(m: number) => formatMoney({ minor: m, currency }, { compact: true })}
            width={50}
            tickLine={false}
            axisLine={false}
            tick={{ fill: tokens.inkMuted, fontSize: 11 }}
          />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.18)" />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as { month: string; net: number } | undefined;
              return active && p ? (
                <div className="rounded-md border border-line-accent bg-surface-2/95 px-3 py-2 text-sm shadow-accent">
                  <p className="text-ink-muted">
                    {new Date(`${p.month}-15T12:00:00`).toLocaleDateString(undefined, {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="num font-semibold text-ink">
                    {formatMoney({ minor: p.net, currency }, { signed: true })}
                  </p>
                </div>
              ) : null;
            }}
          />
          <Bar dataKey="net" radius={[4, 4, 4, 4]} maxBarSize={28} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.month} fill={d.net >= 0 ? tokens.success : tokens.danger} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

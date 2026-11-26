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
import { formatMoney } from "@/lib/money";

export type BankrollPoint = { label: string; minor: number };

/**
 * Cumulative bankroll line. Single series → no legend; the card title names it.
 * Crosshair + tooltip on hover/touch; recessive grid; one y-axis.
 */
export function BankrollChart({
  data,
  currency,
  height = 200,
}: {
  data: readonly BankrollPoint[];
  currency: string;
  height?: number;
}) {
  const fmt = (minor: number) => formatMoney({ minor, currency }, { compact: true });
  return (
    <div style={{ height }} className="-mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={[...data]} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="bankroll-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tokens.primary} stopOpacity={0.35} />
              <stop offset="100%" stopColor={tokens.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: tokens.inkMuted, fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tickFormatter={fmt}
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fill: tokens.inkMuted, fontSize: 11 }}
          />
          <Tooltip
            cursor={{ stroke: tokens.lavender, strokeWidth: 1, strokeDasharray: "3 3" }}
            content={({ active, payload, label }) =>
              active && payload?.[0] ? (
                <div className="rounded-md border border-line-accent bg-surface-2/95 px-3 py-2 text-sm shadow-accent backdrop-blur">
                  <p className="text-ink-muted">{label}</p>
                  <p className="num font-semibold text-ink">
                    {formatMoney({ minor: Number(payload[0].value), currency })}
                  </p>
                </div>
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey="minor"
            stroke={tokens.lavender}
            strokeWidth={2}
            fill="url(#bankroll-fill)"
            activeDot={{ r: 5, fill: tokens.lavenderPale, stroke: tokens.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { tokens } from "@/config/tokens";
import { formatMoney } from "@/lib/money";

/** Stack over the session; dashed line = total invested. Single series, so no legend. */
export function ChipGraph({
  points,
  invested,
  currency,
  height = 140,
}: {
  points: ReadonlyArray<{ at: string; stack: number }>;
  invested: number;
  currency: string;
  height?: number;
}) {
  if (points.length < 2) return null;
  const t0 = Date.parse(points[0]!.at);
  const data = points.map((p) => ({
    min: Math.round((Date.parse(p.at) - t0) / 60_000),
    stack: p.stack,
  }));
  const fmt = (m: number) => formatMoney({ minor: m, currency }, { compact: true });
  return (
    <div style={{ height }} className="-mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <XAxis
            dataKey="min"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(m: number) =>
              `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`
            }
            tickLine={false}
            axisLine={false}
            tick={{ fill: tokens.inkMuted, fontSize: 11 }}
          />
          <YAxis
            tickFormatter={fmt}
            width={44}
            tickLine={false}
            axisLine={false}
            tick={{ fill: tokens.inkMuted, fontSize: 11 }}
            domain={["auto", "auto"]}
          />
          <ReferenceLine
            y={invested}
            stroke={tokens.inkSubtle}
            strokeDasharray="4 4"
            label={{ value: "In", fill: tokens.inkMuted, fontSize: 10, position: "insideTopLeft" }}
          />
          <Tooltip
            cursor={{ stroke: tokens.lavender, strokeDasharray: "3 3" }}
            content={({ active, payload }) =>
              active && payload?.[0] ? (
                <div className="rounded-md border border-line-accent bg-surface-2/95 px-3 py-2 text-sm shadow-accent">
                  <p className="num font-semibold">
                    {formatMoney({ minor: Number(payload[0].value), currency })}
                  </p>
                </div>
              ) : null
            }
          />
          <Line
            type="stepAfter"
            dataKey="stack"
            stroke={tokens.lavender}
            strokeWidth={2}
            dot={{ r: 3, fill: tokens.lavenderPale, stroke: tokens.surface, strokeWidth: 2 }}
            isAnimationActive
            animationDuration={1300}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

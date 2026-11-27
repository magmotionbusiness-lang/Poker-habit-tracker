"use client";

import { useMemo } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { useHands } from "@/lib/db/hooks";
import { POSITION_ORDER } from "@/lib/insights/positions";
import { cn } from "@/lib/utils";

/** Position heatmap from logged hands: average bb per hand, by seat. */
export function PositionMap() {
  const hands = useHands();
  const rows = useMemo(() => {
    if (!hands) return null;
    const m = new Map<string, { bb: number; n: number }>();
    for (const h of hands) {
      if (!h.hero_position || h.net_bb == null) continue;
      const cur = m.get(h.hero_position) ?? { bb: 0, n: 0 };
      m.set(h.hero_position, { bb: cur.bb + h.net_bb, n: cur.n + 1 });
    }
    return POSITION_ORDER.filter((p) => m.has(p)).map((p) => {
      const v = m.get(p)!;
      return { pos: p, avg: v.bb / v.n, n: v.n };
    });
  }, [hands]);
  if (!rows || rows.filter((r) => r.n > 0).length < 2) return null;
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.avg)));
  return (
    <Card>
      <CardHeader eyebrow="By position · logged hands" />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {rows.map((r, i) => {
          const t = Math.min(1, Math.abs(r.avg) / max);
          return (
            <div
              key={r.pos}
              className={cn(
                "heat-in rounded-md border px-2 py-2.5 text-center",
                r.avg >= 0 ? "border-success/30" : "border-danger/30",
              )}
              style={{
                animationDelay: `${i * 60}ms`,
                background:
                  r.avg >= 0
                    ? `rgba(52,211,153,${0.06 + t * 0.28})`
                    : `rgba(248,113,113,${0.06 + t * 0.28})`,
              }}
            >
              <p className="text-xs font-semibold text-ink-soft">{r.pos}</p>
              <p
                className={cn(
                  "num font-display text-lg font-semibold",
                  r.avg >= 0 ? "text-success" : "text-danger",
                )}
              >
                {r.avg >= 0 ? "+" : "−"}
                {Math.abs(r.avg).toFixed(1)}
              </p>
              <p className="text-[10px] text-ink-muted">bb/hand · {r.n}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-ink-subtle">
        From hands you chose to log (big pots are over-represented) — a review guide, not a win
        rate.
      </p>
    </Card>
  );
}

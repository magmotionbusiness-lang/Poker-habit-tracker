"use client";

import { useMemo } from "react";
import {
  Brain,
  CalendarDays,
  Clock,
  Coins,
  Flame,
  MapPin,
  Moon,
  Sun,
  ThermometerSun,
  type LucideIcon,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { insightsCopy } from "@/content/insights";
import { useRates } from "@/lib/db/derived";
import { useSessions, useToday, useVenues } from "@/lib/db/hooks";
import { formatMoney } from "@/lib/money";
import { useAppStore } from "@/lib/store/app-store";
import { type Dimension, type Group, whatsWorking } from "@/lib/stats/whats-working";
import { cn } from "@/lib/utils";

const ICON: Record<Dimension, LucideIcon> = {
  rating: Brain,
  stakes: Coins,
  venue: MapPin,
  length: Clock,
  weekday: CalendarDays,
  timeOfDay: Sun,
  warmUp: Flame,
  sleep: Moon,
  tilt: ThermometerSun,
};

/** Best vs worst group per dimension, biggest lever first. */
export function WhatsWorking() {
  const currency = useAppStore((s) => s.prefs.currency);
  const sessions = useSessions();
  const venues = useVenues();
  const { tz } = useToday();
  const rates = useRates([currency, ...new Set((sessions ?? []).map((s) => s.currency))]);
  const list = useMemo(() => {
    if (!sessions || !venues) return null;
    const names = new Map(venues.map((v) => [v.id, v.name]));
    return whatsWorking(sessions, currency, rates, tz, (id) => names.get(id)).slice(0, 3);
  }, [sessions, venues, currency, rates, tz]);
  if (!list) return null;

  const hourly = (g: Group) =>
    `${g.hourly >= 0 ? "+" : "−"}${formatMoney({ minor: Math.abs(g.hourly), currency }, { trimZeroCents: true })}/h`;
  const max = Math.max(
    1,
    ...list.flatMap((i) => [Math.abs(i.best.hourly), Math.abs(i.worst.hourly)]),
  );

  return (
    <Card>
      <CardHeader eyebrow={insightsCopy.title} />
      {list.length === 0 ? (
        <p className="text-sm text-ink-muted">{insightsCopy.empty}</p>
      ) : (
        <ul className="space-y-4">
          {list.map((i, n) => {
            const Icon = ICON[i.dimension];
            return (
              <li key={i.dimension} className="pop-in" style={{ animationDelay: `${n * 90}ms` }}>
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <span className="grid size-7 place-items-center rounded-full bg-pill text-lavender">
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  {insightsCopy.lead[i.dimension]}
                </p>
                {[i.best, i.worst].map((g, k) => (
                  <div
                    key={g.label}
                    className="mb-1.5 grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-2 text-xs"
                  >
                    <span className="truncate text-ink-soft">{g.label}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-field">
                      <span
                        className={cn(
                          "progress-grow block h-full rounded-full",
                          g.hourly >= 0 ? "bg-success" : "bg-danger",
                        )}
                        style={{
                          width: `${Math.max(4, (Math.abs(g.hourly) / max) * 100)}%`,
                          animationDelay: `${n * 90 + k * 60}ms`,
                        }}
                      />
                    </span>
                    <span
                      className={cn(
                        "num font-semibold",
                        g.hourly >= 0 ? "text-success" : "text-danger",
                      )}
                    >
                      {hourly(g)}
                    </span>
                  </div>
                ))}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-ink-subtle">{insightsCopy.footnote}</p>
    </Card>
  );
}

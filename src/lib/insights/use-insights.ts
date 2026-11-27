"use client";

import { useMemo } from "react";
import { useRates } from "@/lib/db/derived";
import { useHands, useNow, useSessions, useToday, useVenues } from "@/lib/db/hooks";
import { formatMoney } from "@/lib/money";
import { useAppStore } from "@/lib/store/app-store";
import { generateInsights, type Insight } from "./engine";

/** Money formatter in the display currency ("+$24", "−$11"). */
export function useFmt() {
  const currency = useAppStore((s) => s.prefs.currency);
  return useMemo(
    () =>
      (minor: number, signed = false) =>
        formatMoney({ minor, currency }, { signed, trimZeroCents: true }),
    [currency],
  );
}

/** All insights for the player, best first (null while loading). */
export function useInsights(): Insight[] | null {
  const currency = useAppStore((s) => s.prefs.currency);
  const sessions = useSessions();
  const hands = useHands();
  const venues = useVenues();
  const { tz } = useToday();
  const now = useNow(10 * 60_000);
  const fmt = useFmt();
  const rates = useRates([currency, ...new Set((sessions ?? []).map((s) => s.currency))]);
  return useMemo(() => {
    if (!sessions || !hands || !venues) return null;
    const names = new Map(venues.map((v) => [v.id, v.name]));
    return generateInsights({
      sessions,
      hands,
      currency,
      rates,
      tz,
      now,
      venueName: (id) => names.get(id),
      fmt,
    });
  }, [sessions, hands, venues, currency, rates, tz, now, fmt]);
}

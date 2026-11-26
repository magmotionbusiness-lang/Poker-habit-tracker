"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Lightbulb, X } from "lucide-react";
import { nudges } from "@/content/nudges";
import { addDays, localDate, startOfWeek } from "@/lib/dates/dates";
import { useHands, useNow, useRules, useSessions, useSettings } from "@/lib/db/hooks";
import { saveSettings } from "@/lib/db/repo";
import { pickNudge } from "@/lib/growth/nudges";
import { useAppStore } from "@/lib/store/app-store";
import { resultIn } from "@/lib/stats/session-math";

/** One gentle, contextual nudge at most once a week. */
export function NudgeCard({ today, tz, streak }: { today: string; tz: string; streak: number }) {
  const settings = useSettings();
  const rules = useRules();
  const hands = useHands();
  const sessions = useSessions();
  const currency = useAppStore((s) => s.prefs.currency);
  const now = useNow(60_000);

  let pick: ReturnType<typeof pickNudge> = null;
  if (settings && rules && hands && sessions) {
    const from = addDays(startOfWeek(today), -7);
    const to = addDays(startOfWeek(today), -1);
    const last = sessions.filter(
      (s) =>
        s.status === "finished" &&
        localDate(s.started_at, tz) >= from &&
        localDate(s.started_at, tz) <= to,
    );
    pick = pickNudge(
      nudges,
      {
        rulesCount: rules.length,
        handsReviewed: hands.filter((h) => h.review?.reviewed_at).length,
        streak,
        lastWeekNet: last.length
          ? last.reduce((a, s) => a + (resultIn(s, currency, {}, true) ?? 0), 0)
          : null,
        status: settings.uts?.status ?? null,
      },
      settings.nudges,
      now,
    );
  }

  const id = pick?.id;
  const isNew = pick?.isNew;
  useEffect(() => {
    if (!id || !isNew || !settings) return;
    void saveSettings({
      nudges: { ...settings.nudges, [`nudge:${id}`]: new Date().toISOString() },
    });
  }, [id, isNew, settings]);

  const n = nudges.find((x) => x.id === id);
  if (!n || !settings) return null;
  return (
    <div className="pop-in relative flex gap-3 rounded-lg border border-line-accent bg-surface px-4 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-pill text-gold">
        <Lightbulb className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 pr-6">
        <p className="text-sm font-semibold">{n.title}</p>
        <p className="mt-0.5 text-sm text-ink-muted">{n.body}</p>
        <Link href={n.href} className="mt-1.5 inline-block text-sm font-semibold text-lavender">
          {n.cta} →
        </Link>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() =>
          void saveSettings({
            nudges: { ...settings.nudges, [`nudge-x:${n.id}`]: new Date().toISOString() },
          })
        }
        className="absolute top-2 right-2 grid size-8 place-items-center rounded-full text-ink-muted hover:bg-field"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

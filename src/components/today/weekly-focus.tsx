"use client";

import Link from "next/link";
import { Crosshair, NotebookPen } from "lucide-react";
import { weeklyReview } from "@/content/weekly-review";
import { addDays, isoWeekday, startOfWeek } from "@/lib/dates/dates";
import { useSettings } from "@/lib/db/hooks";

/**
 * Last week's "focus for next week" answer, carried into this week — and from Friday,
 * a nudge to write this week's review if it isn't done.
 */
export function WeeklyFocus({ today }: { today: string }) {
  const settings = useSettings();
  if (!settings) return null;
  const week = startOfWeek(today);
  const focus = settings.weeklyReviews[addDays(week, -7)]?.focus;
  const due = isoWeekday(today) >= 5 && !settings.weeklyReviews[week];
  if (!focus && !due) return null;
  return (
    <div className="space-y-2">
      {focus && (
        <div className="flex items-start gap-3 rounded-lg border border-line-accent bg-surface px-4 py-3">
          <Crosshair className="mt-0.5 size-4 shrink-0 text-lavender" aria-hidden />
          <div>
            <p className="eyebrow">{weeklyReview.focusEyebrow}</p>
            <p className="mt-0.5 text-sm font-medium">{focus}</p>
          </div>
        </div>
      )}
      {due && (
        <Link
          href="/progress#weekly-review"
          className="flex items-center gap-3 rounded-lg border border-dashed border-line-accent px-4 py-3 text-sm font-semibold text-lavender"
        >
          <NotebookPen className="size-4" aria-hidden /> {weeklyReview.cta}
        </Link>
      )}
    </div>
  );
}

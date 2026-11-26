"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import { weeklyReview } from "@/content/weekly-review";
import { saveSettings } from "@/lib/db/repo";
import type { UserSettings, WeeklyReview } from "@/lib/db/settings";
import { celebrate } from "@/lib/store/celebrate";

type Answers = Pick<WeeklyReview, "well" | "leak" | "focus">;

/** Keep the last 26 weeks; keys are ISO dates (the week's Monday) so they sort. */
export function withReview(all: UserSettings["weeklyReviews"], week: string, review: WeeklyReview) {
  const next = { ...all, [week]: review };
  return Object.fromEntries(
    Object.entries(next)
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .slice(0, 26),
  );
}

export function WeeklyReviewSheet({
  open,
  onClose,
  week,
  settings,
  summary,
}: {
  open: boolean;
  onClose: () => void;
  week: string;
  settings: UserSettings;
  summary?: React.ReactNode;
}) {
  const existing = settings.weeklyReviews[week];
  const [a, setA] = useState<Answers>({
    well: existing?.well ?? "",
    leak: existing?.leak ?? "",
    focus: existing?.focus ?? "",
  });
  const ok = Object.values(a).some((v) => v.trim());
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={weeklyReview.title}
      description="Three questions. Two minutes."
    >
      <div className="space-y-4">
        {summary}
        {weeklyReview.prompts.map((p) => (
          <div key={p.key}>
            <Label htmlFor={`wr-${p.key}`}>{p.label}</Label>
            <Textarea
              id={`wr-${p.key}`}
              className="min-h-16"
              placeholder={p.placeholder}
              value={a[p.key]}
              onChange={(e) => setA((x) => ({ ...x, [p.key]: e.target.value }))}
            />
          </div>
        ))}
        <Button
          block
          size="lg"
          disabled={!ok}
          onClick={async () => {
            const review: WeeklyReview = {
              well: a.well.trim(),
              leak: a.leak.trim(),
              focus: a.focus.trim(),
              at: new Date().toISOString(),
            };
            await saveSettings({ weeklyReviews: withReview(settings.weeklyReviews, week, review) });
            if (!existing) celebrate("day");
            toast.success(weeklyReview.done);
            onClose();
          }}
        >
          Save review
        </Button>
      </div>
    </Sheet>
  );
}

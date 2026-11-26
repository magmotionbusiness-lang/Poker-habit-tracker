"use client";

import { useState } from "react";
import { Play, Square } from "lucide-react";
import { Chips } from "@/components/forms/chips";
import { formatClock } from "@/components/sessions/timer";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import { logStudy } from "@/lib/db/actions";
import { useNow } from "@/lib/db/hooks";
import type { StudyCategory } from "@/lib/domain/types";
import { useStudyTimer, useUi } from "@/lib/store/ui-store";

const CATEGORIES: Array<{ value: StudyCategory; label: string }> = [
  { value: "solver", label: "Solver work" },
  { value: "course", label: "Course video" },
  { value: "ranges", label: "Range drilling" },
  { value: "hand_review", label: "Hand review" },
  { value: "group", label: "Group study" },
  { value: "coaching", label: "Coaching call" },
  { value: "other", label: "Other" },
];

export function StudySheet() {
  const { sheet, close } = useUi();
  const timer = useStudyTimer();
  const now = useNow(1000);
  const [minutes, setMinutes] = useState<number | null>(30);
  const [custom, setCustom] = useState("");
  const [category, setCategory] = useState<StudyCategory>("solver");
  const [note, setNote] = useState("");
  const elapsed = timer.startedAt ? now - Date.parse(timer.startedAt) : 0;

  async function save(mins: number, startedAt?: string) {
    if (mins < 1) return toast.error("Study for at least a minute first.");
    await logStudy(Math.min(1440, mins), category, note, startedAt);
    toast.success(`${mins} min of study logged. That's how the edge gets built.`);
    setNote("");
    close();
  }

  return (
    <Sheet
      open={sheet === "study"}
      onOpenChange={(o) => !o && close()}
      title="Log study"
      description="Minutes count toward your study habit and streak."
    >
      <div className="space-y-5">
        <div className="rounded-lg border border-line-accent bg-pill/40 p-4 text-center">
          <p className="eyebrow">Study timer</p>
          <p className="num mt-1 font-display text-4xl font-semibold">{formatClock(elapsed)}</p>
          {timer.startedAt ? (
            <Button
              className="mt-3"
              variant="danger"
              onClick={async () => {
                const mins = Math.round(elapsed / 60_000);
                const startedAt = timer.startedAt!;
                timer.stop();
                await save(mins, startedAt);
              }}
            >
              <Square aria-hidden /> Stop & log
            </Button>
          ) : (
            <Button
              className="mt-3"
              variant="outline"
              onClick={() => {
                timer.start();
                close();
                toast("Study timer running. Come back here to stop it.");
              }}
            >
              <Play aria-hidden /> Start timer
            </Button>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-ink-soft">Or log minutes</p>
          <Chips
            ariaLabel="Minutes"
            options={[15, 30, 45, 60, 90].map((m) => ({ value: m, label: `${m} min` }))}
            value={minutes}
            onChange={(v) => {
              setMinutes(v as number);
              setCustom("");
            }}
          />
          <Input
            className="mt-3"
            aria-label="Custom minutes"
            inputMode="numeric"
            placeholder="Custom minutes"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value.replace(/\D/g, ""));
              setMinutes(null);
            }}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-ink-soft">What did you study?</p>
          <Chips
            ariaLabel="Study category"
            size="sm"
            options={CATEGORIES}
            value={category}
            onChange={(v) => setCategory(v as StudyCategory)}
          />
        </div>
        <div>
          <Label htmlFor="study-note">Note (optional)</Label>
          <Input
            id="study-note"
            placeholder="BTN vs BB single-raised pots"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <Button
          size="lg"
          block
          onClick={() => save(minutes ?? Number(custom))}
          disabled={!minutes && !Number(custom)}
        >
          Log study
        </Button>
      </div>
    </Sheet>
  );
}

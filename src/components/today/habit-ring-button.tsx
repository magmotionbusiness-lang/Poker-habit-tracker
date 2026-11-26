"use client";

import { Check, Minus, Zap } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress";
import type { HabitDay } from "@/lib/habits/habits";
import { presetByKey } from "@/content/habits";
import { cn } from "@/lib/utils";

export function HabitRingButton({
  day,
  onTap,
  onMinus,
}: {
  day: HabitDay;
  onTap: () => void;
  onMinus?: () => void;
}) {
  const { habit, value, target, complete, applies } = day;
  const auto = presetByKey(habit.key)?.auto === "sessions";
  const label =
    habit.unit === "boolean"
      ? complete
        ? "Done"
        : auto
          ? "Auto"
          : "Tap"
      : habit.unit === "minutes"
        ? `${value}/${target}′`
        : `${value}/${target}`;
  return (
    <div className={cn("relative flex flex-col items-center gap-2", !applies && "opacity-45")}>
      <button
        type="button"
        disabled={!applies || auto}
        onClick={onTap}
        aria-label={`${habit.name}: ${value} of ${target}${complete ? ", done" : ""}${!applies ? " (only on play days)" : ""}`}
        className="flex w-full flex-col items-center gap-2 rounded-md py-2 transition-transform hover:bg-white/[0.03] active:scale-95 disabled:active:scale-100"
      >
        <ProgressRing value={value / target} label={habit.name}>
          {complete ? (
            <Check className="size-5 text-success" aria-hidden />
          ) : auto ? (
            <Zap className="size-4 text-ink-muted" aria-hidden />
          ) : (
            <span className="num text-[13px] font-semibold">{label}</span>
          )}
        </ProgressRing>
        <span className="line-clamp-2 text-center text-[13px] leading-tight text-ink-soft">
          {habit.name}
        </span>
      </button>
      {onMinus && value > 0 && habit.unit === "count" && (
        <button
          type="button"
          onClick={onMinus}
          aria-label={`Undo one ${habit.name}`}
          className="absolute top-0 right-1 grid size-7 place-items-center rounded-full bg-field text-ink-muted"
        >
          <Minus className="size-3.5" />
        </button>
      )}
    </div>
  );
}

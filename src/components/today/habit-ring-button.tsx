"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Minus } from "lucide-react";
import { useRef } from "react";
import type { HabitDay } from "@/lib/habits/habits";
import { presetByKey } from "@/content/habits";
import { cn } from "@/lib/utils";
import { HabitIcon } from "./habit-icon";

const SIZE = 64;
const STROKE = 5;

/**
 * One habit as a tappable ring: icon in the middle, ring fills with a spring, and on
 * completion it turns mint, pops a check and bursts (the caller fires the celebration).
 */
export function HabitRingButton({
  day,
  onTap,
  onMinus,
}: {
  day: HabitDay;
  onTap: (el: HTMLElement | null) => void;
  onMinus?: () => void;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLButtonElement>(null);
  const { habit, value, target, complete, applies } = day;
  const auto = presetByKey(habit.key)?.auto === "sessions";
  const r = (SIZE - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, value / target);
  const label =
    habit.unit === "boolean"
      ? complete
        ? "Done"
        : auto
          ? "Auto"
          : "Tap"
      : habit.unit === "minutes"
        ? `${value}/${target}m`
        : `${value}/${target}`;

  return (
    <div className={cn("relative flex flex-col items-center gap-1.5", !applies && "opacity-40")}>
      <motion.button
        ref={ref}
        type="button"
        data-silent
        disabled={!applies || auto}
        whileTap={reduce ? undefined : { scale: 0.9 }}
        onClick={() => onTap(ref.current)}
        aria-label={`${habit.name}: ${value} of ${target}${complete ? ", done" : ""}${!applies ? " (only on play days)" : ""}`}
        className="relative grid place-items-center rounded-full"
        style={{ width: SIZE, height: SIZE }}
      >
        <svg width={SIZE} height={SIZE} className="absolute inset-0 -rotate-90" aria-hidden>
          <defs>
            <linearGradient id={`ring-${habit.id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--lavender-pale)" />
              <stop offset="100%" stopColor="var(--primary)" />
            </linearGradient>
          </defs>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={r}
            fill="none"
            stroke="var(--field)"
            strokeWidth={STROKE}
          />
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={r}
            fill="none"
            stroke={complete ? "var(--success)" : `url(#ring-${habit.id})`}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={false}
            animate={{ strokeDashoffset: c * (1 - frac) }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 16 }}
            style={{
              filter: complete
                ? "drop-shadow(0 0 6px rgba(52,211,153,0.6))"
                : frac > 0
                  ? "drop-shadow(0 0 5px rgba(124,92,255,0.55))"
                  : "none",
            }}
          />
        </svg>
        <span
          className={cn(
            "grid size-11 place-items-center rounded-full transition-colors",
            complete ? "bg-success/15 text-success" : "bg-pill text-lavender",
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            {complete ? (
              <motion.span
                key="done"
                initial={reduce ? false : { scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 18 }}
              >
                <Check className="size-6" strokeWidth={2.6} aria-hidden />
              </motion.span>
            ) : (
              <motion.span
                key="icon"
                initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <HabitIcon habitKey={habit.key} className="size-5" />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </motion.button>
      <span className="line-clamp-1 max-w-[92px] text-center text-[12px] leading-tight font-medium text-ink-soft">
        {habit.name}
      </span>
      <span
        className={cn(
          "num text-[11px] font-semibold",
          complete ? "text-success" : "text-ink-muted",
        )}
      >
        {label}
      </span>
      {onMinus && value > 0 && habit.unit === "count" && (
        <button
          type="button"
          onClick={onMinus}
          aria-label={`Undo one ${habit.name}`}
          className="absolute -top-1 right-1 grid size-6 place-items-center rounded-full border border-line bg-surface-2 text-ink-muted"
        >
          <Minus className="size-3" />
        </button>
      )}
    </div>
  );
}

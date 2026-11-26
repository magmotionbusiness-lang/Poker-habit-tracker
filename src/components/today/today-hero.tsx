"use client";

import { useGentle } from "@/lib/motion/motion";
import { useSettled } from "@/lib/motion/use-settled";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Snowflake } from "lucide-react";
import { StreakFlame } from "@/components/brand/streak-flame";
import { CountUp } from "@/components/fx/count-up";
import { nextMilestone } from "@/lib/streaks/streaks";

const SIZE = 124;
const STROKE = 9;

/**
 * The day at a glance: a big ring for today's commitment around the streak flame,
 * with the one sentence that matters ("1 more habit keeps your 23-day streak").
 */
export function TodayHero({
  done,
  required,
  streak,
  freezes,
  maxFreezes,
}: {
  done: number;
  required: number;
  streak: number;
  freezes: number;
  maxFreezes: number;
}) {
  const reduce = useGentle();
  const delay = useSettled() ? 0 : 0.3;
  const r = (SIZE - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const frac = required ? Math.min(1, done / required) : 1;
  const counts = required === 0 || done >= required;
  const left = Math.max(0, required - done);
  const next = nextMilestone(streak);
  const line =
    required === 0
      ? "Rest day. Your streak is safe."
      : counts
        ? "Today counts. Streak safe."
        : streak > 0
          ? `${left} more habit${left === 1 ? "" : "s"} keeps your ${streak}-day streak`
          : `${left} habit${left === 1 ? "" : "s"} starts your streak`;

  return (
    <Link
      href="/progress"
      className="relative block overflow-hidden rounded-xl border border-line-accent bg-[radial-gradient(ellipse_at_20%_30%,rgba(124,92,255,0.28),transparent_60%),var(--surface)] p-4 shadow-card"
    >
      <div className="flex items-center gap-4">
        <div
          className="relative grid shrink-0 place-items-center"
          style={{ width: SIZE, height: SIZE }}
        >
          <svg width={SIZE} height={SIZE} className="absolute inset-0 -rotate-90" aria-hidden>
            <defs>
              <linearGradient id="hero-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#c5b6ff" />
                <stop offset="100%" stopColor="#6847f0" />
              </linearGradient>
            </defs>
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={STROKE}
            />
            <motion.circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={r}
              fill="none"
              stroke={counts ? "var(--success)" : "url(#hero-ring)"}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={c}
              initial={{ strokeDashoffset: c }}
              animate={{ strokeDashoffset: c * (1 - frac) }}
              transition={
                reduce
                  ? { duration: 1.2, ease: [0.16, 1, 0.3, 1], delay }
                  : { type: "spring", stiffness: 38, damping: 12, delay }
              }
              style={{
                filter: counts
                  ? "drop-shadow(0 0 10px rgba(52,211,153,0.55))"
                  : "drop-shadow(0 0 10px rgba(124,92,255,0.6))",
              }}
            />
          </svg>
          <div className="flex flex-col items-center">
            <StreakFlame count={streak} size="md" />
            <span className="mt-0.5 text-[10px] font-semibold tracking-[0.12em] text-ink-muted uppercase">
              day streak
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-1">Today</p>
          <p className="font-display text-[22px] leading-tight font-semibold">
            {counts && required > 0 && (
              <Check
                className="anim-bounce-in mr-1 inline size-5 -translate-y-0.5 text-success"
                strokeWidth={3}
                aria-hidden
              />
            )}
            {line}
          </p>
          <p className="num mt-2 text-sm text-ink-muted">
            <CountUp value={Math.min(done, required)} />/{required} habits
            {next && (
              <>
                {" "}
                · {next - streak}d to {next}
              </>
            )}
          </p>
          <p
            className="mt-1 flex items-center gap-1 text-xs text-ink-subtle"
            aria-label={`${freezes} of ${maxFreezes} streak freezes`}
          >
            {Array.from({ length: maxFreezes }, (_, i) => (
              <Snowflake
                key={i}
                style={{ animationDelay: `${i * -3}s` }}
                className={`size-3.5 ${i < freezes ? "anim-spin-slow text-lavender" : "text-ink-subtle/40"}`}
                aria-hidden
              />
            ))}
            <span className="ml-1">freezes</span>
          </p>
        </div>
      </div>
    </Link>
  );
}

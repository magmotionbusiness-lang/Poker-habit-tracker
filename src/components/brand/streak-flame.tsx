"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Streak flame with a gentle spring; dims when the streak is 0. */
export function StreakFlame({
  count,
  size = "md",
  className,
}: {
  count: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const reduce = useReducedMotion();
  const active = count > 0;
  const px = size === "sm" ? 22 : size === "md" ? 30 : 56;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-label={`${count}-day streak`}
      role="img"
    >
      <motion.svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        aria-hidden
        initial={false}
        animate={active && !reduce ? { scale: [1, 1.07, 1], rotate: [0, -2, 0] } : { scale: 1 }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        style={{ filter: active ? "drop-shadow(0 0 10px rgba(124,92,255,0.65))" : "none" }}
      >
        <defs>
          <linearGradient id="flame" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor={active ? "#c5b6ff" : "#3a3a4a"} />
            <stop offset="100%" stopColor={active ? "#6847f0" : "#22222e"} />
          </linearGradient>
        </defs>
        <path
          d="M12 2c.6 3.2-1.2 5-2.7 6.7C7.8 10.4 6.5 12 6.5 14.6A5.5 5.5 0 0 0 12 20a5.5 5.5 0 0 0 5.5-5.4c0-2.4-1.2-4.1-2.2-5.3-.3 1.4-1 2.4-2 2.9.4-3.3-.2-6.9-1.3-10.2Z"
          fill="url(#flame)"
        />
        <path
          d="M12 20a2.8 2.8 0 0 1-2.8-2.8c0-1.6 1.3-2.5 2.1-3.7.5 1 .9 1.4 1.6 1.7.2-.7.2-1.4.1-2 1 1 1.8 2.2 1.8 3.9A2.8 2.8 0 0 1 12 20Z"
          fill={active ? "#fff" : "#4a4a5a"}
          fillOpacity={active ? 0.9 : 0.6}
        />
      </motion.svg>
      <span
        className={cn(
          "num font-display font-semibold tracking-[-0.02em]",
          size === "sm" && "text-base",
          size === "md" && "text-xl",
          size === "lg" && "text-5xl",
          !active && "text-ink-muted",
        )}
      >
        {count}
      </span>
    </span>
  );
}

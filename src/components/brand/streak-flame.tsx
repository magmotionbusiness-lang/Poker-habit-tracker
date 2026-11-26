"use client";

import { useGentle } from "@/lib/motion/motion";
import { motion } from "framer-motion";
import { CountUp } from "@/components/fx/count-up";
import { cn } from "@/lib/utils";

/** Streak flame with a gentle spring; dims when the streak is 0. */
export function StreakFlame({
  count,
  size = "md",
  hideCount = false,
  className,
}: {
  count: number;
  size?: "sm" | "md" | "lg";
  /** Just the flame (when the number is shown elsewhere). */
  hideCount?: boolean;
  className?: string;
}) {
  const reduce = useGentle();
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
        animate={
          !active
            ? { scale: 1 }
            : reduce
              ? {
                  filter: [
                    "drop-shadow(0 0 8px rgba(124,92,255,0.5))",
                    "drop-shadow(0 0 16px rgba(124,92,255,0.9))",
                    "drop-shadow(0 0 8px rgba(124,92,255,0.5))",
                  ],
                }
              : {
                  scale: [1, 1.09, 0.97, 1.06, 1],
                  rotate: [0, -3, 2, -1.5, 0],
                  y: [0, -1.5, 0, -1, 0],
                  filter: [
                    "drop-shadow(0 0 8px rgba(124,92,255,0.5))",
                    "drop-shadow(0 0 16px rgba(124,92,255,0.95))",
                    "drop-shadow(0 0 10px rgba(124,92,255,0.6))",
                    "drop-shadow(0 0 14px rgba(124,92,255,0.85))",
                    "drop-shadow(0 0 8px rgba(124,92,255,0.5))",
                  ],
                }
        }
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "50% 90%" }}
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
      {!hideCount && (
        <span
          className={cn(
            "num font-display font-semibold tracking-[-0.02em]",
            size === "sm" && "text-base",
            size === "md" && "text-xl",
            size === "lg" && "text-5xl",
            !active && "text-ink-muted",
          )}
        >
          <CountUp value={count} />
        </span>
      )}
    </span>
  );
}

"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";

/**
 * Numbers that count up to their value (stats, goals, streaks) and glide between values
 * when they change. Tabular, no layout shift. Counting isn't movement, so it plays in every
 * motion mode.
 */
export function CountUp({
  value,
  format = (v) => String(Math.round(v)),
  duration = 1.1,
  delay = 0.15,
  className,
}: {
  value: number;
  format?: (v: number) => string;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    const first = mv.get() === 0;
    const c = animate(mv, value, {
      duration: first ? duration : duration * 0.7,
      delay: first ? delay : 0,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => c.stop();
  }, [mv, value, duration, delay]);
  return <motion.span className={className}>{text}</motion.span>;
}

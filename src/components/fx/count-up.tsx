"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect } from "react";

/** Numbers that count up to their value (stats, goals, streaks). Tabular, no layout shift. */
export function CountUp({
  value,
  format = (v) => String(Math.round(v)),
  duration = 0.9,
  className,
}: {
  value: number;
  format?: (v: number) => string;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    const c = animate(mv, value, { duration: reduce ? 0 : duration, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [mv, value, duration, reduce]);
  return <motion.span className={className}>{text}</motion.span>;
}

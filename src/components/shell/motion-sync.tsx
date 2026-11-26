"use client";

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { useMotionMode } from "@/lib/motion/motion";

/** Keeps <html data-motion> in sync with the setting; framer never auto-disables animations. */
export function MotionSync({ children }: { children: React.ReactNode }) {
  const mode = useMotionMode();
  useEffect(() => {
    document.documentElement.dataset.motion = mode;
  }, [mode]);
  return <MotionConfig reducedMotion="never">{children}</MotionConfig>;
}

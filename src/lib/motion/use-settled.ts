"use client";

import { useEffect, useState } from "react";

/** False during the entrance choreography, true after `ms` — so later updates respond instantly. */
export function useSettled(ms = 1200): boolean {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return settled;
}

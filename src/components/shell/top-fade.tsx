"use client";

import { useEffect } from "react";

/** Soft fade under the iOS status bar, shown only once the page is scrolled. */
export function TopFade() {
  useEffect(() => {
    const root = document.documentElement;
    const on = () => {
      const v = window.scrollY > 6 ? "true" : "false";
      if (root.dataset.scrolled !== v) root.dataset.scrolled = v;
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return <div aria-hidden className="top-fade" />;
}

"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const noop = () => () => {};

/**
 * Renders children only in the browser. App screens read IndexedDB, the clock and the
 * user's timezone — none of which exist at prerender time — so the static shell ships the
 * fallback and the screen renders right after hydration (instant, works offline).
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  return mounted ? children : fallback;
}

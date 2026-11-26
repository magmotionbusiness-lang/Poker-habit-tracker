"use client";

import { useSyncExternalStore } from "react";
import { useAppStore } from "./app-store";

/** True once the persisted store has been read from localStorage on the client. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useAppStore.persist.onFinishHydration(cb),
    () => useAppStore.persist.hasHydrated(),
    () => false,
  );
}

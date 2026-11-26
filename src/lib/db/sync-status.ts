"use client";

import { create } from "zustand";

export type SyncState = "off" | "idle" | "syncing" | "offline" | "error";
export const useSyncStatus = create<{
  state: SyncState;
  lastSyncedAt: string | null;
  error: string | null;
  set: (
    p: Partial<{ state: SyncState; lastSyncedAt: string | null; error: string | null }>,
  ) => void;
}>((set) => ({ state: "off", lastSyncedAt: null, error: null, set: (p) => set(p) }));

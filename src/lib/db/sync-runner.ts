"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { onLocalWrite } from "./repo";
import { pull, push, redeemPendingCode, syncSettings } from "./sync";
import { useSyncStatus } from "./sync-status";

/**
 * Runs sync cycles while the user is signed in: on start, after local writes (debounced),
 * when the device comes back online, when the app returns to the foreground, and every minute.
 */
export function startSync(client: SupabaseClient, userId: string): () => void {
  const status = useSyncStatus.getState().set;
  let running = false;
  let queued = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cycle = async () => {
    if (running) {
      queued = true;
      return;
    }
    if (!navigator.onLine) {
      status({ state: "offline" });
      return;
    }
    running = true;
    status({ state: "syncing" });
    try {
      await syncSettings(client, userId);
      await push(client, userId);
      await pull(client);
      await redeemPendingCode(client);
      status({ state: "idle", lastSyncedAt: new Date().toISOString(), error: null });
    } catch (e) {
      status({ state: "error", error: e instanceof Error ? e.message : String(e) });
    } finally {
      running = false;
      if (queued) {
        queued = false;
        void cycle();
      }
    }
  };
  const soon = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(cycle, 1500);
  };
  const onVisible = () => document.visibilityState === "visible" && cycle();
  const onOffline = () => status({ state: "offline" });

  const unsub = onLocalWrite(soon);
  window.addEventListener("online", cycle);
  window.addEventListener("offline", onOffline);
  document.addEventListener("visibilitychange", onVisible);
  const interval = setInterval(cycle, 60_000);
  void cycle();

  return () => {
    unsub();
    window.removeEventListener("online", cycle);
    window.removeEventListener("offline", onOffline);
    document.removeEventListener("visibilitychange", onVisible);
    clearInterval(interval);
    if (timer) clearTimeout(timer);
    status({ state: "off" });
  };
}

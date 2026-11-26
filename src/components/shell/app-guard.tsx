"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSettings } from "@/lib/db/hooks";
import { getSettings } from "@/lib/db/repo";
import { useSyncStatus } from "@/lib/db/sync-status";
import { isSupabaseConfigured } from "@/lib/env";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/use-hydrated";

/**
 * Routing guard for the tabbed app:
 *  - no guest session and no account → welcome screen
 *  - onboarding not done → onboarding (for a fresh sign-in, wait for the first sync so an
 *    existing account isn't sent through onboarding again)
 */
export function AppGuard() {
  const hydrated = useHydrated();
  const mode = useAppStore((s) => s.mode);
  const settings = useSettings();
  const sync = useSyncStatus();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (mode === null) return router.replace("/");
    if (!settings || settings.onboardingDone) return;
    const waitingForFirstSync =
      mode === "account" &&
      isSupabaseConfigured &&
      !sync.lastSyncedAt &&
      sync.state !== "error" &&
      sync.state !== "offline";
    if (waitingForFirstSync) return;
    // Live queries can briefly replay a cached value from before onboarding finished;
    // confirm with a direct read before redirecting.
    let cancelled = false;
    getSettings().then((fresh) => {
      if (!cancelled && !fresh.onboardingDone) router.replace("/onboarding");
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, mode, settings, sync.lastSyncedAt, sync.state, router]);
  return null;
}

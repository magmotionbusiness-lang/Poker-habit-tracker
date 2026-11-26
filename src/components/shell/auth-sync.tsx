"use client";

import { useEffect } from "react";
import { toast } from "@/components/ui/toaster";
import { startSync } from "@/lib/db/sync-runner";
import { useAppStore } from "@/lib/store/app-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Keeps device mode in sync with the Supabase session, confirms magic-link sign-ins and
 * runs background sync while signed in. Guest data written before sign-up is already in
 * the outbox, so the first sync uploads it to the new account.
 */
export function AuthSync() {
  const setMode = useAppStore((s) => s.setMode);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("signed_in") === "1") {
      url.searchParams.delete("signed_in");
      window.history.replaceState(null, "", url);
      toast.success("You're signed in. Your data now backs up to your account.");
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let stop: (() => void) | null = null;
    let userId: string | null = null;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null;
      if (next === userId) return;
      stop?.();
      stop = null;
      userId = next;
      if (next) {
        setMode("account");
        stop = startSync(supabase, next);
      }
    });
    return () => {
      data.subscription.unsubscribe();
      stop?.();
    };
  }, [setMode]);
  return null;
}

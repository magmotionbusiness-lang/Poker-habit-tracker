"use client";

import { useEffect } from "react";
import { toast } from "@/components/ui/toaster";
import { useAppStore } from "@/lib/store/app-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** Keeps device mode in sync with the Supabase session and confirms magic-link sign-ins. */
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
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) setMode("account");
    });
    return () => data.subscription.unsubscribe();
  }, [setMode]);
  return null;
}

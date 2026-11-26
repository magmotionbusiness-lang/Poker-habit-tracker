import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";

/**
 * Service-role client for trusted server jobs (cron reminders, lead capture). Bypasses
 * RLS — never import from client code, never expose its results unfiltered.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const key = serverEnv().SUPABASE_SERVICE_ROLE_KEY;
  if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL || !key) return null;
  return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

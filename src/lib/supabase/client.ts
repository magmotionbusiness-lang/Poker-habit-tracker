"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";

let client: SupabaseClient | null | undefined;

/**
 * Browser Supabase client, or `null` when Supabase isn't configured (guest-only build).
 * Data access from the client always goes through RLS with the user's own JWT.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  client = isSupabaseConfigured
    ? createBrowserClient(
        publicEnv.NEXT_PUBLIC_SUPABASE_URL!,
        publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      )
    : null;
  return client;
}

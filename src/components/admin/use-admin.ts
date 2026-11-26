"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type AdminAccess =
  | { state: "loading" }
  | { state: "no-backend" }
  | { state: "signed-out" }
  | { state: "not-admin" }
  | { state: "admin"; client: SupabaseClient; userId: string };

/** Is the signed-in user an admin? (UI gate only — RLS and the server enforce it.) */
export function useAdminAccess(): AdminAccess {
  const [access, setAccess] = useState<AdminAccess>({ state: "loading" });
  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      queueMicrotask(() => setAccess({ state: "no-backend" }));
      return;
    }
    let live = true;
    void (async () => {
      const { data } = await client.auth.getUser();
      if (!live) return;
      if (!data.user) return setAccess({ state: "signed-out" });
      const { data: me } = await client
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      if (!live) return;
      setAccess(
        me?.role === "admin"
          ? { state: "admin", client, userId: data.user.id }
          : { state: "not-admin" },
      );
    })();
    return () => {
      live = false;
    };
  }, []);
  return access;
}

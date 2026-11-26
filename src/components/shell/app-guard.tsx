"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/use-hydrated";

/** Sends first-time visitors (no guest session, no account) to the welcome screen. */
export function AppGuard() {
  const hydrated = useHydrated();
  const mode = useAppStore((s) => s.mode);
  const router = useRouter();
  useEffect(() => {
    if (hydrated && mode === null) router.replace("/");
  }, [hydrated, mode, router]);
  return null;
}

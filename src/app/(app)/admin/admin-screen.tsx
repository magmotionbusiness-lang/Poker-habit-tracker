"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { AnnouncementsAdmin } from "@/components/admin/announcements-admin";
import { BroadcastAdmin } from "@/components/admin/broadcast-admin";
import { CodesAdmin } from "@/components/admin/codes-admin";
import { DailyHandsAdmin } from "@/components/admin/daily-hands-admin";
import { LeadsAdmin } from "@/components/admin/leads-admin";
import { AdminOverview } from "@/components/admin/overview";
import { useAdminAccess } from "@/components/admin/use-admin";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS = [
  ["overview", "Overview"],
  ["announce", "Announcements"],
  ["daily", "Daily Hand"],
  ["codes", "Codes"],
  ["leads", "Leads"],
  ["push", "Push"],
] as const;
type Tab = (typeof TABS)[number][0];

/** Nelson's control room. Every write is enforced by RLS and audited in Postgres. */
export function AdminScreen() {
  const access = useAdminAccess();
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="space-y-5 pt-3">
      <Link
        href="/more"
        className="-ml-2 inline-flex h-11 items-center gap-1.5 px-2 text-sm font-semibold text-ink-soft"
      >
        <ArrowLeft className="size-4" aria-hidden /> More
      </Link>
      <header>
        <p className="eyebrow mb-1.5">Up The Stakes</p>
        <h1 className="text-[34px] font-semibold">Admin</h1>
      </header>

      {access.state === "loading" ? (
        <p className="text-sm text-ink-muted">Checking access…</p>
      ) : access.state !== "admin" ? (
        <EmptyState
          icon={<ShieldCheck />}
          title="Admins only"
          body={
            access.state === "no-backend"
              ? "Accounts aren't configured on this deployment."
              : access.state === "signed-out"
                ? "Sign in with an admin account."
                : "This account isn't an admin. Ask the owner to set your role to admin in Supabase."
          }
          action={
            access.state === "signed-out" ? (
              <Button asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Admin sections"
            className="-mx-4 flex scrollbar-none gap-2 overflow-x-auto px-4"
          >
            {TABS.map(([k, label]) => (
              <button
                key={k}
                role="tab"
                type="button"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={cn(
                  "press h-9 shrink-0 rounded-full border px-4 text-sm font-semibold",
                  tab === k
                    ? "border-primary bg-pill text-lavender-pale"
                    : "border-line text-ink-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div key={tab} className="pop-in">
            {tab === "overview" && <AdminOverview client={access.client} />}
            {tab === "announce" && <AnnouncementsAdmin client={access.client} />}
            {tab === "daily" && <DailyHandsAdmin client={access.client} />}
            {tab === "codes" && <CodesAdmin client={access.client} />}
            {tab === "leads" && <LeadsAdmin client={access.client} />}
            {tab === "push" && <BroadcastAdmin />}
          </div>
        </>
      )}
    </div>
  );
}

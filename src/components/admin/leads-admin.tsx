"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CheckCircle2, CircleAlert, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";
import { toCsv } from "@/lib/csv/csv";
import { downloadText } from "@/lib/export/export";

type Lead = {
  id: string;
  name: string | null;
  email: string;
  instagram: string | null;
  list: string;
  source: string;
  utm: Record<string, string> | null;
  consent_text: string;
  consented_at: string;
  synced_to_provider_at: string | null;
  provider_error: string | null;
  created_at: string;
};

/** Waitlist + newsletter leads with consent proof; CSV export for the email tool. */
export function LeadsAdmin({ client }: { client: SupabaseClient }) {
  const [rows, setRows] = useState<Lead[] | null>(null);
  useEffect(() => {
    void client
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000)
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setRows((data ?? []) as Lead[]);
      });
  }, [client]);

  function exportCsv() {
    if (!rows) return;
    const csv = toCsv(rows, [
      { header: "created_at", value: (r) => r.created_at },
      { header: "list", value: (r) => r.list },
      { header: "name", value: (r) => r.name },
      { header: "email", value: (r) => r.email },
      { header: "instagram", value: (r) => r.instagram },
      { header: "source", value: (r) => r.source },
      { header: "utm_source", value: (r) => r.utm?.utm_source },
      { header: "utm_medium", value: (r) => r.utm?.utm_medium },
      { header: "utm_campaign", value: (r) => r.utm?.utm_campaign },
      { header: "consent_text", value: (r) => r.consent_text },
      { header: "consented_at", value: (r) => r.consented_at },
      { header: "synced_to_provider_at", value: (r) => r.synced_to_provider_at },
      { header: "provider_error", value: (r) => r.provider_error },
    ]);
    downloadText(`stakers-leads-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <div className="space-y-3">
      <Button block variant="outline" disabled={!rows?.length} onClick={exportCsv}>
        <Download aria-hidden /> Export {rows?.length ?? 0} leads (CSV, with consent)
      </Button>
      <ul className="stagger space-y-2">
        {(rows ?? []).slice(0, 200).map((l) => (
          <li key={l.id}>
            <Card className="flex items-center gap-3 p-4">
              {l.synced_to_provider_at ? (
                <CheckCircle2
                  className="size-5 shrink-0 text-success"
                  aria-label="In email provider"
                />
              ) : (
                <CircleAlert
                  className="size-5 shrink-0 text-gold"
                  aria-label={l.provider_error ?? "Not synced"}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {l.name ? `${l.name} · ` : ""}
                  {l.email}
                </p>
                <p className="truncate text-xs text-ink-muted">
                  {l.list} · {l.utm?.utm_source ?? l.source} · {l.created_at.slice(0, 10)}
                  {l.instagram ? ` · ${l.instagram}` : ""}
                </p>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

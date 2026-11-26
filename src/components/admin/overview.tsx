"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Activity, Flame, Mail, Users } from "lucide-react";
import { CountUp } from "@/components/fx/count-up";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";

type Stats = {
  users: number;
  onboarded: number;
  students: number;
  alumni: number;
  dau: number;
  wau: number;
  mau: number;
  signups_7d: number;
  streaks: Record<string, number>;
  leads: Record<string, number>;
  leads_7d: number;
  lead_sources: Record<string, number>;
  leads_unsynced: number;
};

const BUCKETS = ["0", "1-6", "7-29", "30-99", "100+"];

/** Anonymised aggregates only (admin_stats() in Postgres). */
export function AdminOverview({ client }: { client: SupabaseClient }) {
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    void client
      .rpc("admin_stats")
      .then(({ data, error }) => (error ? setErr(error.message) : setS(data as Stats)));
  }, [client]);
  if (err) return <p className="text-sm text-danger">{err}</p>;
  if (!s) return <p className="text-sm text-ink-muted">Loading…</p>;

  const tiles = [
    { icon: Users, label: "Players", value: s.users, sub: `+${s.signups_7d} this week` },
    {
      icon: Activity,
      label: "Weekly active",
      value: s.wau,
      sub: `${s.dau} today · ${s.mau} monthly`,
    },
    {
      icon: Flame,
      label: "Students · alumni",
      value: s.students + s.alumni,
      sub: `${s.students} students · ${s.alumni} alumni`,
    },
    {
      icon: Mail,
      label: "Leads",
      value: (s.leads.waitlist ?? 0) + (s.leads.newsletter ?? 0),
      sub: `${s.leads.waitlist ?? 0} waitlist · ${s.leads.newsletter ?? 0} email · +${s.leads_7d} wk`,
    },
  ];
  const streakMax = Math.max(1, ...Object.values(s.streaks));
  const sources = Object.entries(s.lead_sources);
  const sourceMax = Math.max(1, ...sources.map(([, n]) => n));
  return (
    <div className="stagger space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {tiles.map(({ icon: Icon, label, value, sub }) => (
          <Card key={label} className="p-4">
            <Icon className="anim-float mb-2 size-5 text-lavender" aria-hidden />
            <p className="num font-display text-3xl font-semibold">
              <CountUp value={value} />
            </p>
            <p className="text-sm font-medium">{label}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{sub}</p>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader eyebrow="Streak distribution (days)" />
        <div className="space-y-2">
          {BUCKETS.map((b) => (
            <div key={b} className="grid grid-cols-[3.5rem_1fr_2.5rem] items-center gap-2 text-sm">
              <span className="num text-ink-soft">{b}</span>
              <ProgressBar value={(s.streaks[b] ?? 0) / streakMax} label={`${b}-day streaks`} />
              <span className="num text-right font-semibold">{s.streaks[b] ?? 0}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader eyebrow="Where leads come from" />
        {sources.length === 0 ? (
          <p className="text-sm text-ink-muted">No leads yet.</p>
        ) : (
          <div className="space-y-2">
            {sources.map(([src, n]) => (
              <div
                key={src}
                className="grid grid-cols-[6rem_1fr_2.5rem] items-center gap-2 text-sm"
              >
                <span className="truncate text-ink-soft">{src}</span>
                <ProgressBar value={n / sourceMax} label={`Leads from ${src}`} />
                <span className="num text-right font-semibold">{n}</span>
              </div>
            ))}
          </div>
        )}
        {s.leads_unsynced > 0 && (
          <p className="mt-3 text-xs text-gold">
            {s.leads_unsynced} lead(s) not yet in the email provider — export them from Leads.
          </p>
        )}
      </Card>
    </div>
  );
}

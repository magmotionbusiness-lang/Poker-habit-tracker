"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowUpRight, Megaphone, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  announcementDefaults,
  announcementLabels,
  sampleAnnouncements,
} from "@/content/announcements";
import { db } from "@/lib/db/db";
import { useNow, useSettings } from "@/lib/db/hooks";
import { saveSettings } from "@/lib/db/repo";
import { activeAnnouncements, type Announcement, countdownParts } from "@/lib/growth/announcements";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

let fetched = false;

/** Published announcements (Supabase, cached on device) + content defaults + demo samples. */
export function useAnnouncements() {
  const settings = useSettings();
  const now = useNow(1000);
  const cached = useLiveQuery(
    async () => (await db().meta.get("announcements"))?.value as Announcement[] | undefined,
    [],
  );
  const demo = useLiveQuery(async () => Boolean((await db().meta.get("demoIds"))?.value), []);
  useEffect(() => {
    if (fetched) return;
    fetched = true;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    void client
      .from("announcements")
      .select("id,type,title,body,image_url,starts_at,ends_at,cta_label,cta_url,audience,priority")
      .eq("published", true)
      .gte("starts_at", new Date(Date.now() - 60 * 86_400_000).toISOString())
      .limit(20)
      .then(({ data }) => {
        if (data) void db().meta.put({ key: "announcements", value: data });
      });
  }, []);
  if (!settings) return { list: [], now, settings };
  const all = [
    ...(cached ?? []),
    ...announcementDefaults,
    ...(demo ? sampleAnnouncements(now) : []),
  ];
  const list = activeAnnouncements(all, now, settings.uts?.status ?? null, settings.nudges);
  return { list, now, settings };
}

function Countdown({ to, now }: { to: number; now: number }) {
  const p = countdownParts(to - now);
  const cells: Array<[number, string]> = [
    [p.d, "days"],
    [p.h, "hrs"],
    [p.m, "min"],
    [p.s, "sec"],
  ];
  return (
    <div
      className="mt-3 grid grid-cols-4 gap-2"
      role="timer"
      aria-label={`${p.d} days ${p.h} hours ${p.m} minutes left`}
    >
      {cells.map(([v, l]) => (
        <div key={l} className="rounded-md border border-line-accent bg-field/70 py-2 text-center">
          <p className="num font-display text-2xl leading-none font-semibold tabular-nums">
            {String(v).padStart(2, "0")}
          </p>
          <p className="mt-1 text-[10px] tracking-[0.12em] text-ink-muted uppercase">{l}</p>
        </div>
      ))}
    </div>
  );
}

export function AnnouncementCard({
  a,
  now,
  onDismiss,
}: {
  a: Announcement & { phase: "upcoming" | "live" };
  now: number;
  onDismiss?: () => void;
}) {
  const external = a.cta_url?.startsWith("http");
  return (
    <Card
      glow
      className="relative overflow-hidden bg-[radial-gradient(ellipse_at_100%_0%,rgba(124,92,255,0.3),transparent_60%),var(--surface)]"
    >
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss announcement"
          className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-ink-muted hover:bg-field"
        >
          <X className="size-4" />
        </button>
      )}
      <Badge dot pulse={a.phase === "live"} className="mb-3">
        {a.phase === "live" ? "Live now" : announcementLabels[a.type]}
      </Badge>
      <p className="flex items-start gap-2 pr-8 font-display text-xl leading-tight font-semibold">
        <Megaphone className="mt-0.5 size-5 shrink-0 text-lavender" aria-hidden />
        {a.title}
      </p>
      {a.body && <p className="mt-1.5 text-sm text-ink-muted">{a.body}</p>}
      {a.phase === "upcoming" && <Countdown to={Date.parse(a.starts_at)} now={now} />}
      {a.cta_url && a.cta_label && (
        <Button className="mt-4" block asChild>
          {external ? (
            <a href={a.cta_url} target="_blank" rel="noopener noreferrer">
              {a.cta_label} <ArrowUpRight aria-hidden />
            </a>
          ) : (
            <Link href={a.cta_url}>{a.cta_label}</Link>
          )}
        </Button>
      )}
    </Card>
  );
}

/** The single most important announcement, as a dismissible countdown card (Today). */
export function AnnouncementSlot() {
  const { list, now, settings } = useAnnouncements();
  const [hidden, setHidden] = useState<string | null>(null);
  const top = list.find((a) => a.id !== hidden);
  if (!top || !settings) return null;
  return (
    <AnnouncementCard
      a={top}
      now={now}
      onDismiss={() => {
        setHidden(top.id);
        void saveSettings({
          nudges: { ...settings.nudges, [`ann:${top.id}`]: new Date().toISOString() },
        });
      }}
    />
  );
}

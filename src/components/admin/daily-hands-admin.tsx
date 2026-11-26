"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CalendarPlus, Check, Trash2 } from "lucide-react";
import { PlayingCard } from "@/components/poker/playing-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { dailyHands } from "@/content/daily-hands";
import { localDate, addDays } from "@/lib/dates/dates";
import { type DailyHandRow, scheduleSpots } from "@/lib/growth/daily-hand";

const pairs = (s: string) => s.match(/.{2}/g) ?? [];

/** Schedule, review and approve Daily Hand spots. Only approved rows reach players. */
export function DailyHandsAdmin({ client }: { client: SupabaseClient }) {
  const [rows, setRows] = useState<DailyHandRow[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);
  useEffect(() => {
    let live = true;
    const today = localDate(Date.now(), Intl.DateTimeFormat().resolvedOptions().timeZone);
    void client
      .from("daily_hands")
      .select("id,date,spot,options,answer,explanation,approved")
      .gte("date", addDays(today, -7))
      .order("date")
      .limit(120)
      .then(({ data, error }) => {
        if (!live) return;
        if (error) toast.error(error.message);
        setRows((data ?? []) as DailyHandRow[]);
      });
    return () => {
      live = false;
    };
  }, [client, version]);

  async function seed() {
    const today = localDate(Date.now(), Intl.DateTimeFormat().resolvedOptions().timeZone);
    const taken = new Set((rows ?? []).map((r) => r.date));
    const plan = scheduleSpots(dailyHands, taken, addDays(today, 1));
    const { error } = await client.from("daily_hands").insert(
      plan.map(({ date, spot }) => ({
        date,
        spot: {
          game: spot.game,
          position: spot.position,
          cards: spot.cards,
          board: spot.board,
          situation: spot.situation,
        },
        options: spot.options,
        answer: spot.answer,
        explanation: spot.explanation,
        author: "sample",
        approved: false,
      })),
    );
    if (error) return toast.error(error.message);
    toast.success(`Scheduled ${plan.length} sample spots as drafts`);
    load();
  }

  async function setApproved(r: DailyHandRow, approved: boolean) {
    const { error } = await client.from("daily_hands").update({ approved }).eq("id", r.id);
    if (error) return toast.error(error.message);
    setRows((xs) => xs?.map((x) => (x.id === r.id ? { ...x, approved } : x)) ?? null);
  }

  async function remove(r: DailyHandRow) {
    if (!confirm(`Delete the spot for ${r.date}?`)) return;
    const { error } = await client.from("daily_hands").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  }

  const approved = rows?.filter((r) => r.approved).length ?? 0;
  return (
    <div className="space-y-3">
      <Card className="flex items-center gap-3 p-4">
        <p className="flex-1 text-sm text-ink-muted">
          <span className="num font-semibold text-ink">{approved}</span> approved ·{" "}
          <span className="num font-semibold text-ink">{(rows?.length ?? 0) - approved}</span>{" "}
          waiting. Until a day has an approved spot, players see the built-in sample.
        </p>
        <Button size="sm" variant="outline" onClick={seed}>
          <CalendarPlus aria-hidden /> Schedule samples
        </Button>
      </Card>
      <ul className="stagger space-y-2">
        {(rows ?? []).map((r) => (
          <li key={r.id}>
            <Card className="p-4">
              <button
                type="button"
                className="flex w-full items-center gap-3 text-left"
                onClick={() => setOpen(open === r.id ? null : r.id)}
                aria-expanded={open === r.id}
              >
                <span className="num w-20 shrink-0 text-sm font-semibold">{r.date.slice(5)}</span>
                <span className="flex gap-0.5">
                  {pairs(r.spot.cards ?? "").map((c) => (
                    <PlayingCard key={c} card={c} size="xs" />
                  ))}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
                  {r.spot.situation}
                </span>
                {r.approved && <Check className="size-4 text-success" aria-label="Approved" />}
              </button>
              {open === r.id && (
                <div className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
                  <p className="text-ink-muted">
                    {r.spot.game} · {r.spot.position}
                    {r.spot.board ? ` · board ${r.spot.board}` : ""}
                  </p>
                  <ol className="list-inside list-decimal">
                    {r.options.map((o, i) => (
                      <li key={o} className={i === r.answer ? "font-semibold text-success" : ""}>
                        {o}
                      </li>
                    ))}
                  </ol>
                  <p className="text-ink-soft">{r.explanation}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <Switch
                      checked={r.approved}
                      onCheckedChange={(v) => setApproved(r, v)}
                      aria-label={`Approve spot for ${r.date}`}
                    />
                    <span className="flex-1">Approved</span>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Delete spot for ${r.date}`}
                      onClick={() => remove(r)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

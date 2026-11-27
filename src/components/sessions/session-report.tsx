"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Award, Clock, Gauge, Info } from "lucide-react";
import { CountUp } from "@/components/fx/count-up";
import { formatDuration } from "@/components/sessions/timer";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { updateSession } from "@/lib/db/actions";
import { useRates } from "@/lib/db/derived";
import { useSessions, useToday } from "@/lib/db/hooks";
import type { PokerSession } from "@/lib/domain/types";
import { sessionReport } from "@/lib/insights/reports";
import { useFmt } from "@/lib/insights/use-insights";
import { useGentle } from "@/lib/motion/motion";
import { play } from "@/lib/sfx/sfx";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";

const MOODS = [
  { v: 5, e: "😀", l: "Great" },
  { v: 4, e: "🙂", l: "Good" },
  { v: 3, e: "😐", l: "Neutral" },
  { v: 2, e: "😕", l: "Frustrated" },
  { v: 1, e: "😡", l: "Tilted" },
];

/**
 * The moment right after cash-out: the result counts up, the hourly and how it compares
 * to your 30-day average, a badge if you earned one, a variance note if you lost — and one
 * tap for how you felt (correlated with results later).
 */
export function SessionReportSheet({
  session,
  onClose,
}: {
  session: PokerSession;
  onClose: () => void;
}) {
  const currency = useAppStore((s) => s.prefs.currency);
  const sessions = useSessions() ?? [];
  const { tz } = useToday();
  const fmt = useFmt();
  const gentle = useGentle();
  const rates = useRates([currency, session.currency]);
  const [now] = useState(() => Date.now());
  const [mood, setMood] = useState<number | null>(session.mood ?? null);
  const r = sessionReport(session, sessions, { currency, rates, tz }, now);
  const up = r.result >= 0;

  async function pickMood(v: number) {
    setMood(v);
    play("tick", { progress: v / 5 });
    const fresh = sessions.find((x) => x.id === session.id) ?? session;
    await updateSession(fresh, { mood: v });
  }

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title="Session report"
      description="Logged. Here's how it went."
    >
      <div className="space-y-5">
        <div className="text-center">
          <p
            className={cn(
              "num font-display text-6xl font-semibold tracking-tight",
              up ? "text-success" : "text-danger",
            )}
          >
            <CountUp value={r.result} duration={1.4} format={(v) => fmt(Math.round(v), true)} />
          </p>
          <div className="mt-3 flex justify-center gap-4 text-sm text-ink-soft">
            <span className="flex items-center gap-1.5">
              <Clock className="size-4 text-lavender" aria-hidden /> {formatDuration(r.durationMs)}
            </span>
            {r.hourly !== null && (
              <span className="num flex items-center gap-1.5">
                <Gauge className="size-4 text-lavender" aria-hidden /> {fmt(r.hourly, true)}/h
              </span>
            )}
          </div>
        </div>

        {r.badges.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {r.badges.map((b, i) => (
              <motion.span
                key={b}
                initial={gentle ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.15, type: "spring", stiffness: 400, damping: 18 }}
                className="anim-shine flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm font-semibold text-gold"
              >
                <Award className="size-4" aria-hidden /> {b}
              </motion.span>
            ))}
          </div>
        )}

        {r.vs30d !== null && (
          <p className="rounded-md bg-field px-3 py-2.5 text-center text-sm text-ink-soft">
            {r.vs30d >= 0
              ? `${r.vs30d}% above your 30-day hourly average.`
              : `${Math.abs(r.vs30d)}% below your 30-day hourly average.`}
          </p>
        )}
        {r.varianceNote && (
          <p className="flex gap-2 rounded-md bg-pill px-3 py-2.5 text-sm text-ink-soft">
            <Info className="mt-0.5 size-4 shrink-0 text-lavender" aria-hidden /> {r.varianceNote}
          </p>
        )}

        <div>
          <p className="mb-2 text-center text-sm font-medium text-ink-soft">How did you feel?</p>
          <div className="flex justify-between gap-1.5" role="radiogroup" aria-label="Mood">
            {MOODS.map((m) => (
              <button
                key={m.v}
                type="button"
                role="radio"
                aria-checked={mood === m.v}
                aria-label={m.l}
                onClick={() => pickMood(m.v)}
                className={cn(
                  "press flex flex-1 flex-col items-center gap-1 rounded-lg border py-2.5 transition-colors",
                  mood === m.v ? "border-primary bg-pill" : "border-line bg-field",
                )}
              >
                <motion.span
                  className="text-2xl"
                  animate={mood === m.v && !gentle ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                  transition={{ duration: 0.35 }}
                >
                  {m.e}
                </motion.span>
                <span className="text-[10px] text-ink-muted">{m.l}</span>
              </button>
            ))}
          </div>
        </div>

        <Button block size="lg" onClick={onClose}>
          Done
        </Button>
      </div>
    </Sheet>
  );
}

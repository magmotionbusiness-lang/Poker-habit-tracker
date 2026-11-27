"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { startSession } from "@/lib/db/actions";
import { useNow, useRunningSession, useSessions, useToday, useVenues } from "@/lib/db/hooks";
import { playingTonight, usualGame } from "@/lib/insights/smart-defaults";
import { useFmt } from "@/lib/insights/use-insights";
import { stakesLabel } from "@/lib/stats/session-math";

/**
 * "Playing tonight?" — on the weekday and hour you usually play, your usual game is one
 * tap away (stake, room and buy-in pre-filled from your history).
 */
export function PlayingTonight() {
  const router = useRouter();
  const sessions = useSessions();
  const venues = useVenues();
  const running = useRunningSession();
  const { tz } = useToday();
  const now = useNow(60_000);
  const fmt = useFmt();
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!sessions || running || hidden) return null;
  const when = playingTonight(sessions, now, tz);
  const usual = usualGame(sessions);
  if (!when || !usual) return null;
  const venue = venues?.find((v) => v.id === usual.venue_id)?.name;
  const label = `${usual.format === "cash" ? stakesLabel({ ...usual, straddle_minor: null, fees_minor: 0 }) : "Tournament"} ${usual.game}${venue ? ` · ${venue}` : ""}`;

  return (
    <div className="pop-in relative overflow-hidden rounded-xl border border-line-accent bg-[radial-gradient(ellipse_at_100%_0%,rgba(124,92,255,0.3),transparent_60%),var(--surface)] p-4">
      <button
        type="button"
        aria-label="Not tonight"
        onClick={() => setHidden(true)}
        className="absolute top-2 right-2 grid size-8 place-items-center rounded-full text-ink-muted hover:bg-field"
      >
        <X className="size-4" />
      </button>
      <p className="eyebrow">Playing tonight?</p>
      <p className="mt-1 font-display text-xl font-semibold">{label}</p>
      <p className="text-sm text-ink-muted">
        Your usual · buy-in {fmt(usual.buy_in_minor)} · you&apos;ve played {when.times} of the last
        8 weeks
      </p>
      <Button
        className="mt-3"
        block
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { count, ...preset } = usual; // count is analysis-only, not a session column
            await startSession(preset);
            router.push("/session");
            toast("Session started. Play your A-game.");
          } catch {
            toast.error("Couldn't start the session");
            setBusy(false);
          }
        }}
      >
        <Play aria-hidden /> Start my usual
      </Button>
    </div>
  );
}

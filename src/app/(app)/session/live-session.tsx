"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, NotebookPen, Pause, Play, Plus, Square, TrendingUp } from "lucide-react";
import { ChipGraph } from "@/components/charts/chip-graph";
import { Chips, RatingPicker } from "@/components/forms/chips";
import { MoneyInput } from "@/components/forms/money-input";
import { formatClock, formatDuration } from "@/components/sessions/timer";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, Stat } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import { celebrate } from "@/lib/store/celebrate";
import { errorMessage } from "@/lib/errors";
import {
  addStackUpdate,
  endSession,
  pauseSession,
  resumeSession,
  setHabitValue,
} from "@/lib/db/actions";
import { db } from "@/lib/db/db";
import {
  useNow,
  useRunningSession,
  useSessions,
  useStackUpdates,
  useToday,
  useVenues,
} from "@/lib/db/hooks";
import { localDate } from "@/lib/dates/dates";
import type { GameRating, PokerSession } from "@/lib/domain/types";
import { formatMoney } from "@/lib/money";
import { haptic } from "@/lib/haptics";
import { sessionDurationMs, stakesLabel } from "@/lib/stats/session-math";
import { tiltSignals } from "@/lib/insights/tilt-guard";
import { getSettings } from "@/lib/db/repo";
import { useUi } from "@/lib/store/ui-store";
import { useSessionReport } from "@/lib/store/report-store";

export function LiveSession() {
  const session = useRunningSession();
  const open = useUi((s) => s.open);
  if (session === undefined) return null;
  if (session === null)
    return (
      <div className="pt-6">
        <EmptyState
          icon={<Play />}
          title="No session running"
          body="Start one from a shortcut and the timer, stack graph and stop-loss guardrails take care of the rest."
          action={<Button onClick={() => open("start-session")}>Start session</Button>}
        />
      </div>
    );
  return <Running session={session} />;
}

function Running({ session }: { session: PokerSession }) {
  const openSheet = useUi((s) => s.open);
  const now = useNow(1000);
  const updates = useStackUpdates(session.id) ?? [];
  const venues = useVenues() ?? [];
  const [sheet, setSheet] = useState<"stack" | "addon" | "end" | null>(null);
  const showReport = useSessionReport((s) => s.show);
  const [amount, setAmount] = useState<number | null>(null);

  const ccy = session.currency;
  const money = (m: number, signed = false) =>
    formatMoney({ minor: m, currency: ccy }, { signed, trimZeroCents: true });
  const invested = session.buy_in_minor + session.rebuys_minor;
  const stack = updates.at(-1)?.stack_minor ?? session.buy_in_minor;
  const up = stack - invested;
  const ms = sessionDurationMs(session, now);
  const venue = venues.find((v) => v.id === session.venue_id)?.name;
  const stopHit =
    session.stop_loss_minor != null &&
    session.stop_loss_minor > 0 &&
    -up >= session.stop_loss_minor;
  const lengthHit = session.max_length_min != null && ms >= session.max_length_min * 60_000;
  const paused = Boolean(session.paused_at);

  const points = [
    { at: session.started_at, stack: session.buy_in_minor },
    ...updates.map((u) => ({ at: u.at, stack: u.stack_minor })),
  ];
  if (points.length > 1 && points[1]!.at === points[0]!.at) points.shift();

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={`${session.is_live ? "Live" : "Online"} · ${session.game} ${stakesLabel(session)}${venue ? ` · ${venue}` : ""}`}
        title={<span className="num">{formatClock(ms)}</span>}
        action={
          paused ? (
            <Badge variant="gold" dot>
              Paused
            </Badge>
          ) : (
            <Badge dot pulse>
              Live
            </Badge>
          )
        }
      />

      {(stopHit || lengthHit) && (
        <Card className="flex gap-3 border-gold/40 bg-gold/5">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
          <div>
            <p className="font-semibold text-ink">
              {stopHit ? "Stop-loss reached" : "Planned session length reached"}
            </p>
            <p className="text-sm text-ink-muted">
              {stopHit
                ? "This was your plan before you sat down. Respect it — the game will be there tomorrow."
                : "Results tend to drop when you're tired. Finish the orbit and call it."}
            </p>
          </div>
        </Card>
      )}

      <PatternCheck session={session} now={now} stack={stack} />

      <Card glow>
        <CardHeader
          eyebrow="Stack"
          action={<TrendingUp className="size-5 text-lavender" strokeWidth={1.6} aria-hidden />}
        />
        <div className="flex items-end justify-between gap-3">
          <Stat value={money(stack)} label={`In for ${money(invested)}`} />
          <p
            className={`num pb-1 text-lg font-semibold ${up > 0 ? "text-success" : up < 0 ? "text-danger" : "text-ink-muted"}`}
          >
            {money(up, true)}
          </p>
        </div>
        <div className="mt-4">
          <ChipGraph points={points} invested={invested} currency={ccy} />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          onClick={() => {
            setAmount(stack);
            setSheet("stack");
          }}
        >
          Update stack
        </Button>
        <Button
          size="lg"
          variant="secondary"
          onClick={() => {
            setAmount(session.buy_in_minor || null);
            setSheet("addon");
          }}
        >
          <Plus aria-hidden /> Add-on
        </Button>
        <Button
          variant="secondary"
          onClick={() => (paused ? resumeSession(session) : pauseSession(session))}
        >
          {paused ? <Play aria-hidden /> : <Pause aria-hidden />} {paused ? "Resume" : "Pause"}
        </Button>
        <Button variant="secondary" onClick={() => openSheet("express-hand")}>
          <NotebookPen aria-hidden /> Log hand
        </Button>
      </div>
      <Button
        variant="danger"
        block
        size="lg"
        onClick={() => {
          setAmount(stack);
          setSheet("end");
        }}
      >
        <Square aria-hidden /> End session
      </Button>
      {session.focus_point && (
        <p className="text-center text-sm text-ink-muted">Focus: {session.focus_point}</p>
      )}

      <Sheet
        open={sheet === "stack"}
        onOpenChange={(o) => !o && setSheet(null)}
        title="Update stack"
        description="Two taps. Back to the game."
      >
        <MoneyInput size="lg" autoFocus currency={ccy} value={amount} onChange={setAmount} />
        {session.stakes_bb_minor ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {[-50, -20, -10, 10, 20, 50].map((bbs) => (
              <Button
                key={bbs}
                size="sm"
                variant="secondary"
                className="num"
                onClick={() =>
                  setAmount(Math.max(0, (amount ?? stack) + bbs * session.stakes_bb_minor!))
                }
              >
                {bbs > 0 ? "+" : "−"}
                {Math.abs(bbs)}bb
              </Button>
            ))}
          </div>
        ) : null}
        <Button
          className="mt-5"
          size="lg"
          block
          disabled={amount === null}
          onClick={async () => {
            await addStackUpdate(session.id, amount!);
            haptic();
            setSheet(null);
          }}
        >
          Save
        </Button>
      </Sheet>

      <Sheet
        open={sheet === "addon"}
        onOpenChange={(o) => !o && setSheet(null)}
        title="Add-on / rebuy"
        description="Adds to what you've invested and to your stack."
      >
        <MoneyInput size="lg" autoFocus currency={ccy} value={amount} onChange={setAmount} />
        <Button
          className="mt-5"
          size="lg"
          block
          disabled={!amount}
          onClick={async () => {
            await addStackUpdate(session.id, stack + amount!, amount!);
            haptic();
            setSheet(null);
          }}
        >
          Add {amount ? money(amount) : ""}
        </Button>
      </Sheet>

      {/* Mounted on open so its fields start from the current stack, not a stale one. */}
      {sheet === "end" && (
        <EndSheet
          open
          onClose={() => setSheet(null)}
          session={session}
          defaultCashOut={stack}
          onDone={(s) => {
            setSheet(null);
            celebrate("day", null, { sound: "save" });
            showReport(s);
          }}
        />
      )}
    </div>
  );
}

function EndSheet({
  open,
  onClose,
  session,
  defaultCashOut,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  session: PokerSession;
  defaultCashOut: number;
  onDone: (s: PokerSession) => void;
}) {
  const cash = session.format === "cash";
  const ccy = session.currency;
  const [cashOut, setCashOut] = useState<number | null>(defaultCashOut);
  const [prize, setPrize] = useState<number | null>(null);
  const [bounties, setBounties] = useState<number | null>(null);
  const [position, setPosition] = useState("");
  const [field, setField] = useState("");
  const [tips, setTips] = useState<number | null>(null);
  const [rating, setRating] = useState<GameRating | null>(null);
  const [tilt, setTilt] = useState<number | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const [followed, setFollowed] = useState<"yes" | "no" | null>(null);
  const [takeaway, setTakeaway] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const done = await endSession(session, {
        cash_out_minor: cash ? (cashOut ?? 0) : 0,
        prize_minor: cash ? 0 : (prize ?? 0),
        bounties_minor: cash ? 0 : (bounties ?? 0),
        finish_position: cash ? null : Number(position) || null,
        field_size: cash ? null : Number(field) || null,
        tips_minor: tips ?? 0,
        game_rating: rating,
        tilt_rating: tilt,
        focus_rating: focus,
        followed_focus: followed === null ? null : followed === "yes",
        takeaway: takeaway.trim() || null,
      });
      // Filling in the cool-down completes the post-session habit.
      if (rating) {
        const settings = await getSettings();
        const cool = (await db().habits.toArray()).find((h) => h.key === "cool_down" && h.active);
        if (cool) await setHabitValue(cool.id, localDate(Date.now(), settings.timezone), 1);
      }
      onDone(done);
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't save"));
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="End session"
      description="Two minutes now saves hours of guessing later."
    >
      <div className="space-y-5">
        {cash ? (
          <MoneyInput
            size="lg"
            label="Cash out"
            currency={ccy}
            value={cashOut}
            onChange={setCashOut}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <MoneyInput label="Prize" currency={ccy} value={prize} onChange={setPrize} />
              <MoneyInput label="Bounties" currency={ccy} value={bounties} onChange={setBounties} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pos">Finished</Label>
                <Input
                  id="pos"
                  inputMode="numeric"
                  placeholder="9"
                  value={position}
                  onChange={(e) => setPosition(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <div>
                <Label htmlFor="field">Field size</Label>
                <Input
                  id="field"
                  inputMode="numeric"
                  placeholder="400"
                  value={field}
                  onChange={(e) => setField(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>
          </>
        )}
        <MoneyInput label="Tips (dealer, staff)" currency={ccy} value={tips} onChange={setTips} />
        <div>
          <p className="mb-2 text-sm font-medium text-ink-soft">How did you play?</p>
          <Chips
            ariaLabel="Game rating"
            options={[
              { value: "A", label: "A-game" },
              { value: "B", label: "B-game" },
              { value: "C", label: "C-game" },
            ]}
            value={rating}
            onChange={(v) => setRating(v as GameRating)}
          />
        </div>
        <RatingPicker label="Tilt" low="Calm" high="Steaming" value={tilt} onChange={setTilt} />
        <RatingPicker
          label="Focus"
          low="Distracted"
          high="Locked in"
          value={focus}
          onChange={setFocus}
        />
        {session.focus_point && (
          <div>
            <p className="mb-2 text-sm font-medium text-ink-soft">
              Did you follow your focus point?
            </p>
            <Chips
              ariaLabel="Followed focus point"
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "Not really" },
              ]}
              value={followed}
              onChange={(v) => setFollowed(v as "yes" | "no")}
            />
          </div>
        )}
        <div>
          <Label htmlFor="takeaway">One-line takeaway</Label>
          <Textarea
            id="takeaway"
            className="min-h-16"
            placeholder="Folded too much on the river vs regs."
            value={takeaway}
            onChange={(e) => setTakeaway(e.target.value)}
          />
        </div>
        <Button size="lg" block disabled={busy} onClick={save}>
          Save session
        </Button>
        <p className="text-center text-xs text-ink-subtle">
          Hands you logged this session are waiting in your review queue.{" "}
          <Link className="underline" href="/hands">
            Hands
          </Link>
        </p>
      </div>
    </Sheet>
  );
}

/**
 * "Outside your normal pattern" — neutral notes when tonight drifts from your own history
 * (re-buys, length, stake, depth of loss, late hour). Dismissible; never judgmental.
 */
function PatternCheck({
  session,
  now,
  stack,
}: {
  session: PokerSession;
  now: number;
  stack: number;
}) {
  const sessions = useSessions();
  const { tz } = useToday();
  const [dismissed, setDismissed] = useState<string[]>([]);
  if (!sessions) return null;
  const signals = tiltSignals(session, sessions, now, tz, stack, formatDuration).filter(
    (x) => !dismissed.includes(x.id),
  );
  if (!signals.length) return null;
  return (
    <Card className="pop-in border-line-accent bg-pill/40">
      <p className="eyebrow mb-1.5">Outside your normal pattern</p>
      <ul className="space-y-1.5 text-sm text-ink-soft">
        {signals.map((x) => (
          <li key={x.id}>· {x.text}</li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink-muted">
        Consider a short break before you decide to continue.
      </p>
      <Button
        size="sm"
        variant="ghost"
        className="mt-2 -ml-2"
        onClick={() => setDismissed((d) => [...d, ...signals.map((x) => x.id)])}
      >
        I&apos;m good
      </Button>
    </Card>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronFirst, ChevronLast, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { decisionInfo, replay, settle, streetMarkers } from "@/lib/poker/engine";
import { strengthLabel } from "@/lib/poker/evaluator";
import type { HandHistory, Street } from "@/lib/poker/hand-types";
import { cn } from "@/lib/utils";
import { chipLabel } from "./amount";
import { PokerTable, actionLabel } from "./poker-table";

const SPEEDS = [
  { value: "0.5", label: "½×" },
  { value: "1", label: "1×" },
  { value: "2", label: "2×" },
] as const;

/** Step-by-step replay of a hand on the animated table. */
export function Replayer({
  hand,
  mode,
  fourColor,
}: {
  hand: HandHistory;
  mode: "money" | "bb";
  fourColor: boolean;
}) {
  const first = useMemo(() => {
    const i = hand.actions.findIndex((a) => a.type !== "post");
    return i < 0 ? hand.actions.length : i;
  }, [hand]);
  const last = hand.actions.length + 1; // +1 = showdown / result
  const [step, setStep] = useState(first);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<"0.5" | "1" | "2">("1");

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(
      () => {
        if (step >= last) setPlaying(false);
        else setStep(step + 1);
      },
      1100 / Number(speed),
    );
    return () => clearTimeout(t);
  }, [playing, step, last, speed]);

  const applied = Math.min(step, hand.actions.length);
  const state = useMemo(() => replay(hand, applied), [hand, applied]);
  const atEnd = step >= last;
  const result = useMemo(() => (atEnd ? settle(hand) : null), [atEnd, hand]);
  const markers = useMemo(() => streetMarkers(hand), [hand]);
  const decision = !atEnd ? decisionInfo(state) : null;
  const heroCards = hand.players.find((p) => p.seat === hand.hero)?.cards ?? [];
  const strength =
    hand.game === "NLHE" && heroCards.length === 2 && state.board.length >= 3
      ? strengthLabel(heroCards, state.board)
      : "";
  const fmt = (m: number) => chipLabel(m, hand.currency, hand.bb, mode);
  const actor = state.seats.find((s) => s.seat === state.toAct);
  const span = Math.max(1, last - first);

  const jump = (street: Street) => {
    const m = markers.find((x) => x.street === street);
    if (m) {
      setPlaying(false);
      setStep(m.index);
    }
  };

  return (
    <div className="space-y-4">
      <PokerTable
        hand={hand}
        state={atEnd ? { ...state, toAct: null } : state}
        mode={mode}
        fourColor={fourColor}
        revealAll={atEnd && !!result?.showdown}
        results={atEnd && result?.resolved ? result.net : null}
      />

      {/* What's happening now */}
      <div
        className="min-h-[44px] rounded-lg border border-line bg-surface px-4 py-2.5 text-sm"
        aria-live="polite"
      >
        {atEnd ? (
          <span className="text-ink-soft">
            {result?.showdown ? "Showdown" : "Hand over"}
            {result &&
              Object.values(result.values).length > 0 &&
              ` · ${Object.entries(result.values)
                .map(
                  ([s, v]) =>
                    `${Number(s) === hand.hero ? "You" : state.seats.find((x) => x.seat === Number(s))?.name}: ${v.name}`,
                )
                .join(" · ")}`}
          </span>
        ) : actor ? (
          <span className="text-ink-soft">
            <span className="font-semibold text-ink">{actor.isHero ? "You" : actor.name}</span> (
            {actor.position}) to act
            {decision &&
              decision.toCall > 0 &&
              ` · ${fmt(decision.toCall)} to call · pot odds ${Math.round((decision.potOdds ?? 0) * 100)}%`}
            {decision?.spr != null && ` · SPR ${decision.spr}`}
          </span>
        ) : (
          <span className="text-ink-muted">Dealing…</span>
        )}
        {strength && <span className="block text-xs text-lavender">You: {strength}</span>}
      </div>

      {/* Scrub bar with street markers */}
      <div>
        <input
          type="range"
          min={first}
          max={last}
          value={step}
          onChange={(e) => {
            setPlaying(false);
            setStep(Number(e.target.value));
          }}
          aria-label="Replay position"
          className="w-full accent-[var(--primary-strong)]"
        />
        <div className="relative mt-1 h-5">
          {markers.map((m) => (
            <button
              key={m.street}
              type="button"
              onClick={() => jump(m.street)}
              className="absolute -translate-x-1/2 text-[11px] font-semibold text-ink-muted capitalize hover:text-lavender"
              style={{ left: `${((m.index - first) / span) * 100}%` }}
            >
              {m.street === "preflop" ? "Pre" : m.street}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <IconButton
            label="Start"
            onClick={() => {
              setPlaying(false);
              setStep(first);
            }}
          >
            <ChevronFirst />
          </IconButton>
          <IconButton
            label="Step back"
            onClick={() => {
              setPlaying(false);
              setStep(Math.max(first, step - 1));
            }}
          >
            <SkipBack />
          </IconButton>
          <button
            type="button"
            onClick={() => {
              if (atEnd) setStep(first);
              setPlaying(!playing);
            }}
            aria-label={playing ? "Pause" : "Play"}
            className="grid size-12 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-white shadow-accent active:scale-95"
          >
            {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
          </button>
          <IconButton
            label="Step forward"
            onClick={() => {
              setPlaying(false);
              setStep(Math.min(last, step + 1));
            }}
          >
            <SkipForward />
          </IconButton>
          <IconButton
            label="End"
            onClick={() => {
              setPlaying(false);
              setStep(last);
            }}
          >
            <ChevronLast />
          </IconButton>
        </div>
        <Segmented ariaLabel="Speed" value={speed} onValueChange={setSpeed} options={SPEEDS} />
      </div>

      {/* Action log */}
      <ol
        className="space-y-3 rounded-lg border border-line bg-surface p-4 text-sm"
        aria-label="Action log"
      >
        {(["preflop", "flop", "turn", "river"] as const).map((street) => {
          const items = hand.actions
            .map((a, i) => ({ a, i }))
            .filter(({ a }) => a.street === street && a.type !== "post");
          if (!items.length) return null;
          const boardNow =
            street === "preflop"
              ? []
              : hand.board.slice(0, street === "flop" ? 3 : street === "turn" ? 4 : 5);
          return (
            <li key={street}>
              <p className="eyebrow mb-1">
                {street}
                {boardNow.length > 0 && (
                  <span className="num ml-2 tracking-normal text-ink-muted normal-case">
                    {boardNow.join(" ")}
                  </span>
                )}
              </p>
              <ul className="space-y-0.5">
                {items.map(({ a, i }) => {
                  const s = state.seats.find((x) => x.seat === a.seat);
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => {
                          setPlaying(false);
                          setStep(i + 1);
                        }}
                        className={cn(
                          "w-full rounded-md px-2 py-1 text-left",
                          i === applied - 1
                            ? "bg-pill text-ink"
                            : "text-ink-soft hover:bg-white/[0.03]",
                        )}
                      >
                        <span className="font-semibold">
                          {a.seat === hand.hero ? "You" : s?.name}
                        </span>{" "}
                        <span className="text-ink-muted">({s?.position})</span>{" "}
                        {actionLabel(a, fmt).toLowerCase()}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-10 place-items-center rounded-full text-ink-soft hover:bg-white/5 active:scale-95 [&_svg]:size-5"
    >
      {children}
    </button>
  );
}

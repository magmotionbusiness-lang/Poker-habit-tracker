"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { useEffect } from "react";
import type { TableState } from "@/lib/poker/engine";
import type { HandAction, HandHistory } from "@/lib/poker/hand-types";
import { cn } from "@/lib/utils";
import { PlayingCard } from "./playing-card";
import { chipLabel, signedChipLabel } from "./amount";

type Mode = "money" | "bb";

/**
 * Top-down poker table. The hero always sits at the bottom; other seats go clockwise.
 * Everything animates from the engine's TableState: bets slide out and into the pot,
 * board cards deal in, the button glides, folded players dim, the actor glows.
 */
export function PokerTable({
  hand,
  state,
  mode = "money",
  fourColor = false,
  revealAll = false,
  results,
  onSeatClick,
  className,
}: {
  hand: HandHistory;
  state: TableState;
  mode?: Mode;
  fourColor?: boolean;
  /** Show every known hole card (showdown / review). */
  revealAll?: boolean;
  /** Net result per seat when the hand is over (winner glow + amounts). */
  results?: Record<number, number> | null;
  onSeatClick?: (seat: number) => void;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const n = state.seats.length;
  const heroIndex = Math.max(
    0,
    state.seats.findIndex((s) => s.seat === hand.hero),
  );
  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 260, damping: 28 };

  // Seat k places clockwise from the hero (bottom). Screen y grows downward, so +angle = clockwise.
  const place = (seat: number, scale: number, angleOffset = 0) => {
    const idx = state.seats.findIndex((s) => s.seat === seat);
    const k = (idx - heroIndex + n) % n;
    const angle = Math.PI / 2 + (k * 2 * Math.PI) / n + angleOffset;
    return { left: 50 + 43 * scale * Math.cos(angle), top: 50 + 41 * scale * Math.sin(angle) };
  };

  const fmt = (m: number) => chipLabel(m, hand.currency, hand.bb, mode);
  const committedTotal = state.seats.reduce((a, s) => a + s.committed, 0);
  // Beside (not on top of) the button player's bet.
  const btn = place(hand.button, 0.7, -Math.min(0.42, Math.PI / n));

  return (
    <div
      className={cn(
        "relative mx-auto aspect-[4/5] w-full max-w-[520px] select-none sm:aspect-[16/11]",
        className,
      )}
      role="img"
      aria-label={describe(hand, state, fmt)}
    >
      {/* Rail + felt */}
      <div className="absolute inset-[9%_7%] rounded-[50%] bg-[#14121f] p-[10px] shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.06)_inset]">
        <div className="relative h-full w-full overflow-hidden rounded-[50%] bg-[radial-gradient(ellipse_at_50%_45%,#2a2160_0%,#1b1744_45%,#110f2b_100%)] shadow-[inset_0_0_40px_rgba(0,0,0,0.65),inset_0_0_0_1px_rgba(168,146,255,0.18)]">
          <div className="absolute inset-[10%] rounded-[50%] border border-[rgba(168,146,255,0.10)]" />
          <p className="absolute top-[24%] left-1/2 -translate-x-1/2 font-display text-[11px] font-semibold tracking-[0.3em] text-white/10 uppercase">
            Stakers
          </p>
        </div>
      </div>

      {/* Pot + board */}
      <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
        <PotCounter
          value={state.pot}
          total={state.pot + committedTotal}
          fmt={fmt}
          reduce={!!reduce}
        />
        <div className="flex h-[38px] gap-1" aria-hidden>
          <AnimatePresence initial={false}>
            {state.board.map((c, i) => (
              <motion.div
                key={c}
                initial={reduce ? false : { opacity: 0, y: -24, rotateY: 90, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, rotateY: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { duration: 0.35, delay: (i < 3 ? i : 0) * 0.09, ease: [0.4, 0, 0.2, 1] }
                }
                style={{ transformPerspective: 400 }}
              >
                <PlayingCard card={c} size="xs" fourColor={fourColor} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Dealer button */}
      <motion.div
        className="absolute z-10 grid size-[18px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[9px] font-bold text-[#16161f] shadow-md"
        animate={{ left: `${btn.left}%`, top: `${btn.top}%` }}
        transition={spring}
        aria-hidden
      >
        D
      </motion.div>

      {/* Bets in front of players */}
      <AnimatePresence>
        {state.seats
          .filter((s) => s.committed > 0)
          .map((s) => {
            const p = place(s.seat, 0.58);
            return (
              <motion.div
                key={`bet-${s.seat}-${state.street}`}
                className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-black/45 py-0.5 pr-2 pl-0.5 backdrop-blur-sm"
                initial={
                  reduce
                    ? false
                    : {
                        left: `${place(s.seat, 0.9).left}%`,
                        top: `${place(s.seat, 0.9).top}%`,
                        opacity: 0,
                        scale: 0.6,
                      }
                }
                animate={{ left: `${p.left}%`, top: `${p.top}%`, opacity: 1, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { left: "50%", top: "44%", opacity: 0, scale: 0.5 }}
                transition={reduce ? { duration: 0 } : { duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
                aria-hidden
              >
                <ChipStack />
                <span className="num text-[11px] font-semibold text-white">{fmt(s.committed)}</span>
              </motion.div>
            );
          })}
      </AnimatePresence>

      {/* Seats */}
      {state.seats.map((s) => {
        const p = place(s.seat, 1);
        const acting = state.toAct === s.seat;
        const net = results?.[s.seat];
        const winner = net !== undefined && net > 0;
        const showCards = s.cards && (s.isHero || revealAll);
        const holeCount = hand.game === "PLO5" ? 5 : hand.game === "PLO" ? 4 : 2;
        return (
          <div
            key={s.seat}
            className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${p.left}%`, top: `${p.top}%` }}
          >
            {/* Hole cards */}
            <div
              className={cn(
                "mb-[-6px] flex h-[34px] items-end",
                holeCount > 2 ? "-space-x-3" : "-space-x-1.5",
              )}
            >
              <AnimatePresence>
                {!s.folded &&
                  Array.from({ length: holeCount }, (_, i) => (
                    <motion.div
                      key={`${s.seat}-c${i}`}
                      initial={reduce ? false : { y: 8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1, rotate: (i - (holeCount - 1) / 2) * 5 }}
                      exit={reduce ? { opacity: 0 } : { y: -20, opacity: 0, scale: 0.7 }}
                      transition={reduce ? { duration: 0 } : { duration: 0.25, delay: i * 0.04 }}
                    >
                      {showCards ? (
                        <PlayingCard card={s.cards![i]} size="xs" fourColor={fourColor} />
                      ) : (
                        <PlayingCard faceDown size="xs" className="!h-[30px] !w-[21px]" />
                      )}
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>

            {/* Plate */}
            <motion.button
              type="button"
              disabled={!onSeatClick}
              onClick={() => onSeatClick?.(s.seat)}
              animate={{
                opacity: s.folded ? 0.42 : 1,
                boxShadow: winner
                  ? "0 0 0 2px rgba(168,146,255,0.9), 0 0 24px rgba(124,92,255,0.7)"
                  : acting
                    ? [
                        "0 0 0 2px rgba(124,92,255,0.9), 0 0 10px rgba(124,92,255,0.4)",
                        "0 0 0 2px rgba(124,92,255,0.9), 0 0 22px rgba(124,92,255,0.8)",
                      ]
                    : "0 0 0 1px rgba(255,255,255,0.10), 0 4px 12px rgba(0,0,0,0.5)",
              }}
              transition={
                acting && !reduce
                  ? { boxShadow: { duration: 0.9, repeat: Infinity, repeatType: "reverse" } }
                  : { duration: 0.2 }
              }
              className={cn(
                "relative flex min-w-[64px] flex-col items-center rounded-xl px-2 pt-1 pb-1 text-center",
                s.isHero ? "bg-[#231c4d]" : "bg-[#16151f]",
                onSeatClick && "cursor-pointer",
              )}
              aria-label={`${s.name}, ${s.position}${s.isHero ? " (you)" : ""}, stack ${fmt(s.stack)}${s.folded ? ", folded" : ""}${acting ? ", to act" : ""}`}
            >
              <span
                className={cn(
                  "num rounded-full px-1.5 text-[9px] leading-[14px] font-bold tracking-[0.06em]",
                  positionTone(s.position),
                )}
              >
                {s.position}
              </span>
              <span className="max-w-[72px] truncate text-[11px] leading-tight font-semibold text-white">
                {s.isHero ? "You" : s.name}
              </span>
              <span className="num text-[11px] leading-tight text-ink-soft">
                {s.allIn && !s.folded ? "All-in" : fmt(s.stack)}
              </span>
            </motion.button>

            {/* Last action / result bubble */}
            <AnimatePresence mode="wait">
              {net !== undefined && net !== 0 ? (
                <motion.span
                  key="net"
                  initial={reduce ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "num mt-1 rounded-full bg-black/60 px-2 text-[10px] font-bold",
                    net > 0 ? "text-success" : "text-danger",
                  )}
                >
                  {signedChipLabel(net, hand.currency, hand.bb, mode)}
                </motion.span>
              ) : s.lastAction && s.lastAction.type !== "post" ? (
                <motion.span
                  key={`${s.lastAction.street}-${s.lastAction.type}-${s.lastAction.to ?? 0}`}
                  initial={reduce ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-1 rounded-full bg-black/60 px-2 text-[10px] font-semibold text-lavender-pale"
                >
                  {actionLabel(s.lastAction, fmt)}
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function positionTone(pos: string) {
  if (pos === "BTN") return "bg-white text-[#16161f]";
  if (pos === "SB" || pos === "BB") return "bg-primary-strong text-white";
  return "bg-white/10 text-ink-soft";
}

export function actionLabel(a: HandAction, fmt: (m: number) => string): string {
  switch (a.type) {
    case "fold":
      return "Fold";
    case "check":
      return "Check";
    case "call":
      return `Call ${fmt(a.to ?? 0)}`;
    case "bet":
      return `Bet ${fmt(a.to ?? 0)}`;
    case "raise":
      return `Raise ${fmt(a.to ?? 0)}`;
    default:
      return a.post === "ante"
        ? "Ante"
        : a.post === "straddle"
          ? "Straddle"
          : (a.post?.toUpperCase() ?? "");
  }
}

function ChipStack() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <circle
        cx="8"
        cy="8"
        r="7"
        fill="#7c5cff"
        stroke="#c5b6ff"
        strokeWidth="1.5"
        strokeDasharray="2.2 2"
      />
      <circle cx="8" cy="8" r="3.5" fill="#5d3fe6" />
    </svg>
  );
}

function PotCounter({
  value,
  total,
  fmt,
  reduce,
}: {
  value: number;
  total: number;
  fmt: (m: number) => string;
  reduce: boolean;
}) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => fmt(Math.round(v)));
  useEffect(() => {
    const controls = animate(mv, value, { duration: reduce ? 0 : 0.45, ease: "easeOut" });
    return () => controls.stop();
  }, [mv, value, reduce]);
  if (total === 0) return <div className="h-[22px]" />;
  return (
    <div className="flex flex-col items-center">
      <motion.span className="num rounded-full bg-black/45 px-2.5 py-0.5 text-[12px] font-semibold text-white">
        {text}
      </motion.span>
      {total !== value && (
        <span className="num mt-0.5 text-[9px] text-ink-muted">total {fmt(total)}</span>
      )}
    </div>
  );
}

function describe(hand: HandHistory, state: TableState, fmt: (m: number) => string): string {
  const actor = state.seats.find((s) => s.seat === state.toAct);
  return `Poker table, ${state.seats.length}-handed, ${state.street}. Pot ${fmt(state.pot)}.${
    state.board.length ? ` Board ${state.board.join(" ")}.` : ""
  }${actor ? ` ${actor.isHero ? "You" : actor.name} (${actor.position}) to act.` : ""}`;
}

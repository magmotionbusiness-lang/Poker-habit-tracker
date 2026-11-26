"use client";

import { useState } from "react";
import { FastForward, Undo2 } from "lucide-react";
import { MoneyInput } from "@/components/forms/money-input";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/haptics";
import { legalActions, sizePresets, type TableState } from "@/lib/poker/engine";
import type { HandHistory } from "@/lib/poker/hand-types";
import { cn } from "@/lib/utils";
import { chipLabel } from "./amount";

type Kind = "fold" | "check" | "call" | "bet" | "raise";

/** Big-button action entry for whoever is to act, with bet-size chips. */
export function ActionPad({
  hand,
  state,
  mode,
  onAct,
  onFoldToHero,
  onUndo,
}: {
  hand: HandHistory;
  state: TableState;
  mode: "money" | "bb";
  onAct: (kind: Kind, to?: number) => void;
  onFoldToHero?: () => void;
  onUndo?: () => void;
}) {
  const legal = legalActions(state);
  const [sizing, setSizing] = useState(false);
  const [custom, setCustom] = useState<number | null>(null);
  if (!legal) return null;
  const actor = state.seats.find((s) => s.seat === legal.seat)!;
  const fmt = (m: number) => chipLabel(m, hand.currency, hand.bb, mode);
  const presets = sizePresets(state, hand);
  const fire = (k: Kind, to?: number) => {
    haptic();
    setSizing(false);
    setCustom(null);
    onAct(k, to);
  };
  const verb = legal.aggressive === "bet" ? "Bet" : "Raise";
  const heroHasActed =
    state.street === "preflop" &&
    state.seats.find((s) => s.isHero)?.lastAction?.type !== "post" &&
    state.seats.find((s) => s.isHero)?.lastAction != null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm">
          <span className="font-semibold text-ink">{actor.isHero ? "You" : actor.name}</span>{" "}
          <span className="text-ink-muted">
            ({actor.position}) to act{legal.toCall > 0 ? ` · ${fmt(legal.toCall)} to call` : ""}
          </span>
        </p>
        <div className="flex gap-1">
          {onFoldToHero && !actor.isHero && state.street === "preflop" && !heroHasActed && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onFoldToHero}
              aria-label="Everyone folds to you"
            >
              <FastForward aria-hidden /> Folds to you
            </Button>
          )}
          {onUndo && (
            <Button size="icon-sm" variant="ghost" onClick={onUndo} aria-label="Undo last action">
              <Undo2 />
            </Button>
          )}
        </div>
      </div>

      {!sizing ? (
        <div className="grid grid-cols-3 gap-2">
          <PadButton tone="muted" disabled={!legal.canFold} onClick={() => fire("fold")}>
            Fold
          </PadButton>
          <PadButton tone="neutral" onClick={() => fire(legal.canCheck ? "check" : "call")}>
            {legal.canCheck ? "Check" : `Call ${fmt(legal.toCall)}`}
          </PadButton>
          <PadButton tone="primary" disabled={!legal.aggressive} onClick={() => setSizing(true)}>
            {legal.aggressive ? verb : "—"}
          </PadButton>
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-line-accent bg-pill/30 p-3">
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => fire(legal.aggressive!, p.to)}
                className="flex min-h-11 flex-col items-center justify-center rounded-full border border-line-accent bg-surface-2 px-4 text-sm font-semibold text-lavender-pale active:scale-95"
              >
                <span>{p.label}</span>
                <span className="num text-[11px] font-normal text-ink-muted">{fmt(p.to)}</span>
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <MoneyInput
              className="flex-1"
              label={`${verb} to (min ${fmt(legal.minTo)})`}
              currency={hand.currency}
              value={custom}
              onChange={setCustom}
            />
            <Button
              disabled={!custom || custom < legal.minTo}
              onClick={() => fire(legal.aggressive!, Math.min(custom!, legal.maxTo))}
            >
              {verb}
            </Button>
          </div>
          <Button variant="ghost" block size="sm" onClick={() => setSizing(false)}>
            Back
          </Button>
        </div>
      )}
    </div>
  );
}

function PadButton({
  tone,
  disabled,
  onClick,
  children,
}: {
  tone: "muted" | "neutral" | "primary";
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "num h-14 rounded-xl text-[15px] font-semibold transition-transform active:scale-95 disabled:opacity-30",
        tone === "muted" && "border border-line bg-field text-ink-soft",
        tone === "neutral" && "border border-line-strong bg-surface-2 text-ink",
        tone === "primary" && "bg-[image:var(--gradient-primary)] text-white shadow-accent",
      )}
    >
      {children}
    </button>
  );
}

"use client";

import { useGentle } from "@/lib/motion/motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ChevronsUp, Lock, MapPin, Settings2, Share2, Target } from "lucide-react";
import { ShareSheet } from "@/components/share/share-sheet";
import { CountUp } from "@/components/fx/count-up";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import { ladderCopy } from "@/content/ladder";
import { useBankrollSummary } from "@/lib/db/derived";
import { useSessions, useSettings } from "@/lib/db/hooks";
import { saveSettings } from "@/lib/db/repo";
import type { LadderPreset, UserSettings } from "@/lib/db/settings";
import {
  type BankrollRule,
  fromLadderUnits,
  guessKind,
  type LadderKind,
  ladderView,
  RULE_PRESETS,
  toLadderUnits,
  typicalStake,
} from "@/lib/ladder/ladder";
import { currencyExponent, formatMoney } from "@/lib/money";
import { celebrate } from "@/lib/store/celebrate";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";

export function ruleFor(settings: UserSettings, kind: LadderKind): BankrollRule {
  const k = kind === "mtt" ? "mtt" : "cash";
  const { preset, custom } = settings.ladder;
  return preset === "custom" && custom
    ? custom[k]
    : RULE_PRESETS[preset === "custom" ? "standard" : preset][k];
}

/**
 * The signature Up The Stakes feature: where your bankroll puts you on the stake ladder,
 * exactly what the next rung costs, and when to take a shot or step down.
 */
export function StakeLadder() {
  const reduce = useGentle();
  const currency = useAppStore((s) => s.prefs.currency);
  const summary = useBankrollSummary(currency);
  const sessions = useSessions();
  const settings = useSettings();
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const kind: LadderKind = settings?.ladder.kind ?? guessKind(sessions ?? []);
  const exp = currencyExponent(currency);
  const total = summary?.total ?? null;
  const view = useMemo(() => {
    if (!settings || total === null || !sessions) return null;
    const played = typicalStake(sessions, kind);
    return ladderView(kind, toLadderUnits(total, exp), ruleFor(settings, kind), played);
  }, [settings, total, sessions, kind, exp]);

  // Celebrate moving up a rung (once per new rung, per ladder).
  const top = settings?.ladder.top[kind];
  const maxIndex = view?.maxIndex;
  useEffect(() => {
    if (!settings || maxIndex === undefined || !view) return;
    if (top === undefined) {
      void saveSettings({
        ladder: { ...settings.ladder, top: { ...settings.ladder.top, [kind]: maxIndex } },
      });
    } else if (maxIndex > top) {
      void saveSettings({
        ladder: { ...settings.ladder, top: { ...settings.ladder.top, [kind]: maxIndex } },
      });
      celebrate("milestone", cardRef.current);
      toast.success(ladderCopy.movedUp(view.rungs[maxIndex]!.label));
    }
  }, [maxIndex, top, kind, settings, view]);

  if (!settings || !view) {
    return summary && summary.items.length === 0 ? (
      <Card>
        <CardHeader eyebrow={ladderCopy.title} />
        <p className="text-sm text-ink-muted">{ladderCopy.noBankroll}</p>
      </Card>
    ) : null;
  }

  const money = (units: number) =>
    formatMoney({ minor: fromLadderUnits(units, exp), currency }, { compact: units >= 10_000_000 });
  const rule = ruleFor(settings, kind);
  const next = view.next ? view.rungs[view.next.index]! : null;
  const current = view.rungs[view.currentIndex]!;
  const setKind = (k: LadderKind) => void saveSettings({ ladder: { ...settings.ladder, kind: k } });

  return (
    <Card
      ref={cardRef}
      className="overflow-hidden bg-[radial-gradient(ellipse_at_90%_0%,rgba(124,92,255,0.22),transparent_55%),var(--surface)]"
    >
      <CardHeader
        eyebrow={ladderCopy.title}
        action={
          <span className="flex gap-1">
            {view.maxIndex >= 0 && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Share your stake"
                onClick={() => setSharing(true)}
              >
                <Share2 aria-hidden />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Ladder settings"
              onClick={() => setEditing(true)}
            >
              <Settings2 aria-hidden />
            </Button>
          </span>
        }
      />
      <Segmented
        ariaLabel="Ladder"
        value={kind}
        onValueChange={setKind}
        options={(Object.keys(ladderCopy.kinds) as LadderKind[]).map((k) => ({
          value: k,
          label: ladderCopy.kinds[k],
        }))}
        className="mb-4 w-full [&>*]:flex-1"
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-field px-3 py-2.5">
          <p className="eyebrow">You play</p>
          <p className="num mt-0.5 text-xl font-semibold">{current.label}</p>
        </div>
        <div className="rounded-lg bg-field px-3 py-2.5">
          <p className="eyebrow">Buy-ins</p>
          <p className="num mt-0.5 text-xl font-semibold">
            <CountUp value={view.buyInsAtCurrent} format={(v) => v.toFixed(v >= 100 ? 0 : 1)} />
            <span className="ml-1 text-sm text-ink-muted">/ {rule.buyIns}</span>
          </p>
        </div>
      </div>

      {next ? (
        <div className="mb-4">
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
            <span className="flex items-center gap-1.5 font-semibold">
              <Target className="anim-pulse size-4 text-lavender" aria-hidden />
              {ladderCopy.toNext(money(view.next!.needed), next.label)}
            </span>
            <span className="num text-ink-muted">{Math.floor(view.next!.fraction * 100)}%</span>
          </div>
          <ProgressBar value={view.next!.fraction} label={`Progress to ${next.label}`} />
        </div>
      ) : (
        <p className="mb-4 text-sm font-semibold text-gold">{ladderCopy.top}</p>
      )}

      {view.moveDown ? (
        <Banner tone="danger" icon={<AlertTriangle className="size-4" aria-hidden />}>
          {ladderCopy.moveDown(current.label)}
        </Banner>
      ) : view.shot && next ? (
        <Banner tone="gold" icon={<ChevronsUp className="anim-float size-4" aria-hidden />}>
          {ladderCopy.shot(next.label)}
        </Banner>
      ) : null}

      <ol className="mt-3 flex flex-col-reverse gap-1.5" aria-label="Stakes">
        {view.rungs.map((r, i) => {
          const here = r.index === view.currentIndex;
          const isNext = view.next?.index === r.index;
          return (
            <motion.li
              key={r.label}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: reduce ? 0 : i * 0.05,
                type: "spring",
                stiffness: 260,
                damping: 24,
              }}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2",
                here
                  ? "border-primary bg-pill shadow-[0_0_18px_rgba(124,92,255,0.35)]"
                  : r.unlocked
                    ? "border-line-accent bg-surface-2"
                    : isNext
                      ? "border-dashed border-line-accent bg-transparent"
                      : "border-line bg-transparent opacity-60",
              )}
            >
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-full text-[11px] font-bold",
                  r.unlocked
                    ? "bg-[image:var(--gradient-headline)] text-white"
                    : "bg-field text-ink-subtle",
                )}
                aria-hidden
              >
                {r.unlocked ? i + 1 : <Lock className="size-3.5" />}
              </span>
              <span className="num flex-1 font-semibold">{r.label}</span>
              {here && (
                <span className="flex items-center gap-1 text-xs font-semibold text-lavender">
                  <MapPin className="anim-float size-3.5" aria-hidden /> You
                </span>
              )}
              <span className={cn("num text-xs", r.unlocked ? "text-success" : "text-ink-muted")}>
                {money(r.required)}
              </span>
            </motion.li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-ink-subtle">
        {rule.name}: {ladderCopy.ruleLine(rule.buyIns, kind === "mtt" ? "mtt" : "cash")}. Shot at{" "}
        {rule.shotAt}, move down below {rule.moveDownAt}.
      </p>

      {sharing && view.maxIndex >= 0 && (
        <ShareSheet
          open
          onClose={() => setSharing(false)}
          subject={{
            kind: "ladder",
            stake: view.rungs[view.maxIndex]!.label,
            ladder: ladderCopy.kindNames[kind],
            bankroll: money(toLadderUnits(summary!.total!, exp)),
          }}
        />
      )}
      <RuleSheet open={editing} onClose={() => setEditing(false)} settings={settings} />
    </Card>
  );
}

function Banner({
  tone,
  icon,
  children,
}: {
  tone: "gold" | "danger";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <p
      role="status"
      className={cn(
        "flex gap-2 rounded-md px-3 py-2.5 text-sm",
        tone === "gold" ? "bg-gold/10 text-gold" : "bg-danger/10 text-danger",
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </p>
  );
}

function RuleSheet({
  open,
  onClose,
  settings,
}: {
  open: boolean;
  onClose: () => void;
  settings: UserSettings;
}) {
  const [preset, setPreset] = useState<LadderPreset>(settings.ladder.preset);
  const [custom, setCustom] = useState(
    settings.ladder.custom ?? { cash: RULE_PRESETS.standard.cash, mtt: RULE_PRESETS.standard.mtt },
  );
  const field = (k: "cash" | "mtt", f: "buyIns" | "shotAt" | "moveDownAt", label: string) => (
    <div>
      <Label htmlFor={`${k}-${f}`}>{label}</Label>
      <Input
        id={`${k}-${f}`}
        inputMode="numeric"
        value={String(custom[k][f])}
        onChange={(e) => {
          const n = Math.min(1000, Number(e.target.value.replace(/\D/g, "")) || 0);
          setCustom((c) => ({ ...c, [k]: { ...c[k], name: "Custom", [f]: n } }));
        }}
      />
    </div>
  );
  const valid = (["cash", "mtt"] as const).every(
    (k) =>
      custom[k].buyIns > 0 &&
      custom[k].moveDownAt <= custom[k].buyIns &&
      custom[k].shotAt <= custom[k].buyIns,
  );

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Bankroll rule"
      description="How many buy-ins you need before you play a stake."
    >
      <div className="space-y-5">
        <Segmented
          ariaLabel="Preset"
          value={preset}
          onValueChange={setPreset}
          options={(Object.keys(ladderCopy.presets) as LadderPreset[]).map((p) => ({
            value: p,
            label: ladderCopy.presets[p],
          }))}
          className="w-full [&>*]:flex-1"
        />
        {preset !== "custom" ? (
          <ul className="space-y-1.5 text-sm text-ink-soft">
            <li>
              Cash: {RULE_PRESETS[preset].cash.buyIns} buy-ins · shot at{" "}
              {RULE_PRESETS[preset].cash.shotAt} · move down below{" "}
              {RULE_PRESETS[preset].cash.moveDownAt}
            </li>
            <li>
              MTT: {RULE_PRESETS[preset].mtt.buyIns} buy-ins · shot at{" "}
              {RULE_PRESETS[preset].mtt.shotAt} · move down below{" "}
              {RULE_PRESETS[preset].mtt.moveDownAt}
            </li>
          </ul>
        ) : (
          <>
            <p className="eyebrow">Cash</p>
            <div className="grid grid-cols-3 gap-2">
              {field("cash", "buyIns", "Buy-ins")}
              {field("cash", "shotAt", "Shot at")}
              {field("cash", "moveDownAt", "Move down")}
            </div>
            <p className="eyebrow">Tournaments</p>
            <div className="grid grid-cols-3 gap-2">
              {field("mtt", "buyIns", "Buy-ins")}
              {field("mtt", "shotAt", "Shot at")}
              {field("mtt", "moveDownAt", "Move down")}
            </div>
            {!valid && (
              <p className="text-sm text-danger">
                Shot and move-down must be at most the buy-ins needed.
              </p>
            )}
          </>
        )}
        <Button
          block
          size="lg"
          disabled={preset === "custom" && !valid}
          onClick={async () => {
            await saveSettings({
              ladder: {
                ...settings.ladder,
                preset,
                custom: preset === "custom" ? custom : settings.ladder.custom,
              },
            });
            onClose();
          }}
        >
          Save rule
        </Button>
      </div>
    </Sheet>
  );
}

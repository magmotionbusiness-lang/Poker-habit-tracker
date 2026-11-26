"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Flame, Zap } from "lucide-react";
import { Chips, RatingPicker } from "@/components/forms/chips";
import { MoneyInput } from "@/components/forms/money-input";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { errorMessage } from "@/lib/errors";
import { completeHabitByKey, saveShortcut, startSession, upsertVenue } from "@/lib/db/actions";
import { useBankrolls, useRules, useShortcuts, useToday, useVenues } from "@/lib/db/hooks";
import { play } from "@/lib/sfx/sfx";
import { warmUp } from "@/content/routines";
import type { SessionShortcut } from "@/lib/domain/types";
import { stakesLabel } from "@/lib/stats/session-math";
import { useAppStore } from "@/lib/store/app-store";
import { useUi } from "@/lib/store/ui-store";
import { GameFields, type SessionDraft } from "./session-fields";

export function StartSessionSheet() {
  const router = useRouter();
  const { sheet, close } = useUi();
  const open = sheet === "start-session";
  const bankrolls = useBankrolls() ?? [];
  const shortcuts = useShortcuts() ?? [];
  const venues = useVenues() ?? [];
  const currency = useAppStore((s) => s.prefs.currency);
  const first = bankrolls.find((b) => !b.archived);

  const blank = (): SessionDraft => ({
    format: "cash",
    is_live: true,
    game: "NLHE",
    stakes_sb_minor: null,
    stakes_bb_minor: null,
    straddle_minor: null,
    buy_in_minor: 0,
    fees_minor: 0,
    currency: first?.currency ?? currency,
    bankroll_id: first?.id ?? null,
    venue_id: null,
    venue_name: "",
  });
  const [draft, setDraft] = useState<SessionDraft>(blank);
  const [stopLoss, setStopLoss] = useState<number | null>(null);
  const [maxHours, setMaxHours] = useState("");
  const [saveAs, setSaveAs] = useState(false);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [warm, setWarm] = useState(false);
  const [focusPoint, setFocusPoint] = useState("");
  const [energy, setEnergy] = useState<number | null>(null);
  const [sleep, setSleep] = useState<number | null>(null);
  const { today } = useToday();
  const openRules = (useRules() ?? [])
    .filter((r) => r.status === "working")
    .sort((a, b) => b.times_seen - a.times_seen)
    .slice(0, 3);
  const warmedUp = Boolean(focusPoint.trim()) && energy !== null;
  const set = (p: Partial<SessionDraft>) => setDraft((d) => ({ ...d, ...p }));
  if (open && draft.bankroll_id === null && first)
    set({ bankroll_id: first.id, currency: first.currency });

  async function go(preset: Partial<SessionDraft>, shortcutLabel?: string) {
    setBusy(true);
    try {
      const { venue_name, ...rest } = { ...draft, ...preset };
      const venue = venue_name?.trim()
        ? await upsertVenue(venue_name, rest.is_live ? "live" : "online")
        : null;
      const s = await startSession({
        ...rest,
        venue_id: venue?.id ?? rest.venue_id ?? null,
        bankroll_id: rest.bankroll_id ?? first?.id ?? null,
        stop_loss_minor: stopLoss,
        max_length_min: maxHours ? Math.round(Number(maxHours) * 60) : null,
        focus_point: focusPoint.trim() || null,
        energy_rating: energy,
        sleep_rating: sleep,
      });
      const warmed = warmedUp && (await completeHabitByKey("warm_up", today));
      if (saveAs && !shortcutLabel) {
        const { venue_name: _v, ...presetRest } = { ...draft };
        void _v;
        await saveShortcut(label || `${venue_name || "Session"} ${stakesLabel({ ...s })}`, {
          ...presetRest,
          venue_id: s.venue_id,
        });
      }
      close();
      setDraft(blank());
      setFocusPoint("");
      setEnergy(null);
      setSleep(null);
      play(warmed ? "complete" : "deal");
      router.push("/session");
      toast(
        `Session started${shortcutLabel ? ` · ${shortcutLabel}` : ""}. ${warmed ? warmUp.doneToast : warmUp.startToast}`,
      );
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't start the session"));
    } finally {
      setBusy(false);
    }
  }

  const startShortcut = (sc: SessionShortcut) =>
    go(
      { ...sc.preset, venue_name: venues.find((v) => v.id === sc.preset.venue_id)?.name ?? "" },
      sc.label,
    );

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => (o ? null : close())}
      title="Start session"
      description="One tap from a shortcut, or set it up below."
    >
      {shortcuts.length > 0 && (
        <div className="mb-5">
          <p className="eyebrow mb-2">Shortcuts</p>
          <div className="flex flex-wrap gap-2">
            {shortcuts.map((sc) => (
              <Button
                key={sc.id}
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => startShortcut(sc)}
              >
                <Zap aria-hidden /> {sc.label}
              </Button>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-4">
        <GameFields
          draft={draft}
          set={set}
          bankrolls={bankrolls.filter((b) => !b.archived)}
          venueNames={venues.map((v) => v.name)}
        />
        {draft.format === "cash" && (
          <MoneyInput
            label="Buy-in"
            currency={draft.currency}
            value={draft.buy_in_minor || null}
            onChange={(v) => set({ buy_in_minor: v ?? 0 })}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <MoneyInput
            label="Stop-loss (optional)"
            currency={draft.currency}
            value={stopLoss}
            onChange={setStopLoss}
          />
          <div>
            <Label htmlFor="max-hours">Max hours (optional)</Label>
            <Input
              id="max-hours"
              inputMode="decimal"
              placeholder="5"
              value={maxHours}
              onChange={(e) => setMaxHours(e.target.value.replace(/[^\d.]/g, ""))}
            />
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-line-accent bg-surface">
          <button
            type="button"
            onClick={() => setWarm((w) => !w)}
            aria-expanded={warm}
            className="flex w-full items-center gap-3 px-4 py-3 text-left"
          >
            <span className="grid size-9 place-items-center rounded-full bg-pill text-lavender">
              <Flame className="size-4" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">{warmUp.title}</span>
              <span className="block text-xs text-ink-muted">
                {warmedUp ? "Ready. Counts for your warm-up habit." : warmUp.subtitle}
              </span>
            </span>
            <ChevronDown
              className={`size-4 text-ink-muted transition-transform ${warm ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
          {warm && (
            <div className="space-y-4 border-t border-line px-4 py-4">
              <div>
                <Label htmlFor="focus-point">{warmUp.focusLabel}</Label>
                {openRules.length > 0 && (
                  <div className="mb-2">
                    <Chips
                      ariaLabel="Focus from your Leak Book"
                      options={openRules.map((r) => ({ value: r.text, label: r.text }))}
                      value={focusPoint}
                      onChange={(v) => setFocusPoint(String(v))}
                    />
                  </div>
                )}
                <Input
                  id="focus-point"
                  placeholder={warmUp.focusPlaceholder}
                  value={focusPoint}
                  onChange={(e) => setFocusPoint(e.target.value)}
                />
              </div>
              <RatingPicker
                label="Energy"
                low="Drained"
                high="Sharp"
                value={energy}
                onChange={setEnergy}
              />
              <RatingPicker
                label="Sleep last night"
                low="Bad"
                high="Great"
                value={sleep}
                onChange={setSleep}
              />
              {energy !== null && energy <= 2 && (
                <p className="rounded-md bg-gold/10 px-3 py-2 text-sm text-gold">
                  {warmUp.lowEnergy}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3">
          <span className="text-sm font-medium">Save as shortcut</span>
          <Switch checked={saveAs} onCheckedChange={setSaveAs} aria-label="Save as shortcut" />
        </div>
        {saveAs && (
          <Input
            aria-label="Shortcut name"
            placeholder="Crown $2/3"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        )}
        <Button size="lg" block disabled={busy || !draft.bankroll_id} onClick={() => go({})}>
          Start session
        </Button>
        {!draft.bankroll_id && (
          <p className="text-center text-sm text-ink-muted">
            Create a bankroll first (Bankroll tab).
          </p>
        )}
      </div>
    </Sheet>
  );
}

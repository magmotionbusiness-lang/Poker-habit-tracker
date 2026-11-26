"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Zap } from "lucide-react";
import { MoneyInput } from "@/components/forms/money-input";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { errorMessage } from "@/lib/errors";
import { saveShortcut, startSession, upsertVenue } from "@/lib/db/actions";
import { useBankrolls, useShortcuts, useVenues } from "@/lib/db/hooks";
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
      });
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
      router.push("/session");
      toast(
        `Session started${shortcutLabel ? ` · ${shortcutLabel}` : ""}. Good luck — play your A-game.`,
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

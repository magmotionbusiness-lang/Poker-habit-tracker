"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Chips, RatingPicker } from "@/components/forms/chips";
import { CurrencySelect } from "@/components/forms/currency-select";
import { MoneyInput } from "@/components/forms/money-input";
import { GameFields, type SessionDraft } from "@/components/sessions/session-fields";
import { formatDuration } from "@/components/sessions/timer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { celebrate } from "@/lib/store/celebrate";
import { errorMessage } from "@/lib/errors";
import { blankSession, deleteSession, saveFinishedSession, upsertVenue } from "@/lib/db/actions";
import { useRates } from "@/lib/db/derived";
import { useBankrolls, useSession, useVenues } from "@/lib/db/hooks";
import type { Expense, GameRating, PokerSession } from "@/lib/domain/types";
import { formatMoney } from "@/lib/money";
import { sessionCosts, sessionDurationMs, sessionResult } from "@/lib/stats/session-math";
import { useAppStore } from "@/lib/store/app-store";

const pad = (n: number) => String(n).padStart(2, "0");
function toLocalInputs(iso: string) {
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function SessionEditor() {
  const id = useSearchParams().get("id");
  const existing = useSession(id);
  if (id && existing === undefined) return null;
  if (id && existing === null)
    return (
      <div className="pt-10 text-center">
        <p className="text-ink-muted">That session doesn&apos;t exist anymore.</p>
        <Button className="mt-4" asChild>
          <Link href="/bankroll">Back to bankroll</Link>
        </Button>
      </div>
    );
  return <Editor key={existing?.id ?? "new"} existing={existing ?? null} />;
}

function Editor({ existing }: { existing: PokerSession | null }) {
  const router = useRouter();
  const bankrolls = (useBankrolls() ?? []).filter(
    (b) => !b.archived || b.id === existing?.bankroll_id,
  );
  const venues = useVenues() ?? [];
  const prefCurrency = useAppStore((s) => s.prefs.currency);
  const defaultBr = bankrolls[0];

  const [s, setS] = useState<PokerSession>(() => {
    if (existing) return existing;
    const start = new Date(Date.now() - 4 * 3_600_000);
    start.setMinutes(0, 0, 0);
    return blankSession({
      started_at: start.toISOString(),
      ended_at: new Date(start.getTime() + 4 * 3_600_000).toISOString(),
      currency: prefCurrency,
    });
  });
  const [venueName, setVenueName] = useState(
    () => venues.find((v) => v.id === existing?.venue_id)?.name ?? "",
  );
  const init = toLocalInputs(s.started_at);
  const [date, setDate] = useState(init.date);
  const [time, setTime] = useState(init.time);
  const initMin = Math.round(sessionDurationMs(s) / 60_000);
  const [hours, setHours] = useState(String(Math.floor(initMin / 60)));
  const [mins, setMins] = useState(String(initMin % 60));
  const [tags, setTags] = useState(s.tags.join(", "));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  // Default the bankroll once bankrolls have loaded.
  if (!s.bankroll_id && defaultBr)
    setS((x) => ({
      ...x,
      bankroll_id: defaultBr.id,
      currency: existing ? x.currency : defaultBr.currency,
    }));

  const set = (p: Partial<PokerSession>) => setS((x) => ({ ...x, ...p }));
  const bankroll = bankrolls.find((b) => b.id === s.bankroll_id);
  const needsFx = Boolean(bankroll && bankroll.currency !== s.currency);
  const rates = useRates(bankroll ? [bankroll.currency, s.currency] : []);
  const suggestedRate = bankroll ? rates[`${s.currency}:${bankroll.currency}`] : undefined;
  const cash = s.format === "cash";
  const draft: SessionDraft = { ...s, venue_name: venueName };
  const result = sessionResult(s);
  const money = (m: number, signed = false) =>
    formatMoney({ minor: m, currency: s.currency }, { signed, trimZeroCents: true });

  async function save() {
    setBusy(true);
    try {
      const started = new Date(`${date}T${time || "00:00"}`);
      const durationMs = (Number(hours) * 60 + Number(mins)) * 60_000;
      if (!durationMs) throw new Error("Add how long you played.");
      const venue = venueName.trim()
        ? await upsertVenue(venueName, s.is_live ? "live" : "online")
        : null;
      const next: PokerSession = {
        ...s,
        venue_id: venue?.id ?? null,
        started_at: started.toISOString(),
        ended_at: new Date(started.getTime() + durationMs + s.paused_ms).toISOString(),
        fx_rate: needsFx ? (s.fx_rate ?? suggestedRate ?? null) : null,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 20),
        cash_out_minor: cash ? s.cash_out_minor : 0,
        prize_minor: cash ? 0 : s.prize_minor,
        bounties_minor: cash ? 0 : s.bounties_minor,
      };
      if (needsFx && !next.fx_rate)
        throw new Error(`Add the ${s.currency} → ${bankroll!.currency} rate.`);
      await saveFinishedSession(next);
      celebrate("small", null, { sound: "save" });
      toast.success(`Session saved · ${money(sessionResult(next), true)}`);
      router.push("/bankroll");
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't save"));
      setBusy(false);
    }
  }

  const expense = (kind: Expense["kind"]) =>
    s.expenses.find((e) => e.kind === kind)?.amount_minor ?? null;
  const setExpense = (kind: Expense["kind"], v: number | null) =>
    set({
      expenses: [
        ...s.expenses.filter((e) => e.kind !== kind),
        ...(v ? [{ kind, amount_minor: v }] : []),
      ],
    });

  return (
    <div className="space-y-6 pt-3">
      <div className="flex items-center justify-between">
        <Link
          href="/bankroll"
          className="-ml-2 inline-flex h-11 items-center gap-1.5 px-2 text-sm font-semibold text-ink-soft"
        >
          <ArrowLeft className="size-4" aria-hidden /> Back
        </Link>
        {existing && (
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden /> Delete
          </Button>
        )}
      </div>
      <header>
        <p className="eyebrow mb-1.5">{existing ? "Edit session" : "Log finished session"}</p>
        <h1
          className={`num text-[40px] font-semibold ${result > 0 ? "text-success" : result < 0 ? "text-danger" : ""}`}
        >
          {money(result, true)}
        </h1>
        <p className="text-sm text-ink-muted">
          {formatDuration((Number(hours) * 60 + Number(mins)) * 60_000)}
          {sessionCosts(s) > 0 && ` · ${money(-sessionCosts(s))} tips & costs`}
        </p>
      </header>

      <section className="space-y-4">
        <GameFields
          draft={draft}
          set={(p) => {
            const { venue_name, ...rest } = p;
            if (venue_name !== undefined) setVenueName(venue_name);
            set(rest);
          }}
          bankrolls={bankrolls}
          venueNames={venues.map((v) => v.name)}
        />
        <CurrencySelect
          id="session-ccy"
          label="Session currency"
          value={s.currency}
          onChange={(c) => set({ currency: c, fx_rate: null })}
        />
        {needsFx && (
          <div>
            <Label htmlFor="fx">
              Rate: 1 {s.currency} = ? {bankroll!.currency}
            </Label>
            <Input
              id="fx"
              inputMode="decimal"
              placeholder={suggestedRate ? Number(suggestedRate).toFixed(4) : "1.08"}
              value={s.fx_rate ?? ""}
              onChange={(e) => set({ fx_rate: e.target.value.replace(/[^\d.]/g, "") || null })}
            />
            {suggestedRate && !s.fx_rate && (
              <p className="mt-1 text-xs text-ink-subtle">
                Today&apos;s ECB rate is used if you leave this empty.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="eyebrow !font-sans">When</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="time">Start</Label>
            <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="h">Hours</Label>
            <Input
              id="h"
              inputMode="numeric"
              value={hours}
              onChange={(e) => setHours(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div>
            <Label htmlFor="m">Minutes</Label>
            <Input
              id="m"
              inputMode="numeric"
              value={mins}
              onChange={(e) => setMins(e.target.value.replace(/\D/g, "").slice(0, 2))}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="eyebrow !font-sans">Money</h2>
        {cash ? (
          <div className="grid grid-cols-2 gap-3">
            <MoneyInput
              label="Buy-in"
              currency={s.currency}
              value={s.buy_in_minor || null}
              onChange={(v) => set({ buy_in_minor: v ?? 0 })}
            />
            <MoneyInput
              label="Rebuys / add-ons"
              currency={s.currency}
              value={s.rebuys_minor || null}
              onChange={(v) => set({ rebuys_minor: v ?? 0 })}
            />
            <MoneyInput
              label="Cash out"
              currency={s.currency}
              value={s.cash_out_minor}
              onChange={(v) => set({ cash_out_minor: v ?? 0 })}
              className="col-span-2"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <MoneyInput
              label="Re-entries"
              currency={s.currency}
              value={s.rebuys_minor || null}
              onChange={(v) => set({ rebuys_minor: v ?? 0 })}
            />
            <MoneyInput
              label="Prize"
              currency={s.currency}
              value={s.prize_minor || null}
              onChange={(v) => set({ prize_minor: v ?? 0 })}
            />
            <MoneyInput
              label="Bounties"
              currency={s.currency}
              value={s.bounties_minor || null}
              onChange={(v) => set({ bounties_minor: v ?? 0 })}
            />
            <div />
            <div>
              <Label htmlFor="pos">Finished</Label>
              <Input
                id="pos"
                inputMode="numeric"
                value={s.finish_position ?? ""}
                onChange={(e) =>
                  set({ finish_position: Number(e.target.value.replace(/\D/g, "")) || null })
                }
              />
            </div>
            <div>
              <Label htmlFor="field">Field size</Label>
              <Input
                id="field"
                inputMode="numeric"
                value={s.field_size ?? ""}
                onChange={(e) =>
                  set({ field_size: Number(e.target.value.replace(/\D/g, "")) || null })
                }
              />
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {cash && (
            <MoneyInput
              label="Rake / fees"
              currency={s.currency}
              value={s.fees_minor || null}
              onChange={(v) => set({ fees_minor: v ?? 0 })}
            />
          )}
          <MoneyInput
            label="Tips"
            currency={s.currency}
            value={s.tips_minor || null}
            onChange={(v) => set({ tips_minor: v ?? 0 })}
          />
          <MoneyInput
            label="Food"
            currency={s.currency}
            value={expense("food")}
            onChange={(v) => setExpense("food", v)}
          />
          <MoneyInput
            label="Travel"
            currency={s.currency}
            value={expense("travel")}
            onChange={(v) => setExpense("travel", v)}
          />
          <MoneyInput
            label="Hotel"
            currency={s.currency}
            value={expense("hotel")}
            onChange={(v) => setExpense("hotel", v)}
          />
        </div>
        {!s.is_live && (
          <div>
            <Label htmlFor="hands">Hands played</Label>
            <Input
              id="hands"
              inputMode="numeric"
              value={s.hands_played ?? ""}
              onChange={(e) =>
                set({ hands_played: Number(e.target.value.replace(/\D/g, "")) || null })
              }
            />
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="eyebrow !font-sans">Mental game</h2>
        <Chips
          ariaLabel="Game rating"
          options={[
            { value: "A", label: "A-game" },
            { value: "B", label: "B-game" },
            { value: "C", label: "C-game" },
          ]}
          value={s.game_rating}
          onChange={(v) => set({ game_rating: v as GameRating })}
        />
        <RatingPicker
          label="Focus"
          low="Distracted"
          high="Locked in"
          value={s.focus_rating}
          onChange={(v) => set({ focus_rating: v })}
        />
        <RatingPicker
          label="Tilt"
          low="Calm"
          high="Steaming"
          value={s.tilt_rating}
          onChange={(v) => set({ tilt_rating: v })}
        />
        <RatingPicker
          label="Energy"
          low="Drained"
          high="Fresh"
          value={s.energy_rating}
          onChange={(v) => set({ energy_rating: v })}
        />
        <RatingPicker
          label="Sleep last night"
          low="Bad"
          high="Great"
          value={s.sleep_rating}
          onChange={(v) => set({ sleep_rating: v })}
        />
      </section>

      <section className="space-y-4">
        <h2 className="eyebrow !font-sans">Notes</h2>
        <div>
          <Label htmlFor="focus">Focus point</Label>
          <Input
            id="focus"
            value={s.focus_point ?? ""}
            onChange={(e) => set({ focus_point: e.target.value || null })}
          />
        </div>
        <div>
          <Label htmlFor="takeaway">Takeaway</Label>
          <Input
            id="takeaway"
            value={s.takeaway ?? ""}
            onChange={(e) => set({ takeaway: e.target.value || null })}
          />
        </div>
        <div>
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            placeholder="deep stacked, new venue"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={s.notes ?? ""}
            onChange={(e) => set({ notes: e.target.value || null })}
          />
        </div>
      </section>

      <Card className="sticky bottom-[calc(var(--tabbar-height)+var(--safe-bottom)+12px)] z-10 bg-surface-2/95 p-3 backdrop-blur">
        <Button size="lg" block disabled={busy || !s.bankroll_id} onClick={save}>
          {existing ? "Save changes" : "Save session"}
        </Button>
      </Card>

      <Dialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this session?"
        description="It's removed from your stats, graph and goals. This can't be undone."
      >
        <div className="flex gap-3">
          <Button variant="secondary" block onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            block
            onClick={async () => {
              await deleteSession(existing!.id);
              toast("Session deleted");
              router.push("/bankroll");
            }}
          >
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

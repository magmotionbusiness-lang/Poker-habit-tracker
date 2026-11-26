"use client";

import type { Bankroll, PokerSession, SessionFormat } from "@/lib/domain/types";
import { Chips } from "@/components/forms/chips";
import { MoneyInput } from "@/components/forms/money-input";
import { Segmented } from "@/components/ui/segmented";
import { Input, Label } from "@/components/ui/input";

export const FORMAT_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "mtt", label: "MTT" },
  { value: "sng", label: "SNG" },
  { value: "spin", label: "Spin" },
] as const;

export type SessionDraft = Pick<
  PokerSession,
  | "format"
  | "is_live"
  | "game"
  | "stakes_sb_minor"
  | "stakes_bb_minor"
  | "straddle_minor"
  | "buy_in_minor"
  | "fees_minor"
  | "currency"
  | "bankroll_id"
  | "venue_id"
> & { venue_name: string };

/** The "what are you playing" block shared by start-session and log-session forms. */
export function GameFields({
  draft,
  set,
  bankrolls,
  venueNames,
}: {
  draft: SessionDraft;
  set: (p: Partial<SessionDraft>) => void;
  bankrolls: readonly Bankroll[];
  venueNames: readonly string[];
}) {
  const cash = draft.format === "cash";
  return (
    <div className="space-y-4">
      <Segmented
        ariaLabel="Format"
        value={draft.format}
        onValueChange={(v) => set({ format: v as SessionFormat })}
        options={FORMAT_OPTIONS}
        className="w-full"
      />
      <div className="flex gap-3">
        <Chips
          ariaLabel="Live or online"
          options={[
            { value: "live", label: "Live" },
            { value: "online", label: "Online" },
          ]}
          value={draft.is_live ? "live" : "online"}
          onChange={(v) => set({ is_live: v === "live" })}
        />
        <select
          aria-label="Game"
          value={draft.game}
          onChange={(e) => set({ game: e.target.value })}
          className="h-11 flex-1 rounded-full border border-line bg-field px-4 text-sm font-semibold text-ink"
        >
          {["NLHE", "PLO", "PLO5", "Mixed", "Other"].map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </div>

      {cash ? (
        <div className="grid grid-cols-2 gap-3">
          <MoneyInput
            label="Small blind"
            currency={draft.currency}
            value={draft.stakes_sb_minor}
            onChange={(v) => set({ stakes_sb_minor: v })}
          />
          <MoneyInput
            label="Big blind"
            currency={draft.currency}
            value={draft.stakes_bb_minor}
            onChange={(v) => set({ stakes_bb_minor: v })}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <MoneyInput
            label="Buy-in"
            currency={draft.currency}
            value={draft.buy_in_minor}
            onChange={(v) => set({ buy_in_minor: v ?? 0 })}
          />
          <MoneyInput
            label="Fee / rake"
            currency={draft.currency}
            value={draft.fees_minor}
            onChange={(v) => set({ fees_minor: v ?? 0 })}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="venue">{draft.is_live ? "Venue" : "Site"}</Label>
          <Input
            id="venue"
            list="venue-list"
            placeholder={draft.is_live ? "Card room" : "GGPoker"}
            value={draft.venue_name}
            onChange={(e) => set({ venue_name: e.target.value })}
          />
          <datalist id="venue-list">
            {venueNames.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </div>
        <div>
          <Label htmlFor="bankroll">Bankroll</Label>
          <select
            id="bankroll"
            value={draft.bankroll_id ?? ""}
            onChange={(e) => {
              const b = bankrolls.find((x) => x.id === e.target.value);
              set({ bankroll_id: b?.id ?? null, ...(b ? { currency: b.currency } : {}) });
            }}
            className="h-12 w-full rounded-md border border-line bg-field px-3 text-[16px] text-ink"
          >
            {bankrolls.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} · {b.currency}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, LayoutGrid } from "lucide-react";
import { Chips } from "@/components/forms/chips";
import { MoneyInput } from "@/components/forms/money-input";
import { CardPicker } from "@/components/poker/card-picker";
import { PlayingCard } from "@/components/poker/playing-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import { userTags } from "@/content/hands";
import { useRunningSession } from "@/lib/db/hooks";
import { newId, nowIso, putRow } from "@/lib/db/repo";
import { errorMessage } from "@/lib/errors";
import {
  buildExpressHand,
  type ExpressPot,
  type ExpressResult,
  type ExpressStreet,
} from "@/lib/hands/express";
import { haptic } from "@/lib/haptics";
import type { Card } from "@/lib/poker/cards";
import { positionNames } from "@/lib/poker/positions";
import { celebrate } from "@/lib/store/celebrate";
import { useAppStore } from "@/lib/store/app-store";
import { useHandSetup } from "@/lib/store/hand-setup";
import { useUi } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";

const POTS: Array<{ value: ExpressPot; label: string }> = [
  { value: "limped", label: "Limped" },
  { value: "srp", label: "Raised" },
  { value: "3bet", label: "3-bet" },
  { value: "4bet+", label: "4-bet+" },
];
const STREETS: Array<{ value: ExpressStreet; label: string }> = [
  { value: "preflop", label: "Pre" },
  { value: "flop", label: "Flop" },
  { value: "turn", label: "Turn" },
  { value: "river", label: "River" },
  { value: "showdown", label: "Showdown" },
];
const BB_CHIPS = [5, 10, 20, 40, 75, 100, 200];

/** The 10-second hand log for between two hands. */
export function ExpressSheet() {
  const { sheet, close } = useUi();
  const open = sheet === "express-hand";
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && close()}
      title="Quick hand"
      description="Ten seconds now, full review later."
    >
      {open && <ExpressForm onDone={close} />}
    </Sheet>
  );
}

function ExpressForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const running = useRunningSession();
  const setup = useHandSetup((s) => s.setup);
  const fourColor = useAppStore((s) => s.prefs.fourColorDeck);
  const fromSession = running && running.format === "cash" && running.stakes_bb_minor;
  const stakes = {
    currency: fromSession ? running.currency : setup.currency,
    sb: fromSession ? (running.stakes_sb_minor ?? 0) : setup.sb,
    bb: fromSession ? running.stakes_bb_minor! : setup.bb,
    straddle: fromSession ? (running.straddle_minor ?? 0) : setup.straddle,
  };

  const [cards, setCards] = useState<Card[]>([]);
  const [position, setPosition] = useState(setup.heroPosition);
  const [pot, setPot] = useState<ExpressPot>("srp");
  const [multiway, setMultiway] = useState(false);
  const [street, setStreet] = useState<ExpressStreet>("flop");
  const [result, setResult] = useState<ExpressResult | null>(null);
  const [bbs, setBbs] = useState<number | null>(null);
  const [money, setMoney] = useState<number | null>(null);
  const [showBoard, setShowBoard] = useState(false);
  const [board, setBoard] = useState<Card[]>([]);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const amount = money ?? (bbs !== null ? bbs * stakes.bb : null);
  const ready =
    cards.length === 2 && result !== null && (result === "chopped" || (amount ?? 0) > 0);

  async function save() {
    setBusy(true);
    try {
      const at = nowIso();
      const row = buildExpressHand(
        {
          cards,
          position,
          pot,
          multiway,
          street,
          result: result!,
          amount: result === "chopped" ? 0 : amount!,
          board,
          note,
          tags,
          game: setup.game,
          ...stakes,
        },
        { id: newId(), at, session_id: running?.id ?? null },
      );
      await putRow("hands", row);
      haptic([10, 30, 10]);
      celebrate("small", null, { sound: "save" });
      toast.success("Hand saved to “To finish”.", {
        action: {
          label: "Review",
          onClick: () => router.push(`/hands/view?id=${row.id}`),
        },
      });
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Cards: big preview, compact grid */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5">
          {[0, 1].map((i) =>
            cards[i] ? (
              <PlayingCard key={i} card={cards[i]} size="md" fourColor={fourColor} />
            ) : (
              <div
                key={i}
                className="h-[64px] w-[46px] rounded-[8px] border-2 border-dashed border-line-accent"
                aria-hidden
              />
            ),
          )}
        </div>
        <p className="text-sm text-ink-muted">
          {cards.length < 2 ? "Tap your two cards" : "Got it."}
        </p>
      </div>
      {cards.length < 2 && (
        <CardPicker
          label="Your cards"
          count={2}
          selected={cards}
          onChange={setCards}
          fourColor={fourColor}
        />
      )}
      {cards.length === 2 && (
        <button
          type="button"
          className="-mt-3 text-sm font-semibold text-lavender"
          onClick={() => setCards([])}
        >
          Change cards
        </button>
      )}

      <Row label="Position">
        <Chips
          ariaLabel="Position"
          size="sm"
          options={positionNames(Math.max(6, setup.tableSize)).map((p) => ({ value: p, label: p }))}
          value={position}
          onChange={(v) => setPosition(v as string)}
        />
      </Row>
      <Row label="Pot">
        <div className="flex flex-wrap items-center gap-2">
          <Chips
            ariaLabel="Pot type"
            size="sm"
            options={POTS}
            value={pot}
            onChange={(v) => setPot(v as ExpressPot)}
          />
          <button
            type="button"
            aria-pressed={multiway}
            onClick={() => setMultiway(!multiway)}
            className={cn(
              "min-h-9 rounded-full border px-3 text-[13px] font-semibold",
              multiway
                ? "border-primary-strong bg-pill text-lavender-pale"
                : "border-line bg-field text-ink-soft",
            )}
          >
            Multiway
          </button>
        </div>
      </Row>
      <Row label="Went to">
        <Chips
          ariaLabel="Went to"
          size="sm"
          options={STREETS}
          value={street}
          onChange={(v) => setStreet(v as ExpressStreet)}
        />
      </Row>
      <Row label="Result">
        <div className="grid grid-cols-3 gap-2">
          {(["won", "lost", "chopped"] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={result === r}
              onClick={() => setResult(r)}
              className={cn(
                "h-12 rounded-xl border text-[15px] font-semibold capitalize transition-colors",
                result === r
                  ? r === "won"
                    ? "border-success bg-success/15 text-success"
                    : r === "lost"
                      ? "border-danger bg-danger/15 text-danger"
                      : "border-primary-strong bg-pill text-lavender-pale"
                  : "border-line bg-field text-ink-soft",
              )}
            >
              {r === "won" ? "+ Won" : r === "lost" ? "− Lost" : "Chop"}
            </button>
          ))}
        </div>
        {result && result !== "chopped" && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              {BB_CHIPS.map((b) => (
                <button
                  key={b}
                  type="button"
                  aria-pressed={bbs === b && money === null}
                  onClick={() => {
                    setBbs(b);
                    setMoney(null);
                  }}
                  className={cn(
                    "num min-h-9 rounded-full border px-3 text-[13px] font-semibold",
                    bbs === b && money === null
                      ? "border-primary-strong bg-pill text-lavender-pale"
                      : "border-line bg-field text-ink-soft",
                  )}
                >
                  {b}bb
                </button>
              ))}
            </div>
            <MoneyInput
              label="…or exact amount"
              currency={stakes.currency}
              value={money}
              onChange={(v) => {
                setMoney(v);
                if (v !== null) setBbs(null);
              }}
            />
          </div>
        )}
      </Row>

      <button
        type="button"
        onClick={() => setShowBoard(!showBoard)}
        className="flex items-center gap-1.5 text-sm font-semibold text-ink-soft"
      >
        <ChevronDown
          className={cn("size-4 transition-transform", showBoard && "rotate-180")}
          aria-hidden
        />{" "}
        Board, note & tags (optional)
      </button>
      {showBoard && (
        <div className="space-y-4">
          <CardPicker
            label="Board"
            count={5}
            selected={board}
            dead={cards}
            onChange={setBoard}
            fourColor={fourColor}
          />
          <Input
            aria-label="Note"
            placeholder="Villain tanked then shoved river"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Chips
            ariaLabel="Tags"
            multiple
            size="sm"
            options={userTags.map((t) => ({ value: t, label: t }))}
            value={tags}
            onChange={(v) => setTags(v as string[])}
          />
        </div>
      )}

      <Button size="lg" block disabled={!ready || busy} onClick={save}>
        Save hand
      </Button>
      <Button variant="ghost" block asChild>
        <Link href={running ? `/hands/new?session=${running.id}` : "/hands/new"} onClick={onDone}>
          <LayoutGrid aria-hidden /> Full hand on the table instead
        </Link>
      </Button>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink-soft">{label}</p>
      {children}
    </div>
  );
}

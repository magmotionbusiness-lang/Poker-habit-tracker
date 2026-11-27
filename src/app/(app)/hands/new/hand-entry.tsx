"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Plus } from "lucide-react";
import { Chips } from "@/components/forms/chips";
import { MoneyInput } from "@/components/forms/money-input";
import { ActionPad } from "@/components/poker/action-pad";
import { signedChipLabel } from "@/components/poker/amount";
import { CardPicker } from "@/components/poker/card-picker";
import { PokerTable } from "@/components/poker/poker-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import { sectionEmojis, userTags } from "@/content/hands";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/db";
import { useHand, useRunningSession } from "@/lib/db/hooks";
import { errorMessage } from "@/lib/errors";
import {
  createCollection,
  saveHand,
  saveQuickNote,
  stakesText,
  updateHand,
} from "@/lib/hands/actions";
import { haptic } from "@/lib/haptics";
import { play } from "@/lib/sfx/sfx";
import type { Card as PokerCard } from "@/lib/poker/cards";
import { act, foldTo, replay, settle } from "@/lib/poker/engine";
import { holeCardCount, type Game, type HandHistory } from "@/lib/poker/hand-types";
import { positionNames } from "@/lib/poker/positions";
import { buildHand, HERO_SEAT, setPlayer, undoLast } from "@/lib/poker/setup";
import { useAppStore } from "@/lib/store/app-store";
import { DEFAULT_SETUP, useHandSetup, type HandSetup } from "@/lib/store/hand-setup";

const BOARD_NEEDED = { preflop: 0, flop: 3, turn: 4, river: 5 } as const;
const STAKE_PRESETS: Array<{ label: string; sb: number; bb: number }> = [
  { label: "1/2", sb: 100, bb: 200 },
  { label: "1/3", sb: 100, bb: 300 },
  { label: "2/5", sb: 200, bb: 500 },
  { label: "5/10", sb: 500, bb: 1000 },
  { label: "NL25", sb: 10, bb: 25 },
  { label: "NL50", sb: 25, bb: 50 },
  { label: "NL100", sb: 50, bb: 100 },
];

export function HandEntry() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"hand" | "note">(
    params.get("mode") === "note" ? "note" : "hand",
  );
  const running = useRunningSession();
  const sessionId = params.get("session") ?? running?.id ?? null;
  const fromNote = params.get("from");

  return (
    <div className="space-y-5 pt-3">
      <div className="flex items-center justify-between">
        <Link
          href="/hands"
          className="-ml-2 inline-flex h-11 items-center gap-1.5 px-2 text-sm font-semibold text-ink-soft"
        >
          <ArrowLeft className="size-4" aria-hidden /> Hands
        </Link>
        <Segmented
          ariaLabel="Entry type"
          value={mode}
          onValueChange={setMode}
          options={[
            { value: "hand", label: "Full hand" },
            { value: "note", label: "Quick note" },
          ]}
        />
      </div>
      {mode === "note" ? (
        <QuickNote sessionId={sessionId} />
      ) : (
        <FullHand sessionId={sessionId} fromNote={fromNote} />
      )}
    </div>
  );
}

function QuickNote({ sessionId }: { sessionId: string | null }) {
  const router = useRouter();
  const [text, setText] = useState("");
  return (
    <div className="space-y-4">
      <header>
        <p className="eyebrow mb-1.5">No time? Note it.</p>
        <h1 className="text-[30px] font-semibold">Quick note</h1>
        <p className="mt-1 text-ink-muted">
          It goes to your review queue. Flesh it out after the session.
        </p>
      </header>
      <Textarea
        aria-label="Quick note"
        autoFocus
        className="min-h-32"
        placeholder="AKo, 3-bet pot, lost big on the river vs the reg in seat 4. Check later."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button
        size="lg"
        block
        disabled={text.trim().length < 2}
        onClick={async () => {
          try {
            await saveQuickNote(text, sessionId);
            haptic();
            toast.success("Saved to your review queue.");
            router.push("/hands");
          } catch (e) {
            toast.error(errorMessage(e));
          }
        }}
      >
        Save note
      </Button>
    </div>
  );
}

function FullHand({ sessionId, fromNote }: { sessionId: string | null; fromNote: string | null }) {
  const remembered = useHandSetup((s) => s.setup);
  const saveSetup = useHandSetup((s) => s.save);
  const [setup, setSetup] = useState<HandSetup>({ ...DEFAULT_SETUP, ...remembered });
  const [heroCards, setHeroCards] = useState<PokerCard[]>([]);
  const [hand, setHand] = useState<HandHistory | null>(null);
  const [overrides, setOverrides] = useState<Record<number, { name?: string; stack?: number }>>({});
  // Expanding a quick hand: start from its cards and position.
  const fromHand = useHand(fromNote);
  const [prefilled, setPrefilled] = useState(false);
  if (!prefilled && fromHand?.hero_cards) {
    setPrefilled(true);
    setHeroCards(fromHand.hero_cards.match(/.{2}/g) ?? []);
    if (fromHand.hero_position && positionNames(setup.tableSize).includes(fromHand.hero_position)) {
      setSetup({ ...setup, heroPosition: fromHand.hero_position });
    }
  }

  if (!hand) {
    return (
      <SetupStep
        setup={setup}
        setSetup={setSetup}
        heroCards={heroCards}
        setHeroCards={setHeroCards}
        overrides={overrides}
        setOverrides={setOverrides}
        onStart={(h) => {
          saveSetup(setup);
          setHand(h);
        }}
      />
    );
  }
  return (
    <PlayStep
      hand={hand}
      setHand={setHand}
      sessionId={sessionId}
      fromNote={fromNote}
      onBackToSetup={() => setHand(null)}
    />
  );
}

/* ---------------- Setup ---------------- */

function SetupStep({
  setup,
  setSetup,
  heroCards,
  setHeroCards,
  overrides,
  setOverrides,
  onStart,
}: {
  setup: HandSetup;
  setSetup: (s: HandSetup) => void;
  heroCards: PokerCard[];
  setHeroCards: (c: PokerCard[]) => void;
  overrides: Record<number, { name?: string; stack?: number }>;
  setOverrides: (o: Record<number, { name?: string; stack?: number }>) => void;
  onStart: (h: HandHistory) => void;
}) {
  const fourColor = useAppStore((s) => s.prefs.fourColorDeck);
  const displayMode = useAppStore((s) => s.prefs.displayMode);
  const [editSeat, setEditSeat] = useState<number | null>(null);
  const set = (p: Partial<HandSetup>) => {
    const next = { ...setup, ...p };
    if (p.tableSize && !positionNames(p.tableSize).includes(next.heroPosition))
      next.heroPosition = "BTN";
    if (p.tableSize) setOverrides({});
    if (p.game && holeCardCount(p.game) !== heroCards.length) setHeroCards([]);
    setSetup(next);
  };
  const preview = useMemo(
    () => buildHand({ ...setup, heroCards, players: overrides }),
    [setup, heroCards, overrides],
  );
  const state = useMemo(() => replay(preview), [preview]);
  const need = holeCardCount(setup.game);
  const stakeKey = STAKE_PRESETS.find((p) => p.sb === setup.sb && p.bb === setup.bb)?.label ?? null;
  const seatPlayer = editSeat ? preview.players.find((p) => p.seat === editSeat) : null;

  return (
    <div className="space-y-5">
      <header>
        <p className="eyebrow mb-1.5">Log a hand</p>
        <h1 className="text-[30px] font-semibold">Set the table</h1>
      </header>

      <PokerTable
        hand={preview}
        state={{ ...state, toAct: null }}
        mode={displayMode}
        fourColor={fourColor}
        onSeatClick={(s) => setEditSeat(s)}
      />
      <p className="-mt-2 text-center text-xs text-ink-subtle">
        Tap a seat to name a player or change their stack.
      </p>

      <section className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-ink-soft">Game</p>
          <Chips
            ariaLabel="Game"
            options={[
              { value: "NLHE", label: "Hold'em" },
              { value: "PLO", label: "PLO" },
              { value: "PLO5", label: "PLO5" },
            ]}
            value={setup.game}
            onChange={(v) => set({ game: v as Game })}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-ink-soft">Stakes</p>
          <Chips
            ariaLabel="Stakes"
            size="sm"
            options={STAKE_PRESETS.map((p) => ({ value: p.label, label: p.label }))}
            value={stakeKey}
            onChange={(v) => {
              const p = STAKE_PRESETS.find((x) => x.label === v)!;
              set({ sb: p.sb, bb: p.bb });
            }}
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <MoneyInput
              label="Small blind"
              currency={setup.currency}
              value={setup.sb}
              onChange={(v) => set({ sb: v ?? 0 })}
            />
            <MoneyInput
              label="Big blind"
              currency={setup.currency}
              value={setup.bb}
              onChange={(v) => v && set({ bb: v })}
            />
            <MoneyInput
              label="Ante (each)"
              currency={setup.currency}
              value={setup.ante || null}
              onChange={(v) => set({ ante: v ?? 0 })}
            />
            <MoneyInput
              label="Straddle"
              currency={setup.currency}
              value={setup.straddle || null}
              onChange={(v) => set({ straddle: v ?? 0 })}
            />
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-ink-soft">Players at the table</p>
          <Chips
            ariaLabel="Table size"
            size="sm"
            options={[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ value: n, label: String(n) }))}
            value={setup.tableSize}
            onChange={(v) => set({ tableSize: v as number })}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-ink-soft">Your position</p>
          <Chips
            ariaLabel="Your position"
            size="sm"
            options={positionNames(setup.tableSize).map((p) => ({ value: p, label: p }))}
            value={setup.heroPosition}
            onChange={(v) => set({ heroPosition: v as string })}
          />
        </div>
        <div>
          <Label htmlFor="stack-bb">Stacks (big blinds, everyone)</Label>
          <Input
            id="stack-bb"
            inputMode="numeric"
            value={setup.stackBb}
            onChange={(e) =>
              set({ stackBb: Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 0) })
            }
          />
        </div>
        <CardPicker
          label="Your cards"
          count={need}
          selected={heroCards}
          onChange={setHeroCards}
          fourColor={fourColor}
        />
      </section>

      <Button
        size="lg"
        block
        disabled={heroCards.length !== need || setup.bb <= 0}
        onClick={() => onStart(preview)}
      >
        Start the action →
      </Button>

      <Sheet
        open={editSeat !== null}
        onOpenChange={(o) => !o && setEditSeat(null)}
        title={
          seatPlayer?.seat === HERO_SEAT
            ? "You"
            : (state.seats.find((s) => s.seat === editSeat)?.position ?? "Player")
        }
      >
        {seatPlayer && (
          <div className="space-y-4">
            {seatPlayer.seat !== HERO_SEAT && (
              <div>
                <Label htmlFor="pname">Name / description</Label>
                <Input
                  id="pname"
                  placeholder="Reg in the red hoodie"
                  value={overrides[seatPlayer.seat]?.name ?? ""}
                  onChange={(e) =>
                    setOverrides({
                      ...overrides,
                      [seatPlayer.seat]: {
                        ...overrides[seatPlayer.seat],
                        name: e.target.value || undefined,
                      },
                    })
                  }
                />
              </div>
            )}
            <MoneyInput
              label="Stack"
              currency={setup.currency}
              value={seatPlayer.stack}
              onChange={(v) =>
                v &&
                setOverrides({
                  ...overrides,
                  [seatPlayer.seat]: { ...overrides[seatPlayer.seat], stack: v },
                })
              }
            />
            <Button block onClick={() => setEditSeat(null)}>
              Done
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

/* ---------------- Action & finish ---------------- */

function PlayStep({
  hand,
  setHand,
  sessionId,
  fromNote,
  onBackToSetup,
}: {
  hand: HandHistory;
  setHand: (h: HandHistory) => void;
  sessionId: string | null;
  fromNote: string | null;
  onBackToSetup: () => void;
}) {
  const router = useRouter();
  const fourColor = useAppStore((s) => s.prefs.fourColorDeck);
  const displayMode = useAppStore((s) => s.prefs.displayMode);
  const [mode, setDisplayMode] = useState<"money" | "bb">(displayMode);
  const state = useMemo(() => replay(hand), [hand]);
  const need = BOARD_NEEDED[state.street];
  const boardMissing = !state.handOver
    ? hand.board.length < need
    : state.showdown && hand.board.length < 5;
  const finished = state.handOver && !boardMissing;
  const result = useMemo(() => (finished ? settle(hand) : null), [finished, hand]);
  const dead = [...hand.board, ...hand.players.flatMap((p) => p.cards ?? [])];

  const [boardPick, setBoardPick] = useState<PokerCard[]>([]);
  const nextStreetName = hand.board.length < 3 ? "flop" : hand.board.length < 4 ? "turn" : "river";
  const pickCount = hand.board.length < 3 ? 3 : 1;

  function act_(kind: "fold" | "check" | "call" | "bet" | "raise", to?: number) {
    try {
      setHand(act(hand, kind, to));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">
            {hand.game} {stakesText(hand)}
          </p>
          <p className="font-display text-2xl font-semibold capitalize">
            {finished ? "Result" : state.street}
          </p>
        </div>
        <Segmented
          ariaLabel="Show amounts in"
          value={mode}
          onValueChange={setDisplayMode}
          options={[
            { value: "money", label: "$" },
            { value: "bb", label: "BB" },
          ]}
        />
      </div>

      <PokerTable
        hand={hand}
        state={state}
        mode={mode}
        fourColor={fourColor}
        revealAll={finished}
        results={result?.resolved ? result.net : null}
      />

      {boardMissing ? (
        <Card className="space-y-3">
          <CardPicker
            label={`Deal the ${nextStreetName}`}
            count={pickCount}
            selected={boardPick}
            dead={dead}
            onChange={setBoardPick}
            fourColor={fourColor}
          />
          <Button
            block
            disabled={boardPick.length !== pickCount}
            onClick={() => {
              setHand({ ...hand, board: [...hand.board, ...boardPick] });
              setBoardPick([]);
              haptic();
            }}
          >
            Deal {nextStreetName}
          </Button>
          <Button variant="ghost" block size="sm" onClick={() => setHand(undoLast(hand))}>
            Undo last action
          </Button>
        </Card>
      ) : !state.handOver ? (
        <Card>
          <ActionPad
            hand={hand}
            state={state}
            mode={mode}
            onAct={act_}
            onFoldToHero={() => setHand(foldTo(hand, hand.hero))}
            onUndo={
              hand.actions.some((a) => a.type !== "post")
                ? () => setHand(undoLast(hand))
                : onBackToSetup
            }
          />
        </Card>
      ) : (
        <FinishStep
          hand={hand}
          setHand={setHand}
          sessionId={sessionId}
          fromNote={fromNote}
          onSaved={(id) => router.push(`/hands/view?id=${id}`)}
          mode={mode}
        />
      )}
    </div>
  );
}

function FinishStep({
  hand,
  setHand,
  sessionId,
  fromNote,
  onSaved,
  mode,
}: {
  hand: HandHistory;
  setHand: (h: HandHistory) => void;
  sessionId: string | null;
  fromNote: string | null;
  onSaved: (id: string) => void;
  mode: "money" | "bb";
}) {
  const fourColor = useAppStore((s) => s.prefs.fourColorDeck);
  const sections =
    useLiveQuery(() => db().handCollections.orderBy("sort_order").toArray(), []) ?? [];
  const [villainSeat, setVillainSeat] = useState<number | null>(null);
  const [pick, setPick] = useState<PokerCard[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [newSection, setNewSection] = useState("");
  const [busy, setBusy] = useState(false);
  const r = settle(hand);
  const t = replay(hand);
  const live = t.seats.filter((s) => !s.folded);
  const unknownVillains = r.showdown ? live.filter((s) => !s.isHero && !s.cards) : [];
  const dead = [...hand.board, ...hand.players.flatMap((p) => p.cards ?? [])];
  const need = holeCardCount(hand.game);
  const heroNet = r.resolved ? r.net[hand.hero]! : null;

  return (
    <div className="space-y-4">
      <Card className="text-center">
        <p className="eyebrow">Your result</p>
        <p
          className={`num mt-1 font-display text-4xl font-semibold ${heroNet === null ? "text-ink-muted" : heroNet > 0 ? "text-success" : heroNet < 0 ? "text-danger" : ""}`}
        >
          {heroNet === null ? "Who won?" : signedChipLabel(heroNet, hand.currency, hand.bb, mode)}
        </p>
        {Object.entries(r.values).map(([seat, v]) => (
          <p key={seat} className="text-sm text-ink-muted">
            {t.seats.find((s) => s.seat === Number(seat))?.isHero
              ? "You"
              : t.seats.find((s) => s.seat === Number(seat))?.name}
            : {v.name}
          </p>
        ))}
      </Card>

      {unknownVillains.length > 0 && (
        <Card className="space-y-3">
          <p className="text-sm text-ink-soft">
            Showdown. Add villain cards if you saw them — or just pick the winner.
          </p>
          <div className="flex flex-wrap gap-2">
            {unknownVillains.map((s) => (
              <Button
                key={s.seat}
                size="sm"
                variant="secondary"
                onClick={() => {
                  setVillainSeat(s.seat);
                  setPick([]);
                }}
              >
                {s.name}&apos;s cards
              </Button>
            ))}
          </div>
          {!r.resolved && (
            <div>
              <p className="mb-2 text-sm font-medium text-ink-soft">Who won the pot?</p>
              <Chips
                ariaLabel="Winner"
                multiple
                size="sm"
                options={live.map((s) => ({ value: s.seat, label: s.isHero ? "Me" : s.name }))}
                value={hand.winners ?? []}
                onChange={(v) =>
                  setHand({ ...hand, winners: (v as number[]).length ? (v as number[]) : null })
                }
              />
              <p className="mt-1 text-xs text-ink-subtle">Pick two or more for a chop.</p>
            </div>
          )}
        </Card>
      )}

      <Card className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-ink-soft">Tags</p>
          <Chips
            ariaLabel="Tags"
            multiple
            size="sm"
            options={userTags.map((x) => ({ value: x, label: x }))}
            value={tags}
            onChange={(v) => setTags(v as string[])}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-ink-soft">Add to your sections</p>
          {sections.length > 0 && (
            <Chips
              ariaLabel="Sections"
              multiple
              size="sm"
              options={sections.map((s) => ({
                value: s.id,
                label: `${s.emoji ?? ""} ${s.name}`.trim(),
              }))}
              value={sectionIds}
              onChange={(v) => setSectionIds(v as string[])}
            />
          )}
          <div className="mt-2 flex gap-2">
            <Input
              aria-label="New section name"
              placeholder="New section, e.g. Ask Nelson"
              value={newSection}
              onChange={(e) => setNewSection(e.target.value)}
            />
            <Button
              size="icon"
              variant="secondary"
              aria-label="Create section"
              disabled={!newSection.trim()}
              onClick={async () => {
                const c = await createCollection(
                  newSection,
                  sectionEmojis[sections.length % sectionEmojis.length]!,
                );
                setSectionIds([...sectionIds, c.id]);
                setNewSection("");
              }}
            >
              <Plus />
            </Button>
          </div>
        </div>
        <div>
          <Label htmlFor="hand-note">Note (optional)</Label>
          <Textarea
            id="hand-note"
            className="min-h-16"
            placeholder="Villain tanked on the river, then shoved."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </Card>

      <Button
        size="lg"
        block
        disabled={busy || !r.resolved}
        onClick={async () => {
          setBusy(true);
          try {
            // Converting a quick note replaces it (same id), keeping the note text.
            const saved = await saveHand(hand, {
              id: fromNote ?? undefined,
              session_id: sessionId,
              quick_note: note.trim() || undefined,
            });
            const final = await updateHand(saved, { user_tags: tags, collection_ids: sectionIds });
            haptic([10, 30, 10]);
            play("save");
            toast.success("Hand saved. Review it while it's fresh.");
            onSaved(final.id);
          } catch (e) {
            toast.error(errorMessage(e));
            setBusy(false);
          }
        }}
      >
        <Check aria-hidden /> Save hand
      </Button>
      {!r.resolved && (
        <p className="text-center text-xs text-ink-subtle">
          Pick the winner (or add cards) to save.
        </p>
      )}

      <Sheet
        open={villainSeat !== null}
        onOpenChange={(o) => !o && setVillainSeat(null)}
        title="Villain's cards"
      >
        <div className="space-y-4">
          <CardPicker
            label="Their cards"
            count={need}
            selected={pick}
            dead={dead}
            onChange={setPick}
            fourColor={fourColor}
          />
          <Button
            block
            disabled={pick.length !== need}
            onClick={() => {
              setHand(setPlayer(hand, villainSeat!, { cards: pick }));
              setVillainSeat(null);
            }}
          >
            Show cards
          </Button>
        </div>
      </Sheet>
      <Badge variant="outline" size="sm">
        Auto-tags & stats are computed when you save
      </Badge>
    </div>
  );
}

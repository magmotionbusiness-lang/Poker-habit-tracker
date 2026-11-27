"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { HandRow } from "@/components/hands/hand-row";
import { PlayerSheet } from "@/components/players/player-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";
import type { Trait } from "@/lib/domain/types";
import { useHands, useOpponent } from "@/lib/db/hooks";
import { deleteOpponent, saveOpponent } from "@/lib/hands/actions";
import { useFmt } from "@/lib/insights/use-insights";
import {
  bumpTrait,
  readConfidence,
  recordVs,
  STYLES,
  TRAIT_PRESETS,
  traitLabel,
} from "@/lib/players/players";
import { play } from "@/lib/sfx/sfx";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";

const LEVELS: Trait["level"][] = ["low", "medium", "high"];

/** One player: your record against them, their reads (with evidence), notes, shared hands. */
export function PlayerProfile() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const p = useOpponent(id);
  const hands = useHands();
  const prefs = useAppStore((s) => s.prefs);
  const fmt = useFmt();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const shared = useMemo(
    () =>
      hands && id
        ? hands
            .filter((h) => h.opponent_ids?.includes(id))
            .sort((a, b) => (a.played_at < b.played_at ? 1 : -1))
        : [],
    [hands, id],
  );
  if (p === undefined || !hands) return null;
  if (!p)
    return (
      <p className="pt-6 text-ink-muted">
        Player not found.{" "}
        <Link href="/hands/players" className="text-lavender">
          Back to players
        </Link>
      </p>
    );
  const r = recordVs(p.id, hands);
  const style = STYLES[p.style ?? "unknown"];
  const money = Object.entries(r.net).find(([c]) => c === prefs.currency)?.[1];

  async function addTrait(key: string, level: Trait["level"]) {
    await saveOpponent({ ...p!, traits: bumpTrait(p!, key, level) });
    play("tick", { progress: 0.6 });
  }

  return (
    <div className="space-y-4 pt-3">
      <Link
        href="/hands/players"
        className="-ml-2 inline-flex h-11 items-center gap-1.5 px-2 text-sm font-semibold text-ink-soft"
      >
        <ArrowLeft className="size-4" aria-hidden /> Players
      </Link>

      <Card glow className="flex items-center gap-4">
        <span className="anim-float grid size-16 shrink-0 place-items-center rounded-full bg-pill text-4xl">
          {p.avatar ?? "🎩"}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-semibold">{p.nickname}</h1>
          <p className="text-sm text-lavender">{style.label}</p>
          <p className="text-xs text-ink-muted">{style.hint}</p>
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Edit player"
          onClick={() => setEditing(true)}
        >
          <Pencil aria-hidden />
        </Button>
      </Card>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Hands", String(r.hands)],
          ["Net", r.hands ? `${r.netBb >= 0 ? "+" : "−"}${Math.abs(r.netBb)} bb` : "—"],
          ["Won · lost", `${r.won} · ${r.lost}`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-line bg-surface/80 py-2.5">
            <p className="text-[11px] text-ink-muted">{k}</p>
            <p
              className={cn(
                "num font-semibold",
                k === "Net" && r.hands ? (r.netBb >= 0 ? "text-success" : "text-danger") : "",
              )}
            >
              {v}
            </p>
          </div>
        ))}
      </div>
      {money !== undefined && (
        <p className="-mt-2 text-center text-xs text-ink-muted">
          {fmt(money, true)} across shared hands you logged (big pots are over-represented).
        </p>
      )}

      <Card>
        <CardHeader
          eyebrow="Reads"
          action={
            <Button size="sm" variant="ghost" onClick={() => setAdding((a) => !a)}>
              <Plus aria-hidden /> Add
            </Button>
          }
        />
        {Object.keys(p.traits).length === 0 && !adding && (
          <p className="text-sm text-ink-muted">
            No reads yet. Add what you notice — each time you see it again, tap +1.
          </p>
        )}
        <ul className="space-y-2">
          {Object.entries(p.traits).map(([k, t]) => {
            const c = readConfidence(t.evidence);
            return (
              <li key={k} className="flex items-center gap-3 rounded-lg bg-field px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium capitalize">{traitLabel(k)}</p>
                  <p className="text-xs text-ink-muted">
                    {t.level} ·{" "}
                    <span
                      className={cn(
                        c.level === 2
                          ? "text-success"
                          : c.level === 1
                            ? "text-lavender"
                            : "text-gold",
                      )}
                    >
                      {c.label}
                    </span>{" "}
                    · {t.evidence} sighting{t.evidence === 1 ? "" : "s"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addTrait(k, t.level)}
                  aria-label={`Seen again: ${traitLabel(k)}`}
                >
                  +1
                </Button>
              </li>
            );
          })}
        </ul>
        {adding && <TraitPicker onPick={(k, l) => addTrait(k, l).then(() => setAdding(false))} />}
        <p className="mt-3 text-[11px] text-ink-subtle">
          One memorable hand is an assumption. Three sightings is some evidence; eight is a solid
          read.
        </p>
      </Card>

      {p.notes && (
        <Card>
          <CardHeader eyebrow="Notes" />
          <p className="text-sm whitespace-pre-wrap text-ink-soft">{p.notes}</p>
        </Card>
      )}

      <section className="space-y-2">
        <h2 className="eyebrow px-1">Shared hands · {shared.length}</h2>
        {shared.length === 0 ? (
          <p className="px-1 text-sm text-ink-muted">Open any hand and tag {p.nickname} in it.</p>
        ) : (
          <ul className="stagger divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface/80">
            {shared.slice(0, 30).map((h) => (
              <li key={h.id}>
                <Link href={`/hands/view?id=${h.id}`} className="block">
                  <HandRow hand={h} mode={prefs.displayMode} fourColor={prefs.fourColorDeck} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Button
        variant="danger"
        block
        onClick={async () => {
          if (!confirm(`Delete ${p.nickname}? Your hands stay; they're just untagged.`)) return;
          await deleteOpponent(p.id);
          toast("Player deleted");
          router.push("/hands/players");
        }}
      >
        <Trash2 aria-hidden /> Delete player
      </Button>
      {editing && <PlayerSheet player={p} onClose={() => setEditing(false)} />}
    </div>
  );
}

function TraitPicker({ onPick }: { onPick: (key: string, level: Trait["level"]) => void }) {
  const [key, setKey] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  return (
    <div className="mt-3 space-y-3 rounded-lg border border-line-accent p-3">
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(TRAIT_PRESETS).map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setKey(k)}
            className={cn(
              "press h-8 rounded-full border px-3 text-xs font-semibold",
              key === k
                ? "border-primary bg-pill text-lavender-pale"
                : "border-line text-ink-muted",
            )}
          >
            {l}
          </button>
        ))}
      </div>
      <input
        aria-label="Custom read"
        placeholder="Or type your own…"
        className="h-10 w-full rounded-md border border-line bg-field px-3 text-sm"
        value={custom}
        onChange={(e) => {
          setCustom(e.target.value);
          setKey(
            e.target.value.trim()
              ? e.target.value.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 40)
              : null,
          );
        }}
      />
      <div className="grid grid-cols-3 gap-2">
        {LEVELS.map((l) => (
          <Button
            key={l}
            size="sm"
            variant="secondary"
            disabled={!key}
            onClick={() => key && onPick(key, l)}
            className="capitalize"
          >
            {l}
          </Button>
        ))}
      </div>
    </div>
  );
}

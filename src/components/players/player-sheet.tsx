"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import type { Opponent, OpponentStyle } from "@/lib/domain/types";
import { saveOpponent } from "@/lib/hands/actions";
import { STYLES } from "@/lib/players/players";
import { cn } from "@/lib/utils";

const AVATARS = ["🦈", "🐟", "🪨", "📞", "🔥", "🎯", "🦊", "🐢", "👑", "🎩", "🧢", "😎"];

/** Add or edit a player: name, a face, a style and free notes. Five seconds, tops. */
export function PlayerSheet({
  player,
  onClose,
  onSaved,
}: {
  player: Opponent | null;
  onClose: () => void;
  onSaved?: (o: Opponent) => void;
}) {
  const [name, setName] = useState(player?.nickname ?? "");
  const [avatar, setAvatar] = useState(player?.avatar ?? "🎩");
  const [style, setStyle] = useState<OpponentStyle>(player?.style ?? "unknown");
  const [notes, setNotes] = useState(player?.notes ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title={player ? "Edit player" : "New player"}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="pl-name">Name or nickname</Label>
          <Input
            id="pl-name"
            maxLength={60}
            placeholder="Mike (seat 4)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-soft">Face</p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Avatar">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={avatar === a}
                onClick={() => setAvatar(a)}
                className={cn(
                  "press grid size-10 place-items-center rounded-full border text-xl",
                  avatar === a ? "border-primary bg-pill" : "border-line bg-field",
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-soft">Style</p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Style">
            {(Object.keys(STYLES) as OpponentStyle[]).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={style === k}
                onClick={() => setStyle(k)}
                className={cn(
                  "press h-9 rounded-full border px-3 text-sm font-semibold",
                  style === k
                    ? "border-primary bg-pill text-lavender-pale"
                    : "border-line text-ink-muted",
                )}
              >
                {STYLES[k].label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">{STYLES[style].hint}</p>
        </div>
        <div>
          <Label htmlFor="pl-notes">Notes</Label>
          <Textarea
            id="pl-notes"
            className="min-h-20"
            placeholder="Overbets the river when bluffing."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <Button
          block
          size="lg"
          disabled={busy || !name.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              const o = await saveOpponent({
                id: player?.id,
                nickname: name,
                avatar,
                style,
                notes: notes.trim() || null,
              });
              onSaved?.(o);
              onClose();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Couldn't save");
              setBusy(false);
            }
          }}
        >
          Save player
        </Button>
      </div>
    </Sheet>
  );
}

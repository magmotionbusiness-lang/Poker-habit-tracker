"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus, Search, Users } from "lucide-react";
import { PlayerSheet } from "@/components/players/player-sheet";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useHands, useOpponents } from "@/lib/db/hooks";
import { recordVs, STYLES } from "@/lib/players/players";
import { cn } from "@/lib/utils";

/** Your personal database of the people you play against. */
export function PlayersScreen() {
  const players = useOpponents();
  const hands = useHands();
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const rows = useMemo(() => {
    if (!players || !hands) return null;
    return players
      .filter((p) => p.nickname.toLowerCase().includes(q.trim().toLowerCase()))
      .map((p) => ({ p, r: recordVs(p.id, hands) }))
      .sort((a, b) =>
        (b.r.lastPlayed ?? b.p.updated_at).localeCompare(a.r.lastPlayed ?? a.p.updated_at),
      );
  }, [players, hands, q]);

  return (
    <div className="space-y-4 pt-3">
      <Link
        href="/hands"
        className="-ml-2 inline-flex h-11 items-center gap-1.5 px-2 text-sm font-semibold text-ink-soft"
      >
        <ArrowLeft className="size-4" aria-hidden /> Hands
      </Link>
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1.5">Know your table</p>
          <h1 className="text-[34px] font-semibold">Players</h1>
        </div>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus aria-hidden /> Add
        </Button>
      </header>

      {players && players.length > 0 && (
        <Input
          icon={<Search />}
          aria-label="Search players"
          placeholder="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      )}

      {rows && rows.length === 0 && !q ? (
        <EmptyState
          icon={<Users />}
          title="Remember everyone"
          body="Add the regulars you play with. Tag them in hands and your record against each one builds up — with how solid each read is."
          action={<Button onClick={() => setAdding(true)}>Add your first player</Button>}
        />
      ) : (
        <ul className="stagger space-y-2">
          {(rows ?? []).map(({ p, r }) => (
            <li key={p.id}>
              <Link
                href={`/hands/players/view?id=${p.id}`}
                className="press flex items-center gap-3 rounded-lg border border-line bg-surface/80 px-4 py-3"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-pill text-2xl">
                  {p.avatar ?? "🎩"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.nickname}</span>
                  <span className="block truncate text-sm text-ink-muted">
                    {STYLES[p.style ?? "unknown"].label} · {r.hands} hand{r.hands === 1 ? "" : "s"}
                  </span>
                </span>
                {r.hands > 0 && (
                  <span
                    className={cn(
                      "num text-sm font-semibold",
                      r.netBb >= 0 ? "text-success" : "text-danger",
                    )}
                  >
                    {r.netBb >= 0 ? "+" : "−"}
                    {Math.abs(r.netBb)} bb
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {adding && <PlayerSheet player={null} onClose={() => setAdding(false)} />}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BookMarked,
  FolderPlus,
  LayoutGrid,
  NotebookPen,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { HandRow } from "@/components/hands/hand-row";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { CardsArt } from "@/components/ui/illustrations";
import { Input, Label } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { handsCopy, sectionEmojis, smartLists } from "@/content/hands";
import { useCollections, useHands } from "@/lib/db/hooks";
import type { HandCollection } from "@/lib/domain/types";
import { errorMessage } from "@/lib/errors";
import { createCollection, deleteCollection, updateCollection } from "@/lib/hands/actions";
import { inCollection, searchHands, smartList, type SmartListKey } from "@/lib/hands/lists";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import { useUi } from "@/lib/store/ui-store";

type View = { kind: "smart"; key: SmartListKey } | { kind: "section"; id: string };

export function HandsScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const hands = useHands();
  const sections = useCollections();
  const prefs = useAppStore((s) => s.prefs);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(40);
  const [sheet, setSheet] = useState<"new" | HandCollection | null>(null);
  const openSheet = useUi((s) => s.open);

  const view: View = params.get("section")
    ? { kind: "section", id: params.get("section")! }
    : { kind: "smart", key: (params.get("list") as SmartListKey) ?? "all" };
  const go = (v: View) => {
    setLimit(40);
    router.replace(
      v.kind === "section"
        ? `/hands?section=${v.id}`
        : v.key === "all"
          ? "/hands"
          : `/hands?list=${v.key}`,
      { scroll: false },
    );
  };

  const counts = useMemo(() => {
    if (!hands) return null;
    return Object.fromEntries(
      smartLists.map((l) => [l.key, smartList(hands, l.key as SmartListKey).length]),
    ) as Record<SmartListKey, number>;
  }, [hands]);

  if (!hands || !sections || !counts) {
    return (
      <div className="space-y-4 pt-5">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const section = view.kind === "section" ? sections.find((s) => s.id === view.id) : undefined;
  const base = view.kind === "section" ? inCollection(hands, view.id) : smartList(hands, view.key);
  const list = searchHands(base, query);
  const title =
    view.kind === "section"
      ? `${section?.emoji ?? ""} ${section?.name ?? "Section"}`.trim()
      : smartLists.find((l) => l.key === view.key)!.label;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Learn how to learn"
        title="Hands"
        action={
          <div className="flex gap-2">
            <Button size="icon-sm" variant="secondary" aria-label="Leak Book" asChild>
              <Link href="/hands/leaks">
                <BookMarked />
              </Link>
            </Button>
            <Button size="icon-sm" variant="secondary" aria-label="Full hand on the table" asChild>
              <Link href="/hands/new">
                <LayoutGrid />
              </Link>
            </Button>
            <Button size="sm" onClick={() => openSheet("express-hand")}>
              <Plus aria-hidden /> Log hand
            </Button>
          </div>
        }
      />

      {hands.length === 0 ? (
        <EmptyState
          art={<CardsArt />}
          title={handsCopy.emptyTitle}
          body={handsCopy.emptyBody}
          action={
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href="/hands/new">Log your first hand</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/hands/new?mode=note">
                  <NotebookPen aria-hidden /> Quick note
                </Link>
              </Button>
            </div>
          }
        />
      ) : (
        <>
          {counts.unreviewed > 0 && view.kind === "smart" && view.key !== "unreviewed" && (
            <button
              type="button"
              onClick={() => go({ kind: "smart", key: "unreviewed" })}
              className="block w-full text-left"
            >
              <Card glow className="flex items-center justify-between">
                <span>
                  <span className="eyebrow block">Review queue</span>
                  <span className="font-display text-xl font-semibold">
                    {counts.unreviewed} hand{counts.unreviewed === 1 ? "" : "s"} waiting
                  </span>
                </span>
                <span className="text-sm font-semibold text-lavender">Review →</span>
              </Card>
            </button>
          )}

          <section aria-labelledby="sections-h" className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 id="sections-h" className="eyebrow !font-sans">
                Your sections
              </h2>
              <button
                type="button"
                className="text-sm font-semibold text-lavender"
                onClick={() => setSheet("new")}
              >
                + New
              </button>
            </div>
            <div className="-mx-4 flex scrollbar-none gap-2 overflow-x-auto px-4 pb-1">
              {sections.map((s) => {
                const n = hands.filter((h) => h.collection_ids.includes(s.id)).length;
                const active = view.kind === "section" && view.id === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      go(active ? { kind: "smart", key: "all" } : { kind: "section", id: s.id })
                    }
                    className={cn(
                      "flex w-[128px] shrink-0 flex-col rounded-lg border p-3 text-left transition-colors",
                      active ? "border-primary-strong bg-pill" : "border-line bg-surface",
                    )}
                  >
                    <span className="text-xl" aria-hidden>
                      {s.emoji ?? "📁"}
                    </span>
                    <span className="mt-1 truncate font-semibold">{s.name}</span>
                    <span className="num text-xs text-ink-muted">
                      {n} hand{n === 1 ? "" : "s"}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setSheet("new")}
                className="flex w-[128px] shrink-0 flex-col items-start justify-center rounded-lg border border-dashed border-line-accent p-3 text-left text-sm text-lavender"
              >
                <FolderPlus className="mb-1 size-5" aria-hidden />
                New section
              </button>
            </div>
            {sections.length === 0 && (
              <p className="px-1 text-xs text-ink-subtle">{handsCopy.sectionsHelp}</p>
            )}
          </section>

          <div
            className="-mx-4 flex scrollbar-none gap-2 overflow-x-auto px-4"
            role="tablist"
            aria-label="Smart lists"
          >
            {smartLists
              .filter((l) => l.key === "all" || counts[l.key as SmartListKey] > 0)
              .map((l) => {
                const active = view.kind === "smart" && view.key === l.key;
                return (
                  <button
                    key={l.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => go({ kind: "smart", key: l.key as SmartListKey })}
                    className={cn(
                      "num inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold",
                      active
                        ? "border-primary-strong bg-pill text-lavender-pale"
                        : "border-line bg-field text-ink-soft",
                    )}
                  >
                    {l.label}{" "}
                    <span className="text-ink-muted">{counts[l.key as SmartListKey]}</span>
                  </button>
                );
              })}
          </div>

          <div className="flex items-end justify-between gap-3 px-1">
            <div className="min-w-0">
              <h2 className="truncate font-display text-2xl font-semibold">{title}</h2>
              <p className="num text-sm text-ink-muted">
                {list.length} hand{list.length === 1 ? "" : "s"}
              </p>
            </div>
            {section && (
              <Button size="sm" variant="ghost" onClick={() => setSheet(section)}>
                <Pencil aria-hidden /> Edit
              </Button>
            )}
          </div>

          <Input
            icon={<Search />}
            aria-label="Search hands"
            placeholder="Search: AK, BTN, multiway, cooler…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {list.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-ink-muted">
              {view.kind === "section"
                ? "No hands in this section yet. Add hands from their detail page."
                : "Nothing here yet."}
            </p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
              {list.slice(0, limit).map((h) => (
                <li key={h.id}>
                  <HandRow hand={h} mode={prefs.displayMode} fourColor={prefs.fourColorDeck} />
                </li>
              ))}
            </ul>
          )}
          {list.length > limit && (
            <Button variant="ghost" block onClick={() => setLimit(limit + 40)}>
              Show more
            </Button>
          )}
        </>
      )}

      <SectionSheet
        key={sheet === null ? "closed" : sheet === "new" ? "new" : sheet.id}
        section={sheet === "new" ? null : sheet}
        open={sheet !== null}
        onClose={() => setSheet(null)}
        onDeleted={() => go({ kind: "smart", key: "all" })}
      />
    </div>
  );
}

function SectionSheet({
  section,
  open,
  onClose,
  onDeleted,
}: {
  section: HandCollection | null;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(section?.name ?? "");
  const [emoji, setEmoji] = useState(section?.emoji ?? sectionEmojis[0]!);
  const [confirm, setConfirm] = useState(false);
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={section ? "Edit section" : "New section"}
      description={section ? undefined : handsCopy.sectionsHelp}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="section-name">Name</Label>
          <Input
            id="section-name"
            autoFocus
            placeholder="Ask Nelson"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Icon">
          {sectionEmojis.map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={emoji === e}
              onClick={() => setEmoji(e)}
              className={cn(
                "grid size-11 place-items-center rounded-full border text-xl",
                emoji === e ? "border-primary-strong bg-pill" : "border-line bg-field",
              )}
            >
              {e}
            </button>
          ))}
        </div>
        <Button
          size="lg"
          block
          disabled={!name.trim()}
          onClick={async () => {
            try {
              if (section) await updateCollection(section, { name: name.trim(), emoji });
              else await createCollection(name, emoji);
              toast.success(
                section ? "Section updated." : "Section created. Add hands to it from any hand.",
              );
              onClose();
            } catch (e) {
              toast.error(errorMessage(e));
            }
          }}
        >
          {section ? "Save" : "Create section"}
        </Button>
        {section && (
          <Button variant="ghost" block onClick={() => setConfirm(true)}>
            Delete section
          </Button>
        )}
      </div>
      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this section?"
        description="Your hands stay in your journal — they're just taken out of this section."
      >
        <div className="flex gap-3">
          <Button variant="secondary" block onClick={() => setConfirm(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            block
            onClick={async () => {
              await deleteCollection(section!.id);
              setConfirm(false);
              onClose();
              onDeleted();
              toast("Section deleted");
            }}
          >
            Delete
          </Button>
        </div>
      </Dialog>
    </Sheet>
  );
}

"use client";

import { ArrowLeftRight, BookOpen, NotebookPen, Play, Plus, Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { copy } from "@/content/copy";
import { haptic } from "@/lib/haptics";
import { useRunningSession } from "@/lib/db/hooks";
import { useUi } from "@/lib/store/ui-store";

const actions = [
  { key: "startSession", icon: Play, featured: true },
  { key: "logSession", icon: Timer },
  { key: "logHand", icon: NotebookPen },
  { key: "logStudy", icon: BookOpen },
  { key: "transaction", icon: ArrowLeftRight },
] as const;

/** The "+" button that opens Quick add. Lives in the Home and Today headers. */
export function QuickAddButton() {
  const open = useUi((s) => s.open);
  return (
    <Button
      size="icon-sm"
      aria-label="Quick add"
      aria-haspopup="dialog"
      onClick={() => {
        haptic();
        open("quick-add");
      }}
    >
      <Plus className="size-5" strokeWidth={2.4} aria-hidden />
    </Button>
  );
}

/** The quick-add sheet (mounted once; opened from any header's "+"). */
export function QuickAdd() {
  const router = useRouter();
  const ui = useUi();
  const running = useRunningSession();
  const open = ui.sheet === "quick-add";

  function run(key: (typeof actions)[number]["key"]) {
    ui.close();
    switch (key) {
      case "startSession":
        return running ? router.push("/session") : ui.open("start-session");
      case "logSession":
        return router.push("/sessions/edit");
      case "logStudy":
        return ui.open("study");
      case "transaction":
        return ui.open("transaction");
      case "logHand":
        return ui.open("express-hand");
    }
  }
  return (
    <>
      <Sheet open={open} onOpenChange={(o) => (o ? null : ui.close())} title={copy.quickAdd.title}>
        <ul className="stagger space-y-2">
          {actions.map(({ key, icon: Icon, ...rest }) => {
            const item = copy.quickAdd[key];
            const featured = "featured" in rest;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => run(key)}
                  className={
                    featured
                      ? "press flex w-full items-center gap-4 rounded-lg border border-line-accent bg-[radial-gradient(ellipse_at_left,rgba(124,92,255,0.22),transparent_70%)] p-4 text-left"
                      : "press flex w-full items-center gap-4 rounded-lg border border-line bg-surface p-4 text-left hover:border-line-strong"
                  }
                >
                  <span
                    className={
                      featured
                        ? "grid size-11 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-white shadow-accent"
                        : "grid size-11 place-items-center rounded-full bg-pill text-lavender"
                    }
                  >
                    <Icon className="size-5" strokeWidth={1.8} aria-hidden />
                  </span>
                  <span>
                    <span className="block font-semibold text-ink">
                      {key === "startSession" && running ? "Back to live session" : item.label}
                    </span>
                    <span className="block text-sm text-ink-muted">{item.hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
}

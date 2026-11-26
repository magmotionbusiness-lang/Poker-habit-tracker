"use client";

import { ArrowLeftRight, BookOpen, NotebookPen, Play, Plus, Timer } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
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

/** Floating "+" that opens the quick-add sheet. Sits above the tab bar, thumb-reachable. */
export function QuickAdd() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ui = useUi();
  const running = useRunningSession();
  const pathname = usePathname();

  function run(key: (typeof actions)[number]["key"]) {
    setOpen(false);
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
        return toast("Hand logging arrives in Phase 2", {
          description: "Fast entry, quick notes and the replayer.",
        });
    }
  }
  return (
    <>
      {!/^\/(sessions\/edit|hands\/new|hands\/view)/.test(pathname) && (
        <button
          type="button"
          aria-label="Quick add"
          aria-haspopup="dialog"
          onClick={() => {
            haptic();
            setOpen(true);
          }}
          className="fixed right-[max(16px,var(--safe-right))] bottom-[calc(var(--tabbar-height)+var(--safe-bottom)+16px)] z-40 grid size-14 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-white shadow-accent transition-transform active:scale-95"
        >
          <Plus className="size-7" strokeWidth={2.2} aria-hidden />
        </button>
      )}
      <Sheet open={open} onOpenChange={setOpen} title={copy.quickAdd.title}>
        <ul className="space-y-2">
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
                      ? "flex w-full items-center gap-4 rounded-lg border border-line-accent bg-[radial-gradient(ellipse_at_left,rgba(124,92,255,0.22),transparent_70%)] p-4 text-left"
                      : "flex w-full items-center gap-4 rounded-lg border border-line bg-surface p-4 text-left hover:border-line-strong"
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

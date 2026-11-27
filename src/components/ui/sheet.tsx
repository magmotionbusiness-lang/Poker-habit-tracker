"use client";

import { Drawer } from "vaul";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Keeps an open sheet above the on-screen keyboard. iOS doesn't resize the layout viewport
 * when the keyboard opens (only the *visual* viewport shrinks), and vaul's own input
 * repositioning double-shifts inside a home-screen app — the sheet jumped off screen. We
 * turn that off and instead pin the sheet's bottom to the top of the keyboard and cap its
 * height to the visible area, so the focused field always stays in view.
 */
function useKeyboardSafe(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    const el = ref.current;
    if (!open || !vv || !el) return;
    const update = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      el.style.bottom = `${kb}px`;
      el.style.maxHeight = `${Math.round(vv.height * 0.94)}px`;
      const focused = document.activeElement as HTMLElement | null;
      if (kb > 0 && focused && el.contains(focused))
        focused.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      el.style.bottom = "";
      el.style.maxHeight = "";
    };
  }, [open]);
  return ref;
}

/** Bottom sheet (iOS-style, drag to dismiss). Used for quick-add and pickers. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useKeyboardSafe(open);
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
        <Drawer.Content
          ref={ref}
          className={cn(
            "pb-safe fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-lg flex-col rounded-t-xl border border-b-0 border-line bg-surface-2 transition-[bottom] duration-200 ease-out outline-none",
            className,
          )}
        >
          <div
            className="mx-auto mt-2.5 mb-1 h-1 w-10 shrink-0 rounded-full bg-line-strong"
            aria-hidden
          />
          <div className="shrink-0 px-5 pt-2 pb-1">
            <Drawer.Title className="font-display text-2xl font-semibold tracking-[-0.02em]">
              {title}
            </Drawer.Title>
            {description ? (
              <Drawer.Description className="mt-1 text-sm text-ink-muted">
                {description}
              </Drawer.Description>
            ) : (
              <Drawer.Description className="sr-only">{title}</Drawer.Description>
            )}
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pt-3 pb-5">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

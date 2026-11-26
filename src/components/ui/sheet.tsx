"use client";

import { Drawer } from "vaul";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
        <Drawer.Content
          className={cn(
            "pb-safe fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-lg flex-col rounded-t-xl border border-b-0 border-line bg-surface-2 outline-none",
            className,
          )}
        >
          <div className="mx-auto mt-2.5 mb-1 h-1 w-10 rounded-full bg-line-strong" aria-hidden />
          <div className="px-5 pt-2 pb-1">
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
          <div className="overflow-y-auto px-5 pt-3 pb-5">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

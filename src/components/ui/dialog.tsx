"use client";

import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Dialog({
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
  children?: ReactNode;
  className?: string;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-fade-up" />
        <D.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-line-accent bg-surface-2 p-6 shadow-accent outline-none",
            className,
          )}
        >
          <D.Title className="pr-8 font-display text-2xl font-semibold tracking-[-0.02em]">
            {title}
          </D.Title>
          {description && (
            <D.Description className="mt-2 text-ink-muted">{description}</D.Description>
          )}
          <div className="mt-5">{children}</div>
          <D.Close
            className="absolute top-4 right-4 grid size-9 place-items-center rounded-full text-ink-muted hover:bg-white/5 hover:text-ink"
            aria-label="Close"
          >
            <X className="size-5" />
          </D.Close>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

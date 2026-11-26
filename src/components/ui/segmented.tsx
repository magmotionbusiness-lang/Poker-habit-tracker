"use client";

import { ToggleGroup } from "radix-ui";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = { value: T; label: string };

/** Pill segmented control (single select). */
export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  ariaLabel,
  className,
}: {
  value: T;
  onValueChange: (v: T) => void;
  options: readonly SegmentedOption<T>[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v as T)}
      aria-label={ariaLabel}
      className={cn("inline-flex rounded-full border border-line bg-field p-1", className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          className="h-9 flex-1 rounded-full px-4 text-sm font-semibold text-ink-muted transition-colors data-[state=on]:bg-primary-strong data-[state=on]:text-white data-[state=on]:shadow-[0_4px_16px_rgba(124,92,255,0.35)]"
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}

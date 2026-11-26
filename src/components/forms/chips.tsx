"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChipOption<T extends string | number> = { value: T; label: string; hint?: string };

/** Pill chips: single or multi select, ≥ 44px touch targets. */
export function Chips<T extends string | number>({
  options,
  value,
  onChange,
  multiple = false,
  ariaLabel,
  size = "md",
}: {
  options: readonly ChipOption<T>[];
  value: T | T[] | null;
  onChange: (v: T | T[]) => void;
  multiple?: boolean;
  ariaLabel: string;
  size?: "sm" | "md";
}) {
  const selected = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected(o.value);
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={on}
            onClick={() => {
              if (!multiple) return onChange(o.value);
              const list = Array.isArray(value) ? value : [];
              onChange(on ? list.filter((x) => x !== o.value) : [...list, o.value]);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border font-semibold transition-colors",
              size === "md" ? "min-h-11 px-4 text-sm" : "min-h-9 px-3 text-[13px]",
              on
                ? "border-primary-strong bg-pill text-lavender-pale shadow-[0_0_16px_rgba(124,92,255,0.25)]"
                : "border-line bg-field text-ink-soft hover:border-line-strong",
            )}
          >
            {multiple && on && <Check className="size-3.5" aria-hidden />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** 1–5 rating as five pills. */
export function RatingPicker({
  value,
  onChange,
  label,
  low,
  high,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  label: string;
  low: string;
  high: string;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink-soft">{label}</legend>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            aria-label={`${label}: ${n} of 5`}
            onClick={() => onChange(value === n ? null : n)}
            className={cn(
              "num h-11 flex-1 rounded-md border text-sm font-semibold transition-colors",
              value === n
                ? "border-primary-strong bg-primary-strong text-white"
                : "border-line bg-field text-ink-soft",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-ink-subtle">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </fieldset>
  );
}

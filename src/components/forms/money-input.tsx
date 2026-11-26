"use client";

import { useId, useState } from "react";
import { currencyExponent, parseMoney, toDecimalString } from "@/lib/money";
import { cn } from "@/lib/utils";

function symbolFor(currency: string) {
  try {
    const parts = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}

function tryParse(text: string, currency: string): number | null {
  if (!text.trim()) return null;
  try {
    return parseMoney(text, currency).minor;
  } catch {
    return Number.NaN;
  }
}

/**
 * Amount input that never touches floats: keeps the typed text, parses it with
 * parseMoney into integer minor units. `value` null = empty.
 */
export function MoneyInput({
  value,
  onChange,
  currency,
  label,
  placeholder = "0",
  allowNegative = false,
  autoFocus,
  className,
  size = "md",
  id,
}: {
  value: number | null;
  onChange: (minor: number | null) => void;
  currency: string;
  label?: string;
  placeholder?: string;
  allowNegative?: boolean;
  autoFocus?: boolean;
  className?: string;
  size?: "md" | "lg";
  id?: string;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const fmt = (v: number | null) =>
    v === null ? "" : toDecimalString({ minor: v, currency }).replace(/\.0+$/, "");
  const [text, setText] = useState(() => fmt(value));
  const [error, setError] = useState(false);
  const [prev, setPrev] = useState({ value, currency });

  // Follow external changes (e.g. a shortcut filling the form) without fighting the user:
  // adjust state during render (React's recommended alternative to a syncing effect).
  if (prev.value !== value || prev.currency !== currency) {
    setPrev({ value, currency });
    if (tryParse(text, currency) !== value) setText(fmt(value));
  }

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink-soft">
          {label}
        </label>
      )}
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-muted">
          {symbolFor(currency)}
        </span>
        <input
          id={inputId}
          inputMode={currencyExponent(currency) ? "decimal" : "numeric"}
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={text}
          aria-invalid={error || undefined}
          onChange={(e) => {
            const t = e.target.value;
            setText(t);
            const m = tryParse(t, currency);
            if (m === null) {
              setError(false);
              return onChange(null);
            }
            if (Number.isNaN(m) || (!allowNegative && m < 0)) return setError(true);
            setError(false);
            onChange(m);
          }}
          className={cn(
            "num w-full rounded-md border border-line bg-field pr-4 pl-10 text-ink outline-none placeholder:text-ink-subtle focus:border-primary-strong focus:ring-2 focus:ring-primary/25 aria-invalid:border-danger",
            size === "md" ? "h-12 text-[16px]" : "h-16 font-display text-3xl font-semibold",
          )}
        />
      </div>
    </div>
  );
}

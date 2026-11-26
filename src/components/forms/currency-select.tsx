"use client";

import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import {
  currencyFlag,
  currencyName,
  POPULAR_CURRENCIES,
  searchCurrencies,
} from "@/lib/money/currencies";
import { cn } from "@/lib/utils";

/** Every world currency, searchable by code or name, with flags. */
export function CurrencySelect({
  value,
  onChange,
  id,
  label = "Currency",
}: {
  value: string;
  onChange: (c: string) => void;
  id: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const results = searchCurrencies(q);
  const popularCount = q ? 0 : POPULAR_CURRENCIES.length;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-soft">
        {label}
      </label>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center gap-3 rounded-md border border-line bg-field px-3 text-left text-[16px] text-ink"
        aria-haspopup="dialog"
      >
        <span className="text-xl" aria-hidden>
          {currencyFlag(value)}
        </span>
        <span className="num font-semibold">{value}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-ink-muted">
          {currencyName(value)}
        </span>
        <ChevronDown className="size-4 text-ink-subtle" aria-hidden />
      </button>
      <Sheet
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQ("");
        }}
        title={label}
        description="Every currency in the world."
      >
        <Input
          icon={<Search />}
          aria-label="Search currencies"
          placeholder="Search: forint, yen, CAD…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <ul
          className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface"
          role="listbox"
          aria-label="Currencies"
        >
          {results.map((c, i) => (
            <li key={c} role="option" aria-selected={c === value}>
              {i === popularCount && popularCount > 0 && (
                <p className="eyebrow bg-surface-2 px-4 py-2">All currencies</p>
              )}
              <button
                type="button"
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                  setQ("");
                }}
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left hover:bg-white/[0.03]",
                  c === value && "bg-pill",
                )}
              >
                <span className="text-xl" aria-hidden>
                  {currencyFlag(c)}
                </span>
                <span className="num w-12 font-semibold">{c}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
                  {currencyName(c)}
                </span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-ink-muted">
              No currency matches “{q}”.
            </li>
          )}
        </ul>
      </Sheet>
    </div>
  );
}

export const COMMON_CURRENCIES = POPULAR_CURRENCIES;

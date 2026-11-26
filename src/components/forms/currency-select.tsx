"use client";

export const COMMON_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "HUF",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "CZK",
  "JPY",
  "SGD",
  "HKD",
  "NZD",
  "MXN",
  "BRL",
  "INR",
  "ZAR",
] as const;

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
  const options = Array.from(new Set([value, ...COMMON_CURRENCIES]));
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-soft">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-md border border-line bg-field px-3 text-[16px] text-ink outline-none focus:border-primary-strong"
      >
        {options.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}

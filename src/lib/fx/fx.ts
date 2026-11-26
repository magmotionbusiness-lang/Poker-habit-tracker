/**
 * Daily FX rates (ECB reference rates via Frankfurter, free, no key). Rates are cached
 * on the device and only ever used to *display* totals across currencies or to pre-fill
 * a session's rate — the rate actually used is stored on the record.
 */
export type EuroRates = Record<string, number>; // EUR → X (EUR itself = 1)

const ENDPOINTS = ["https://api.frankfurter.app/latest", "https://api.frankfurter.dev/v1/latest"];

export async function fetchEuroRates(
  fetchImpl: typeof fetch = fetch,
): Promise<{ day: string; rates: EuroRates }> {
  let lastErr: unknown;
  for (const url of ENDPOINTS) {
    try {
      const res = await fetchImpl(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = (await res.json()) as { date: string; rates: Record<string, number> };
      return { day: json.date, rates: { EUR: 1, ...json.rates } };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("FX unavailable");
}

/** Cross rate A→B from EUR-based rates, as a 10-dp decimal string (null if unknown). */
export function crossRate(rates: EuroRates, from: string, to: string): string | null {
  if (from === to) return "1";
  const a = rates[from];
  const b = rates[to];
  if (!a || !b) return null;
  return (b / a).toFixed(10);
}

/** All pair rates among `currencies`, keyed "FROM:TO" (the shape stats/goals expect). */
export function pairRates(rates: EuroRates, currencies: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of currencies)
    for (const b of currencies) {
      if (a === b) continue;
      const r = crossRate(rates, a, b);
      if (r) out[`${a}:${b}`] = r;
    }
  return out;
}

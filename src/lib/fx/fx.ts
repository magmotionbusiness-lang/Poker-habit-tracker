/**
 * Daily FX rates (ECB reference rates via Frankfurter, free, no key). Rates are cached
 * on the device and only ever used to *display* totals across currencies or to pre-fill
 * a session's rate — the rate actually used is stored on the record.
 */
export type EuroRates = Record<string, number>; // EUR → X (EUR itself = 1)

const ECB_ENDPOINTS = [
  "https://api.frankfurter.app/latest",
  "https://api.frankfurter.dev/v1/latest",
];
/** Covers ~160 currencies (incl. the ones the ECB doesn't publish). Free, no key. */
const WORLD_ENDPOINT = "https://open.er-api.com/v6/latest/EUR";

/**
 * EUR-based rates: official ECB reference rates where available, topped up with a
 * world-currency source for everything else (HUF is ECB; e.g. NGN, ARS, VND are not).
 */
export async function fetchEuroRates(
  fetchImpl: typeof fetch = fetch,
): Promise<{ day: string; rates: EuroRates }> {
  let ecb: { day: string; rates: EuroRates } | null = null;
  for (const url of ECB_ENDPOINTS) {
    try {
      const res = await fetchImpl(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = (await res.json()) as { date: string; rates: Record<string, number> };
      ecb = { day: json.date, rates: { EUR: 1, ...json.rates } };
      break;
    } catch {
      /* try the next one */
    }
  }
  let world: EuroRates = {};
  try {
    const res = await fetchImpl(WORLD_ENDPOINT, { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as { result?: string; rates?: Record<string, number> };
      if (json.result === "success" && json.rates) world = json.rates;
    }
  } catch {
    /* optional */
  }
  if (!ecb && !Object.keys(world).length) throw new Error("FX unavailable");
  return {
    day: ecb?.day ?? new Date().toISOString().slice(0, 10),
    rates: { ...world, ...(ecb?.rates ?? {}), EUR: 1 },
  };
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

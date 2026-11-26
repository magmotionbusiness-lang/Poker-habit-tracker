import { currencyExponent } from "./money";

/**
 * Every active ISO 4217 currency (2025), so any player anywhere can track in their own
 * money. Minor-unit exponents come from the fixed table in money.ts.
 */
export const ALL_CURRENCIES = [
  "AED",
  "AFN",
  "ALL",
  "AMD",
  "ANG",
  "AOA",
  "ARS",
  "AUD",
  "AWG",
  "AZN",
  "BAM",
  "BBD",
  "BDT",
  "BGN",
  "BHD",
  "BIF",
  "BMD",
  "BND",
  "BOB",
  "BRL",
  "BSD",
  "BTN",
  "BWP",
  "BYN",
  "BZD",
  "CAD",
  "CDF",
  "CHF",
  "CLP",
  "CNY",
  "COP",
  "CRC",
  "CUP",
  "CVE",
  "CZK",
  "DJF",
  "DKK",
  "DOP",
  "DZD",
  "EGP",
  "ERN",
  "ETB",
  "EUR",
  "FJD",
  "FKP",
  "GBP",
  "GEL",
  "GHS",
  "GIP",
  "GMD",
  "GNF",
  "GTQ",
  "GYD",
  "HKD",
  "HNL",
  "HTG",
  "HUF",
  "IDR",
  "ILS",
  "INR",
  "IQD",
  "IRR",
  "ISK",
  "JMD",
  "JOD",
  "JPY",
  "KES",
  "KGS",
  "KHR",
  "KMF",
  "KPW",
  "KRW",
  "KWD",
  "KYD",
  "KZT",
  "LAK",
  "LBP",
  "LKR",
  "LRD",
  "LSL",
  "LYD",
  "MAD",
  "MDL",
  "MGA",
  "MKD",
  "MMK",
  "MNT",
  "MOP",
  "MRU",
  "MUR",
  "MVR",
  "MWK",
  "MXN",
  "MYR",
  "MZN",
  "NAD",
  "NGN",
  "NIO",
  "NOK",
  "NPR",
  "NZD",
  "OMR",
  "PAB",
  "PEN",
  "PGK",
  "PHP",
  "PKR",
  "PLN",
  "PYG",
  "QAR",
  "RON",
  "RSD",
  "RUB",
  "RWF",
  "SAR",
  "SBD",
  "SCR",
  "SDG",
  "SEK",
  "SGD",
  "SHP",
  "SLE",
  "SOS",
  "SRD",
  "SSP",
  "STN",
  "SVC",
  "SYP",
  "SZL",
  "THB",
  "TJS",
  "TMT",
  "TND",
  "TOP",
  "TRY",
  "TTD",
  "TWD",
  "TZS",
  "UAH",
  "UGX",
  "USD",
  "UYU",
  "UZS",
  "VES",
  "VND",
  "VUV",
  "WST",
  "XAF",
  "XCD",
  "XCG",
  "XOF",
  "XPF",
  "YER",
  "ZAR",
  "ZMW",
  "ZWG",
] as const;

/** Shown first in pickers: where most of our players play. */
export const POPULAR_CURRENCIES = [
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
  "MXN",
  "BRL",
  "INR",
  "ZAR",
  "NZD",
] as const;

/** Currencies whose ISO code doesn't start with the issuing country's code. */
const REGION_OVERRIDES: Record<string, string> = {
  EUR: "EU",
  ANG: "CW",
  XCG: "CW",
  XAF: "CM",
  XOF: "SN",
  XPF: "PF",
  XCD: "AG",
};

/** 🇺🇸 for USD, 🇪🇺 for EUR … built from regional-indicator letters (no image assets). */
export function currencyFlag(code: string): string {
  const region = REGION_OVERRIDES[code] ?? code.slice(0, 2);
  if (!/^[A-Z]{2}$/.test(region)) return "🌐";
  return String.fromCodePoint(...[...region].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const nameCache = new Map<string, string>();
/** "Hungarian Forint" — localised via Intl, falls back to the code. */
export function currencyName(code: string, locale = "en"): string {
  const key = `${locale}:${code}`;
  const hit = nameCache.get(key);
  if (hit) return hit;
  let name = code;
  try {
    name = new Intl.DisplayNames([locale], { type: "currency" }).of(code) ?? code;
  } catch {
    /* older engines */
  }
  nameCache.set(key, name);
  return name;
}

export function searchCurrencies(query: string, locale = "en"): string[] {
  const q = query.trim().toLowerCase();
  const all = [
    ...POPULAR_CURRENCIES,
    ...ALL_CURRENCIES.filter((c) => !(POPULAR_CURRENCIES as readonly string[]).includes(c)),
  ];
  if (!q) return all;
  return all.filter(
    (c) => c.toLowerCase().includes(q) || currencyName(c, locale).toLowerCase().includes(q),
  );
}

export { currencyExponent };

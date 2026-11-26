/**
 * Money primitives. Every amount in Stakers is an integer number of minor units
 * (cents, pence, yen…) plus an ISO-4217 currency code. Never use floats for money:
 * parse from strings, add integers, convert with BigInt-scaled rates.
 */

export type CurrencyCode = string & { readonly __brand?: "CurrencyCode" };

export type Money = {
  /** Integer number of minor units. May be negative. */
  readonly minor: number;
  readonly currency: CurrencyCode;
};

/**
 * ISO 4217 minor-unit exponents. Deliberately a fixed table, NOT derived from Intl:
 * browsers' CLDR data differs by version (e.g. HUF/TWD display 0 decimals in some),
 * and the storage format must never change underneath stored integers.
 * Every currency not listed has exponent 2.
 */
const ISO_EXPONENTS: Readonly<Record<string, number>> = {
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  ISK: 0,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  PYG: 0,
  RWF: 0,
  UGX: 0,
  UYI: 0,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3,
  CLF: 4,
  UYW: 4,
};

/** Number of minor-unit digits for a currency (EUR → 2, JPY → 0, BHD → 3). */
export function currencyExponent(currency: CurrencyCode): number {
  return ISO_EXPONENTS[normaliseCurrency(currency)] ?? 2;
}

export function normaliseCurrency(currency: string): CurrencyCode {
  const code = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) throw new RangeError(`Invalid currency code: ${currency}`);
  return code;
}

export function money(minor: number, currency: CurrencyCode): Money {
  assertSafeInteger(minor);
  return { minor, currency: normaliseCurrency(currency) };
}

function assertSafeInteger(n: number): void {
  if (!Number.isSafeInteger(n)) throw new RangeError(`Amount must be a safe integer, got ${n}`);
}

/**
 * Parse a user-typed amount ("1,234.50", "-20", "12.5", "1 234,50") into minor units
 * without ever going through a float. Accepts "." or "," as the decimal separator:
 * the last separator followed by 1..exponent digits is treated as decimal.
 */
export function parseMoney(input: string, currency: CurrencyCode): Money {
  const exp = currencyExponent(currency);
  let s = input.trim().replace(/[\s  ']/g, "");
  let negative = false;
  if (s.startsWith("-") || s.startsWith("−")) {
    negative = true;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }
  s = s.replace(/^[^\d.,]+/, ""); // drop a leading currency symbol
  if (!/^[\d.,]+$/.test(s)) throw new RangeError(`Not an amount: "${input}"`);

  let intPart = s;
  let fracPart = "";
  const lastSep = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
  if (lastSep !== -1) {
    const tail = s.slice(lastSep + 1);
    const sepCount = (s.match(/[.,]/g) ?? []).length;
    const isDecimal =
      exp > 0 &&
      tail.length >= 1 &&
      tail.length <= exp &&
      (sepCount === 1 || s[lastSep] !== s[s.search(/[.,]/)]);
    if (isDecimal) {
      intPart = s.slice(0, lastSep);
      fracPart = tail;
    }
  }
  intPart = intPart.replace(/[.,]/g, "");
  if (intPart === "" && fracPart === "") throw new RangeError(`Not an amount: "${input}"`);
  if (fracPart.length > exp) throw new RangeError(`Too many decimals for ${currency}: "${input}"`);

  const digits = (intPart || "0") + fracPart.padEnd(exp, "0");
  const big = BigInt(digits) * (negative ? -1n : 1n);
  if (big > BigInt(Number.MAX_SAFE_INTEGER) || big < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new RangeError(`Amount too large: "${input}"`);
  }
  const minor = Number(big);
  return money(minor === 0 ? 0 : minor, currency);
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.minor + b.minor, a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.minor - b.minor, a.currency);
}

export function sumMoney(items: readonly Money[], currency: CurrencyCode): Money {
  return items.reduce((acc, m) => addMoney(acc, m), money(0, currency));
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new TypeError(`Currency mismatch: ${a.currency} vs ${b.currency}. Convert first.`);
  }
}

/** FX rates are carried as decimal strings or numbers and scaled to 1e-10 precision. */
const RATE_SCALE = 10_000_000_000n;

function scaleRate(rate: number | string): bigint {
  const str = typeof rate === "number" ? rate.toFixed(10) : rate.trim();
  if (!/^\d+(\.\d+)?$/.test(str)) throw new RangeError(`Invalid FX rate: ${rate}`);
  const [i = "0", f = ""] = str.split(".");
  const scaled = BigInt(i + f.slice(0, 10).padEnd(10, "0"));
  if (scaled <= 0n) throw new RangeError(`FX rate must be positive: ${rate}`);
  return scaled;
}

/** Round half away from zero for a BigInt division. */
function divRound(n: bigint, d: bigint): bigint {
  const q = n / d;
  const r = n % d;
  if (r === 0n) return q;
  const twice = (r < 0n ? -r : r) * 2n;
  if (twice >= (d < 0n ? -d : d)) return q + (n < 0n !== d < 0n ? -1n : 1n);
  return q;
}

/**
 * Convert using `rate` = units of `to` per 1 unit of `from` (e.g. EUR→USD 1.0842).
 * Handles currencies with different minor-unit exponents.
 */
export function convertMoney(amount: Money, to: CurrencyCode, rate: number | string): Money {
  const target = normaliseCurrency(to);
  if (target === amount.currency) return amount;
  const fromExp = currencyExponent(amount.currency);
  const toExp = currencyExponent(target);
  let numerator = BigInt(amount.minor) * scaleRate(rate);
  let denominator = RATE_SCALE;
  const diff = toExp - fromExp;
  if (diff > 0) numerator *= 10n ** BigInt(diff);
  if (diff < 0) denominator *= 10n ** BigInt(-diff);
  return money(Number(divRound(numerator, denominator)), target);
}

export type FormatOptions = {
  locale?: string;
  /** Always show a sign: +$12.00 / −$12.00. Use for results so win/loss never relies on colour. */
  signed?: boolean;
  /** Hide minor units when they are zero ($1,200 instead of $1,200.00). */
  trimZeroCents?: boolean;
  compact?: boolean;
};

export function formatMoney(amount: Money, options: FormatOptions = {}): string {
  const exp = currencyExponent(amount.currency);
  const major = amount.minor / 10 ** exp; // display only — never fed back into maths
  const isWhole = amount.minor % 10 ** exp === 0;
  const fmt = new Intl.NumberFormat(options.locale ?? "en-US", {
    style: "currency",
    currency: amount.currency,
    notation: options.compact ? "compact" : "standard",
    minimumFractionDigits: options.compact ? 0 : options.trimZeroCents && isWhole ? 0 : exp,
    maximumFractionDigits: options.compact ? 1 : exp,
    signDisplay: options.signed ? "exceptZero" : "auto",
  });
  // Use a true minus sign for typographic consistency with tabular numbers.
  return fmt.format(major).replace("-", "−");
}

export function isProfit(m: Money): boolean {
  return m.minor > 0;
}
export function isLoss(m: Money): boolean {
  return m.minor < 0;
}

import { describe, expect, it } from "vitest";
import {
  ALL_CURRENCIES,
  currencyFlag,
  currencyName,
  POPULAR_CURRENCIES,
  searchCurrencies,
} from "./currencies";
import { currencyExponent, formatMoney, parseMoney, toDecimalString } from "./money";

describe("world currencies", () => {
  it("lists every active ISO code once, with the popular ones included", () => {
    expect(ALL_CURRENCIES.length).toBeGreaterThanOrEqual(155);
    expect(new Set(ALL_CURRENCIES).size).toBe(ALL_CURRENCIES.length);
    for (const c of POPULAR_CURRENCIES) expect(ALL_CURRENCIES).toContain(c);
  });

  it("every currency round-trips through parse → format with the right decimals", () => {
    for (const c of ALL_CURRENCIES) {
      const exp = currencyExponent(c);
      const m = parseMoney(exp === 0 ? "1234" : `1234.${"5".repeat(exp)}`, c);
      expect(toDecimalString(m)).toBe(exp === 0 ? "1234" : `1234.${"5".repeat(exp)}`);
      expect(() => formatMoney(m)).not.toThrow();
    }
  });

  it("knows the odd ones: zero- and three-decimal currencies", () => {
    expect(["JPY", "KRW", "VND", "ISK", "CLP", "XAF"].map(currencyExponent)).toEqual([
      0, 0, 0, 0, 0, 0,
    ]);
    expect(["BHD", "KWD", "OMR", "JOD", "TND"].map(currencyExponent)).toEqual([3, 3, 3, 3, 3]);
  });

  it("has flags, names and search", () => {
    expect(currencyFlag("USD")).toBe("🇺🇸");
    expect(currencyFlag("EUR")).toBe("🇪🇺");
    expect(currencyFlag("XOF")).toBe("🇸🇳");
    expect(currencyName("HUF")).toMatch(/Forint/i);
    expect(searchCurrencies("forint")).toEqual(["HUF"]);
    expect(searchCurrencies("")[0]).toBe("USD");
    expect(searchCurrencies("yen")).toContain("JPY");
  });
});

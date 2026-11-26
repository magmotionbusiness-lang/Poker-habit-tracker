import { describe, expect, it } from "vitest";
import {
  addMoney,
  convertMoney,
  currencyExponent,
  formatMoney,
  money,
  parseMoney,
  subtractMoney,
  sumMoney,
} from "./money";

describe("currencyExponent", () => {
  it("knows common poker currencies", () => {
    expect(currencyExponent("USD")).toBe(2);
    expect(currencyExponent("eur")).toBe(2);
    expect(currencyExponent("HUF")).toBe(2);
    expect(currencyExponent("JPY")).toBe(0);
    expect(currencyExponent("BHD")).toBe(3);
  });
  it("rejects garbage codes", () => {
    expect(() => currencyExponent("DOLLARS")).toThrow();
  });
});

describe("parseMoney", () => {
  const cases: Array<[string, string, number]> = [
    ["0", "USD", 0],
    ["12", "USD", 1200],
    ["12.5", "USD", 1250],
    ["12.50", "USD", 1250],
    ["-20", "USD", -2000],
    ["−20.01", "USD", -2001],
    ["+3.07", "USD", 307],
    ["1,234.56", "USD", 123456],
    ["1.234,56", "EUR", 123456],
    ["1 234,56", "EUR", 123456],
    ["1,234", "USD", 123400], // thousands separator, not 1.234
    ["$450", "USD", 45000],
    ["€0.10", "EUR", 10],
    [".5", "USD", 50],
    ["5000", "JPY", 5000],
    ["1,500", "JPY", 1500],
    ["1.234", "BHD", 1234],
    ["0.1", "USD", 10], // classic float trap: 0.1 + 0.2
  ];
  it.each(cases)("parses %s %s → %i", (input, ccy, minor) => {
    expect(parseMoney(input, ccy).minor).toBe(minor);
  });

  it("rejects too many decimals and non-numbers", () => {
    expect(() => parseMoney("abc", "USD")).toThrow();
    expect(() => parseMoney("", "USD")).toThrow();
    expect(() => parseMoney("1.2.3", "USD")).not.toThrow(); // read as 123 thousands-style
    expect(() => parseMoney("12.345", "EUR")).not.toThrow(); // "12.345" = 12345 with . thousands
    expect(parseMoney("12.345", "EUR").minor).toBe(1234500);
  });

  it("never drifts: 0.1 + 0.2 === 0.3", () => {
    const a = parseMoney("0.1", "USD");
    const b = parseMoney("0.2", "USD");
    expect(addMoney(a, b)).toEqual(parseMoney("0.3", "USD"));
  });
});

describe("arithmetic", () => {
  it("adds and subtracts same-currency amounts", () => {
    expect(addMoney(money(150, "USD"), money(-50, "USD")).minor).toBe(100);
    expect(subtractMoney(money(150, "USD"), money(200, "USD")).minor).toBe(-50);
    expect(sumMoney([money(1, "EUR"), money(2, "EUR"), money(3, "EUR")], "EUR").minor).toBe(6);
  });
  it("refuses to mix currencies", () => {
    expect(() => addMoney(money(1, "USD"), money(1, "EUR"))).toThrow(/mismatch/);
  });
  it("refuses non-integer minor units", () => {
    expect(() => money(1.5, "USD")).toThrow();
  });
});

describe("convertMoney", () => {
  it("converts with half-away-from-zero rounding", () => {
    expect(convertMoney(money(10000, "EUR"), "USD", "1.0842").minor).toBe(10842);
    expect(convertMoney(money(1, "EUR"), "USD", "1.5").minor).toBe(2); // 1.5 → 2
    expect(convertMoney(money(-1, "EUR"), "USD", "1.5").minor).toBe(-2);
  });
  it("handles different exponents", () => {
    // 100.00 USD at 150.25 JPY/USD = 15025 JPY
    expect(convertMoney(money(10000, "USD"), "JPY", "150.25").minor).toBe(15025);
    // 15025 JPY at 0.006655 USD/JPY = 99.99 USD
    expect(convertMoney(money(15025, "JPY"), "USD", "0.006655").minor).toBe(9999);
  });
  it("is identity for the same currency", () => {
    expect(convertMoney(money(123, "USD"), "usd", 2).minor).toBe(123);
  });
  it("rejects invalid rates", () => {
    expect(() => convertMoney(money(1, "USD"), "EUR", "0")).toThrow();
    expect(() => convertMoney(money(1, "USD"), "EUR", "-1")).toThrow();
  });
});

describe("formatMoney", () => {
  it("formats with sign when asked, using a real minus", () => {
    expect(formatMoney(money(123456, "USD"))).toBe("$1,234.56");
    expect(formatMoney(money(-4100, "USD"), { signed: true })).toBe("−$41.00");
    expect(formatMoney(money(2800, "USD"), { signed: true })).toBe("+$28.00");
    expect(formatMoney(money(0, "USD"), { signed: true })).toBe("$0.00");
  });
  it("trims zero cents and supports compact", () => {
    expect(formatMoney(money(5000000, "USD"), { trimZeroCents: true })).toBe("$50,000");
    expect(formatMoney(money(1248000, "USD"), { compact: true })).toBe("$12.5K");
  });
  it("respects locale and zero-decimal currencies", () => {
    expect(formatMoney(money(5000, "JPY"))).toBe("¥5,000");
    expect(formatMoney(money(123456, "EUR"), { locale: "de-DE" })).toMatch(/1\.234,56\s€/);
  });
});

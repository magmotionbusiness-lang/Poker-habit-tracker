import { describe, expect, it } from "vitest";
import { detectCurrency } from "./app-store";

describe("detectCurrency", () => {
  it.each([
    ["en-US", "USD"],
    ["hu-HU", "HUF"],
    ["de-DE", "EUR"],
    ["en-IE", "EUR"],
    ["en-GB", "GBP"],
    ["en", "USD"],
    ["fr-SN", "XOF"],
    ["en-NG", "NGN"],
    ["ja-JP", "JPY"],
    ["es-AR", "ARS"],
    ["xx-ZZ", "USD"],
  ])("%s → %s", (loc, ccy) => expect(detectCurrency(loc)).toBe(ccy));
});

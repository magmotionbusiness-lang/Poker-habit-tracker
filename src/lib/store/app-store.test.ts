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
    ["fr-SN", "USD"],
  ])("%s → %s", (loc, ccy) => expect(detectCurrency(loc)).toBe(ccy));
});

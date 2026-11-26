import { describe, expect, it } from "vitest";
import { crossRate, fetchEuroRates, pairRates } from "./fx";

const rates = { EUR: 1, USD: 1.08, HUF: 400, JPY: 160 };

describe("fx", () => {
  it("derives cross rates from EUR rates", () => {
    expect(crossRate(rates, "EUR", "USD")).toBe("1.0800000000");
    expect(crossRate(rates, "USD", "HUF")).toBe((400 / 1.08).toFixed(10));
    expect(crossRate(rates, "USD", "XYZ")).toBeNull();
    expect(crossRate(rates, "USD", "USD")).toBe("1");
  });
  it("builds a pair map", () => {
    const m = pairRates(rates, ["USD", "EUR"]);
    expect(Object.keys(m).sort()).toEqual(["EUR:USD", "USD:EUR"]);
  });
  it("falls back to the second endpoint", async () => {
    let calls = 0;
    const fake = (async () => {
      calls++;
      if (calls === 1) throw new Error("down");
      return new Response(JSON.stringify({ date: "2026-11-26", rates: { USD: 1.05 } }));
    }) as unknown as typeof fetch;
    await expect(fetchEuroRates(fake)).resolves.toEqual({
      day: "2026-11-26",
      rates: { EUR: 1, USD: 1.05 },
    });
  });
});

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
  it("falls back to the second ECB endpoint and tops up with world rates", async () => {
    const fake = (async (url: string) => {
      if (url.includes("frankfurter.app")) throw new Error("down");
      if (url.includes("frankfurter.dev"))
        return new Response(JSON.stringify({ date: "2026-11-26", rates: { USD: 1.05 } }));
      return new Response(
        JSON.stringify({ result: "success", rates: { USD: 1.04, NGN: 1650, VND: 27000 } }),
      );
    }) as unknown as typeof fetch;
    const r = await fetchEuroRates(fake);
    expect(r.day).toBe("2026-11-26");
    expect(r.rates.USD).toBe(1.05); // ECB wins where both exist
    expect(r.rates.NGN).toBe(1650);
    expect(r.rates.EUR).toBe(1);
  });

  it("works with only the world source", async () => {
    const fake = (async (url: string) => {
      if (url.includes("frankfurter")) throw new Error("down");
      return new Response(JSON.stringify({ result: "success", rates: { ARS: 1100 } }));
    }) as unknown as typeof fetch;
    expect((await fetchEuroRates(fake)).rates.ARS).toBe(1100);
  });
});

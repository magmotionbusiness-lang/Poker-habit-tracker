import { describe, expect, it } from "vitest";
import type { Transaction } from "@/lib/domain/types";
import { makeSession } from "@/lib/test/factories";
import {
  bankrollBalance,
  dailyResults,
  ledger,
  monthlyResults,
  sessionDelta,
  transactionDelta,
} from "./bankroll";

const br = { id: "br1", currency: "USD" };
const tx = (o: Partial<Transaction>): Transaction => ({
  id: o.id ?? Math.random().toString(36).slice(2),
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
  bankroll_id: "br1",
  type: "deposit",
  amount_minor: 0,
  currency: "USD",
  fx_rate_to_display: null,
  transfer_bankroll_id: null,
  note: null,
  occurred_at: "2026-10-01T00:00:00Z",
  ...o,
});

describe("transactions", () => {
  it("signs each type correctly", () => {
    expect(transactionDelta(tx({ type: "deposit", amount_minor: 500000 }), "br1")).toBe(500000);
    expect(transactionDelta(tx({ type: "withdrawal", amount_minor: 20000 }), "br1")).toBe(-20000);
    expect(transactionDelta(tx({ type: "adjustment", amount_minor: -150 }), "br1")).toBe(-150);
    const t = tx({ type: "transfer", amount_minor: 10000, transfer_bankroll_id: "br2" });
    expect(transactionDelta(t, "br1")).toBe(-10000);
    expect(transactionDelta(t, "br2")).toBe(10000);
    expect(transactionDelta(t, "br3")).toBe(0);
  });
});

describe("ledger", () => {
  const txs = [
    tx({ id: "t1", amount_minor: 500000, occurred_at: "2026-10-01T10:00:00Z" }),
    tx({ id: "t2", type: "withdrawal", amount_minor: 50000, occurred_at: "2026-10-20T10:00:00Z" }),
  ];
  const sessions = [
    makeSession({
      id: "a",
      buy_in_minor: 30000,
      cash_out_minor: 51200,
      tips_minor: 1200,
      started_at: "2026-10-05T18:00:00Z",
    }),
    makeSession({
      id: "b",
      buy_in_minor: 40000,
      cash_out_minor: 0,
      started_at: "2026-10-25T18:00:00Z",
    }),
    makeSession({ id: "other", bankroll_id: "br2", buy_in_minor: 100, cash_out_minor: 999999 }),
    makeSession({ id: "run", status: "running", buy_in_minor: 30000 }),
  ];

  it("runs balance and results separately", () => {
    const l = ledger(br, txs, sessions);
    expect(l.map((e) => [e.refId, e.delta, e.balance, e.results])).toEqual([
      ["t1", 500000, 500000, 0],
      ["a", 20000, 520000, 20000], // 212 − 12 tip
      ["t2", -50000, 470000, 20000],
      ["b", -40000, 430000, -20000],
    ]);
    expect(bankrollBalance(br, txs, sessions)).toBe(430000);
    expect(bankrollBalance(br, [], [])).toBe(0);
  });

  it("converts foreign-currency sessions with the stored rate", () => {
    const eur = makeSession({
      currency: "EUR",
      fx_rate: "1.10",
      buy_in_minor: 10000,
      cash_out_minor: 20000,
    });
    expect(sessionDelta(eur, br)).toBe(11000);
    expect(() => sessionDelta({ ...eur, fx_rate: null }, br)).toThrow(/FX/);
  });

  it("groups results by local day and month", () => {
    const late = makeSession({
      buy_in_minor: 100,
      cash_out_minor: 600,
      started_at: "2026-10-31T21:00:00Z",
      hours: 2,
    }); // ends 23:00Z
    const days = dailyResults([late], br, "Europe/Budapest");
    expect([...days.entries()]).toEqual([["2026-11-01", 500]]);
    expect(monthlyResults([late], br, "UTC")).toEqual([{ month: "2026-10", net: 500 }]);
    expect(monthlyResults([late], br, "Europe/Budapest")).toEqual([{ month: "2026-11", net: 500 }]);
  });
});

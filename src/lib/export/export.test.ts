import { describe, expect, it } from "vitest";
import { makeSession } from "@/lib/test/factories";
import { sessionsCsv, transactionsCsv } from "./export";

describe("exports", () => {
  it("writes sessions with exact decimal amounts and escaped text", () => {
    const s = makeSession({
      buy_in_minor: 30000,
      cash_out_minor: 51250,
      tips_minor: 500,
      takeaway: 'Folded "too much", again',
    });
    const csv = sessionsCsv(
      [s, makeSession({ status: "running" })],
      [],
      [
        {
          id: "br1",
          name: "Live",
          currency: "USD",
          archived: false,
          sort_order: 0,
          created_at: "",
          updated_at: "",
        },
      ],
    );
    const [header, row, extra] = csv.trim().split("\r\n");
    expect(header).toContain("net_after_costs");
    expect(row).toContain(",300.00,");
    expect(row).toContain(",212.50,"); // result
    expect(row).toContain(",207.50,"); // after tip
    expect(row).toContain('"Folded ""too much"", again"');
    expect(row).toContain(",Live,");
    expect(extra).toBeUndefined(); // running sessions are not exported
  });

  it("writes transactions", () => {
    const csv = transactionsCsv(
      [
        {
          id: "t",
          bankroll_id: "b",
          type: "deposit",
          amount_minor: 400000,
          currency: "USD",
          fx_rate_to_display: null,
          transfer_bankroll_id: null,
          note: null,
          occurred_at: "2026-09-01T10:00:00Z",
          created_at: "",
          updated_at: "",
        },
      ],
      [
        {
          id: "b",
          name: "Live",
          currency: "USD",
          archived: false,
          sort_order: 0,
          created_at: "",
          updated_at: "",
        },
      ],
    );
    expect(csv).toBe(
      "date,type,bankroll,to_bankroll,amount,currency,note\r\n2026-09-01T10:00:00Z,deposit,Live,,4000.00,USD,\r\n",
    );
  });
});

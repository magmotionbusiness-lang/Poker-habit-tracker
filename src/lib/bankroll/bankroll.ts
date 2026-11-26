import type { Bankroll, ISODate, PokerSession, Timestamp, Transaction } from "@/lib/domain/types";
import { convertMoney } from "@/lib/money";
import { localDate, monthKey } from "@/lib/dates/dates";
import { sessionCosts, sessionResult } from "@/lib/stats/session-math";

/**
 * Bankroll ledger maths. A bankroll's balance is the sum of its transactions and the
 * results of the sessions played from it, in the bankroll's own currency.
 * Sessions in another currency carry `fx_rate` (session ccy → bankroll ccy).
 */

/** Signed effect of a transaction on one bankroll. */
export function transactionDelta(tx: Transaction, bankrollId: string): number {
  switch (tx.type) {
    case "deposit":
      return tx.bankroll_id === bankrollId ? Math.abs(tx.amount_minor) : 0;
    case "withdrawal":
      return tx.bankroll_id === bankrollId ? -Math.abs(tx.amount_minor) : 0;
    case "adjustment":
      return tx.bankroll_id === bankrollId ? tx.amount_minor : 0;
    case "transfer":
      if (tx.bankroll_id === bankrollId) return -Math.abs(tx.amount_minor);
      if (tx.transfer_bankroll_id === bankrollId) return Math.abs(tx.amount_minor);
      return 0;
  }
}

/** A session's effect on its bankroll, in the bankroll currency (results minus tips/expenses). */
export function sessionDelta(s: PokerSession, bankroll: Pick<Bankroll, "currency">): number {
  const minor = sessionResult(s) - sessionCosts(s);
  if (s.currency === bankroll.currency) return minor;
  if (!s.fx_rate)
    throw new Error(
      `Session ${s.id} is in ${s.currency} but has no FX rate to ${bankroll.currency}`,
    );
  return convertMoney({ minor, currency: s.currency }, bankroll.currency, s.fx_rate).minor;
}

export type LedgerKind = "session" | "deposit" | "withdrawal" | "transfer" | "adjustment";
export type LedgerEvent = {
  at: Timestamp;
  kind: LedgerKind;
  refId: string;
  delta: number;
  /** Running balance after this event. */
  balance: number;
  /** Running results-only total (sessions), excluding money moved in/out. */
  results: number;
};

export function ledger(
  bankroll: Pick<Bankroll, "id" | "currency">,
  transactions: readonly Transaction[],
  sessions: readonly PokerSession[],
): LedgerEvent[] {
  const events: Array<Omit<LedgerEvent, "balance" | "results">> = [];
  for (const tx of transactions) {
    const delta = transactionDelta(tx, bankroll.id);
    if (delta !== 0 || (tx.bankroll_id === bankroll.id && tx.type === "adjustment")) {
      events.push({ at: tx.occurred_at, kind: tx.type, refId: tx.id, delta });
    }
  }
  for (const s of sessions) {
    if (s.status !== "finished" || s.bankroll_id !== bankroll.id) continue;
    events.push({
      at: s.ended_at ?? s.started_at,
      kind: "session",
      refId: s.id,
      delta: sessionDelta(s, bankroll),
    });
  }
  events.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.refId < b.refId ? -1 : 1));
  let balance = 0;
  let results = 0;
  return events.map((e) => {
    balance += e.delta;
    if (e.kind === "session") results += e.delta;
    return { ...e, balance, results };
  });
}

export function bankrollBalance(
  bankroll: Pick<Bankroll, "id" | "currency">,
  transactions: readonly Transaction[],
  sessions: readonly PokerSession[],
): number {
  return ledger(bankroll, transactions, sessions).at(-1)?.balance ?? 0;
}

/** Net session results per local day — for the win/loss calendar. */
export function dailyResults(
  sessions: readonly PokerSession[],
  bankroll: Pick<Bankroll, "id" | "currency">,
  tz: string,
): Map<ISODate, number> {
  const out = new Map<ISODate, number>();
  for (const s of sessions) {
    if (s.status !== "finished" || s.bankroll_id !== bankroll.id) continue;
    const day = localDate(s.ended_at ?? s.started_at, tz);
    out.set(day, (out.get(day) ?? 0) + sessionDelta(s, bankroll));
  }
  return out;
}

/** Net session results per local month ("2026-11"), oldest first. */
export function monthlyResults(
  sessions: readonly PokerSession[],
  bankroll: Pick<Bankroll, "id" | "currency">,
  tz: string,
): Array<{ month: string; net: number }> {
  const m = new Map<string, number>();
  for (const [day, net] of dailyResults(sessions, bankroll, tz)) {
    m.set(monthKey(day), (m.get(monthKey(day)) ?? 0) + net);
  }
  return [...m.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, net]) => ({ month, net }));
}

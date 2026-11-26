import type { Bankroll, PokerSession, Transaction, Venue } from "@/lib/domain/types";
import { toCsv } from "@/lib/csv/csv";
import { toDecimalString } from "@/lib/money";
import {
  sessionCosts,
  sessionDurationMs,
  sessionResult,
  stakesLabel,
} from "@/lib/stats/session-math";

/** Exact decimal strings (never floats) so spreadsheets and tax tools get the real amounts. */
const dec = (minor: number, currency: string) => toDecimalString({ minor, currency });

export function sessionsCsv(
  sessions: readonly PokerSession[],
  venues: readonly Venue[],
  bankrolls: readonly Bankroll[],
): string {
  const venue = (id: string | null) => venues.find((v) => v.id === id)?.name ?? "";
  const bankroll = (id: string | null) => bankrolls.find((b) => b.id === id)?.name ?? "";
  const rows = sessions.filter((s) => s.status === "finished");
  return toCsv(rows, [
    { header: "start", value: (s) => s.started_at },
    { header: "end", value: (s) => s.ended_at },
    { header: "hours", value: (s) => Math.round((sessionDurationMs(s) / 3_600_000) * 100) / 100 },
    { header: "format", value: (s) => s.format },
    { header: "live", value: (s) => s.is_live },
    { header: "game", value: (s) => s.game },
    { header: "stakes", value: (s) => stakesLabel(s) },
    { header: "venue", value: (s) => venue(s.venue_id) },
    { header: "bankroll", value: (s) => bankroll(s.bankroll_id) },
    { header: "currency", value: (s) => s.currency },
    { header: "buy_in", value: (s) => dec(s.buy_in_minor, s.currency) },
    { header: "rebuys", value: (s) => dec(s.rebuys_minor, s.currency) },
    { header: "cash_out", value: (s) => dec(s.cash_out_minor, s.currency) },
    { header: "prize", value: (s) => dec(s.prize_minor, s.currency) },
    { header: "bounties", value: (s) => dec(s.bounties_minor, s.currency) },
    { header: "fees", value: (s) => dec(s.fees_minor, s.currency) },
    { header: "result", value: (s) => dec(sessionResult(s), s.currency) },
    { header: "tips_and_expenses", value: (s) => dec(sessionCosts(s), s.currency) },
    {
      header: "net_after_costs",
      value: (s) => dec(sessionResult(s) - sessionCosts(s), s.currency),
    },
    { header: "fx_rate_to_bankroll", value: (s) => s.fx_rate },
    { header: "finish_position", value: (s) => s.finish_position },
    { header: "field_size", value: (s) => s.field_size },
    { header: "hands", value: (s) => s.hands_played },
    { header: "game_rating", value: (s) => s.game_rating },
    { header: "focus", value: (s) => s.focus_rating },
    { header: "tilt", value: (s) => s.tilt_rating },
    { header: "energy", value: (s) => s.energy_rating },
    { header: "sleep", value: (s) => s.sleep_rating },
    { header: "tags", value: (s) => s.tags.join("; ") },
    { header: "takeaway", value: (s) => s.takeaway },
    { header: "notes", value: (s) => s.notes },
  ]);
}

export function transactionsCsv(
  transactions: readonly Transaction[],
  bankrolls: readonly Bankroll[],
): string {
  const name = (id: string | null) => bankrolls.find((b) => b.id === id)?.name ?? "";
  return toCsv(transactions, [
    { header: "date", value: (t) => t.occurred_at },
    { header: "type", value: (t) => t.type },
    { header: "bankroll", value: (t) => name(t.bankroll_id) },
    { header: "to_bankroll", value: (t) => name(t.transfer_bankroll_id) },
    { header: "amount", value: (t) => dec(t.amount_minor, t.currency) },
    { header: "currency", value: (t) => t.currency },
    { header: "note", value: (t) => t.note },
  ]);
}

/** Trigger a browser download of text content. */
export function downloadText(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([type.startsWith("text/csv") ? "﻿" + content : content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

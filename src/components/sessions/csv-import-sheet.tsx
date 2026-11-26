"use client";

import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import {
  type DateOrder,
  detectDateOrder,
  guessMapping,
  IMPORT_FIELDS,
  type ImportField,
  importKey,
  type Mapping,
  parseCsv,
  rowsToSessions,
} from "@/lib/csv/import";
import { db } from "@/lib/db/db";
import { useBankrolls, useToday } from "@/lib/db/hooks";
import { newId, nowIso, putRows } from "@/lib/db/repo";
import { upsertVenue } from "@/lib/db/actions";
import type { PokerSession } from "@/lib/domain/types";
import { formatMoney } from "@/lib/money";
import { celebrate } from "@/lib/store/celebrate";
import { sessionResult } from "@/lib/stats/session-math";

const LABEL: Record<ImportField, string> = {
  date: "Date *",
  start_time: "Start time",
  hours: "Hours",
  format: "Cash / MTT",
  live: "Live / online",
  game: "Game",
  stakes: "Stakes",
  buy_in: "Buy-in",
  cash_out: "Cash-out / prize",
  profit: "Profit (if no buy-in/out)",
  venue: "Venue / site",
  notes: "Notes",
};

/** Import sessions from any spreadsheet: pick a CSV, check the column mapping, import. */
export function CsvImportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const bankrolls = (useBankrolls() ?? []).filter((b) => !b.archived);
  const { tz } = useToday();
  const [rows, setRows] = useState<string[][] | null>(null);
  const [name, setName] = useState("");
  const [mapping, setMapping] = useState<Mapping>({});
  const [order, setOrder] = useState<DateOrder>("dmy");
  const [bankrollId, setBankrollId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const bankroll = bankrolls.find((b) => b.id === bankrollId) ?? bankrolls[0];
  const brId = bankroll?.id;
  const brCcy = bankroll?.currency;

  const headers = rows?.[0] ?? [];
  // React Compiler memoizes this; no manual useMemo needed.
  const result =
    rows && brId && brCcy
      ? rowsToSessions(rows.slice(1), mapping, {
          currency: brCcy,
          bankroll_id: brId,
          tz,
          dateOrder: order,
          defaultLive: true,
        })
      : null;

  async function pick(file: File) {
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) return toast.error("That file has no rows to import.");
    const m = guessMapping(parsed[0]!);
    setRows(parsed);
    setName(file.name);
    setMapping(m);
    setOrder(
      detectDateOrder(
        parsed.slice(1, 200).map((r) => (m.date !== undefined ? (r[m.date] ?? "") : "")),
      ),
    );
  }

  async function run() {
    if (!result || !bankroll) return;
    setBusy(true);
    try {
      const existing = new Set((await db().sessions.toArray()).map(importKey));
      const fresh = result.sessions.filter((s) => !existing.has(importKey(s)));
      const venues = new Map<string, string>();
      for (const n of new Set(fresh.map((s) => s.venue_name).filter(Boolean) as string[]))
        venues.set(n, (await upsertVenue(n, "live")).id);
      const at = nowIso();
      const toSave: PokerSession[] = fresh.map(({ venue_name, ...s }) => ({
        ...s,
        id: newId(),
        venue_id: venue_name ? (venues.get(venue_name) ?? null) : null,
        created_at: at,
        updated_at: at,
      }));
      await putRows("sessions", toSave);
      celebrate("day");
      toast.success(
        `Imported ${toSave.length} session${toSave.length === 1 ? "" : "s"}${result.sessions.length - fresh.length ? ` · ${result.sessions.length - fresh.length} already there` : ""}.`,
      );
      setRows(null);
      onClose();
    } catch {
      toast.error("Import failed. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  }

  const total = result?.sessions.reduce((a, s) => a + sessionResult(s), 0) ?? 0;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Import sessions"
      description="From any spreadsheet or tracker export (CSV)."
    >
      <div className="space-y-4">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void pick(f);
            e.target.value = "";
          }}
        />
        <Button variant="outline" block onClick={() => fileRef.current?.click()}>
          <FileUp aria-hidden /> {rows ? name : "Choose a CSV file"}
        </Button>
        {!bankroll && <p className="text-sm text-danger">Create a bankroll first.</p>}

        {rows && bankroll && result && (
          <>
            {bankrolls.length > 1 && (
              <div>
                <Label htmlFor="imp-br">Into bankroll</Label>
                <select
                  id="imp-br"
                  className="h-12 w-full rounded-md border border-line bg-field px-3 text-sm"
                  value={bankroll.id}
                  onChange={(e) => setBankrollId(e.target.value)}
                >
                  {bankrolls.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.currency})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink-soft">Dates look like</p>
              <Segmented
                ariaLabel="Date order"
                value={order}
                onValueChange={setOrder}
                options={[
                  { value: "dmy", label: "31/12" },
                  { value: "mdy", label: "12/31" },
                  { value: "ymd", label: "2026-12-31" },
                ]}
                className="w-full [&>*]:flex-1"
              />
            </div>
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium text-ink-soft">Match your columns</legend>
              {IMPORT_FIELDS.map((f) => (
                <label key={f} className="grid grid-cols-[8.5rem_1fr] items-center gap-2 text-sm">
                  <span className="text-ink-soft">{LABEL[f]}</span>
                  <select
                    aria-label={LABEL[f]}
                    className="h-10 min-w-0 rounded-md border border-line bg-field px-2 text-sm"
                    value={mapping[f] ?? ""}
                    onChange={(e) =>
                      setMapping((m) => ({
                        ...m,
                        [f]: e.target.value === "" ? undefined : Number(e.target.value),
                      }))
                    }
                  >
                    <option value="">—</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `Column ${i + 1}`}
                        {rows[1]?.[i] ? ` · e.g. ${rows[1][i]!.slice(0, 16)}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </fieldset>
            <div className="rounded-md bg-field px-3 py-2.5 text-sm" role="status">
              <p>
                <span className="font-semibold">{result.sessions.length}</span> sessions ready ·{" "}
                <span className="num font-semibold">
                  {formatMoney(
                    { minor: total, currency: bankroll.currency },
                    { signed: true, trimZeroCents: true },
                  )}
                </span>
              </p>
              {result.errors.length > 0 && (
                <p className="mt-1 text-xs text-danger">
                  {result.errors.length} row{result.errors.length === 1 ? "" : "s"} skipped — e.g.
                  row {result.errors[0]!.row}: {result.errors[0]!.message}
                </p>
              )}
            </div>
            <Button block size="lg" disabled={busy || result.sessions.length === 0} onClick={run}>
              Import {result.sessions.length} sessions
            </Button>
          </>
        )}
      </div>
    </Sheet>
  );
}

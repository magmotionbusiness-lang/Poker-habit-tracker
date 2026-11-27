"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { ArrowLeft, Cloud, Database, Download, FileJson, FileUp, Sparkles } from "lucide-react";
import { CsvImportSheet } from "@/components/sessions/csv-import-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { ListGroup, ListRow } from "@/components/ui/list-row";
import { toast } from "@/components/ui/toaster";
import { db } from "@/lib/db/db";
import { useOutboxCount } from "@/lib/db/hooks";
import { useSyncStatus } from "@/lib/db/sync-status";
import { loadDemoData, removeDemoData } from "@/lib/demo/load";
import { downloadText, sessionsCsv, transactionsCsv } from "@/lib/export/export";
import { useAppStore } from "@/lib/store/app-store";

export function DataScreen() {
  const [importing, setImporting] = useState(false);
  const mode = useAppStore((s) => s.mode);
  const sync = useSyncStatus();
  const pending = useOutboxCount();
  const hasDemo = useLiveQuery(async () => Boolean(await db().meta.get("demoIds")), []);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const stamp = new Date().toISOString().slice(0, 10);

  async function exportSessions() {
    const d = db();
    const [sessions, venues, bankrolls] = await Promise.all([
      d.sessions.orderBy("started_at").toArray(),
      d.venues.toArray(),
      d.bankrolls.toArray(),
    ]);
    downloadText(`stakers-sessions-${stamp}.csv`, sessionsCsv(sessions, venues, bankrolls));
  }
  async function exportTransactions() {
    const d = db();
    const [txs, bankrolls] = await Promise.all([
      d.transactions.orderBy("occurred_at").toArray(),
      d.bankrolls.toArray(),
    ]);
    downloadText(`stakers-transactions-${stamp}.csv`, transactionsCsv(txs, bankrolls));
  }
  async function exportJson() {
    const d = db();
    const tables = [
      "bankrolls",
      "transactions",
      "venues",
      "sessions",
      "stackUpdates",
      "shortcuts",
      "habits",
      "habitLogs",
      "studySessions",
      "goals",
      "hands",
      "handCollections",
      "rules",
      "opponents",
      "settings",
    ] as const;
    const out: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      app: "Stakers",
      version: 1,
    };
    for (const t of tables) out[t] = await d.table(t).toArray();
    downloadText(`stakers-export-${stamp}.json`, JSON.stringify(out, null, 2), "application/json");
  }

  const syncText =
    mode !== "account"
      ? "Guest mode — everything is stored on this device only."
      : sync.state === "syncing"
        ? "Syncing…"
        : sync.state === "offline"
          ? "Offline — changes are saved and will sync when you're back."
          : sync.state === "error"
            ? `Sync problem: ${sync.error}`
            : sync.lastSyncedAt
              ? `Backed up · last sync ${new Date(sync.lastSyncedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
              : "Waiting to sync…";

  return (
    <div className="space-y-6 pt-3">
      <Link
        href="/more"
        className="-ml-2 inline-flex h-11 items-center gap-1.5 px-2 text-sm font-semibold text-ink-soft"
      >
        <ArrowLeft className="size-4" aria-hidden /> More
      </Link>
      <header>
        <p className="eyebrow mb-1.5">Your data</p>
        <h1 className="text-[34px] font-semibold">Data & sync</h1>
      </header>

      <Card className="flex gap-3">
        <Cloud className="mt-0.5 size-5 shrink-0 text-lavender" aria-hidden />
        <div>
          <p className="font-semibold">{mode === "account" ? "Account sync" : "On this device"}</p>
          <p className="text-sm text-ink-muted">{syncText}</p>
          {(pending ?? 0) > 0 && (
            <p className="mt-1 text-xs text-ink-subtle">{pending} change(s) waiting to upload.</p>
          )}
          {mode !== "account" && (
            <Button className="mt-3" size="sm" variant="secondary" asChild>
              <Link href="/login">Create account to back up</Link>
            </Button>
          )}
        </div>
      </Card>

      <ListGroup title="Import">
        <ListRow
          icon={<FileUp />}
          label="Sessions from CSV"
          detail="Any spreadsheet or tracker export — you match the columns"
          onClick={() => setImporting(true)}
        />
      </ListGroup>
      {importing && <CsvImportSheet open onClose={() => setImporting(false)} />}

      <ListGroup title="Export">
        <ListRow
          icon={<Download />}
          label="Sessions (CSV)"
          detail="Every finished session, exact amounts"
          onClick={exportSessions}
        />
        <ListRow
          icon={<Download />}
          label="Deposits & withdrawals (CSV)"
          onClick={exportTransactions}
        />
        <ListRow
          icon={<FileJson />}
          label="Everything (JSON)"
          detail="A full copy of your data"
          onClick={exportJson}
        />
      </ListGroup>
      <p className="-mt-3 px-1 text-xs text-ink-subtle">
        Exports help with your own records. They are not tax advice.
      </p>

      <ListGroup title="Demo">
        {hasDemo ? (
          <ListRow
            icon={<Database />}
            label="Remove demo data"
            detail="Deletes the demo player's sessions, habits and goals"
            onClick={async () => {
              await removeDemoData();
              toast("Demo data removed.");
            }}
          />
        ) : (
          <ListRow
            icon={<Sparkles />}
            label="Load demo data"
            detail="~3 months of sessions, a 23-day streak, a $10k goal at 64%"
            onClick={() =>
              mode === "account"
                ? setConfirmDemo(true)
                : loadDemoData().then(() => toast.success("Demo player loaded."))
            }
          />
        )}
      </ListGroup>

      <Dialog
        open={confirmDemo}
        onOpenChange={setConfirmDemo}
        title="Add demo data to your account?"
        description="It syncs like real data. You can remove it here any time."
      >
        <div className="flex gap-3">
          <Button variant="secondary" block onClick={() => setConfirmDemo(false)}>
            Cancel
          </Button>
          <Button
            block
            onClick={async () => {
              setConfirmDemo(false);
              await loadDemoData();
              toast.success("Demo player loaded.");
            }}
          >
            Load demo
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

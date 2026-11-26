"use client";

import { useState } from "react";
import { CurrencySelect } from "@/components/forms/currency-select";
import { MoneyInput } from "@/components/forms/money-input";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import { errorMessage } from "@/lib/errors";
import { addTransaction, createBankroll } from "@/lib/db/actions";
import { useBankrolls } from "@/lib/db/hooks";
import type { TransactionType } from "@/lib/domain/types";
import { useAppStore } from "@/lib/store/app-store";
import { useUi } from "@/lib/store/ui-store";

function todayLocalInput() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function TransactionSheet() {
  const { sheet, close, open } = useUi();
  const bankrolls = (useBankrolls() ?? []).filter((b) => !b.archived);
  const [type, setType] = useState<TransactionType>("deposit");
  const [bankrollId, setBankrollId] = useState<string>("");
  const [toId, setToId] = useState<string>("");
  const [amount, setAmount] = useState<number | null>(null);
  const [date, setDate] = useState(todayLocalInput);
  const [note, setNote] = useState("");
  const br = bankrolls.find((b) => b.id === bankrollId) ?? bankrolls[0];

  async function save() {
    if (!br || !amount) return;
    try {
      await addTransaction({
        bankroll_id: br.id,
        type,
        amount_minor: type === "adjustment" ? amount : Math.abs(amount),
        currency: br.currency,
        transfer_bankroll_id: type === "transfer" ? toId || null : null,
        note: note.trim() || null,
        occurred_at: new Date(`${date}T12:00:00`).toISOString(),
      });
      toast.success("Saved.");
      setAmount(null);
      setNote("");
      close();
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't save"));
    }
  }

  return (
    <Sheet
      open={sheet === "transaction"}
      onOpenChange={(o) => !o && close()}
      title="Add transaction"
      description="Money in or out of a bankroll — kept apart from your results."
    >
      {bankrolls.length === 0 ? (
        <Button block onClick={() => open("bankroll")}>
          Create a bankroll first
        </Button>
      ) : (
        <div className="space-y-4">
          <Segmented
            ariaLabel="Type"
            value={type}
            onValueChange={setType}
            options={[
              { value: "deposit", label: "In" },
              { value: "withdrawal", label: "Out" },
              { value: "transfer", label: "Move" },
              { value: "adjustment", label: "Fix" },
            ]}
            className="w-full"
          />
          <div>
            <Label htmlFor="tx-bankroll">{type === "transfer" ? "From" : "Bankroll"}</Label>
            <select
              id="tx-bankroll"
              value={br?.id}
              onChange={(e) => setBankrollId(e.target.value)}
              className="h-12 w-full rounded-md border border-line bg-field px-3 text-[16px] text-ink"
            >
              {bankrolls.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {b.currency}
                </option>
              ))}
            </select>
          </div>
          {type === "transfer" && (
            <div>
              <Label htmlFor="tx-to">To</Label>
              <select
                id="tx-to"
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="h-12 w-full rounded-md border border-line bg-field px-3 text-[16px] text-ink"
              >
                <option value="">Choose…</option>
                {bankrolls
                  .filter((b) => b.id !== br?.id && b.currency === br?.currency)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </div>
          )}
          {br && (
            <MoneyInput
              size="lg"
              label={type === "adjustment" ? "Amount (use − to reduce)" : "Amount"}
              allowNegative={type === "adjustment"}
              currency={br.currency}
              value={amount}
              onChange={setAmount}
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tx-date">Date</Label>
              <Input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tx-note">Note</Label>
              <Input
                id="tx-note"
                placeholder="Optional"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <Button
            size="lg"
            block
            disabled={!amount || (type === "transfer" && !toId)}
            onClick={save}
          >
            Save
          </Button>
        </div>
      )}
    </Sheet>
  );
}

export function BankrollSheet() {
  const { sheet, close } = useUi();
  const currency = useAppStore((s) => s.prefs.currency);
  const [name, setName] = useState("");
  const [ccy, setCcy] = useState(currency);
  const [start, setStart] = useState<number | null>(null);
  return (
    <Sheet
      open={sheet === "bankroll"}
      onOpenChange={(o) => !o && close()}
      title="New bankroll"
      description="e.g. Live, Online, Shared with a friend."
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="br-name">Name</Label>
          <Input
            id="br-name"
            placeholder="Online"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <CurrencySelect id="br-ccy" value={ccy} onChange={setCcy} />
        <MoneyInput
          label="Starting amount (optional)"
          currency={ccy}
          value={start}
          onChange={setStart}
        />
        <Button
          size="lg"
          block
          disabled={!name.trim()}
          onClick={async () => {
            const b = await createBankroll({ name, currency: ccy });
            if (start)
              await addTransaction({
                bankroll_id: b.id,
                type: "deposit",
                amount_minor: start,
                currency: ccy,
                occurred_at: new Date().toISOString(),
                note: "Starting bankroll",
              });
            toast.success(`${b.name} created.`);
            setName("");
            setStart(null);
            close();
          }}
        >
          Create bankroll
        </Button>
      </div>
    </Sheet>
  );
}

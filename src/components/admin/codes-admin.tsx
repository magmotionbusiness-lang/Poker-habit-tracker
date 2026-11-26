"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Copy, KeyRound, Shuffle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { toast } from "@/components/ui/toaster";

type Code = {
  code: string;
  grants_status: "student" | "alumni";
  pro_months: number;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
};

/** Unambiguous characters only (no 0/O, 1/I). */
export function randomCode(prefix = "UTS"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `${prefix}-${Array.from(bytes, (b) => chars[b % chars.length]).join("")}`;
}

/** Access codes give cohort students / alumni Pro and their status. */
export function CodesAdmin({ client }: { client: SupabaseClient }) {
  const [rows, setRows] = useState<Code[] | null>(null);
  const [code, setCode] = useState(() => randomCode());
  const [status, setStatus] = useState<"student" | "alumni">("student");
  const [months, setMonths] = useState("6");
  const [maxUses, setMaxUses] = useState("20");
  const [expires, setExpires] = useState("");
  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);
  useEffect(() => {
    let live = true;
    void client
      .from("access_codes")
      .select("code,grants_status,pro_months,max_uses,uses,expires_at")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!live) return;
        if (error) toast.error(error.message);
        setRows((data ?? []) as Code[]);
      });
    return () => {
      live = false;
    };
  }, [client, version]);

  async function create() {
    const { error } = await client.from("access_codes").insert({
      code: code.trim().toUpperCase(),
      grants_status: status,
      pro_months: Math.max(1, Number(months) || 6),
      max_uses: maxUses ? Math.max(1, Number(maxUses)) : null,
      expires_at: expires ? new Date(`${expires}T23:59:59`).toISOString() : null,
    });
    if (error) return toast.error(error.message);
    toast.success(`Code ${code} created`);
    setCode(randomCode());
    load();
  }

  async function remove(c: Code) {
    if (!confirm(`Delete code ${c.code}? People who already redeemed it keep their access.`))
      return;
    const { error } = await client.from("access_codes").delete().eq("code", c.code);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div>
          <Label htmlFor="code">Code</Label>
          <div className="flex gap-2">
            <Input
              id="code"
              className="num uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9-]/g, "").slice(0, 40))}
            />
            <Button
              variant="outline"
              size="icon"
              aria-label="New random code"
              onClick={() => setCode(randomCode())}
            >
              <Shuffle aria-hidden />
            </Button>
          </div>
        </div>
        <Segmented
          ariaLabel="Grants"
          value={status}
          onValueChange={setStatus}
          options={[
            { value: "student", label: "Cohort student" },
            { value: "alumni", label: "Alumni" },
          ]}
          className="w-full [&>*]:flex-1"
        />
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label htmlFor="months">Pro months</Label>
            <Input
              id="months"
              inputMode="numeric"
              value={months}
              onChange={(e) => setMonths(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div>
            <Label htmlFor="max">Max uses</Label>
            <Input
              id="max"
              inputMode="numeric"
              placeholder="∞"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div>
            <Label htmlFor="exp">Expires</Label>
            <Input
              id="exp"
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />
          </div>
        </div>
        <Button block disabled={code.length < 4} onClick={create}>
          <KeyRound aria-hidden /> Create code
        </Button>
      </Card>
      <ul className="stagger space-y-2">
        {(rows ?? []).map((c) => (
          <li key={c.code}>
            <Card className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="num font-semibold">{c.code}</p>
                <p className="text-xs text-ink-muted">
                  {c.grants_status} · {c.pro_months} mo Pro · used {c.uses}
                  {c.max_uses ? `/${c.max_uses}` : ""}
                  {c.expires_at ? ` · until ${c.expires_at.slice(0, 10)}` : ""}
                </p>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Copy ${c.code}`}
                onClick={() =>
                  void navigator.clipboard?.writeText(c.code).then(() => toast.success("Copied"))
                }
              >
                <Copy aria-hidden />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Delete ${c.code}`}
                onClick={() => remove(c)}
              >
                <Trash2 aria-hidden />
              </Button>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

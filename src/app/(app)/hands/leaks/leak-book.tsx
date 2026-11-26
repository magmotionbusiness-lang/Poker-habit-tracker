"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, BookMarked, Check, Plus } from "lucide-react";
import { Chips } from "@/components/forms/chips";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Label, Textarea } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import { ruleCategories } from "@/content/review";
import { useRules } from "@/lib/db/hooks";
import { newId, nowIso, putRow } from "@/lib/db/repo";
import type { Rule, RuleCategory } from "@/lib/domain/types";
import { deleteRule, updateRule } from "@/lib/hands/actions";
import { groupRules } from "@/lib/hands/leaks";

export function LeakBook() {
  const rules = useRules();
  const [editing, setEditing] = useState<Rule | "new" | null>(null);
  if (!rules) return null;
  const groups = groupRules(rules);
  const open = rules.filter((r) => r.status === "working").length;

  return (
    <div className="space-y-6 pt-3">
      <div className="flex items-center justify-between">
        <Link
          href="/hands"
          className="-ml-2 inline-flex h-11 items-center gap-1.5 px-2 text-sm font-semibold text-ink-soft"
        >
          <ArrowLeft className="size-4" aria-hidden /> Hands
        </Link>
        <Button size="sm" variant="secondary" onClick={() => setEditing("new")}>
          <Plus aria-hidden /> Add rule
        </Button>
      </div>
      <header>
        <p className="eyebrow mb-1.5">Your own rules</p>
        <h1 className="text-[34px] font-semibold">Leak Book</h1>
        <p className="mt-2 text-ink-muted">
          Every rule comes from a hand you reviewed.{" "}
          {rules.length > 0 && `${open} you're working on, ${rules.length - open} fixed.`}
        </p>
      </header>

      {groups.length === 0 ? (
        <EmptyState
          icon={<BookMarked />}
          title="No leaks written yet."
          body="Review a hand and finish with “Next time in this spot I will…”. That rule lands here and resurfaces on your Today screen."
          action={
            <Button asChild>
              <Link href="/hands?list=unreviewed">Review a hand</Link>
            </Button>
          }
        />
      ) : (
        groups.map((g) => (
          <section key={g.category} aria-labelledby={`cat-${g.category}`} className="space-y-2">
            <h2 id={`cat-${g.category}`} className="eyebrow px-1 !font-sans">
              {ruleCategories.find((c) => c.value === g.category)?.label}
            </h2>
            {g.rules.map((r) => (
              <Card key={r.id} className={r.status === "fixed" ? "opacity-70" : ""}>
                <button type="button" className="w-full text-left" onClick={() => setEditing(r)}>
                  <p
                    className={`font-display text-lg leading-snug ${r.status === "fixed" ? "line-through decoration-ink-subtle" : ""}`}
                  >
                    {r.text}
                  </p>
                </button>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {r.times_seen > 1 && <Badge size="sm">Seen {r.times_seen}×</Badge>}
                  {r.hand_ids[0] && (
                    <Link
                      href={`/hands/view?id=${r.hand_ids.at(-1)}`}
                      className="text-xs font-semibold text-lavender underline-offset-4 hover:underline"
                    >
                      {r.hand_ids.length} example hand{r.hand_ids.length === 1 ? "" : "s"} →
                    </Link>
                  )}
                  <span className="flex-1" />
                  <Button
                    size="sm"
                    variant={r.status === "fixed" ? "secondary" : "outline"}
                    onClick={async () => {
                      await updateRule(r, { status: r.status === "fixed" ? "working" : "fixed" });
                      toast(
                        r.status === "fixed" ? "Back on the list." : "Marked fixed. Nice work.",
                      );
                    }}
                  >
                    {r.status === "fixed" ? (
                      "Reopen"
                    ) : (
                      <>
                        <Check aria-hidden /> Fixed
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </section>
        ))
      )}

      <RuleSheet
        key={editing === null ? "none" : editing === "new" ? "new" : editing.id}
        rule={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function RuleSheet({
  rule,
  open,
  onClose,
}: {
  rule: Rule | null;
  open: boolean;
  onClose: () => void;
}) {
  const [text, setText] = useState(rule?.text ?? "");
  const [category, setCategory] = useState<RuleCategory>(rule?.category ?? "preflop");
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={rule ? "Edit rule" : "New rule"}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="rule-text">Next time in this spot I will…</Label>
          <Textarea id="rule-text" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <Chips
          ariaLabel="Category"
          size="sm"
          options={ruleCategories}
          value={category}
          onChange={(v) => setCategory(v as RuleCategory)}
        />
        <Button
          size="lg"
          block
          disabled={!text.trim()}
          onClick={async () => {
            if (rule) await updateRule(rule, { text: text.trim(), category });
            else {
              const at = nowIso();
              await putRow("rules", {
                id: newId(),
                category,
                text: text.trim(),
                status: "working",
                times_seen: 1,
                last_surfaced_at: null,
                hand_ids: [],
                created_at: at,
                updated_at: at,
              } satisfies Rule);
            }
            onClose();
          }}
        >
          Save
        </Button>
        {rule && (
          <Button
            variant="ghost"
            block
            onClick={async () => {
              await deleteRule(rule.id);
              onClose();
              toast("Rule deleted");
            }}
          >
            Delete rule
          </Button>
        )}
      </div>
    </Sheet>
  );
}

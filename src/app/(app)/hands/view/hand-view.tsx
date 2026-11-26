"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, BookMarked, NotebookPen, Plus, Star, Trash2 } from "lucide-react";
import { Chips } from "@/components/forms/chips";
import { ReviewDot } from "@/components/hands/hand-row";
import { signedChipLabel } from "@/components/poker/amount";
import { PlayingCard } from "@/components/poker/playing-card";
import { Replayer } from "@/components/poker/replayer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import { sectionEmojis, userTags } from "@/content/hands";
import { reviewSteps, ruleCategories, ruleStep } from "@/content/review";
import { useCollections, useHand } from "@/lib/db/hooks";
import type { Hand, RuleCategory } from "@/lib/domain/types";
import { errorMessage } from "@/lib/errors";
import {
  createCollection,
  deleteHand,
  saveReview,
  toggleInCollection,
  updateHand,
} from "@/lib/hands/actions";
import { haptic } from "@/lib/haptics";
import { useAppStore } from "@/lib/store/app-store";

export function HandView() {
  const id = useSearchParams().get("id");
  const hand = useHand(id);
  if (hand === undefined) return null;
  if (hand === null)
    return (
      <div className="pt-10 text-center">
        <p className="text-ink-muted">That hand doesn&apos;t exist anymore.</p>
        <Button className="mt-4" asChild>
          <Link href="/hands">Back to hands</Link>
        </Button>
      </div>
    );
  return <View hand={hand} />;
}

function View({ hand }: { hand: Hand }) {
  const router = useRouter();
  const prefs = useAppStore((s) => s.prefs);
  const [mode, setMode] = useState<"money" | "bb">(prefs.displayMode);
  const [reviewing, setReviewing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cards = hand.hero_cards?.match(/.{2}/g) ?? [];
  const net = hand.net_minor;

  return (
    <div className="space-y-5 pt-3">
      <div className="flex items-center justify-between">
        <Link
          href="/hands"
          className="-ml-2 inline-flex h-11 items-center gap-1.5 px-2 text-sm font-semibold text-ink-soft"
        >
          <ArrowLeft className="size-4" aria-hidden /> Hands
        </Link>
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={hand.starred ? "Unstar" : "Star"}
            aria-pressed={hand.starred}
            onClick={() => {
              haptic();
              void updateHand(hand, { starred: !hand.starred });
            }}
          >
            <Star className={hand.starred ? "fill-lavender text-lavender" : ""} />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Delete hand"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <header className="flex items-center gap-4">
        {cards.length > 0 && (
          <div className="flex -space-x-2">
            {cards.map((c) => (
              <PlayingCard key={c} card={c} size="md" fourColor={prefs.fourColorDeck} />
            ))}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="eyebrow">
            {[hand.hero_position, hand.game, hand.stakes].filter(Boolean).join(" · ") ||
              "Quick note"}
          </p>
          {net !== null && hand.currency ? (
            <p
              className={`num font-display text-[34px] leading-tight font-semibold ${net > 0 ? "text-success" : net < 0 ? "text-danger" : ""}`}
            >
              {signedChipLabel(net, hand.currency, hand.ohh?.bb ?? 1, mode)}
            </p>
          ) : (
            <p className="font-display text-2xl font-semibold">Not logged yet</p>
          )}
          <p className="flex items-center gap-1.5 text-xs text-ink-muted">
            <ReviewDot status={hand.review_status} />
            {hand.review_status === "unreviewed"
              ? "Waiting for review"
              : hand.review_status === "lesson"
                ? "Lesson written"
                : "Reviewed"}{" "}
            ·{" "}
            {new Date(hand.played_at).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {hand.pot_bb !== null && ` · pot ${hand.pot_bb}bb`}
          </p>
        </div>
        {hand.ohh && (
          <Segmented
            ariaLabel="Show amounts in"
            value={mode}
            onValueChange={setMode}
            options={[
              { value: "money", label: "$" },
              { value: "bb", label: "BB" },
            ]}
          />
        )}
      </header>

      {hand.quick_note && (
        <Card className="flex gap-3">
          <NotebookPen className="mt-0.5 size-5 shrink-0 text-lavender" aria-hidden />
          <div className="flex-1">
            <p className="text-ink">{hand.quick_note}</p>
            {!hand.ohh && (
              <Button className="mt-3" size="sm" asChild>
                <Link href={`/hands/new?from=${hand.id}`}>Log it as a full hand</Link>
              </Button>
            )}
          </div>
        </Card>
      )}

      {hand.ohh && <Replayer hand={hand.ohh} mode={mode} fourColor={prefs.fourColorDeck} />}

      <Sections hand={hand} />

      <Card>
        <CardHeader eyebrow="Tags" />
        <Chips
          ariaLabel="Tags"
          multiple
          size="sm"
          options={userTags.map((t) => ({ value: t, label: t }))}
          value={hand.user_tags}
          onChange={(v) => updateHand(hand, { user_tags: v as string[] })}
        />
      </Card>

      <ReviewCard hand={hand} onStart={() => setReviewing(true)} />

      <Sheet
        open={reviewing}
        onOpenChange={setReviewing}
        title="Review this hand"
        description="Street by street. End with the rule you'll use next time."
      >
        {reviewing && <ReviewForm hand={hand} onDone={() => setReviewing(false)} />}
      </Sheet>

      <Dialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this hand?"
        description="It's removed from your journal, sections and Leak Book examples."
      >
        <div className="flex gap-3">
          <Button variant="secondary" block onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            block
            onClick={async () => {
              await deleteHand(hand.id);
              toast("Hand deleted");
              router.push("/hands");
            }}
          >
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function Sections({ hand }: { hand: Hand }) {
  const sections = useCollections() ?? [];
  const [name, setName] = useState("");
  return (
    <Card>
      <CardHeader eyebrow="In your sections" />
      {sections.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sections.map((s) => {
            const on = hand.collection_ids.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleInCollection(hand, s.id)}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold ${on ? "border-primary-strong bg-pill text-lavender-pale" : "border-line bg-field text-ink-soft"}`}
              >
                <span aria-hidden>{s.emoji ?? "📁"}</span> {s.name}
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <Input
          aria-label="New section name"
          placeholder="New section…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          size="icon"
          variant="secondary"
          aria-label="Create section and add this hand"
          disabled={!name.trim()}
          onClick={async () => {
            const c = await createCollection(
              name,
              sectionEmojis[sections.length % sectionEmojis.length]!,
            );
            await toggleInCollection(hand, c.id);
            setName("");
            toast.success(`Added to ${c.name}.`);
          }}
        >
          <Plus />
        </Button>
      </div>
    </Card>
  );
}

function ReviewCard({ hand, onStart }: { hand: Hand; onStart: () => void }) {
  const r = hand.review;
  if (!r)
    return (
      <Card glow className="text-center">
        <p className="eyebrow">The habit that matters most</p>
        <p className="mt-2 font-display text-xl font-semibold">Review it while it&apos;s fresh</p>
        <p className="mt-1 text-sm text-ink-muted">
          Preflop → flop → turn & river → opponent → mental state → the rule.
        </p>
        <Button className="mt-4" block onClick={onStart}>
          Start review
        </Button>
      </Card>
    );
  return (
    <Card>
      <CardHeader
        eyebrow="Your review"
        action={
          <Button size="sm" variant="ghost" onClick={onStart}>
            Edit
          </Button>
        }
      />
      <dl className="space-y-3">
        {reviewSteps.map((s) =>
          r.answers[s.key] ? (
            <div key={s.key}>
              <dt className="text-xs font-semibold text-ink-muted">{s.label}</dt>
              <dd className="text-ink-soft">{r.answers[s.key]}</dd>
            </div>
          ) : null,
        )}
      </dl>
      {r.rule && (
        <Link
          href="/hands/leaks"
          className="mt-4 flex items-start gap-3 rounded-lg border border-line-accent bg-pill/40 p-3"
        >
          <BookMarked className="mt-0.5 size-5 shrink-0 text-lavender" aria-hidden />
          <span>
            <span className="eyebrow block">
              The rule · {ruleCategories.find((c) => c.value === r.rule!.category)?.label}
            </span>
            <span className="font-display text-lg leading-snug">{r.rule.text}</span>
          </span>
        </Link>
      )}
    </Card>
  );
}

function ReviewForm({ hand, onDone }: { hand: Hand; onDone: () => void }) {
  const multiway = hand.auto_tags.includes("multiway");
  const steps = reviewSteps.filter(
    (s) => !("onlyIf" in s) || (s.onlyIf === "multiway" && multiway),
  );
  const [answers, setAnswers] = useState<Record<string, string>>(hand.review?.answers ?? {});
  const [rule, setRule] = useState(hand.review?.rule?.text ?? "");
  const [category, setCategory] = useState<RuleCategory>(
    hand.review?.rule?.category ??
      (hand.auto_tags.includes("street:river") || hand.auto_tags.includes("street:showdown")
        ? "river"
        : "preflop"),
  );
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-4">
      {steps.map((s, i) => (
        <div key={s.key}>
          <Label htmlFor={`rv-${s.key}`}>
            <span className="num mr-1.5 text-lavender">{i + 1}.</span>
            {s.label}
          </Label>
          <Textarea
            id={`rv-${s.key}`}
            className="min-h-16"
            placeholder={s.prompt}
            value={answers[s.key] ?? ""}
            onChange={(e) => setAnswers({ ...answers, [s.key]: e.target.value })}
          />
        </div>
      ))}
      <div className="rounded-lg border border-line-accent bg-pill/30 p-3">
        <Label htmlFor="rv-rule" className="!text-lavender-pale">
          {ruleStep.label} — {ruleStep.prompt}
        </Label>
        <Textarea
          id="rv-rule"
          className="min-h-16"
          placeholder={ruleStep.placeholder}
          value={rule}
          onChange={(e) => setRule(e.target.value)}
        />
        <div className="mt-3">
          <Chips
            ariaLabel="Rule category"
            size="sm"
            options={ruleCategories}
            value={category}
            onChange={(v) => setCategory(v as RuleCategory)}
          />
        </div>
      </div>
      <Button
        size="lg"
        block
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const clean = Object.fromEntries(Object.entries(answers).filter(([, v]) => v.trim()));
            const r = await saveReview(hand, clean, rule.trim() ? { category, text: rule } : null);
            haptic([10, 30, 10]);
            toast.success(
              r.rule
                ? r.rule.times_seen > 1
                  ? `Same leak again (${r.rule.times_seen}×). It's in your Leak Book.`
                  : "Rule added to your Leak Book."
                : "Reviewed. Add a rule next time to lock in the lesson.",
            );
            onDone();
          } catch (e) {
            toast.error(errorMessage(e));
            setBusy(false);
          }
        }}
      >
        {rule.trim() ? "Save review & rule" : "Save review"}
      </Button>
    </div>
  );
}

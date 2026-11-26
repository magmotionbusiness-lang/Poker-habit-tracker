"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, AtSign, Mail, Plus, Target, TrendingUp, User } from "lucide-react";
import { Headline } from "@/components/brand/headline";
import { StakersMark, Wordmark } from "@/components/brand/stakers-mark";
import { StreakFlame } from "@/components/brand/streak-flame";
import { BankrollChart } from "@/components/charts/bankroll-chart";
import { Heatmap } from "@/components/charts/heatmap";
import { Sparkline } from "@/components/charts/sparkline";
import { PlayingCard } from "@/components/poker/playing-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, Stat } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Textarea } from "@/components/ui/input";
import { ListGroup, ListRow } from "@/components/ui/list-row";
import { ProgressBar, ProgressRing } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { tokens } from "@/config/tokens";
import { formatMoney } from "@/lib/money";

/** Deterministic PRNG so the demo renders identically on server and client. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(7);
const bankroll = (() => {
  let v = 500_000;
  return Array.from({ length: 40 }, (_, i) => {
    v += Math.round((rand() - 0.42) * 60_000);
    return { label: `S${i + 1}`, minor: v };
  });
})();
const heat = Array.from({ length: 26 * 7 }, (_, i) => (i < 20 ? null : rand() < 0.18 ? 0 : rand()));

const swatches: Array<[string, string, string]> = [
  ["canvas", tokens.canvas, "App background"],
  ["elevated", tokens.elevated, "Header / tab bar"],
  ["surface", tokens.surface, "Cards"],
  ["surface-2", tokens.surface2, "Raised cards, sheets"],
  ["field", tokens.field, "Inputs, rows"],
  ["pill", tokens.pill, "Badge background"],
  ["primary", tokens.primary, "Buttons, accents"],
  ["primary-strong", tokens.primaryStrong, "Active, focus"],
  ["primary-deep", tokens.primaryDeep, "Gradient end"],
  ["lavender", tokens.lavender, "Eyebrows, highlights"],
  ["lavender-pale", tokens.lavenderPale, "Gradient start"],
  ["ink", tokens.ink, "Headlines"],
  ["ink-soft", tokens.inkSoft, "Secondary text"],
  ["ink-muted", tokens.inkMuted, "Body copy"],
  ["ink-subtle", tokens.inkSubtle, "Captions"],
  ["success", tokens.success, "Profit only"],
  ["danger", tokens.danger, "Loss only"],
  ["gold", tokens.gold, "Milestones only"],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t border-line pt-8">
      <h2 className="text-[26px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function DesignShowcase() {
  const [seg, setSeg] = useState<"day" | "week" | "month">("week");
  const [sw, setSw] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [four, setFour] = useState(false);
  const last = bankroll.at(-1)!.minor;

  return (
    <main className="hero-glow px-safe pt-safe min-h-dvh pb-24">
      <div className="mx-auto max-w-2xl space-y-10">
        <header className="pt-4">
          <Link
            href="/more"
            className="-ml-2 inline-flex h-11 items-center gap-1.5 px-2 text-sm font-semibold text-ink-soft"
          >
            <ArrowLeft className="size-4" aria-hidden /> Back
          </Link>
          <p className="eyebrow mt-6 mb-3">Design system · dev & preview only</p>
          <Headline lead="A private members' club" accent="at night." size="xl" />
          <p className="mt-4 text-ink-muted">
            Tokens from upthestakes.net — Fraunces headlines, Plus Jakarta Sans UI, violet on
            near-black.
          </p>
        </header>

        <Section title="Colour">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {swatches.map(([name, hex, use]) => (
              <li key={name} className="overflow-hidden rounded-lg border border-line bg-surface">
                <div className="h-16 border-b border-line" style={{ background: hex }} />
                <div className="p-3">
                  <p className="text-sm font-semibold">{name}</p>
                  <p className="num text-xs text-ink-muted">{hex}</p>
                  <p className="text-xs text-ink-subtle">{use}</p>
                </div>
              </li>
            ))}
          </ul>
          <div
            className="h-14 rounded-lg bg-[image:var(--gradient-primary)] shadow-accent"
            aria-label="Primary gradient"
          />
          <div
            className="h-14 rounded-lg bg-[image:var(--gradient-headline)]"
            aria-label="Headline gradient"
          />
        </Section>

        <Section title="Typography">
          <div className="space-y-4">
            <Headline lead="Make your first" accent="$50k from poker" size="xl" as="p" />
            <Headline lead="Build the system." accent="Up the stakes." size="lg" as="p" />
            <Headline lead="Not more content." accent="A system." size="md" as="p" />
            <p className="eyebrow">Eyebrow label · the real problem</p>
            <p className="text-base text-ink-soft">
              Body 16px Plus Jakarta Sans. Most players don&apos;t need bigger stakes, longer hours
              or another course — they need a system.
            </p>
            <p className="text-sm text-ink-muted">
              Small 14px muted. Captions and supporting lines.
            </p>
            <p className="num font-display text-5xl font-semibold tracking-[-0.03em]">
              {formatMoney({ minor: 1_248_000, currency: "USD" })}
            </p>
            <p className="num text-ink-soft">Tabular numbers: 1,111.11 · 8,888.88 · 00:42:17</p>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap gap-3">
            <Button>Join the waitlist →</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">End session</Button>
            <Button variant="link">Link →</Button>
            <Button size="icon" aria-label="Add">
              <Plus />
            </Button>
            <Button disabled>Disabled</Button>
          </div>
          <Button size="lg" block>
            Start session
          </Button>
        </Section>

        <Section title="Badges & pills">
          <div className="flex flex-wrap gap-2">
            <Badge dot pulse>
              Cohort 7 waitlist open
            </Badge>
            <Badge variant="outline">Pro</Badge>
            <Badge variant="profit">+$412</Badge>
            <Badge variant="loss">−$180</Badge>
            <Badge variant="gold">30-day streak</Badge>
            <Badge size="sm">UTS Cohort 7</Badge>
          </div>
        </Section>

        <Section title="Inputs & controls">
          <div className="space-y-4">
            <div>
              <Label htmlFor="d-name">Your name</Label>
              <Input id="d-name" icon={<User />} placeholder="Your name" />
            </div>
            <Input icon={<Mail />} type="email" placeholder="you@example.com" aria-label="Email" />
            <Input icon={<AtSign />} placeholder="@yourinstagramhandle" aria-label="Instagram" />
            <Textarea placeholder="Next time in this spot I will…" aria-label="Rule" />
            <Segmented
              ariaLabel="Range"
              value={seg}
              onValueChange={setSeg}
              options={[
                { value: "day", label: "Day" },
                { value: "week", label: "Week" },
                { value: "month", label: "Month" },
              ]}
              className="w-full"
            />
            <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3">
              <span>Daily reminder</span>
              <Switch checked={sw} onCheckedChange={setSw} aria-label="Daily reminder" />
            </div>
          </div>
        </Section>

        <Section title="Cards">
          <Card glow>
            <CardHeader
              eyebrow="Main goal"
              action={<Target className="size-5 text-lavender" strokeWidth={1.6} />}
            />
            <div className="flex items-end justify-between">
              <Stat value="$12,480" label="of $50,000 profit · on pace for Sep 2027" />
              <Sparkline data={bankroll.map((b) => b.minor)} />
            </div>
            <ProgressBar className="mt-4" value={0.25} label="Goal progress" />
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <Stat size="sm" tone="profit" value="+$28/hr" label="A-game sessions" />
            </Card>
            <Card>
              <Stat size="sm" tone="loss" value="−$41/hr" label="C-game sessions" />
            </Card>
          </div>
          <Card>
            <CardHeader
              eyebrow="Bankroll"
              action={<TrendingUp className="size-5 text-lavender" strokeWidth={1.6} />}
            />
            <Stat
              value={formatMoney({ minor: last, currency: "USD" }, { trimZeroCents: true })}
              label="Live bankroll · 40 sessions"
            />
            <div className="mt-4">
              <BankrollChart data={bankroll} currency="USD" />
            </div>
          </Card>
        </Section>

        <Section title="Progress & streaks">
          <div className="flex flex-wrap items-center gap-5">
            <ProgressRing value={1 / 3} label="Review hands 1 of 3">
              <span className="num text-sm font-semibold">1/3</span>
            </ProgressRing>
            <ProgressRing value={12 / 30} label="Study 12 of 30 min">
              <span className="num text-sm font-semibold">12</span>
            </ProgressRing>
            <ProgressRing value={1} label="Warm-up done">
              <span className="text-success">✓</span>
            </ProgressRing>
            <StreakFlame count={23} size="lg" />
            <StreakFlame count={0} />
          </div>
          <Card>
            <CardHeader eyebrow="Habit heatmap" />
            <div className="scrollbar-none overflow-x-auto">
              <Heatmap values={heat} label="Habit consistency" />
            </div>
          </Card>
        </Section>

        <Section title="Playing cards">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-soft">Four-colour deck</span>
            <Switch checked={four} onCheckedChange={setFour} aria-label="Four-colour deck" />
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <PlayingCard card="As" size="lg" fourColor={four} />
            <PlayingCard card="Kh" size="lg" fourColor={four} />
            <PlayingCard card="Td" fourColor={four} />
            <PlayingCard card="7c" fourColor={four} />
            <PlayingCard card="2s" size="sm" fourColor={four} />
            <PlayingCard faceDown />
          </div>
        </Section>

        <Section title="Lists, empty states, loading">
          <ListGroup title="Settings">
            <ListRow icon={<Target />} label="Goals" detail="Make my first $50k" href="/design" />
            <ListRow label="Four-colour deck" trailing={<Switch aria-label="demo" />} />
          </ListGroup>
          <EmptyState
            icon={<StakersMark size={24} />}
            title="Your edge is hiding in your own hands."
            body="Log your first one — or a quick note — and review it when the session's over."
            action={<Button>Log a hand</Button>}
          />
          <div className="space-y-2">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        </Section>

        <Section title="Overlays">
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setSheet(true)}>
              Open sheet
            </Button>
            <Button variant="secondary" onClick={() => setDialog(true)}>
              Open dialog
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast("Session saved", { description: "+$212 · 4h 10m · Crown $2/3" })}
            >
              Toast
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast.success("7-day streak! You earned a streak freeze.")}
            >
              Success toast
            </Button>
          </div>
          <Sheet
            open={sheet}
            onOpenChange={setSheet}
            title="Update stack"
            description="Two taps. Back to the game."
          >
            <Input
              inputMode="decimal"
              placeholder="$0"
              aria-label="Stack"
              className="num text-2xl"
            />
            <Button className="mt-4" block onClick={() => setSheet(false)}>
              Save
            </Button>
          </Sheet>
          <Dialog
            open={dialog}
            onOpenChange={setDialog}
            title="Cohort 7 opens in 2d 14h"
            description="20 spots. Waitlist gets first access."
          >
            <Button block onClick={() => setDialog(false)}>
              Join the waitlist →
            </Button>
          </Dialog>
        </Section>

        <Section title="Brand">
          <div className="flex items-center gap-6">
            <Wordmark />
            <StakersMark size={64} />
          </div>
          <p className="text-sm text-ink-muted">
            Placeholder app mark. Official Up The Stakes logo: TODO(nelson) in /public/brand/.
          </p>
        </Section>
      </div>
    </main>
  );
}

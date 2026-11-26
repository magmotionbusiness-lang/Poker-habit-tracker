"use client";

import Link from "next/link";
import { BookOpen, Check, Inbox, Quote, Target } from "lucide-react";
import { useSyncExternalStore } from "react";
import { StreakFlame } from "@/components/brand/streak-flame";
import { InstallPrompt } from "@/components/shell/install-prompt";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, Stat } from "@/components/ui/card";
import { ProgressBar, ProgressRing } from "@/components/ui/progress";
import { formatMoney } from "@/lib/money";
import { useAppStore } from "@/lib/store/app-store";

function greetingFor(hour: number) {
  if (hour < 5) return "Late session?";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
const noop = () => () => {};

/** Phase 0 preview of the habit-loop home. Values are zero until Phase 1 wires real data. */
export function TodayScreen() {
  const greeting = useSyncExternalStore(
    noop,
    () => greetingFor(new Date().getHours()),
    () => "Welcome back",
  );
  const currency = useAppStore((s) => s.prefs.currency);
  const goal = { current: 0, target: 5_000_000 };

  const habits = [
    { name: "Review hands", value: 0, target: 3, unit: "" },
    { name: "Study", value: 0, target: 30, unit: "min" },
    { name: "Warm-up", value: 0, target: 1, unit: "" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={greeting}
        title="Today"
        action={
          <Link href="/progress" aria-label="Streak details" className="rounded-full p-1">
            <StreakFlame count={0} />
          </Link>
        }
      />

      <Badge variant="outline" size="sm">
        Phase 0 preview · data arrives in Phase 1
      </Badge>

      <InstallPrompt />

      <Card>
        <CardHeader
          eyebrow="Today's habits"
          action={<span className="num text-sm text-ink-muted">0 / 3</span>}
        />
        <ul className="grid grid-cols-3 gap-2">
          {habits.map((h) => (
            <li key={h.name}>
              <button
                type="button"
                className="flex w-full flex-col items-center gap-2 rounded-md py-2 hover:bg-white/[0.03]"
              >
                <ProgressRing
                  value={h.value / h.target}
                  label={`${h.name}: ${h.value} of ${h.target}`}
                >
                  {h.value >= h.target ? (
                    <Check className="size-5 text-success" aria-hidden />
                  ) : (
                    <span className="num text-sm font-semibold">
                      {h.value}/{h.target}
                    </span>
                  )}
                </ProgressRing>
                <span className="text-center text-[13px] leading-tight text-ink-soft">
                  {h.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card glow>
        <CardHeader
          eyebrow="Main goal"
          action={<Target className="size-5 text-lavender" strokeWidth={1.6} aria-hidden />}
        />
        <p className="mb-3 font-display text-xl font-semibold tracking-[-0.01em]">
          Make my first <span className="text-gradient">$50k from poker</span>
        </p>
        <div className="flex items-end justify-between gap-3">
          <Stat
            value={formatMoney({ minor: goal.current, currency: "USD" }, { trimZeroCents: true })}
            label={`of ${formatMoney({ minor: goal.target, currency: "USD" }, { trimZeroCents: true })} profit`}
          />
          <span className="num pb-1 text-sm font-semibold text-lavender">0%</span>
        </div>
        <ProgressBar
          className="mt-3"
          value={goal.current / goal.target}
          label="Progress toward main goal"
        />
        <p className="mt-2.5 text-xs text-ink-subtle">
          Projected date appears after your first sessions · display currency {currency}
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <Inbox className="mb-3 size-5 text-lavender" strokeWidth={1.6} aria-hidden />
          <p className="num font-display text-[28px] leading-none font-semibold">0</p>
          <p className="mt-1.5 text-sm text-ink-muted">hands waiting for review</p>
        </Card>
        <Card className="p-4">
          <BookOpen className="mb-3 size-5 text-lavender" strokeWidth={1.6} aria-hidden />
          <p className="num font-display text-[28px] leading-none font-semibold">
            0<span className="text-base text-ink-muted"> min</span>
          </p>
          <p className="mt-1.5 text-sm text-ink-muted">studied this week</p>
        </Card>
      </div>

      <Card>
        <CardHeader
          eyebrow="Rule of the day"
          action={<Quote className="size-5 text-lavender" strokeWidth={1.6} aria-hidden />}
        />
        <p className="font-display text-lg leading-snug text-ink-soft italic">
          Your own rules from hand reviews will resurface here — the lessons you wrote, when you
          need them.
        </p>
        <Button variant="link" size="sm" className="mt-3" asChild>
          <Link href="/hands">Review a hand →</Link>
        </Button>
      </Card>
    </div>
  );
}

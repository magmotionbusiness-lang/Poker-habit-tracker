"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  BookOpen,
  ChevronRight,
  Inbox,
  Play,
  Quote,
  Share2,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import { StreakFlame } from "@/components/brand/streak-flame";
import { GoalCard } from "@/components/goals/goal-card";
import { formatClock, formatDuration } from "@/components/sessions/timer";
import { InstallPrompt } from "@/components/shell/install-prompt";
import { PageHeader } from "@/components/shell/page-header";
import { AnnouncementSlot } from "@/components/uts/announcements";
import { ShareSheet } from "@/components/share/share-sheet";
import { DailyHandCard } from "@/components/today/daily-hand-card";
import { WeeklyFocus } from "@/components/today/weekly-focus";
import { NudgeCard } from "@/components/today/nudge-card";
import { TopInsightCard } from "@/components/insights/insight-card";
import { PlayingTonight } from "@/components/insights/playing-tonight";
import { HabitRingButton } from "@/components/today/habit-ring-button";
import { TodayHero } from "@/components/today/today-hero";
import { FireOnMount } from "@/components/fx/fire-on-mount";
import { celebrate } from "@/lib/store/celebrate";
import { play } from "@/lib/sfx/sfx";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { setHabitValue } from "@/lib/db/actions";
import { useHabitEngine } from "@/lib/db/derived";
import { useGoalViews } from "@/lib/db/goal-hooks";
import {
  useNow,
  useRunningSession,
  useSessions,
  useStackUpdates,
  useStudySessions,
  useHands,
  useRules,
} from "@/lib/db/hooks";
import { ruleOfTheDay } from "@/lib/hands/leaks";
import { addDays, localDate, startOfWeek } from "@/lib/dates/dates";
import { haptic } from "@/lib/haptics";
import { formatMoney } from "@/lib/money";
import { resultIn, sessionDurationMs } from "@/lib/stats/session-math";
import { STREAK_MILESTONES } from "@/lib/streaks/streaks";
import { useAppStore } from "@/lib/store/app-store";
import { useStudyTimer, useUi } from "@/lib/store/ui-store";

function greetingFor(hour: number) {
  if (hour < 5) return "Late session?";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
const noop = () => () => {};

export function TodayScreen() {
  const greeting = useSyncExternalStore(
    noop,
    () => greetingFor(new Date().getHours()),
    () => "Welcome back",
  );
  const engine = useHabitEngine();
  const currency = useAppStore((s) => s.prefs.currency);
  const goals = useGoalViews(currency);
  const open = useUi((s) => s.open);
  const dismissed = useAppStore((s) => s.dismissed);
  const dismiss = useAppStore((s) => s.dismiss);
  const [sharing, setSharing] = useState(false);

  if (!engine) {
    return (
      <div className="space-y-4 pt-5">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  const { streak, todayInput, today } = engine;
  const habits = todayInput.habits.filter((h) => h.habit.active);
  const main = goals?.find((g) => g.goal.is_main) ?? goals?.[0];
  const yesterday = addDays(today, -1);
  // Celebrate a milestone on the day it's reached (or the morning after), not days later.
  const milestone = [...STREAK_MILESTONES]
    .reverse()
    .find((m) => streak.current >= m && streak.current - m <= 1);
  const runStart = addDays(today, -(streak.current - (streak.todayDone ? 1 : 0)));
  const milestoneKey = milestone ? `milestone:${milestone}:${runStart}` : null;

  async function tap(day: (typeof habits)[number], el: HTMLElement | null) {
    const h = day.habit;
    if (h.unit === "minutes") return open("study");
    const next = h.unit === "boolean" ? (day.value >= 1 ? 0 : 1) : day.value + 1;
    await setHabitValue(h.id, today, next);
    const completesHabit = !day.complete && next >= day.target;
    if (!completesHabit) {
      if (next > day.value) {
        play("tick", { progress: next / day.target });
        haptic(6);
      }
      return;
    }
    const completesDay =
      day.applies && todayInput.required > 0 && todayInput.done + 1 === todayInput.required;
    // Burst from the ring you tapped (where your eyes are): big when it completes the day.
    if (completesDay) celebrate("day", el);
    else celebrate("small", el);
  }

  return (
    <div className="space-y-4">
      <PageHeader eyebrow={greeting} title="Today" />

      <div id="today-hero">
        <TodayHero
          done={todayInput.done}
          required={todayInput.required}
          streak={streak.current}
          freezes={streak.freezesAvailable}
          maxFreezes={engine.settings.maxFreezes}
        />
      </div>

      <RunningBanner />
      <PlayingTonight />
      <StudyTimerBanner />

      {streak.repair && (
        <Card className="border-gold/40 bg-gold/5">
          <p className="font-semibold text-ink">Your {streak.current}-day streak is at risk</p>
          <p className="mt-1 text-sm text-ink-muted">
            You missed yesterday. Double up today —{" "}
            {streak.repair.requiredDoubled === 1
              ? "one habit"
              : `${streak.repair.requiredDoubled} habits`}{" "}
            at 2× the target — and it&apos;s repaired. One repair per streak.
          </p>
        </Card>
      )}
      {streak.freezesUsedOn.at(-1) === yesterday && !dismissed[`freeze:${yesterday}`] && (
        <Card className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-lavender" aria-hidden />
          <div className="flex-1">
            <p className="font-semibold">A streak freeze saved your streak yesterday.</p>
            <p className="text-sm text-ink-muted">
              {streak.freezesAvailable} freeze{streak.freezesAvailable === 1 ? "" : "s"} left. Earn
              one every 7 days.
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => dismiss(`freeze:${yesterday}`)}>
            OK
          </Button>
        </Card>
      )}

      <InstallPrompt />

      <Card>
        {habits.length === 0 ? (
          <div className="py-2 text-center">
            <p className="text-sm text-ink-muted">
              Pick a few small daily habits — they&apos;re the engine.
            </p>
            <Button className="mt-3" size="sm" asChild>
              <Link href="/more/habits">Pick your habits</Link>
            </Button>
          </div>
        ) : (
          <ul className="stagger grid grid-cols-3 gap-x-2 gap-y-4">
            {habits.map((d, i) => (
              <li key={d.habit.id}>
                <HabitRingButton
                  index={i}
                  day={d}
                  onTap={(el) => tap(d, el)}
                  onMinus={() => setHabitValue(d.habit.id, today, d.value - 1)}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {main ? (
        <Link href="/progress" className="block">
          <GoalCard view={main} />
        </Link>
      ) : (
        <Card className="text-center">
          <p className="font-semibold">Set your main goal</p>
          <Button className="mt-3" size="sm" asChild>
            <Link href="/progress">Add goal</Link>
          </Button>
        </Card>
      )}

      <TopInsightCard today={today} />
      <ThisWeek today={today} tz={engine.tz} />
      <WeeklyFocus today={today} />
      <LastTakeaway today={today} />
      <DailyHandCard />
      <AnnouncementSlot />
      <NudgeCard today={today} tz={engine.tz} streak={streak.current} />

      {milestone && milestoneKey && !dismissed[milestoneKey] && (
        <Dialog
          open
          onOpenChange={() => dismiss(milestoneKey)}
          title={`${milestone}-day streak`}
          description="Consistency is the edge most players never build. Keep the system running."
        >
          <FireOnMount kind="milestone" />
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="grid size-28 place-items-center rounded-full bg-[radial-gradient(circle,rgba(124,92,255,0.45),transparent_70%)]">
              <StreakFlame count={milestone} size="lg" />
            </div>
            <Button
              block
              onClick={() => {
                haptic([10, 40, 10]);
                dismiss(milestoneKey);
              }}
            >
              <Sparkles aria-hidden /> Keep going
            </Button>
            <Button block variant="outline" onClick={() => setSharing(true)}>
              <Share2 aria-hidden /> Share it
            </Button>
          </div>
        </Dialog>
      )}
      {sharing && (
        <ShareSheet
          open
          onClose={() => setSharing(false)}
          subject={{ kind: "streak", days: streak.current, longest: streak.longest }}
        />
      )}
    </div>
  );
}

function RunningBanner() {
  const running = useRunningSession();
  const updates = useStackUpdates(running?.id ?? null) ?? [];
  const now = useNow(1000);
  if (!running) return null;
  const stack = updates.at(-1)?.stack_minor ?? running.buy_in_minor;
  const up = stack - running.buy_in_minor - running.rebuys_minor;
  return (
    <Link href="/session" className="block">
      <Card glow className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-white shadow-accent">
          <Play className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{running.paused_at ? "Session paused" : "Session running"}</p>
          <p className="num font-display text-2xl font-semibold">
            {formatClock(sessionDurationMs(running, now))}
          </p>
        </div>
        <span
          className={`num font-semibold ${up > 0 ? "text-success" : up < 0 ? "text-danger" : "text-ink-muted"}`}
        >
          {formatMoney(
            { minor: up, currency: running.currency },
            { signed: true, trimZeroCents: true },
          )}
        </span>
        <ChevronRight className="size-5 text-ink-subtle" aria-hidden />
      </Card>
    </Link>
  );
}

function StudyTimerBanner() {
  const startedAt = useStudyTimer((s) => s.startedAt);
  const open = useUi((s) => s.open);
  const now = useNow(1000);
  if (!startedAt) return null;
  return (
    <button type="button" onClick={() => open("study")} className="block w-full text-left">
      <Card className="flex items-center gap-3">
        <Timer className="size-5 text-lavender" aria-hidden />
        <span className="flex-1 font-semibold">Studying</span>
        <span className="num font-display text-xl font-semibold">
          {formatClock(now - Date.parse(startedAt))}
        </span>
      </Card>
    </button>
  );
}

function ThisWeek({ today, tz }: { today: string; tz: string }) {
  const sessions = useSessions();
  const study = useStudySessions();
  const currency = useAppStore((s) => s.prefs.currency);
  const week = useMemo(() => {
    if (!sessions || !study) return null;
    const from = startOfWeek(today);
    const inWeek = sessions.filter(
      (s) => s.status === "finished" && localDate(s.started_at, tz) >= from,
    );
    const ms = inWeek.reduce((a, s) => a + sessionDurationMs(s), 0);
    const net = inWeek.reduce((a, s) => a + (resultIn(s, currency, {}, true) ?? 0), 0);
    const mixed = inWeek.some((s) => s.currency !== currency);
    const minutes = study
      .filter((s) => localDate(s.started_at, tz) >= from)
      .reduce((a, s) => a + s.minutes, 0);
    return { count: inWeek.length, ms, net, mixed, minutes };
  }, [sessions, study, today, tz, currency]);
  if (!week) return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="p-4">
        <p className="eyebrow mb-3">This week</p>
        <p
          className={`num font-display text-[28px] leading-none font-semibold ${week.net > 0 ? "text-success" : week.net < 0 ? "text-danger" : ""}`}
        >
          {formatMoney(
            { minor: week.net, currency },
            { signed: true, compact: Math.abs(week.net) >= 1_000_000, trimZeroCents: true },
          )}
        </p>
        <p className="mt-1.5 text-sm text-ink-muted">
          {week.count} session{week.count === 1 ? "" : "s"} · {formatDuration(week.ms)}
          {week.mixed && " · other currencies excluded"}
        </p>
      </Card>
      <Card className="p-4">
        <BookOpen className="mb-3 size-5 text-lavender" strokeWidth={1.6} aria-hidden />
        <p className="num font-display text-[28px] leading-none font-semibold">
          {week.minutes}
          <span className="text-base text-ink-muted"> min</span>
        </p>
        <p className="mt-1.5 text-sm text-ink-muted">studied this week</p>
      </Card>
    </div>
  );
}

function LastTakeaway({ today }: { today: string }) {
  const sessions = useSessions();
  const rules = useRules();
  const hands = useHands();
  if (!sessions || !rules || !hands) return null;
  const rule = ruleOfTheDay(rules, today);
  const unreviewed = hands.filter((h) => h.review_status === "unreviewed").length;
  const last = sessions.find((s) => s.status === "finished" && s.takeaway);
  return (
    <>
      {unreviewed > 0 && (
        <Link href="/hands?list=unreviewed" className="block">
          <Card className="flex items-center gap-3">
            <Inbox className="size-5 shrink-0 text-lavender" strokeWidth={1.6} aria-hidden />
            <span className="flex-1">
              <span className="num font-display text-xl font-semibold">{unreviewed}</span>{" "}
              <span className="text-ink-soft">
                hand{unreviewed === 1 ? "" : "s"} waiting for review
              </span>
            </span>
            <ChevronRight className="size-5 text-ink-subtle" aria-hidden />
          </Card>
        </Link>
      )}
      {rule ? (
        <Card>
          <CardHeader
            eyebrow="Rule of the day"
            action={<Quote className="size-5 text-lavender" strokeWidth={1.6} aria-hidden />}
          />
          <p className="font-display text-lg leading-snug text-ink italic">“{rule.text}”</p>
          <p className="mt-2 text-xs text-ink-subtle">
            From your Leak Book{rule.times_seen > 1 ? ` · seen ${rule.times_seen}×` : ""} ·{" "}
            <Link href="/hands/leaks" className="text-lavender underline-offset-4 hover:underline">
              open
            </Link>
          </p>
        </Card>
      ) : last ? (
        <Card>
          <CardHeader
            eyebrow="Your last takeaway"
            action={<Quote className="size-5 text-lavender" strokeWidth={1.6} aria-hidden />}
          />
          <p className="font-display text-lg leading-snug text-ink-soft italic">
            “{last.takeaway}”
          </p>
          <p className="mt-2 text-xs text-ink-subtle">
            Review a hand and write a rule — it will resurface here.
          </p>
        </Card>
      ) : null}
    </>
  );
}

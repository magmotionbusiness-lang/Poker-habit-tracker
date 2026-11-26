"use client";

import { useGentle } from "@/lib/motion/motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, AtSign, KeyRound, Mail } from "lucide-react";
import { z } from "zod";
import { Wordmark } from "@/components/brand/stakers-mark";
import { Chips } from "@/components/forms/chips";
import { CurrencySelect } from "@/components/forms/currency-select";
import { MoneyInput } from "@/components/forms/money-input";
import { ReminderSetup } from "@/components/notifications/reminder-setup";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress";
import { toast } from "@/components/ui/toaster";
import { errorMessage } from "@/lib/errors";
import { habitPresets } from "@/content/habits";
import { onboarding as copy } from "@/content/onboarding";
import {
  addTransaction,
  createBankroll,
  createHabitsFromPresets,
  saveGoal,
} from "@/lib/db/actions";
import { db } from "@/lib/db/db";
import { saveSettings } from "@/lib/db/repo";
import { addDays, localDate, startOfWeek } from "@/lib/dates/dates";
import { deviceTimeZone } from "@/lib/dates/dates";
import { loadDemoData } from "@/lib/demo/load";
import { formatMoney, parseMoney } from "@/lib/money";
import { useAppStore } from "@/lib/store/app-store";
import type { GoalType, GoalUnit } from "@/lib/domain/types";

type GoalChoice = keyof typeof copy.goals;
const STEPS = [
  "formats",
  "stakes",
  "bankroll",
  "goal",
  "habits",
  "reminders",
  "uts",
  "email",
] as const;
type Step = (typeof STEPS)[number];

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

export function OnboardingFlow() {
  const router = useRouter();
  const reduce = useGentle();
  const prefs = useAppStore((s) => s.prefs);
  const setPrefs = useAppStore((s) => s.setPrefs);
  const [i, setI] = useState(0);
  const step: Step = STEPS[i]!;

  const [formats, setFormats] = useState<string[]>(["live_cash"]);
  const [games, setGames] = useState<string[]>(["NLHE"]);
  const [stakes, setStakes] = useState("");
  const [currency, setCurrency] = useState(prefs.currency);
  const [bankroll, setBankroll] = useState<number | null>(null);
  const [goal, setGoal] = useState<GoalChoice>("first50k");
  const [goalAmount, setGoalAmount] = useState<number | null>(5_000_000);
  const [goalText, setGoalText] = useState("");
  const [deadline, setDeadline] = useState("");
  const [habitKeys, setHabitKeys] = useState<string[]>(
    habitPresets.filter((h) => h.recommended).map((h) => h.key),
  );
  const [commitment, setCommitment] = useState<"any" | "all">("any");
  const [restDays, setRestDays] = useState<number[]>([]);
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  const s = copy.steps[step];
  const money = (major: string) => parseMoney(major, currency).minor;
  const fmt = (m: number) =>
    formatMoney({ minor: m, currency }, { compact: m >= 1_000_000, trimZeroCents: true }).replace(
      "K",
      "k",
    );

  function chooseGoal(g: GoalChoice) {
    setGoal(g);
    setGoalAmount(
      g === "first50k"
        ? money("50000")
        : g === "bankroll"
          ? money("10000")
          : g === "monthly"
            ? money("1000")
            : g === "study"
              ? 5
              : null,
    );
  }

  async function finish() {
    setBusy(true);
    try {
      const tz = deviceTimeZone();
      const today = localDate(Date.now(), tz);
      const nowIso = new Date().toISOString();
      setPrefs({ currency });

      // Bankroll (skip if one already exists, e.g. pulled from an existing account).
      if ((await db().bankrolls.count()) === 0) {
        const br = await createBankroll({ name: "Main bankroll", currency });
        if (bankroll && bankroll > 0) {
          await addTransaction({
            bankroll_id: br.id,
            type: "deposit",
            amount_minor: bankroll,
            currency,
            occurred_at: nowIso,
            note: "Starting bankroll",
          });
        }
      }

      await createHabitsFromPresets(habitKeys);

      const base = {
        manual_value: null,
        currency,
        starts_at: nowIso,
        deadline: deadline || null,
        is_main: true,
        status: "active" as const,
        achieved_at: null,
      };
      const amount = goalAmount ?? 0;
      const goals: Record<
        GoalChoice,
        {
          type: GoalType;
          title: string;
          target_value: number;
          start_value: number;
          unit: GoalUnit;
          currency: string | null;
          starts_at?: string;
          deadline?: string | null;
          manual_value?: number | null;
        }
      > = {
        first50k: {
          type: "profit",
          title: `Make my first ${fmt(amount)} from poker`,
          target_value: amount,
          start_value: 0,
          unit: "minor",
          currency,
        },
        bankroll: {
          type: "bankroll",
          title: `Reach a ${fmt(amount)} bankroll`,
          target_value: amount,
          start_value: bankroll ?? 0,
          unit: "minor",
          currency,
        },
        stake: {
          type: "stake",
          title: `Play ${goalText || "the next stake"}`,
          target_value: 1,
          start_value: 0,
          unit: "count",
          currency: null,
          manual_value: 0,
        },
        monthly: {
          type: "profit",
          title: `Profit ${fmt(amount)} this month`,
          target_value: amount,
          start_value: 0,
          unit: "minor",
          currency,
          starts_at: new Date(`${today.slice(0, 7)}-01T00:00:00`).toISOString(),
          deadline: addDays(addDays(`${today.slice(0, 7)}-01`, 40).slice(0, 7) + "-01", -1),
        },
        study: {
          type: "study",
          title: `Study ${amount}h this week`,
          target_value: amount * 60,
          start_value: 0,
          unit: "minutes",
          currency: null,
          starts_at: new Date(`${startOfWeek(today)}T00:00:00`).toISOString(),
          deadline: addDays(startOfWeek(today), 6),
        },
        custom: {
          type: "custom",
          title: goalText || "My goal",
          target_value: Math.max(1, amount),
          start_value: 0,
          unit: "count",
          currency: null,
          manual_value: 0,
        },
      };
      const g = goals[goal];
      await saveGoal({
        ...base,
        ...g,
        deadline: g.deadline ?? base.deadline,
        starts_at: g.starts_at ?? base.starts_at,
        manual_value: g.manual_value ?? null,
      });

      await saveSettings({
        timezone: tz,
        formats,
        games,
        stakes,
        commitment: { mode: commitment },
        restWeekdays: restDays,
        utsCode: code.trim() || null,
        emailOptIn:
          consent && z.email().safeParse(email.trim()).success
            ? {
                email: email.trim(),
                consent_text: copy.emailConsent,
                consented_at: nowIso,
                synced: false,
              }
            : null,
        onboardingDone: true,
      });
      router.replace("/today");
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(false);
    }
  }

  const next = () => (i === STEPS.length - 1 ? finish() : setI(i + 1));
  const canNext =
    (step !== "formats" || formats.length > 0) &&
    (step !== "habits" || habitKeys.length > 0) &&
    (step !== "email" || !consent || z.email().safeParse(email.trim()).success);

  return (
    <main className="hero-glow px-safe pt-safe pb-safe flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="flex items-center justify-between gap-4 pt-4">
          {i > 0 ? (
            <button
              type="button"
              onClick={() => setI(i - 1)}
              className="-ml-2 grid size-11 place-items-center rounded-full text-ink-soft"
              aria-label="Back"
            >
              <ArrowLeft className="size-5" />
            </button>
          ) : (
            <Wordmark />
          )}
          <ProgressBar
            value={(i + 1) / STEPS.length}
            label={`Step ${i + 1} of ${STEPS.length}`}
            className="max-w-40"
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.section
            key={step}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className="flex-1 py-8"
          >
            <p className="eyebrow mb-2">{s.eyebrow}</p>
            <h1 className="text-[32px] font-semibold">{s.title}</h1>
            <p className="mt-2 text-ink-muted">{s.sub}</p>

            <div className="mt-7 space-y-6">
              {step === "formats" && (
                <>
                  <Chips
                    ariaLabel="Formats"
                    multiple
                    options={copy.formats}
                    value={formats}
                    onChange={(v) => setFormats(v as string[])}
                  />
                  <div>
                    <p className="mb-2 text-sm font-medium text-ink-soft">Games</p>
                    <Chips
                      ariaLabel="Games"
                      multiple
                      options={copy.games}
                      value={games}
                      onChange={(v) => setGames(v as string[])}
                    />
                  </div>
                  <button
                    type="button"
                    className="text-sm font-semibold text-lavender underline-offset-4 hover:underline"
                    onClick={async () => {
                      setBusy(true);
                      await loadDemoData();
                      router.replace("/today");
                    }}
                  >
                    {copy.demo} →
                  </button>
                </>
              )}

              {step === "stakes" && (
                <>
                  <div>
                    <Label htmlFor="stakes">Usual stakes</Label>
                    <Input
                      id="stakes"
                      placeholder="e.g. 1/2 live, NL50 online"
                      value={stakes}
                      onChange={(e) => setStakes(e.target.value)}
                    />
                    <div className="mt-3">
                      <Chips
                        ariaLabel="Common stakes"
                        size="sm"
                        options={copy.stakeSuggestions.map((x) => ({ value: x, label: x }))}
                        value={stakes}
                        onChange={(v) => setStakes(v as string)}
                      />
                    </div>
                  </div>
                  <CurrencySelect
                    id="currency"
                    value={currency}
                    onChange={setCurrency}
                    label="Main currency"
                  />
                </>
              )}

              {step === "bankroll" && (
                <MoneyInput
                  size="lg"
                  currency={currency}
                  value={bankroll}
                  onChange={setBankroll}
                  label="Starting bankroll"
                  autoFocus
                />
              )}

              {step === "goal" && (
                <>
                  <div className="space-y-2">
                    {(Object.keys(copy.goals) as GoalChoice[]).map((g) => (
                      <button
                        key={g}
                        type="button"
                        aria-pressed={goal === g}
                        onClick={() => chooseGoal(g)}
                        className={`w-full rounded-lg border p-4 text-left transition-colors ${goal === g ? "border-primary-strong bg-pill" : "border-line bg-surface"}`}
                      >
                        <span className="block font-semibold text-ink">
                          {copy.goals[g].label.replace("{amount}", fmt(money("50000")))}
                        </span>
                        <span className="block text-sm text-ink-muted">
                          {copy.goals[g].hint.replace("{amount}", fmt(money("10000")))}
                        </span>
                      </button>
                    ))}
                  </div>
                  {(goal === "first50k" || goal === "bankroll" || goal === "monthly") && (
                    <MoneyInput
                      currency={currency}
                      value={goalAmount}
                      onChange={setGoalAmount}
                      label="Target"
                    />
                  )}
                  {goal === "study" && (
                    <div>
                      <Label htmlFor="hours">Hours per week</Label>
                      <Input
                        id="hours"
                        inputMode="numeric"
                        value={goalAmount ?? ""}
                        onChange={(e) =>
                          setGoalAmount(Number(e.target.value.replace(/\D/g, "")) || null)
                        }
                      />
                    </div>
                  )}
                  {(goal === "stake" || goal === "custom") && (
                    <div>
                      <Label htmlFor="goal-text">
                        {goal === "stake" ? "Target stake" : "Your goal"}
                      </Label>
                      <Input
                        id="goal-text"
                        placeholder={goal === "stake" ? "2/5" : "Play 100 hours this quarter"}
                        value={goalText}
                        onChange={(e) => setGoalText(e.target.value)}
                      />
                    </div>
                  )}
                  {goal !== "monthly" && goal !== "study" && (
                    <div>
                      <Label htmlFor="deadline">Deadline (optional)</Label>
                      <Input
                        id="deadline"
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                      />
                    </div>
                  )}
                </>
              )}

              {step === "habits" && (
                <>
                  <ul className="space-y-2">
                    {habitPresets.map((h) => {
                      const on = habitKeys.includes(h.key);
                      return (
                        <li key={h.key}>
                          <button
                            type="button"
                            aria-pressed={on}
                            onClick={() =>
                              setHabitKeys(
                                on ? habitKeys.filter((k) => k !== h.key) : [...habitKeys, h.key],
                              )
                            }
                            className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3.5 text-left transition-colors ${on ? "border-primary-strong bg-pill" : "border-line bg-surface"}`}
                          >
                            <span>
                              <span className="block font-semibold text-ink">
                                {h.name}
                                {h.unit !== "boolean" && (
                                  <span className="num font-normal text-ink-muted">
                                    {" "}
                                    · {h.target}
                                    {h.unit === "minutes" ? " min" : ""}/day
                                  </span>
                                )}
                              </span>
                              <span className="block text-sm text-ink-muted">{h.hint}</span>
                            </span>
                            <span
                              className={`grid size-6 shrink-0 place-items-center rounded-full border ${on ? "border-transparent bg-primary-strong text-white" : "border-line-strong"}`}
                              aria-hidden
                            >
                              {on && "✓"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <div>
                    <p className="mb-2 text-sm font-medium text-ink-soft">A day counts when I do</p>
                    <Chips
                      ariaLabel="Daily commitment"
                      options={[
                        { value: "any", label: copy.commitment.any.label },
                        { value: "all", label: copy.commitment.all.label },
                      ]}
                      value={commitment}
                      onChange={(v) => setCommitment(v as "any" | "all")}
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium text-ink-soft">Rest days</p>
                    <Chips
                      ariaLabel="Rest days"
                      multiple
                      size="sm"
                      options={WEEKDAYS}
                      value={restDays}
                      onChange={(v) => setRestDays(v as number[])}
                    />
                    <p className="mt-2 text-xs text-ink-subtle">{copy.restDays}</p>
                  </div>
                </>
              )}

              {step === "reminders" && <ReminderSetup compact />}

              {step === "uts" && (
                <div>
                  <Label htmlFor="code">Access code</Label>
                  <Input
                    id="code"
                    icon={<KeyRound />}
                    autoCapitalize="characters"
                    placeholder="COHORT7-XXXX"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                  />
                  <p className="mt-2 text-xs text-ink-subtle">
                    Redeemed when you&apos;re signed in. No code? Skip this.
                  </p>
                </div>
              )}

              {step === "email" && (
                <>
                  <Input
                    icon={<Mail />}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    aria-label="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <label className="flex items-start gap-3 rounded-lg border border-line bg-surface p-4">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-1 size-5 shrink-0 accent-[var(--primary-strong)]"
                    />
                    <span className="text-sm text-ink-soft">{copy.emailConsent}</span>
                  </label>
                  <p className="flex items-center gap-1.5 text-xs text-ink-subtle">
                    <AtSign className="size-3.5" aria-hidden /> {copy.emailPrivacyNote}
                  </p>
                </>
              )}
            </div>
          </motion.section>
        </AnimatePresence>

        <div className="space-y-2 pb-6">
          <Button size="lg" block onClick={next} disabled={busy || !canNext}>
            {i === STEPS.length - 1 ? copy.finish : "Continue"}
          </Button>
          {["bankroll", "reminders", "uts", "email"].includes(step) && (
            <Button variant="ghost" block onClick={next} disabled={busy}>
              {copy.skip}
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}

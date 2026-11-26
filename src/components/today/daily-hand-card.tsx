"use client";

import { useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Flame, X } from "lucide-react";
import { PlayingCard } from "@/components/poker/playing-card";
import { Card, CardHeader } from "@/components/ui/card";
import { dailyHands } from "@/content/daily-hands";
import { useSettings, useToday } from "@/lib/db/hooks";
import { saveSettings } from "@/lib/db/repo";
import { dailyHandStreak, spotIndexFor, withDailyAnswer } from "@/lib/growth/daily-hand";
import { celebrate } from "@/lib/store/celebrate";
import { play } from "@/lib/sfx/sfx";
import { cn } from "@/lib/utils";

const pairs = (s: string) => s.match(/.{2}/g) ?? [];

/** One multiple-choice spot per day, with its own small streak. */
export function DailyHandCard() {
  const reduce = useReducedMotion();
  const settings = useSettings();
  const { today } = useToday();
  const ref = useRef<HTMLDivElement>(null);
  if (!settings) return null;
  const spot = dailyHands[spotIndexFor(today, dailyHands.length)];
  if (!spot) return null;
  const answer = settings.dailyHand[today];
  const picked = answer?.id === spot.id ? answer : undefined;
  const streak = dailyHandStreak(settings.dailyHand, today);

  async function choose(i: number) {
    if (picked || !settings || !spot) return;
    const correct = i === spot.answer;
    await saveSettings({
      dailyHand: withDailyAnswer(settings.dailyHand, today, { id: spot.id, choice: i, correct }),
    });
    if (correct) celebrate("small", ref.current);
    else play("fold");
  }

  return (
    <Card ref={ref}>
      <CardHeader
        eyebrow="Daily Hand"
        action={
          streak > 0 ? (
            <span
              className="num flex items-center gap-1 text-sm font-semibold text-gold"
              aria-label={`${streak}-day Daily Hand streak`}
            >
              <Flame className="size-4" aria-hidden /> {streak}
            </span>
          ) : null
        }
      />
      <div className="flex items-center gap-3">
        <div className="flex gap-1" aria-label={`Your cards: ${spot.cards}`}>
          {pairs(spot.cards).map((c) => (
            <PlayingCard key={c} card={c} size="sm" />
          ))}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-ink-muted">
            {spot.game} · <span className="font-semibold text-ink-soft">{spot.position}</span>
          </p>
          {spot.board && (
            <div className="mt-1 flex gap-0.5" aria-label={`Board: ${spot.board}`}>
              {pairs(spot.board).map((c) => (
                <PlayingCard key={c} card={c} size="xs" />
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="mt-3 font-medium">{spot.situation}</p>
      <div className="mt-3 grid gap-2" role="group" aria-label="Your play">
        {spot.options.map((o, i) => {
          const isAnswer = i === spot.answer;
          const isPick = picked?.choice === i;
          return (
            <motion.button
              key={o}
              type="button"
              data-silent
              disabled={Boolean(picked)}
              whileTap={reduce || picked ? undefined : { scale: 0.97 }}
              onClick={() => choose(i)}
              className={cn(
                "flex h-12 items-center justify-between rounded-md border px-4 text-left text-sm font-semibold transition-colors",
                !picked && "border-line bg-field hover:border-line-accent",
                picked && isAnswer && "border-success/60 bg-success/15 text-success",
                picked && isPick && !isAnswer && "border-danger/60 bg-danger/10 text-danger",
                picked && !isPick && !isAnswer && "border-line bg-transparent text-ink-subtle",
              )}
            >
              {o}
              {picked && isAnswer && <Check className="size-4" aria-label="Best play" />}
              {picked && isPick && !isAnswer && <X className="size-4" aria-label="Your pick" />}
            </motion.button>
          );
        })}
      </div>
      <AnimatePresence>
        {picked && (
          <motion.div
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="overflow-hidden"
          >
            <p className="mt-3 text-sm text-ink-soft">
              <span className={cn("font-semibold", picked.correct ? "text-success" : "text-ink")}>
                {picked.correct ? "Nice. " : "Good spot to study. "}
              </span>
              {spot.explanation}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      {!spot.approved && (
        <p className="mt-3 text-[11px] text-ink-subtle">Sample spot · pending review by Nelson</p>
      )}
    </Card>
  );
}

"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Brain,
  CalendarDays,
  Clock,
  Coins,
  Crosshair,
  Flame,
  LineChart,
  MapPin,
  Smile,
  Sparkles,
  Sun,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { CONFIDENCE_LABEL, type Insight, type InsightKind } from "@/lib/insights/engine";
import { useInsights } from "@/lib/insights/use-insights";
import { cn } from "@/lib/utils";

const ICON: Record<InsightKind, LucideIcon> = {
  aha: Sparkles,
  stake: Coins,
  weekday: CalendarDays,
  time: Sun,
  length: Clock,
  venue: MapPin,
  mood: Smile,
  rating: Brain,
  form: Flame,
  concentration: AlertTriangle,
  anomaly: LineChart,
  position: Crosshair,
  tournament: Trophy,
};

function ConfidenceChip({ c }: { c: Insight["confidence"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        c === "high"
          ? "bg-success/15 text-success"
          : c === "medium"
            ? "bg-pill text-lavender"
            : "bg-field text-ink-muted",
      )}
      title="Based on how many sessions back this up"
    >
      <span className="flex gap-0.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "size-1 rounded-full",
              i <= ["low", "medium", "high"].indexOf(c) ? "bg-current" : "bg-current/25",
            )}
          />
        ))}
      </span>
      {CONFIDENCE_LABEL[c]}
    </span>
  );
}

export function InsightRow({ i, index = 0 }: { i: Insight; index?: number }) {
  const Icon = ICON[i.kind];
  return (
    <li className="pop-in flex gap-3" style={{ animationDelay: `${index * 80}ms` }}>
      <span
        className={cn(
          "mt-0.5 grid size-9 shrink-0 place-items-center rounded-full",
          i.tone === "warn"
            ? "bg-gold/15 text-gold"
            : i.tone === "good"
              ? "bg-success/15 text-success"
              : "bg-pill text-lavender",
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="leading-snug font-semibold">{i.title}</p>
        <p className="mt-0.5 text-sm text-ink-muted">{i.body}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <ConfidenceChip c={i.confidence} />
          {i.action && <span className="text-xs font-semibold text-lavender">→ {i.action}</span>}
        </div>
      </div>
    </li>
  );
}

/**
 * Today: "Here's what I noticed" — the one thing that matters most right now.
 * Rotates daily through the top 3 so the card stays fresh.
 */
export function TopInsightCard({ today }: { today: string }) {
  const list = useInsights();
  if (!list) return null;
  if (!list.length)
    return (
      <Card className="flex items-center gap-3">
        <Sparkles className="anim-pulse size-5 shrink-0 text-lavender" aria-hidden />
        <p className="text-sm text-ink-muted">
          Log a few sessions and I&apos;ll start telling you what I notice about your game.
        </p>
      </Card>
    );
  const top = list.slice(0, 3);
  const dayN = Math.floor(Date.parse(`${today}T00:00:00Z`) / 86_400_000);
  const i = top[dayN % top.length]!;
  return (
    <Card glow>
      <CardHeader
        eyebrow="Here's what I noticed"
        action={
          <Link href="/progress#insights" className="text-xs font-semibold text-lavender">
            All {list.length} →
          </Link>
        }
      />
      <ul>
        <InsightRow i={i} />
      </ul>
    </Card>
  );
}

/** Progress: every insight, ranked, with confidence. */
export function InsightsList() {
  const list = useInsights();
  if (!list) return null;
  return (
    <Card id="insights" className="scroll-mt-20">
      <CardHeader eyebrow="Here's what I noticed" action={<Badge size="sm">{list.length}</Badge>} />
      {list.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Patterns about your game show up after a few sessions.
        </p>
      ) : (
        <ul className="space-y-4">
          {list.slice(0, 8).map((i, n) => (
            <InsightRow key={i.id} i={i} index={n} />
          ))}
        </ul>
      )}
      <p className="mt-4 text-[11px] text-ink-subtle">
        Associations in your own data, not causes. Confidence reflects how many sessions back each
        one up.
      </p>
    </Card>
  );
}

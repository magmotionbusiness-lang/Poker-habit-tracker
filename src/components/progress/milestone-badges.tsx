import { Crown, Flame, Gem, Lock, Medal, Trophy, type LucideIcon } from "lucide-react";
import { STREAK_MILESTONES } from "@/lib/streaks/streaks";
import { cn } from "@/lib/utils";

const ICON: Record<number, LucideIcon> = {
  3: Flame,
  7: Flame,
  14: Flame,
  30: Medal,
  50: Medal,
  100: Trophy,
  200: Crown,
  365: Gem,
};

/** Streak milestones as collectable badges: unlocked by your longest streak ever. */
export function MilestoneBadges({ longest }: { longest: number }) {
  return (
    <ul className="grid grid-cols-4 gap-3" aria-label="Streak milestones">
      {STREAK_MILESTONES.map((m, i) => {
        const on = longest >= m;
        const Icon = on ? ICON[m]! : Lock;
        return (
          <li
            key={m}
            className="pop-in flex flex-col items-center gap-1.5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span
              className={cn(
                "relative grid size-14 place-items-center rounded-2xl border",
                on
                  ? m >= 100
                    ? "border-gold/50 bg-[radial-gradient(circle_at_30%_25%,rgba(251,191,36,0.35),rgba(30,25,65,0.9))] text-gold shadow-[0_0_22px_rgba(251,191,36,0.35)]"
                    : "border-line-accent bg-[radial-gradient(circle_at_30%_25%,rgba(168,146,255,0.45),rgba(30,25,65,0.9))] text-lavender-pale shadow-[0_0_22px_rgba(124,92,255,0.45)]"
                  : "border-line bg-field text-ink-subtle",
              )}
              aria-label={on ? `${m}-day streak unlocked` : `${m}-day streak locked`}
            >
              <Icon className="size-6" strokeWidth={1.75} aria-hidden />
            </span>
            <span className={cn("num text-xs font-semibold", on ? "text-ink" : "text-ink-subtle")}>
              {m}d
            </span>
          </li>
        );
      })}
    </ul>
  );
}

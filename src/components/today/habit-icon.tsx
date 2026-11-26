import {
  BedDouble,
  BookOpen,
  ClipboardCheck,
  Dumbbell,
  GlassWater,
  Leaf,
  Moon,
  ScanSearch,
  Sparkles,
  Sunrise,
  type LucideIcon,
} from "lucide-react";
import { presetByKey } from "@/content/habits";

const ICONS: Record<string, LucideIcon> = {
  BedDouble,
  BookOpen,
  ClipboardCheck,
  Dumbbell,
  GlassWater,
  Leaf,
  Moon,
  ScanSearch,
  Sunrise,
};

/** The icon for a habit (presets have their own; custom habits get a sparkle). */
export function HabitIcon({
  habitKey,
  className,
}: {
  habitKey: string | null;
  className?: string;
}) {
  const Icon = ICONS[presetByKey(habitKey)?.icon ?? ""] ?? Sparkles;
  return <Icon className={className} aria-hidden />;
}

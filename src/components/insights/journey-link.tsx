import Link from "next/link";
import { BookOpenText, ChevronRight } from "lucide-react";

/** Entry to the player's story: journey, monthly report, year in poker. */
export function JourneyLink() {
  return (
    <Link
      href="/progress/journey"
      className="press group flex items-center gap-3 rounded-lg border border-line-accent bg-[radial-gradient(ellipse_at_0%_50%,rgba(124,92,255,0.22),transparent_70%),var(--surface)] px-4 py-3.5"
    >
      <span className="grid size-10 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-white shadow-accent">
        <BookOpenText className="size-5" aria-hidden />
      </span>
      <span className="flex-1">
        <span className="block font-semibold">Your poker journey</span>
        <span className="block text-sm text-ink-muted">
          Your story, monthly report, year in poker
        </span>
      </span>
      <ChevronRight
        className="size-5 text-ink-subtle transition-transform group-hover:translate-x-1"
        aria-hidden
      />
    </Link>
  );
}

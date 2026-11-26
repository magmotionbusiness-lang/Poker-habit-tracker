import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-[linear-gradient(90deg,var(--surface-2),var(--field),var(--surface-2))]",
        className,
      )}
    />
  );
}

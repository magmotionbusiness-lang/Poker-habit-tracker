import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, glow, ...props }: ComponentProps<"div"> & { glow?: boolean }) {
  return (
    <div
      className={cn(
        "relative rounded-lg border border-line bg-surface p-4 shadow-card",
        glow &&
          "border-line-accent before:pointer-events-none before:absolute before:-inset-px before:-z-10 before:rounded-[inherit] before:bg-[radial-gradient(ellipse_at_top_left,rgba(124,92,255,0.35),transparent_60%)] before:blur-xl",
        className,
      )}
      {...props}
    />
  );
}

/** Card title row: eyebrow label on the left, optional action on the right. */
export function CardHeader({
  eyebrow,
  action,
  className,
  children,
}: {
  eyebrow?: ReactNode;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        {children}
      </div>
      {action}
    </div>
  );
}

/** Big number + supporting line. Numbers are tabular and set in the display face. */
export function Stat({
  value,
  label,
  tone = "default",
  size = "md",
  className,
}: {
  value: ReactNode;
  label?: ReactNode;
  tone?: "default" | "profit" | "loss";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div className={className}>
      <p
        className={cn(
          "num font-display leading-none font-semibold tracking-[-0.02em]",
          size === "sm" && "text-2xl",
          size === "md" && "text-[34px]",
          size === "lg" && "text-5xl",
          tone === "profit" && "text-success",
          tone === "loss" && "text-danger",
        )}
      >
        {value}
      </p>
      {label && <p className="mt-1.5 text-sm text-ink-muted">{label}</p>}
    </div>
  );
}

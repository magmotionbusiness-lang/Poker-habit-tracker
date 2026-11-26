import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        violet: "bg-pill text-lavender-pale",
        outline: "border border-line-strong text-ink-soft",
        profit: "bg-success/12 text-success",
        loss: "bg-danger/12 text-danger",
        gold: "bg-gold/12 text-gold",
      },
      size: {
        sm: "h-6 px-2.5 text-[11px] tracking-[0.08em] uppercase",
        md: "h-7 px-3 text-xs tracking-[0.1em] uppercase",
      },
    },
    defaultVariants: { variant: "violet", size: "md" },
  },
);

/** Status pill, e.g. "● COHORT 7 WAITLIST OPEN". */
export function Badge({
  className,
  variant,
  size,
  dot,
  pulse,
  children,
  ...props
}: ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { dot?: boolean; pulse?: boolean }) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span className="relative flex size-1.5" aria-hidden>
          {pulse && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
          )}
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}

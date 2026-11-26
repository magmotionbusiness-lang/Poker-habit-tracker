import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-md border border-line bg-field text-[16px] text-ink placeholder:text-ink-subtle transition-colors outline-none focus:border-primary-strong focus:ring-2 focus:ring-primary/25 disabled:opacity-50 aria-invalid:border-danger";

/** Text input with an optional leading icon, as in the site's waitlist form. 16px avoids iOS zoom. */
export function Input({
  className,
  icon,
  ...props
}: ComponentProps<"input"> & { icon?: ReactNode }) {
  if (!icon) return <input className={cn(fieldBase, "h-12 px-4", className)} {...props} />;
  return (
    <span className="relative block">
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-subtle [&_svg]:size-[17px] [&_svg]:stroke-[1.8]">
        {icon}
      </span>
      <input className={cn(fieldBase, "h-12 pr-4 pl-11", className)} {...props} />
    </span>
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(fieldBase, "min-h-24 px-4 py-3 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label className={cn("mb-1.5 block text-sm font-medium text-ink-soft", className)} {...props} />
  );
}

import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center gap-2 font-semibold tracking-[0.01em] whitespace-nowrap select-none",
    "transition-[transform,box-shadow,background-color,border-color,opacity] duration-150 ease-out",
    "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:stroke-[1.75]",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-[image:var(--gradient-primary)] text-white shadow-accent hover:shadow-[0_12px_42px_rgba(124,92,255,0.45)]",
        secondary:
          "border border-line bg-surface-2 text-ink hover:border-line-strong hover:bg-field",
        outline: "border border-line-accent bg-transparent text-lavender-pale hover:bg-pill",
        ghost: "bg-transparent text-ink-soft hover:bg-white/[0.04] hover:text-ink",
        danger: "border border-danger/40 bg-danger/10 text-danger hover:bg-danger/15",
        link: "h-auto bg-transparent p-0 text-lavender underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 rounded-full px-3.5 text-[13px]",
        md: "h-11 rounded-full px-5 text-[15px]",
        lg: "h-[52px] rounded-full px-6 text-base",
        icon: "size-11 rounded-full",
        "icon-sm": "size-9 rounded-full",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, block, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size, block }), className)} {...props} />;
}

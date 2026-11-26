import type { ElementType } from "react";
import { cn } from "@/lib/utils";

/** Two-tone headline like upthestakes.net: white lead, key phrase in the lavender→violet gradient. */
export function Headline({
  lead,
  accent,
  as: Tag = "h1",
  size = "lg",
  className,
}: {
  lead?: string;
  accent?: string;
  as?: ElementType;
  size?: "md" | "lg" | "xl";
  className?: string;
}) {
  return (
    <Tag
      className={cn(
        "font-display font-semibold text-ink",
        size === "md" && "text-[28px] leading-[1.1] tracking-[-0.02em]",
        size === "lg" && "text-[38px] leading-[1.05] tracking-[-0.025em]",
        size === "xl" && "text-[48px] leading-[1.02] tracking-[-0.03em] sm:text-[64px]",
        className,
      )}
    >
      {lead}
      {lead && accent ? " " : null}
      {accent && <span className="text-gradient">{accent}</span>}
    </Tag>
  );
}

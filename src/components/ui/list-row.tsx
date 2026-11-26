import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Settings-style row: icon, label, optional detail, chevron. ≥ 52px tall touch target. */
export function ListRow({
  href,
  onClick,
  icon,
  label,
  detail,
  trailing,
  className,
}: {
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  label: ReactNode;
  detail?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  const inner = (
    <>
      {icon && (
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-pill text-lavender [&_svg]:size-[18px] [&_svg]:stroke-[1.75]">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-ink">{label}</span>
        {detail && <span className="block truncate text-sm text-ink-muted">{detail}</span>}
      </span>
      {trailing ??
        ((href || onClick) && <ChevronRight className="size-5 text-ink-subtle" aria-hidden />)}
    </>
  );
  const cls = cn(
    "flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.03] active:bg-white/[0.05]",
    className,
  );
  if (href) {
    const external = href.startsWith("http");
    return (
      <Link
        href={href}
        className={cls}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {inner}
      </Link>
    );
  }
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cls}>
        {inner}
      </button>
    );
  return <div className={cls}>{inner}</div>;
}

export function ListGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      {title && <h2 className="eyebrow px-1 !font-sans">{title}</h2>}
      <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {children}
      </div>
    </section>
  );
}

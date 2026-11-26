import type { ReactNode } from "react";

/** Empty states teach: say why this matters and what to do first. */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line-accent bg-[radial-gradient(ellipse_at_top,rgba(124,92,255,0.12),transparent_70%)] px-6 py-10 text-center">
      {icon && (
        <div className="mb-4 grid size-14 place-items-center rounded-full bg-pill text-lavender shadow-[0_0_32px_rgba(124,92,255,0.35)] [&_svg]:size-6 [&_svg]:stroke-[1.5]">
          {icon}
        </div>
      )}
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-sm text-ink-muted">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

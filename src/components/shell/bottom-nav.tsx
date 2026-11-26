"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

/** Bottom tab bar: blurred translucent background, ≥ 44px targets, safe-area aware. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-elevated/80 backdrop-blur-xl backdrop-saturate-150"
    >
      <ul className="mx-auto flex h-[var(--tabbar-height)] max-w-lg items-stretch px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold tracking-[0.02em] transition-colors",
                  active ? "text-ink" : "text-ink-subtle hover:text-ink-soft",
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-12 place-items-center rounded-full transition-colors",
                    active && "bg-pill text-lavender shadow-[0_0_18px_rgba(124,92,255,0.35)]",
                  )}
                >
                  <Icon className="size-[21px]" strokeWidth={active ? 2 : 1.6} aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

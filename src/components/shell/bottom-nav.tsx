"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useGentle } from "@/lib/motion/motion";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

/**
 * Bottom tab bar: blurred, safe-area aware, ≥ 44px targets. Home is the raised centre
 * button (it glows and breathes when you're on it); the glowing pill glides between the
 * other tabs.
 */
export function BottomNav() {
  const pathname = usePathname();
  const gentle = useGentle();
  const spring = gentle
    ? { duration: 0.3 }
    : { type: "spring" as const, stiffness: 420, damping: 32 };
  return (
    <nav
      aria-label="Main"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-elevated/85 backdrop-blur-xl backdrop-saturate-150"
    >
      <ul className="mx-auto flex h-[var(--tabbar-height)] max-w-lg items-stretch px-2">
        {navItems.map(({ href, label, icon: Icon, center }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          if (center)
            return (
              <li key={href} className="relative flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  aria-label={label}
                  className="absolute inset-x-0 -top-5 flex flex-col items-center gap-1"
                >
                  <motion.span
                    className={cn(
                      "relative grid size-[58px] place-items-center rounded-full border-4 border-elevated bg-[image:var(--gradient-primary)] text-white transition-shadow duration-500",
                      active
                        ? "shadow-[0_0_0_3px_rgba(124,92,255,0.35),0_10px_34px_rgba(124,92,255,0.75)]"
                        : "opacity-90 shadow-[0_8px_22px_rgba(124,92,255,0.35)]",
                    )}
                    animate={active && !gentle ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    whileTap={gentle ? undefined : { scale: 0.9 }}
                  >
                    {active && (
                      <motion.span
                        aria-hidden
                        className="absolute -inset-1.5 rounded-full border border-primary/60"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: [0, 0.9, 0], scale: [0.85, 1.25, 1.4] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
                      />
                    )}
                    <Icon className="size-6" strokeWidth={2.2} aria-hidden />
                  </motion.span>
                  <span
                    className={cn(
                      "text-[11px] font-semibold tracking-[0.02em] transition-colors duration-300",
                      active ? "text-ink" : "text-ink-subtle",
                    )}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            );
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold tracking-[0.02em] transition-colors duration-300",
                  active ? "text-ink" : "text-ink-subtle hover:text-ink-soft",
                )}
              >
                <span className="relative grid h-7 w-12 place-items-center">
                  {active && (
                    <motion.span
                      layoutId="tab-pill"
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-pill shadow-[0_0_18px_rgba(124,92,255,0.45)]"
                      transition={spring}
                    />
                  )}
                  <motion.span
                    key={active ? "on" : "off"}
                    className={cn("relative", active && "text-lavender")}
                    initial={active && !gentle ? { scale: 0.6, rotate: -12 } : false}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 14 }}
                  >
                    <Icon className="size-[21px]" strokeWidth={active ? 2 : 1.6} aria-hidden />
                  </motion.span>
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

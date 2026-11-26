"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useGentle } from "@/lib/motion/motion";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

/**
 * Bottom tab bar: blurred translucent background, ≥ 44px targets, safe-area aware.
 * The glowing pill glides between tabs and the active icon pops.
 */
export function BottomNav() {
  const pathname = usePathname();
  const gentle = useGentle();
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
                      transition={
                        gentle ? { duration: 0.3 } : { type: "spring", stiffness: 420, damping: 32 }
                      }
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

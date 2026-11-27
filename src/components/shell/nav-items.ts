import { Flame, House, Spade, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { copy } from "@/content/copy";

export type NavItem = { href: string; label: string; icon: LucideIcon; center?: boolean };

/** Home (the analytics dashboard) sits in the middle. Settings live behind the gear on Home. */
export const navItems: readonly NavItem[] = [
  { href: "/today", label: copy.tabs.today, icon: Flame },
  { href: "/hands", label: copy.tabs.hands, icon: Spade },
  { href: "/home", label: copy.tabs.home, icon: House, center: true },
  { href: "/bankroll", label: copy.tabs.bankroll, icon: Wallet },
  { href: "/progress", label: copy.tabs.progress, icon: TrendingUp },
];

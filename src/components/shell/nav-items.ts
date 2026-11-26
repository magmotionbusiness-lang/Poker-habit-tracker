import { Ellipsis, Flame, Spade, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { copy } from "@/content/copy";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const navItems: readonly NavItem[] = [
  { href: "/today", label: copy.tabs.today, icon: Flame },
  { href: "/bankroll", label: copy.tabs.bankroll, icon: Wallet },
  { href: "/hands", label: copy.tabs.hands, icon: Spade },
  { href: "/progress", label: copy.tabs.progress, icon: TrendingUp },
  { href: "/more", label: copy.tabs.more, icon: Ellipsis },
];

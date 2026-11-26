import type { Metadata } from "next";
import { HabitsScreen } from "./habits-screen";

export const metadata: Metadata = { title: "Habits" };

export default function HabitsPage() {
  return <HabitsScreen />;
}

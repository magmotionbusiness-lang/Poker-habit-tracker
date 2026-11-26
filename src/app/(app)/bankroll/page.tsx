import type { Metadata } from "next";
import { BankrollScreen } from "./bankroll-screen";

export const metadata: Metadata = { title: "Bankroll" };

export default function BankrollPage() {
  return <BankrollScreen />;
}

"use client";

import { ExpressSheet } from "@/components/hands/express-sheet";
import { StartSessionSheet } from "@/components/sessions/start-session-sheet";
import { StudySheet } from "@/components/sessions/study-sheet";
import { BankrollSheet, TransactionSheet } from "@/components/sessions/transaction-sheet";

/** Quick-add flows, mounted once so any screen can open them. */
export function GlobalSheets() {
  return (
    <>
      <StartSessionSheet />
      <StudySheet />
      <TransactionSheet />
      <BankrollSheet />
      <ExpressSheet />
    </>
  );
}

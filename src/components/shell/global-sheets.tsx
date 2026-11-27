"use client";

import { useRouter } from "next/navigation";
import { ExpressSheet } from "@/components/hands/express-sheet";
import { SessionReportSheet } from "@/components/sessions/session-report";
import { StartSessionSheet } from "@/components/sessions/start-session-sheet";
import { StudySheet } from "@/components/sessions/study-sheet";
import { BankrollSheet, TransactionSheet } from "@/components/sessions/transaction-sheet";
import { useSessionReport } from "@/lib/store/report-store";

/** Quick-add flows, mounted once so any screen can open them. */
export function GlobalSheets() {
  const router = useRouter();
  const report = useSessionReport();
  return (
    <>
      <StartSessionSheet />
      <StudySheet />
      <TransactionSheet />
      <BankrollSheet />
      <ExpressSheet />
      {report.session && (
        <SessionReportSheet
          session={report.session}
          onClose={() => {
            report.close();
            router.push("/home");
          }}
        />
      )}
    </>
  );
}

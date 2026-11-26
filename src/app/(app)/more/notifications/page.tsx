import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReminderSetup } from "@/components/notifications/reminder-setup";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <div className="space-y-6 pt-3">
      <Link
        href="/more"
        className="-ml-2 inline-flex h-11 items-center gap-1.5 px-2 text-sm font-semibold text-ink-soft"
      >
        <ArrowLeft className="size-4" aria-hidden /> More
      </Link>
      <header>
        <p className="eyebrow mb-1.5">Accountability</p>
        <h1 className="text-[34px] font-semibold">Reminders</h1>
        <p className="mt-2 text-ink-muted">
          One nudge a day, only if your habits aren&apos;t done yet. Never during quiet hours.
        </p>
      </header>
      <ReminderSetup />
    </div>
  );
}

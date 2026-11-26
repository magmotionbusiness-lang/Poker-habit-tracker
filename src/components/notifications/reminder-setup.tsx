"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { BellRing, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InstallPrompt } from "@/components/shell/install-prompt";
import { toast } from "@/components/ui/toaster";
import { useSettings } from "@/lib/db/hooks";
import { saveSettings } from "@/lib/db/repo";
import {
  currentPushSubscription,
  enablePush,
  pushSupport,
  sendTestPush,
  type PushSupport,
} from "@/lib/push/client";
import { useAppStore } from "@/lib/store/app-store";

const noopSubscribe = () => () => {};

/** Reminder time + quiet hours + the permission flow, with the iOS install explainer. */
export function ReminderSetup({ compact = false }: { compact?: boolean }) {
  const settings = useSettings();
  const mode = useAppStore((s) => s.mode);
  const support = useSyncExternalStore<PushSupport>(
    noopSubscribe,
    pushSupport,
    () => "unsupported",
  );
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    currentPushSubscription().then((s) => alive && setEnabled(Boolean(s)));
    return () => {
      alive = false;
    };
  }, []);

  if (!settings) return null;
  const time = settings.reminderTimes[0] ?? "19:00";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label htmlFor="reminder-time" className="mb-1.5 block text-sm font-medium text-ink-soft">
            Daily reminder
          </label>
          <input
            id="reminder-time"
            type="time"
            value={time}
            onChange={(e) => saveSettings({ reminderTimes: [e.target.value] })}
            className="num h-12 w-full rounded-md border border-line bg-field px-4 text-[16px] text-ink"
          />
        </div>
        {!compact && (
          <>
            <div>
              <label
                htmlFor="quiet-start"
                className="mb-1.5 block text-sm font-medium text-ink-soft"
              >
                Quiet from
              </label>
              <input
                id="quiet-start"
                type="time"
                value={settings.quietStart}
                onChange={(e) => saveSettings({ quietStart: e.target.value })}
                className="num h-12 w-full rounded-md border border-line bg-field px-4 text-[16px] text-ink"
              />
            </div>
            <div>
              <label htmlFor="quiet-end" className="mb-1.5 block text-sm font-medium text-ink-soft">
                Quiet until
              </label>
              <input
                id="quiet-end"
                type="time"
                value={settings.quietEnd}
                onChange={(e) => saveSettings({ quietEnd: e.target.value })}
                className="num h-12 w-full rounded-md border border-line bg-field px-4 text-[16px] text-ink"
              />
            </div>
          </>
        )}
      </div>

      {enabled ? (
        <Card className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-semibold text-ink">
            <Check className="size-5 text-success" aria-hidden /> Reminders are on
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              sendTestPush()
                .then(() => toast("Test sent"))
                .catch((e) => toast.error(e.message))
            }
          >
            Send test
          </Button>
        </Card>
      ) : support === "needs-install" ? (
        <InstallPrompt force />
      ) : support === "not-configured" ? (
        <p className="text-sm text-ink-muted">
          Push reminders switch on once the server keys are added (see README). Your time is saved.
        </p>
      ) : support === "unsupported" ? (
        <p className="text-sm text-ink-muted">
          This browser can&apos;t show push notifications. Your time is saved.
        </p>
      ) : mode !== "account" ? (
        <Card>
          <p className="text-sm text-ink-soft">
            Reminders are sent from our server, so they need a free account.
          </p>
          <Button className="mt-3" variant="secondary" block asChild>
            <Link href="/login">Create account</Link>
          </Button>
        </Card>
      ) : (
        <Button
          block
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await enablePush();
              setEnabled(true);
              toast.success("Reminders are on.");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Couldn't turn on reminders");
            } finally {
              setBusy(false);
            }
          }}
        >
          <BellRing aria-hidden /> Turn on reminders
        </Button>
      )}
    </div>
  );
}

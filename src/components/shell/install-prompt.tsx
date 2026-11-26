"use client";

import { Share, Smartphone, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { copy } from "@/content/copy";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/use-hydrated";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

function getPlatform() {
  const ua = navigator.userAgent;
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return { ios, standalone };
}

const subscribe = () => () => {};
export function useStandalone(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => getPlatform().standalone,
    () => false,
  );
}
export function useIsIos(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => getPlatform().ios,
    () => false,
  );
}

/**
 * "Add to Home Screen" explainer. iOS has no install API, so we show the Share-sheet
 * steps; Chromium gets a real Install button via `beforeinstallprompt`.
 * Web Push on iOS (16.4+) only works once installed — this is the gateway to reminders.
 */
export function InstallPrompt({ force = false }: { force?: boolean }) {
  const hydrated = useHydrated();
  const dismissed = useAppStore((s) => s.dismissed["install-prompt"]);
  const dismiss = useAppStore((s) => s.dismiss);
  const standalone = useStandalone();
  const ios = useIsIos();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!hydrated || standalone) return null;
  if (!force && (dismissed || (!ios && !deferred))) return null;

  return (
    <Card glow className="overflow-hidden">
      {!force && (
        <button
          type="button"
          onClick={() => dismiss("install-prompt")}
          aria-label="Dismiss"
          className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-ink-muted hover:bg-white/5"
        >
          <X className="size-4" />
        </button>
      )}
      <div className="flex gap-3.5 pr-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-pill text-lavender">
          <Smartphone className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-ink">{copy.install.title}</p>
          <p className="mt-0.5 text-sm text-ink-muted">{copy.install.body}</p>
        </div>
      </div>
      {deferred ? (
        <Button
          className="mt-4"
          block
          onClick={async () => {
            await deferred.prompt();
            setDeferred(null);
          }}
        >
          Install Stakers
        </Button>
      ) : (
        <ol className="mt-4 space-y-2 text-sm text-ink-soft">
          {copy.install.steps.map((step, i) => (
            <li key={step} className="flex items-center gap-3">
              <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-field text-xs font-bold text-lavender">
                {i + 1}
              </span>
              <span className="flex items-center gap-1.5">
                {step}
                {i === 0 && <Share className="size-4 text-lavender" aria-label="(Share icon)" />}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

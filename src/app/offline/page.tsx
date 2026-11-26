import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Offline" };

/** Served by the service worker when a page isn't cached and there's no connection. */
export default function OfflinePage() {
  return (
    <main className="hero-glow px-safe grid min-h-dvh place-items-center text-center">
      <div className="max-w-sm">
        <span className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-pill text-lavender">
          <WifiOff className="size-6" strokeWidth={1.6} aria-hidden />
        </span>
        <h1 className="text-3xl font-semibold">You&apos;re offline</h1>
        <p className="mt-3 text-ink-muted">
          This screen hasn&apos;t been saved for offline use yet. Anything you log is kept on this
          device and syncs when you&apos;re back.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/today">Go to Today</Link>
        </Button>
      </div>
    </main>
  );
}

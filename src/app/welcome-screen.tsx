"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Wordmark } from "@/components/brand/stakers-mark";
import { Headline } from "@/components/brand/headline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { copy } from "@/content/copy";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/use-hydrated";

export function WelcomeScreen() {
  const router = useRouter();
  const hydrated = useHydrated();
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const reduce = useReducedMotion();
  const starting = useRef(false);

  // Returning users skip the welcome screen (but not while we're starting a new guest).
  useEffect(() => {
    if (hydrated && mode !== null && !starting.current) router.replace("/today");
  }, [hydrated, mode, router]);

  const fade = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay, ease: [0.4, 0, 0.2, 1] as const },
        };

  return (
    <main className="hero-glow px-safe pt-safe pb-safe relative flex min-h-dvh flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_40%_at_50%_20%,#000_10%,transparent_75%)] bg-[size:56px_56px] opacity-60"
      />
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="flex items-center justify-between pt-5">
          <Wordmark />
          <Link href="/login" className="text-sm font-semibold text-ink-soft hover:text-ink">
            Sign in
          </Link>
        </div>

        <div className="flex flex-1 flex-col justify-center py-10">
          <motion.div {...fade(0)}>
            <Badge dot className="mb-6">
              {brand.coach.businessTm}
            </Badge>
          </motion.div>
          <motion.div {...fade(0.06)}>
            <Headline
              lead={copy.welcome.headlineLead}
              accent={copy.welcome.headlineAccent}
              size="xl"
            />
          </motion.div>
          <motion.p {...fade(0.12)} className="mt-5 text-[17px] leading-relaxed text-ink-muted">
            {copy.welcome.sub}
          </motion.p>
          <motion.ul {...fade(0.18)} className="mt-7 flex flex-wrap gap-2">
            {brand.coach.pillars.map((p) => (
              <li key={p}>
                <Badge variant="outline" size="sm">
                  {p}
                </Badge>
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div {...fade(0.24)} className="space-y-3 pb-6">
          <Button
            size="lg"
            block
            onClick={() => {
              starting.current = true;
              setMode("guest");
              router.push("/onboarding");
            }}
          >
            {copy.welcome.ctaGuest} <span aria-hidden>→</span>
          </Button>
          <Button size="lg" variant="secondary" block asChild>
            <Link href="/login">{copy.welcome.ctaSignIn}</Link>
          </Button>
          <p className="px-2 pt-1 text-center text-[13px] leading-relaxed text-ink-subtle">
            {copy.welcome.guestNote}
          </p>
          <p className="px-2 text-center text-[12px] leading-relaxed text-ink-subtle">
            {copy.responsibleGaming.notice}
          </p>
        </motion.div>
      </div>
    </main>
  );
}

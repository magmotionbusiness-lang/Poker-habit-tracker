"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";
import { z } from "zod";
import { Headline } from "@/components/brand/headline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { isSupabaseConfigured } from "@/lib/env";
import { useAppStore } from "@/lib/store/app-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const emailSchema = z.email("Enter a valid email address");
const codeSchema = z.string().regex(/^\d{6}$/, "Enter the 6-digit code from the email");

const errors: Record<string, string> = {
  link_invalid: "That sign-in link has expired or was already used. Request a new one.",
  not_configured: "Accounts aren't switched on for this preview yet.",
};

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const setMode = useAppStore((s) => s.setMode);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(errors[params.get("error") ?? ""] ?? null);
  const supabase = getSupabaseBrowserClient();

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email.trim());
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid email");
    if (!supabase) return setError(errors.not_configured!);
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/today`,
        shouldCreateUser: true,
      },
    });
    setBusy(false);
    if (error) return setError(error.message);
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    const parsed = codeSchema.safeParse(code.trim());
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid code");
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: parsed.data,
      type: "email",
    });
    setBusy(false);
    if (error)
      return setError("That code didn't work. Check the latest email or request a new one.");
    setMode("account");
    toast.success("You're signed in.");
    router.replace("/home");
  }

  async function google() {
    if (!supabase) return setError(errors.not_configured!);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/today` },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="pt-4 pb-10">
      <Link
        href="/"
        className="-ml-2 inline-flex h-11 items-center gap-1.5 px-2 text-sm font-semibold text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back
      </Link>
      <div className="mt-6 mb-8">
        <p className="eyebrow mb-3">Your account</p>
        <Headline lead="Back up your" accent="whole system." size="lg" />
        <p className="mt-3 text-ink-muted">
          Sync across iPhone, iPad and desktop. No password — we email you a code.
        </p>
      </div>

      {!isSupabaseConfigured && (
        <Card className="mb-5 border-line-accent">
          <p className="font-semibold">Accounts aren&apos;t switched on in this preview</p>
          <p className="mt-1 text-sm text-ink-muted">
            Everything works in guest mode and stays on this device. Sign-in turns on once Supabase
            is connected.
          </p>
          <Button
            className="mt-4"
            block
            variant="secondary"
            onClick={() => {
              setMode("guest");
              router.push("/onboarding");
            }}
          >
            Continue as guest
          </Button>
        </Card>
      )}

      {step === "email" ? (
        <form onSubmit={sendLink} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              icon={<Mail />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!error || undefined}
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>
          <Button type="submit" size="lg" block disabled={busy || !isSupabaseConfigured}>
            {busy ? "Sending…" : "Email me a sign-in code"}
          </Button>
          <div className="flex items-center gap-3 py-1 text-xs text-ink-subtle">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            block
            onClick={google}
            disabled={!isSupabaseConfigured}
          >
            <GoogleGlyph /> Continue with Google
          </Button>
          <p className="text-center text-xs text-ink-subtle">
            Sign in with Apple arrives with the native app.
          </p>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-4" noValidate>
          <p className="text-ink-soft">
            We sent a sign-in email to <span className="font-semibold text-ink">{email}</span>.
            Enter the 6-digit code here — or tap the link in the email.
          </p>
          <div>
            <Label htmlFor="code">6-digit code</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              placeholder="123456"
              icon={<KeyRound />}
              className="num tracking-[0.3em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              aria-invalid={!!error || undefined}
              aria-describedby={error ? "login-error" : undefined}
              autoFocus
            />
          </div>
          <Button type="submit" size="lg" block disabled={busy}>
            {busy ? "Checking…" : "Sign in"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            block
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
          >
            Use a different email
          </Button>
        </form>
      )}

      {error && (
        <p
          id="login-error"
          role="alert"
          className="mt-4 rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-[18px]">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.8-5.4 3.8-3.3 0-5.9-2.7-5.9-6s2.6-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}

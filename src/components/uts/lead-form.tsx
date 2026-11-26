"use client";

import { useState } from "react";
import { ArrowUpRight, AtSign, Camera, Check, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { brand } from "@/config/brand";
import { type LeadListKey, uts } from "@/content/uts";
import { type LeadResult, submitLead } from "@/lib/growth/leads-client";
import { celebrate } from "@/lib/store/celebrate";
import { play } from "@/lib/sfx/sfx";
import { cn } from "@/lib/utils";

/**
 * Waitlist / newsletter signup with its own unticked consent box (GDPR: separate from the
 * account, the exact text is stored with a timestamp). Honeypot field for bots.
 */
export function LeadForm({ list, glow }: { list: LeadListKey; glow?: boolean }) {
  const copy = uts[list];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [company, setCompany] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | LeadResult>("idle");
  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validEmail || !consent) return;
    setState("busy");
    const r = await submitLead({
      list,
      email: email.trim(),
      name: name.trim() || null,
      instagram: list === "waitlist" ? instagram.trim() || null : null,
      company,
    });
    setState(r);
    if (r === "ok") celebrate("day", e.currentTarget as Element);
    else play("error");
  }

  if (state === "ok") {
    return (
      <Card glow={glow} className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-success/15 text-success">
          <Check className="size-6" strokeWidth={2.6} aria-hidden />
        </span>
        <p className="mt-3 font-display text-xl font-semibold">You&apos;re in.</p>
        <p className="mt-1 text-sm text-ink-muted">{copy.done}</p>
      </Card>
    );
  }

  return (
    <Card glow={glow}>
      <p className="eyebrow">{copy.eyebrow}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{copy.title}</p>
      <p className="mt-1 text-sm text-ink-muted">{copy.body}</p>
      <form className="mt-4 space-y-3" onSubmit={submit} noValidate>
        <Input
          icon={<User />}
          aria-label={uts.fields.name}
          placeholder={uts.fields.name}
          autoComplete="given-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          icon={<Mail />}
          aria-label={uts.fields.email}
          placeholder={uts.fields.email}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {list === "waitlist" && (
          <Input
            icon={<Camera />}
            aria-label={uts.fields.instagram}
            placeholder={uts.fields.instagram}
            autoCapitalize="none"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
          />
        )}
        {/* Honeypot — hidden from people and screen readers. */}
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Company
            <input
              tabIndex={-1}
              autoComplete="off"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </label>
        </div>
        <label className="flex cursor-pointer gap-3 rounded-md bg-field px-3 py-3 text-sm text-ink-soft">
          <input
            type="checkbox"
            className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>{copy.consent}</span>
        </label>
        <Button
          type="submit"
          size="lg"
          block
          disabled={!validEmail || !consent || state === "busy"}
        >
          <AtSign aria-hidden /> {state === "busy" ? "Sending…" : copy.submit}
        </Button>
        <p
          className={cn(
            "text-center text-xs",
            state === "idle" || state === "busy" ? "text-ink-subtle" : "text-danger",
          )}
          role="status"
        >
          {state === "rate_limited"
            ? uts.rateLimited
            : state === "error"
              ? "Couldn't send. Check your connection and try again."
              : state === "unavailable"
                ? uts.unavailable
                : uts.privacy}
        </p>
        {state === "unavailable" && (
          <Button variant="outline" block asChild>
            <a href={brand.coach.site} target="_blank" rel="noopener noreferrer">
              Open upthestakes.net <ArrowUpRight aria-hidden />
            </a>
          </Button>
        )}
      </form>
    </Card>
  );
}

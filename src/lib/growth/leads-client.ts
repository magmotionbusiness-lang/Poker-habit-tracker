"use client";

import { consentFor, type LeadListKey } from "@/content/uts";
import { mergeUtm, parseUtm } from "./utm";

const KEY = "stakers-utm";

export function storedUtm(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : null;
  } catch {
    return null;
  }
}

/** First-touch UTM capture (call once on app load). */
export function captureUtm() {
  try {
    const next = mergeUtm(storedUtm(), parseUtm(window.location.search));
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked — attribution is best effort */
  }
}

export type LeadResult = "ok" | "unavailable" | "rate_limited" | "error";

export async function submitLead(input: {
  list: LeadListKey;
  email: string;
  name?: string | null;
  instagram?: string | null;
  consented_at?: string;
  company?: string;
}): Promise<LeadResult> {
  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...input,
        consent: true,
        consent_text: consentFor(input.list),
        utm: storedUtm(),
      }),
    });
    if (res.ok) return "ok";
    if (res.status === 503) return "unavailable";
    if (res.status === 429) return "rate_limited";
    return "error";
  } catch {
    return "error";
  }
}

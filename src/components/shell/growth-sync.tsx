"use client";

import { useEffect } from "react";
import { consentFor } from "@/content/uts";
import { useSettings } from "@/lib/db/hooks";
import { saveSettings } from "@/lib/db/repo";
import { captureUtm, submitLead } from "@/lib/growth/leads-client";

/**
 * Background growth plumbing: first-touch UTM capture, and sending the onboarding email
 * opt-in to the email provider once we're online (it was captured offline-first).
 */
let attempted = false;

export function GrowthSync() {
  const settings = useSettings();
  useEffect(() => captureUtm(), []);
  const optIn = settings?.emailOptIn;
  useEffect(() => {
    if (!optIn || optIn.synced || attempted || !navigator.onLine) return;
    // Only send if the user saw the text the server currently accepts.
    if (optIn.consent_text !== consentFor("newsletter")) return;
    attempted = true; // once per app load; retried on the next launch if it failed
    void submitLead({
      list: "newsletter",
      email: optIn.email,
      consented_at: optIn.consented_at,
    }).then((r) => {
      if (r === "ok") void saveSettings({ emailOptIn: { ...optIn, synced: true } });
    });
  }, [optIn]);
  return null;
}

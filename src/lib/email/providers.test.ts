import { describe, expect, it, vi } from "vitest";
import { type Lead, providerFromEnv } from "./providers";

const lead: Lead = {
  email: "Max@Example.com",
  name: "Max",
  instagram: "@max",
  list: "waitlist",
  source: "app",
  utm: { utm_source: "instagram", utm_campaign: "cohort8" },
  consent_text: "I agree…",
  consented_at: "2026-11-26T10:00:00.000Z",
};
const okFetch = () => vi.fn(async () => new Response("{}", { status: 200 }));

describe("email providers", () => {
  it("falls back to none when keys are missing", () => {
    expect(providerFromEnv({ EMAIL_PROVIDER: "kit" }).name).toBe("none");
    expect(providerFromEnv({ EMAIL_PROVIDER: "mailchimp", MAILCHIMP_API_KEY: "x-us1" }).name).toBe(
      "none",
    );
    expect(providerFromEnv({ EMAIL_PROVIDER: "none" }).name).toBe("none");
  });

  it("kit posts to the list's form with source + UTM fields", async () => {
    const f = okFetch();
    const p = providerFromEnv(
      { EMAIL_PROVIDER: "kit", KIT_API_KEY: "k", KIT_WAITLIST_FORM_ID: "123" },
      f,
    );
    await p.subscribe(lead);
    const [url, init] = f.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe("https://api.convertkit.com/v3/forms/123/subscribe");
    expect(JSON.parse(init.body as string)).toMatchObject({
      api_key: "k",
      email: lead.email,
      fields: { source: "app", utm_source: "instagram", utm_campaign: "cohort8" },
    });
    await expect(p.subscribe({ ...lead, list: "newsletter" })).rejects.toThrow(/isn't configured/);
  });

  it("mailchimp upserts a pending member by md5(lowercase email) and tags it", async () => {
    const f = okFetch();
    await providerFromEnv(
      { EMAIL_PROVIDER: "mailchimp", MAILCHIMP_API_KEY: "abc-us21", MAILCHIMP_AUDIENCE_ID: "L1" },
      f,
    ).subscribe(lead);
    const [url, init] = f.mock.calls[0]! as unknown as [string, RequestInit];
    const { createHash } = await import("node:crypto");
    const hash = createHash("md5").update("max@example.com").digest("hex");
    expect(url).toBe(`https://us21.api.mailchimp.com/3.0/lists/L1/members/${hash}`);
    expect(url).toMatch(
      /^https:\/\/us21\.api\.mailchimp\.com\/3\.0\/lists\/L1\/members\/[0-9a-f]{32}$/,
    );
    expect(JSON.parse(init.body as string)).toMatchObject({ status_if_new: "pending" });
    expect((f.mock.calls[1] as unknown as [string])[0]).toBe(`${url}/tags`);
  });

  it("webhook posts the lead and surfaces failures", async () => {
    const f = vi.fn(async () => new Response("nope", { status: 500 }));
    const p = providerFromEnv(
      { EMAIL_PROVIDER: "webhook", LEADS_WEBHOOK_URL: "https://hooks.example.com/x" },
      f,
    );
    await expect(p.subscribe(lead)).rejects.toThrow("Webhook 500: nope");
  });
});

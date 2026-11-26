import { createHash } from "node:crypto";

/**
 * Provider-agnostic email list. Nelson's provider is TBD, so the active adapter is
 * chosen by EMAIL_PROVIDER (none | kit | mailchimp | webhook). Each adapter only
 * subscribes; consent is captured and stored by us before this is called.
 */
export type LeadList = "waitlist" | "newsletter";
export type Lead = {
  email: string;
  name: string | null;
  instagram: string | null;
  list: LeadList;
  source: string;
  utm: Record<string, string> | null;
  consent_text: string;
  consented_at: string;
};

export interface EmailProvider {
  readonly name: "none" | "kit" | "mailchimp" | "webhook";
  subscribe(lead: Lead): Promise<void>;
}

type Fetch = typeof fetch;

async function ok(res: Response, who: string) {
  if (res.ok) return;
  const text = await res.text().catch(() => "");
  throw new Error(`${who} ${res.status}: ${text.slice(0, 200)}`);
}

export const noneProvider: EmailProvider = { name: "none", subscribe: async () => {} };

/** Kit (ConvertKit) v3: subscribe to a form; tags + custom fields carry source/UTM. */
export function kitProvider(
  cfg: { apiKey: string; forms: Record<LeadList, string | undefined> },
  f: Fetch = fetch,
): EmailProvider {
  return {
    name: "kit",
    async subscribe(lead) {
      const form = cfg.forms[lead.list];
      if (!form) throw new Error(`Kit form for ${lead.list} isn't configured`);
      const res = await f(
        `https://api.convertkit.com/v3/forms/${encodeURIComponent(form)}/subscribe`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            api_key: cfg.apiKey,
            email: lead.email,
            first_name: lead.name ?? undefined,
            fields: {
              instagram: lead.instagram ?? undefined,
              source: lead.source,
              utm_source: lead.utm?.utm_source,
              utm_medium: lead.utm?.utm_medium,
              utm_campaign: lead.utm?.utm_campaign,
            },
          }),
        },
      );
      await ok(res, "Kit");
    },
  };
}

/** Mailchimp Marketing API: upsert the member as "pending" (double opt-in) and tag them. */
export function mailchimpProvider(
  cfg: { apiKey: string; audienceId: string },
  f: Fetch = fetch,
): EmailProvider {
  const dc = cfg.apiKey.split("-")[1];
  return {
    name: "mailchimp",
    async subscribe(lead) {
      if (!dc) throw new Error("Mailchimp API key has no data-centre suffix");
      const hash = createHash("md5").update(lead.email.toLowerCase()).digest("hex");
      const base = `https://${dc}.api.mailchimp.com/3.0/lists/${encodeURIComponent(cfg.audienceId)}/members/${hash}`;
      const auth = `Basic ${Buffer.from(`stakers:${cfg.apiKey}`).toString("base64")}`;
      const res = await f(base, {
        method: "PUT",
        headers: { "content-type": "application/json", authorization: auth },
        body: JSON.stringify({
          email_address: lead.email,
          status_if_new: "pending",
          merge_fields: { FNAME: lead.name ?? "" },
        }),
      });
      await ok(res, "Mailchimp");
      const tags = await f(`${base}/tags`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: auth },
        body: JSON.stringify({
          tags: [lead.list, `source:${lead.source}`].map((name) => ({ name, status: "active" })),
        }),
      });
      await ok(tags, "Mailchimp tags");
    },
  };
}

/** Generic webhook (Zapier / Make): POST the whole lead as JSON. */
export function webhookProvider(cfg: { url: string }, f: Fetch = fetch): EmailProvider {
  return {
    name: "webhook",
    async subscribe(lead) {
      const res = await f(cfg.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "lead", ...lead }),
      });
      await ok(res, "Webhook");
    },
  };
}

export type ProviderEnv = {
  EMAIL_PROVIDER: "none" | "kit" | "mailchimp" | "webhook";
  KIT_API_KEY?: string;
  KIT_WAITLIST_FORM_ID?: string;
  KIT_NEWSLETTER_FORM_ID?: string;
  MAILCHIMP_API_KEY?: string;
  MAILCHIMP_AUDIENCE_ID?: string;
  LEADS_WEBHOOK_URL?: string;
};

/** Pick the adapter from env; falls back to "none" (lead is still stored) when keys are missing. */
export function providerFromEnv(env: ProviderEnv, f: Fetch = fetch): EmailProvider {
  switch (env.EMAIL_PROVIDER) {
    case "kit":
      return env.KIT_API_KEY
        ? kitProvider(
            {
              apiKey: env.KIT_API_KEY,
              forms: { waitlist: env.KIT_WAITLIST_FORM_ID, newsletter: env.KIT_NEWSLETTER_FORM_ID },
            },
            f,
          )
        : noneProvider;
    case "mailchimp":
      return env.MAILCHIMP_API_KEY && env.MAILCHIMP_AUDIENCE_ID
        ? mailchimpProvider(
            { apiKey: env.MAILCHIMP_API_KEY, audienceId: env.MAILCHIMP_AUDIENCE_ID },
            f,
          )
        : noneProvider;
    case "webhook":
      return env.LEADS_WEBHOOK_URL
        ? webhookProvider({ url: env.LEADS_WEBHOOK_URL }, f)
        : noneProvider;
    default:
      return noneProvider;
  }
}

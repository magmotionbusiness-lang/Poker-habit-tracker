import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { consentFor } from "@/content/uts";
import { providerFromEnv } from "@/lib/email/providers";
import { serverEnv } from "@/lib/env";
import { createRateLimiter } from "@/lib/growth/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const limiter = createRateLimiter(5, 10 * 60_000);

const body = z.object({
  list: z.enum(["waitlist", "newsletter"]),
  email: z.email().max(254),
  name: z.string().trim().max(120).nullish(),
  instagram: z.string().trim().max(80).nullish(),
  consent: z.literal(true),
  consent_text: z.string().max(1000),
  consented_at: z.iso.datetime().optional(),
  utm: z.record(z.string().max(40), z.string().max(100)).nullish(),
  /** Honeypot: humans never see this field. */
  company: z.string().max(200).optional(),
});

/**
 * Public lead capture (waitlist + newsletter). Validates, rate-limits, drops bots via the
 * honeypot, stores the lead with the exact consent text + timestamp, then hands it to the
 * configured email provider. Never reveals whether an email was already on a list.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = limiter(ip);
  if (!rl.ok)
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "retry-after": String(rl.retryAfter) } },
    );

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const input = parsed.data;
  if (input.company) return NextResponse.json({ ok: true }); // bot: pretend success
  if (input.consent_text !== consentFor(input.list))
    return NextResponse.json({ error: "consent_mismatch" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const env = serverEnv();
  const provider = providerFromEnv(env);
  if (!admin && provider.name === "none")
    return NextResponse.json({ error: "unavailable" }, { status: 503 });

  let userId: string | null = null;
  const server = await getSupabaseServerClient();
  if (server) userId = (await server.auth.getUser()).data.user?.id ?? null;

  const lead = {
    email: input.email.toLowerCase(),
    name: input.name || null,
    instagram: input.instagram?.replace(/^@?/, "@") || null,
    list: input.list,
    source: "app",
    utm: input.utm ?? null,
    consent_text: input.consent_text,
    consented_at: input.consented_at ?? new Date().toISOString(),
  };

  if (admin) {
    const { error } = await admin
      .from("leads")
      .upsert({ ...lead, user_id: userId }, { onConflict: "email,list", ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: "store_failed" }, { status: 500 });
  }

  try {
    await provider.subscribe(lead);
    if (admin && provider.name !== "none")
      await admin
        .from("leads")
        .update({ synced_to_provider_at: new Date().toISOString(), provider_error: null })
        .eq("email", lead.email)
        .eq("list", lead.list);
  } catch (e) {
    // Stored but not synced: an admin export / retry picks it up. Don't fail the user.
    if (admin)
      await admin
        .from("leads")
        .update({ provider_error: String(e instanceof Error ? e.message : e).slice(0, 300) })
        .eq("email", lead.email)
        .eq("list", lead.list);
    else return NextResponse.json({ error: "provider_failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

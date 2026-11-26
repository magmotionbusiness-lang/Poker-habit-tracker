import { z } from "zod";

/**
 * Environment schema. Every variable is optional in Phase 0 so the app builds and
 * runs as a guest-mode PWA with zero configuration; features light up as keys are
 * added. Server-only values are parsed lazily in `serverEnv()` so they never reach
 * the client bundle.
 */
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  NEXT_PUBLIC_SUPABASE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(20).optional(),
  ),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  NEXT_PUBLIC_ENABLE_SW_IN_DEV: z.preprocess(
    emptyToUndefined,
    z.enum(["true", "false"]).optional(),
  ),
  NEXT_PUBLIC_VERCEL_ENV: z.preprocess(
    emptyToUndefined,
    z.enum(["production", "preview", "development"]).optional(),
  ),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  VAPID_PRIVATE_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  VAPID_SUBJECT: z.preprocess(emptyToUndefined, z.string().optional()),
  CRON_SECRET: z.preprocess(emptyToUndefined, z.string().min(16).optional()),
  EMAIL_PROVIDER: z.preprocess(
    emptyToUndefined,
    z.enum(["none", "kit", "mailchimp", "webhook"]).default("none"),
  ),
  KIT_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  KIT_WAITLIST_FORM_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  KIT_NEWSLETTER_FORM_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  MAILCHIMP_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  MAILCHIMP_AUDIENCE_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  LEADS_WEBHOOK_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  AI_PROVIDER: z.preprocess(
    emptyToUndefined,
    z.enum(["none", "gemini", "anthropic"]).default("none"),
  ),
  GEMINI_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  ANTHROPIC_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  STRIPE_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  STRIPE_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

/**
 * NEXT_PUBLIC_* values must be referenced literally so Next can inline them.
 */
export const publicEnv: PublicEnv = publicSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  NEXT_PUBLIC_ENABLE_SW_IN_DEV: process.env.NEXT_PUBLIC_ENABLE_SW_IN_DEV,
  NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
});

export function serverEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must not be called in the browser");
  }
  return serverSchema.parse(source);
}

export const isSupabaseConfigured = Boolean(
  publicEnv.NEXT_PUBLIC_SUPABASE_URL && publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

/** Dev tools such as /design are visible everywhere except the production deployment. */
export const isProductionDeployment = publicEnv.NEXT_PUBLIC_VERCEL_ENV === "production";

export { publicSchema as _publicSchema, serverSchema as _serverSchema };

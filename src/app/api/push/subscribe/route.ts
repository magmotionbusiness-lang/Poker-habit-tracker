import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const body = z.object({
  subscription: z.object({
    endpoint: z.url().max(2000),
    keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(10).max(100) }),
  }),
  categories: z
    .array(z.enum(["reminders", "uts_news"]))
    .max(5)
    .default(["reminders", "uts_news"]),
});

/** Save this device's push subscription for the signed-in user (RLS: own rows only). */
export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Accounts aren't configured" }, { status: 503 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    return NextResponse.json({ error: "Sign in to turn on reminders" }, { status: 401 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  const { subscription, categories } = parsed.data;

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: auth.user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      categories,
      user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
    { onConflict: "endpoint" },
  );
  if (error) return NextResponse.json({ error: "Couldn't save the subscription" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

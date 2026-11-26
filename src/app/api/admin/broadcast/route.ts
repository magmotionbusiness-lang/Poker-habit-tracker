import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { pushConfigured, sendPush } from "@/lib/push/server";

const body = z.object({
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(240),
  url: z
    .string()
    .trim()
    .max(300)
    .regex(/^(\/|https:\/\/)/, "URL must be in-app (/…) or https")
    .optional(),
  audience: z.enum(["everyone", "non_students", "students", "alumni"]),
});

/**
 * Admin-only broadcast to everyone who allowed "Up The Stakes news" pushes, filtered by
 * audience. The caller's admin role is checked server-side; the send is audited.
 */
export async function POST(request: NextRequest) {
  const server = await getSupabaseServerClient();
  const admin = getSupabaseAdmin();
  if (!server || !admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const { data: auth } = await server.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: me } = await admin.from("profiles").select("role").eq("id", auth.user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!pushConfigured())
    return NextResponse.json({ error: "push_not_configured" }, { status: 503 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const msg = parsed.data;

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .contains("categories", ["uts_news"]);
  if (error) return NextResponse.json({ error: "read_failed" }, { status: 500 });

  let allowed: Set<string> | null = null;
  if (msg.audience !== "everyone" && subs?.length) {
    const status =
      msg.audience === "non_students" ? "none" : msg.audience === "students" ? "student" : "alumni";
    const { data: profiles } = await admin
      .from("profiles")
      .select("id")
      .eq("uts_status", status)
      .in("id", [...new Set(subs.map((s) => s.user_id))]);
    allowed = new Set((profiles ?? []).map((p) => p.id));
  }

  let sent = 0;
  let gone = 0;
  for (const sub of subs ?? []) {
    if (allowed && !allowed.has(sub.user_id)) continue;
    const r = await sendPush(sub, {
      title: msg.title,
      body: msg.body,
      url: msg.url ?? "/today",
      tag: "uts-broadcast",
    });
    if (r === "ok") sent++;
    if (r === "gone") {
      gone++;
      await admin.from("push_subscriptions").delete().eq("id", sub.id);
    }
  }
  await admin.from("audit_log").insert({
    actor_id: auth.user.id,
    action: "broadcast:push",
    target: msg.audience,
    details: { ...msg, sent, gone },
  });
  return NextResponse.json({ sent, gone });
}

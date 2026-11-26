import { NextResponse } from "next/server";
import { notifications } from "@/content/notifications";
import { pushConfigured, sendPush } from "@/lib/push/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Send a test notification to every device of the signed-in user. */
export async function POST() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Accounts aren't configured" }, { status: 503 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  if (!pushConfigured())
    return NextResponse.json(
      { error: "Push keys aren't configured on the server" },
      { status: 503 },
    );

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");
  if (!subs?.length)
    return NextResponse.json({ error: "No devices with reminders on" }, { status: 404 });
  let sent = 0;
  for (const sub of subs) {
    const r = await sendPush(sub, { ...notifications.test, url: "/today", tag: "test" });
    if (r === "ok") sent++;
    if (r === "gone") await supabase.from("push_subscriptions").delete().eq("id", sub.id);
  }
  return NextResponse.json({ sent });
}

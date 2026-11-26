import "server-only";

import { sendNotification, setVapidDetails } from "web-push";
import { publicEnv, serverEnv } from "@/lib/env";

export type StoredSubscription = { id: string; endpoint: string; p256dh: string; auth: string };
export type PushPayload = { title: string; body: string; url?: string; tag?: string };

let configured = false;
export function pushConfigured(): boolean {
  const env = serverEnv();
  if (!publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return false;
  if (!configured) {
    setVapidDetails(
      env.VAPID_SUBJECT ?? "mailto:support@example.com",
      publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY,
    );
    configured = true;
  }
  return true;
}

/**
 * Send to one subscription. Returns "gone" when the browser has dropped it (404/410) so
 * the caller can delete it.
 */
export async function sendPush(
  sub: StoredSubscription,
  payload: PushPayload,
): Promise<"ok" | "gone" | "error"> {
  try {
    await sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 6, urgency: "normal" },
    );
    return "ok";
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    return status === 404 || status === 410 ? "gone" : "error";
  }
}

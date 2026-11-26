"use client";

import { publicEnv } from "@/lib/env";

export type PushSupport = "supported" | "needs-install" | "unsupported" | "not-configured";

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  if (!publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return "not-configured";
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  // iOS only exposes Web Push to Home Screen apps (16.4+).
  if (ios && !standalone) return "needs-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
    return "unsupported";
  return "supported";
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Ask permission, subscribe, and register the subscription with the server. */
export async function enablePush(categories: string[] = ["reminders", "uts_news"]): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    throw new Error("Notifications are blocked. Allow them in Settings to get reminders.");
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    }));
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), categories }),
  });
  if (!res.ok)
    throw new Error(
      (await res.json().catch(() => null))?.error ?? "Couldn't save your reminder settings",
    );
}

export async function sendTestPush(): Promise<void> {
  const res = await fetch("/api/push/test", { method: "POST" });
  if (!res.ok)
    throw new Error((await res.json().catch(() => null))?.error ?? "Test notification failed");
}

export async function currentPushSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== "supported") return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/* Stakers service worker — app-shell caching, offline fallback, Web Push.
 * Hand-written (no Workbox) to stay compatible with Turbopack builds. See DECISIONS.md → "PWA".
 * Bump VERSION when the caching logic changes; hashed /_next/static assets never need it.
 */
const VERSION = "v4";
const SHELL_CACHE = `stakers-shell-${VERSION}`;
const ASSET_CACHE = `stakers-assets-${VERSION}`;
const SHELL_ROUTES = ["/", "/home", "/today", "/progress/journey", "/hands/players", "/bankroll", "/hands", "/progress", "/more", "/session", "/sessions/edit", "/onboarding", "/more/habits", "/more/data", "/more/notifications", "/hands/new", "/hands/view", "/hands/leaks", "/offline"];
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // Cache each route individually so one failure doesn't abort the install.
      Promise.all(SHELL_ROUTES.map((url) => cache.add(new Request(url, { cache: "reload" })).catch(() => undefined))),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("stakers-") && k !== SHELL_CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k)),
      );
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/splash/") ||
    url.pathname.startsWith("/brand/") ||
    /\.(woff2|png|svg|webp|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Only same-origin. Supabase, analytics etc. go straight to the network.
  if (url.origin !== self.location.origin) return;
  // Never cache auth flows or API responses.
  if (url.pathname.startsWith("/auth/") || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(event));
    return;
  }
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
  // Everything else (RSC payloads, etc.): default network behaviour.
});

async function networkFirstPage(event) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const preloaded = await event.preloadResponse;
    const response = preloaded || (await fetch(event.request));
    if (response.ok && response.type === "basic") cache.put(stripSearch(event.request.url), response.clone());
    return response;
  } catch {
    const cached = (await cache.match(stripSearch(event.request.url))) || (await cache.match(OFFLINE_URL));
    return cached || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

function stripSearch(href) {
  const u = new URL(href);
  u.search = "";
  return u.href;
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/* ---------- Web Push (wired up in Phase 1) ---------- */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data && event.data.text() };
  }
  const title = data.title || "Stakers";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag,
      data: { url: data.url || "/today" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/today", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});

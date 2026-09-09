// Routini service worker — hand-written (not a Workbox/Serwist build) since this app's
// data is already IndexedDB-native and offline-first by construction. Its jobs:
//   1. keep the app shell + every top-level route available offline (precache + per-URL
//      navigation cache),
//   2. support a user-confirmed "update available" flow (no silent reload),
//   3. on reconnect, wake clients to flush the offline outbox (Background Sync).
//
// It is deliberately NOT registered inside the Capacitor Android WebView (there is no
// origin server there) — see ServiceWorkerManager.tsx.

const CACHE_VERSION = "routini-v2";
const APP_SHELL_CACHE = `${CACHE_VERSION}-app-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Static export emits every route as `<route>/index.html` served at a trailing-slash
// path. Precaching the top-level routes means a route works offline even if the user
// never opened it online this session.
const APP_SHELL_URLS = [
  "/",
  "/offline/",
  "/plan/",
  "/tasks/",
  "/habits/",
  "/appointments/",
  "/adhkar/",
  "/areas/",
  "/goals/",
  "/reviews/",
  "/achievements/",
  "/assistant/",
  "/search/",
  "/more/",
  "/more/settings/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const OUTBOX_SYNC_TAG = "routini-outbox-flush";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      await Promise.all(
        APP_SHELL_URLS.map((url) =>
          cache.add(url).catch(() => {
            // A single missing/failed URL shouldn't block installation.
          }),
        ),
      );
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("routini-") && !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Ask every open client to flush its offline outbox. Used by the Background Sync
// handler below and as a fallback trigger.
async function askClientsToFlush() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
  for (const client of clients) {
    client.postMessage({ type: "routini:flush-outbox" });
  }
}

// Background Sync: the browser fires this when connectivity returns, even if the app
// tab was backgrounded. If no client is open the OS may still start one briefly.
self.addEventListener("sync", (event) => {
  if (event.tag === OUTBOX_SYNC_TAG) {
    event.waitUntil(askClientsToFlush());
  }
});

// Periodic Sync (Chromium, installed PWA only, permission-gated) — opportunistic.
self.addEventListener("periodicsync", (event) => {
  if (event.tag === OUTBOX_SYNC_TAG) {
    event.waitUntil(askClientsToFlush());
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, caching each page under its own URL. On failure, serve
  // that same URL from cache if we have it; otherwise fall back to the dedicated /offline
  // page rather than silently serving a different page's cached HTML under this URL.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(APP_SHELL_CACHE);
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          return (
            (await cache.match(request)) ||
            (await cache.match(request, { ignoreSearch: true })) ||
            (await cache.match("/offline/")) ||
            (await cache.match("/offline")) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  // Hashed, immutable static assets: cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })(),
    );
    return;
  }

  // Icons/manifest/splash: stale-while-revalidate.
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/splash/") ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || networkPromise;
      })(),
    );
  }
});

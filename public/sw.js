const CACHE_NAME = "shuttlecall-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/Icon-192.png",
  "/icons/Icon-512.png",
  "/icons/apple-touch-icon.png",
];

// Install — cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {}),
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// Fetch — network-first for API, cache-first for static
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== "GET") return;

  // API — network-first, no cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // SSE — skip
  if (url.pathname.startsWith("/api/sse/")) return;

  // Static assets — cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    }),
  );
});

// Push notification — Web Push
self.addEventListener("push", (event) => {
  let data = { title: "ShuttleCall", body: "Yeni bildirim" };
  try {
    if (event.data) data = event.data.json();
  } catch {}

  const options = {
    body: data.body || "",
    icon: "/images/logo.png",
    badge: "/images/badge.png",
    tag: data.tag || "shuttlecall",
    vibrate: [200, 100, 200],
    silent: false,
    sound: "/sounds/notification.mp3",
    data: { url: data.url || "/driver/dashboard" },
    actions: data.actions || [],
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click — open relevant page
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/driver/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

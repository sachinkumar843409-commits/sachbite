// SachBite Service Worker — PWA installability + basic offline support ke liye.
// IMPORTANT: /api/ calls kabhi cache nahi karte (menu, prices, orders hamesha
// fresh/live hone chahiye) — sirf static app-shell files cache hoti hain.

const CACHE_NAME = "sachbite-shell-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API calls: hamesha network se, kabhi cache se serve nahi karte (live data zaroori hai)
  if (url.pathname.startsWith("/api/")) return;

  // Sirf apni site ke GET requests cache karte hain
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return res;
        })
        .catch(() => cached); // offline ho to cache se serve karo
      return cached || networkFetch;
    })
  );
});

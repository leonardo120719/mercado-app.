/* Púlpito Bible — offline app shell */
const CACHE_NAME = "pulpito-bible-shell-v5";
const APP_SHELL = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/pulpito-manifest.webmanifest",
  "/pulpito-icon-192.svg",
  "/pulpito-icon-512.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith("pulpito-bible-") && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put("/", copy));
        }
        return response;
      }).catch(async () => {
        return (await caches.match(request)) || (await caches.match("/index.html"));
      })
    );
    return;
  }

  const criticalAssets = new Set(["/app.js", "/styles.css", "/pulpito-manifest.webmanifest"]);
  if (criticalAssets.has(url.pathname)) {
    event.respondWith(
      fetch(request, { cache: "no-store" }).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(async () => {
        return (await caches.match(request)) || new Response("", { status: 504, statusText: "Offline" });
      })
    );
    return;
  }

  if (["style", "script", "image", "manifest"].includes(request.destination) ||
      APP_SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }))
    );
  }
});

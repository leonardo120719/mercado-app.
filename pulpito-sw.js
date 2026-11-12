/* Púlpito Bible — offline app shell, shared by web and Android PWA */
"use strict";
const CACHE_NAME = "pulpito-bible-shell-v49";
const APP_SHELL = [
  "/",
  "/pulpito.html",
  "/styles.css",
  "/app.js?v=20261112-sermoes",
  "/pulpito-manifest.webmanifest",
  "/pulpito-acervo.json"
];
const CDN_HOSTS = new Set([
  "cdn.jsdelivr.net",
  "cdnjs.cloudflare.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com"
]);

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async path => {
      try {
        const response = await fetch(path, { cache: "reload" });
        if (response.ok) await cache.put(path, response);
      } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith("pulpito-bible-") && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    if (!CDN_HOSTS.has(url.hostname)) return;
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok || response.type === "opaque") await cache.put(request, response.clone());
        return response;
      } catch (_) {
        return new Response("", { status: 504, statusText: "Offline" });
      }
    })());
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch (_) {
        return (await cache.match(request)) ||
          (await cache.match("/pulpito.html")) ||
          new Response("Púlpito Bible: abra o aplicativo online uma vez para preparar o cache.", {
            status: 503,
            headers: { "Content-Type": "text/plain;charset=utf-8" }
          });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const critical = ["/", "/index.html", "/pulpito.html", "/app.js", "/styles.css", "/pulpito-manifest.webmanifest"].includes(url.pathname);
    if (cached && !critical) return cached;
    try {
      const response = await fetch(request, { cache: critical ? "no-store" : "default" });
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch (_) {
      return cached || new Response("", { status: 504, statusText: "Offline" });
    }
  })());
});

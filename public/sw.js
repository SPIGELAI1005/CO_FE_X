const CACHE = "cofex-shell-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (SHELL.some((path) => url.pathname === path)) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request)),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => response)
      .catch(() => caches.match("/")),
  );
});

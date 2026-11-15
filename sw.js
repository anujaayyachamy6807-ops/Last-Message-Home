// Offline cache for Last Message Home. Bump VERSION whenever a file below changes.
const VERSION = "lmh-v3";
const FILES = [
  "./", "index.html", "style.css", "engine.js", "i18n.js", "app.js", "icon.svg", "manifest.webmanifest",
  "data/contacts.json",
  "img/viking-1.jpg", "img/pathfinder.jpg", "img/mer.jpg", "img/phoenix.jpg", "img/insight.jpg",
  "img/ingenuity.jpg", "img/surveyor-3.jpg", "img/apollo12-lm.jpg", "img/lrv-15.jpg", "img/pioneer-10.jpg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Network first (so updates show up), cache as the fallback when offline.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("index.html")))
  );
});

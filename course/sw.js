// Offline mode (Premium): registered from the course profile page only when
// the account has the premium:offline feature. Network first; when the network
// fails, the last good response from the cache is used, so already-opened
// languages keep working without a connection. Served at /sw.js (root scope).
const CACHE = "papote-offline-v1";
const API_CACHED = [/^\/api\/course\//, /^\/api\/progress\//, /^\/api\/me$/, /^\/api\/features$/];

self.addEventListener("install", () => self.skipWaiting());
// Drop caches left by older versions (e.g. before the app was renamed Papote).
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim())
));

self.addEventListener("message", (e) => {
  if (!e.data || e.data.type !== "precache" || !Array.isArray(e.data.urls)) return;
  e.waitUntil(caches.open(CACHE).then((cache) => Promise.all(e.data.urls.map((u) =>
    fetch(u, { credentials: "same-origin" }).then((r) => (r.ok ? cache.put(u, r) : null)).catch(() => null)))));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") && !API_CACHED.some((re) => re.test(url.pathname))) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req)
      // Pages load /course and /design-system files as "?v=<hash>": offline,
      // any cached version of the file is better than nothing.
      .then((hit) => hit || (url.pathname.startsWith("/api/") ? null : caches.match(req, { ignoreSearch: true })))
      .then((hit) => hit || new Response("", { status: 503, statusText: "offline" })))
  );
});

/* ADHS PWA — Offline Cache */
const VERSION = 'v1.0.0';
const CACHE_NAME = `adhs-pwa-${VERSION}`;

// Passe die Liste an, falls du weitere Dateien nutzt
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './service-worker.js'
  // Optional: Icons, Favicons etc., z. B.:
  // './icons/icon-192.png',
  // './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Navigationen: Network-first mit Fallback auf index.html (SPA)
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const net = await fetch(req);
          // Optional: frisch geladenes HTML in Cache legen
          const cache = await caches.open(CACHE_NAME);
          cache.put('./index.html', net.clone());
          return net;
        } catch (_) {
          return (await caches.match('./index.html')) || Response.error();
        }
      })()
    );
    return;
  }

  // Sonstige GETs: Stale-While-Revalidate
  if (req.method === 'GET') {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        const fetchPromise = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
            return res;
          })
          .catch(() => undefined);
        return cached || fetchPromise || Response.error();
      })()
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
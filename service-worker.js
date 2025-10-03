/* ADHS PWA — Offline Cache (Root-Scope für User Page) */
const VERSION = 'v1.0.2';
const CACHE_NAME = `adhs-pwa-${VERSION}`;

const CORE_ASSETS = [
  '/',                 // GitHub Pages leitet / -> /index.html
  '/index.html',
  '/manifest.webmanifest',
  '/service-worker.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Navigationen: Network-first, Fallback auf Index (App-Shell)
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith((async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, net.clone());
        return net;
      } catch (_) {
        return (await caches.match('/index.html')) || (await caches.match('/')) || Response.error();
      }
    })());
    return;
  }

  // Andere GETs: Stale-While-Revalidate
  if (req.method === 'GET') {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      const fetched = fetch(req).then((res) => {
        caches.open(CACHE_NAME).then((c) => c.put(req, res.clone()));
        return res;
      }).catch(() => undefined);
      return cached || fetched || Response.error();
    })());
  }
});
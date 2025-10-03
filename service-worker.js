/* ADHS PWA — Offline Cache (Root-Scope für User Page) — robust gegen 404s */
const VERSION = 'v1.0.3';
const CACHE_NAME = `adhs-pwa-${VERSION}`;

// Minimal notwendige App-Shell (muss existieren)
const CORE = [
  '/index.html',
  '/manifest.webmanifest'
];

// Optionale Assets (dürfen fehlen; wir überspringen Fehler)
const OPTIONAL = [
  '/', // GitHub Pages leitet / -> /index.html (kann auch schon von oben abgedeckt sein)
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/service-worker.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Zuerst nur die zwingenden Assets cachen – wenn eines davon fehlt, ist es ein echter Fehler
    await cache.addAll(CORE);

    // Optionale Assets „best effort“ hinzufügen (ohne die Installation zu killen)
    for (const url of OPTIONAL) {
      try {
        const res = await fetch(new Request(url, { cache: 'no-store' }));
        if (res && res.ok) await cache.put(url, res);
      } catch (e) {
        // still ok – optional
      }
    }

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

// Optional: auf „CLAIM“-Message reagieren, um Controlling zu beschleunigen
self.addEventListener('message', (event) => {
  if (event?.data?.type === 'CLAIM') {
    self.skipWaiting();
    self.clients.claim();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Navigationen (Dokumente): Network-first, Fallback auf index.html (App-Shell)
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith((async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, net.clone());
        return net;
      } catch (_) {
        // Fallback: index.html oder /
        return (await caches.match('/index.html'))
            || (await caches.match('/'))
            || Response.error();
      }
    })());
    return;
  }

  // Sonstige GETs: Stale-While-Revalidate
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
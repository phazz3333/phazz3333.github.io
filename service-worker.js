// Cache‑First für Offline
const CACHE_NAME = 'adhs-pwa-v6';
const ASSETS = [ './', './index.html', './manifest.webmanifest' ];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k===CACHE_NAME?null:caches.delete(k)))));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if(req.method==='GET' && res.status===200 && res.type==='basic'){
        const resClone = res.clone(); caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
      }
      return res;
    }).catch(()=>caches.match('./index.html')))
  );
});
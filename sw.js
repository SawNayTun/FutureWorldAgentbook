const CACHE_NAME = 'future-world-v2';
const DYNAMIC_CACHE = 'future-world-dynamic-v2';

// Core assets that MUST be cached immediately
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Activate worker immediately
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .catch(console.error)
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Handle HTML/Navigation requests (Network First, Fallback to Cache)
  // This ensures users always get the latest version of the app when online.
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then(networkRes => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(req, networkRes.clone());
            return networkRes;
          });
        })
        .catch(() => caches.match(req)) // Offline fallback
    );
    return;
  }

  // 2. Handle External Libraries/Assets (Cache First, Fallback to Network)
  // CDN links (esm.sh, fonts, etc.) rarely change, so we load them fast from cache.
  if (url.origin !== self.location.origin || req.destination === 'script' || req.destination === 'style' || req.destination === 'image') {
    event.respondWith(
      caches.match(req).then(cachedRes => {
        if (cachedRes) return cachedRes;

        return fetch(req).then(networkRes => {
          // Cache the new asset dynamically
          return caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(req, networkRes.clone());
            return networkRes;
          });
        });
      })
    );
    return;
  }

  // 3. Default Strategy for everything else (Stale-While-Revalidate)
  event.respondWith(
    caches.match(req).then(cachedRes => {
      const fetchPromise = fetch(req).then(networkRes => {
        caches.open(DYNAMIC_CACHE).then(cache => cache.put(req, networkRes.clone()));
        return networkRes;
      });
      return cachedRes || fetchPromise;
    })
  );
});
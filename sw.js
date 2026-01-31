const CACHE_NAME = 'future-world-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://esm.sh/rxjs@^7.8.2?conditions=es2015',
  'https://esm.sh/rxjs@^7.8.2/operators?conditions=es2015',
  'https://esm.sh/rxjs@^7.8.2/ajax?conditions=es2015',
  'https://esm.sh/rxjs@^7.8.2/webSocket?conditions=es2015',
  'https://esm.sh/rxjs@^7.8.2/testing?conditions=es2015',
  'https://esm.sh/rxjs@^7.8.2/fetch?conditions=es2015',
  'https://esm.sh/@angular/common@^21.1.2?external=rxjs',
  'https://esm.sh/@angular/common@^21.1.2/http?external=rxjs',
  'https://esm.sh/@angular/platform-browser@^21.1.2?external=rxjs',
  'https://esm.sh/@angular/core@^21.1.2?external=rxjs',
  'https://esm.sh/@angular/compiler@^21.1.2?external=rxjs'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE).catch(error => {
          console.error('Failed to cache all resources:', error);
        });
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200) {
              return response;
            }
            
            // We don't cache non-GET requests
            if(event.request.method !== 'GET') {
                return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(err => {
            console.log('Fetch failed; returning offline page instead.', err);
            // Optional: return an offline fallback page if a specific resource fails to fetch.
            // For this app, failing to fetch a JS module will break it anyway, so we just let it fail.
        });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
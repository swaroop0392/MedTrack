/* MedTrack service worker — offline shell and cached static assets */
const CACHE = 'medtrack-pwa-v1';

function precacheUrls() {
  const root = new URL('.', self.location.href).href;
  return [
    new URL('index.html', root).href,
    new URL('manifest.webmanifest', root).href,
    new URL('icon-192.png', root).href,
    new URL('icon-512.png', root).href,
  ];
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(precacheUrls()))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE);
        const indexUrl = new URL('index.html', self.location).href;
        return (await cache.match(indexUrl)) || (await cache.match('index.html'));
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const url = new URL(event.request.url);
        const selfOrigin = new URL(self.location.href).origin;
        if (
          response.ok &&
          url.origin === selfOrigin &&
          url.pathname.endsWith('.png')
        ) {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
        }
        return response;
      });
    })
  );
});

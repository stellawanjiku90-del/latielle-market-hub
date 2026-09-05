const CACHE_NAME = 'latielle-market-hub-runtime-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Never cache navigations or API calls. The React shell and data must always
  // come from the current production server.
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate' || url.pathname.startsWith('/api/')) return;
  // Assets are fetched normally; this worker is primarily for push events.
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {
    data = { title: 'LATIELLE MARKET HUB', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'LATIELLE MARKET HUB';
  const options = {
    body: data.body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { link: data.link || '/' },
    tag: data.tag || data.type || 'latielle-market-hub',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.link || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          return client.focus().then(() => ('navigate' in client ? client.navigate(target) : undefined));
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    })
  );
});

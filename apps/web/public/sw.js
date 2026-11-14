// Forecasts must never be presented as current when the network is unavailable.
self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (names) {
        return Promise.all(
          names
            .filter(function (name) {
              return name.startsWith('tonnta-shell-');
            })
            .map(function (name) {
              return caches.delete(name);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);

  // Never intercept cross-origin requests.
  if (url.origin !== self.location.origin) return;

  // Never intercept API requests.
  if (url.pathname.startsWith('/api/')) return;

  // Do not substitute one activity or spot with cached conditions from another.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(function () {
        return new Response(
          '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Conditions unavailable offline</title><body><main><h1>You are offline</h1><p>Live sea conditions are unavailable. Reconnect and reload before making plans. Do not rely on an old forecast for water safety.</p><button onclick="location.reload()">Try again</button></main></body></html>',
          {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
          }
        );
      })
    );
  }
});

self.addEventListener('push', function (event) {
  if (!event.data) return;
  var payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: '/pwa-icon/192',
      badge: '/pwa-icon/192',
      data: { url: payload.url, id: payload.id },
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var c = clientList[i];
        if (c.url.startsWith(self.location.origin) && 'focus' in c) {
          c.postMessage({ type: 'NOTIFICATION_CLICK', url: url });
          return c.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

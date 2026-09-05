// ShowUp Service Worker for Offline PWA and Background Push Notifications
const CACHE_NAME = 'showup-dtr-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification event listener (for Web Push / Server triggers)
self.addEventListener('push', (event) => {
  let data = { title: 'ShowUp DTR Notification', body: 'You have a scheduled reminder.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'ShowUp DTR Notification', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/showup-icon-192.png',
    badge: '/showup-icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

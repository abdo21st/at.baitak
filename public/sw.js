// Service Worker for HodoorK Attendance PWA
const CACHE_NAME = 'hodoork-pwa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle Background Push / Local Notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard/employee';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Listen for background sync or geofence trigger messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_GEOFENCE_NOTIFICATION') {
    const { title, body, tag, url } = event.data;
    self.registration.showNotification(title, {
      body,
      tag,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200, 100, 200],
      dir: 'rtl',
      lang: 'ar',
      data: { url: url || '/dashboard/employee' }
    });
  }
});

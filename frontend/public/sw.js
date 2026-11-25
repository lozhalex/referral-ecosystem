// Базовый Service Worker для Бумеранг
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('Push message received', event);
  
  let data = { title: 'Бумеранг', body: 'Новое уведомление' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error('Ошибка парсинга данных push:', e);
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Бумеранг', {
      body: data.body || 'Новое уведомление',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: data.url || '/'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});
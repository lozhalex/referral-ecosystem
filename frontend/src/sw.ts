/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
clientsClaim(); // Правильный вызов импортированной функции

interface PushData {
  title?: string;
  body?: string;
  url?: string;
}

self.addEventListener('push', (event) => {
  console.log('SW: Push событие получено!');
  let data: PushData = { title: 'Бумеранг', body: 'Новое уведомление' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error('Ошибка парсинга push:', e);
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Бумеранг', {
      body: data.body || 'Новое уведомление',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      data: data.url || '/'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const clickData = event.notification.data as string;
  event.waitUntil(self.clients.openWindow(clickData || '/'));
});
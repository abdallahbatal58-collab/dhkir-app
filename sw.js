const CACHE_NAME = 'dhikr-v3';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/data.js',
  './js/app.js',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@300;400;600;700;900&family=Scheherazade+New:wght@400;700&display=swap'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(err => console.log('Cache error:', err)))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// دعم المزامنة الدورية والمزامنة العادية (Background Sync)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-dhikr') {
    console.log('Background sync performed');
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'periodic-dhikr') {
    console.log('Periodic sync performed');
  }
});

// دعم الإشعارات (Push Notifications)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.text() : 'تذكير بذكر الله';
  event.waitUntil(
    self.registration.showNotification('ذِكْر', {
      body: data,
      icon: 'https://placehold.co/192x192/0d3b2e/d4af37.png?text=Dhikr',
      badge: 'https://placehold.co/192x192/0d3b2e/d4af37.png?text=Dhikr'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
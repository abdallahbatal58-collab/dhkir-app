const CACHE_NAME = 'dhikr-v5-ultimate';
const ASSETS = [
  './', './index.html', './css/style.css?v=200', './js/data.js', './js/app.js?v=200',
  'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Tajawal:wght@300;400;500;700;800&family=Scheherazade+New:wght@400;700&display=swap'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});
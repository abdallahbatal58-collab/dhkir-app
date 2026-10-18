const CACHE_NAME = 'dhikr-v20-ultimate';
const ASSETS = [
    './', './index.html', './css/style.css?v=20.0',
    './js/adhkar-db.js', './js/quran.js', './js/app.js?v=20.0'
];
self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
    self.skipWaiting();
});
self.addEventListener('activate', (e) => {
    e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE_NAME).map(x => caches.delete(x)))));
    self.clients.claim();
});
self.addEventListener('fetch', (e) => {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('./index.html'))));
});
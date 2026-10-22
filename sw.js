/* ═══════════════════════════════════════════════════════════════
   ذِكْر | Service Worker v4.3.0
   ═══════════════════════════════════════════════════════════════ */

const CACHE_STATIC = 'dhikr-static-v4.3.0';
const CACHE_API = 'dhikr-api-v4.3.0';
const CACHE_MAX_ITEMS = 100;

const PRECACHE = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css?v=4.3.0',
    './js/data.js?v=4.3.0',
    './js/app.js?v=4.3.0',
    './icon.svg',
    'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css',
    'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js',
    'https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Amiri:wght@400;700&family=Tajawal:wght@300;400;500;700;800&family=Scheherazade+New:wght@400;700&display=swap'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_STATIC).then(cache =>
            Promise.all(PRECACHE.map(url =>
                cache.add(url).catch(err => console.warn('[SW] Failed precache:', url, err))
            ))
        ).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.map(k => {
                if (k !== CACHE_STATIC && k !== CACHE_API) return caches.delete(k);
            }))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // API & Audio CDN (Network First)
    if (url.hostname === 'api.alquran.cloud' ||
        url.hostname === 'api.quran.com' ||
        url.hostname === 'api.aladhan.com' ||
        url.hostname === 'api.bigdatacloud.net' ||
        url.hostname === 'everyayah.com' || 
        url.hostname === 'cdn.islamic.network') { 
        e.respondWith(
            fetch(req).then(res => {
                if (res && res.status === 200) {
                    const clone = res.clone();
                    caches.open(CACHE_API).then(cache => {
                        cache.put(req, clone);
                        trimCache(CACHE_API, CACHE_MAX_ITEMS);
                    });
                }
                return res;
            }).catch(() => caches.match(req))
        );
        return;
    }

    // HTML
    if (req.mode === 'navigate' || req.destination === 'document') {
        e.respondWith(
            fetch(req).then(res => {
                const clone = res.clone();
                caches.open(CACHE_STATIC).then(c => c.put(req, clone));
                return res;
            }).catch(() => caches.match(req).then(c => c || caches.match('./index.html')))
        );
        return;
    }

    // Static (Cache First)
    e.respondWith(
        caches.match(req).then(cached => {
            if (cached) return cached;
            return fetch(req).then(res => {
                if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
                    const clone = res.clone();
                    caches.open(CACHE_STATIC).then(c => {
                        c.put(req, clone);
                        trimCache(CACHE_STATIC, CACHE_MAX_ITEMS);
                    });
                }
                return res;
            }).catch(() => new Response('/* offline */', { status: 503 }));
        })
    );
});

async function trimCache(name, max) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    if (keys.length > max) {
        await Promise.all(keys.slice(0, keys.length - max).map(k => cache.delete(k)));
    }
}
/* ═══════════════════════════════════════════════════════════════
   ذِكْر | Service Worker v5.2.0 (Stable & Secure)
   ═══════════════════════════════════════════════════════════════ */

const CACHE_STATIC = 'dhikr-static-v5.2.0';
const CACHE_API = 'dhikr-api-v5.2.0';
const CACHE_MAX_ITEMS = 100;

const PRECACHE = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css?v=5.2.0',
    './js/data.js?v=5.2.0',
    './js/app.js?v=5.2.0',
    './icon.svg',
    'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css',
    'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js',
    'https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Amiri:wght@400;700&family=Aref+Ruqaa:wght@400;700&family=Tajawal:wght@300;400;500;700;800&family=Scheherazade+New:wght@400;700&display=swap'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_STATIC)
            .then((cache) => Promise.all(
                PRECACHE.map((url) => cache.add(url).catch((err) => console.warn('[SW] Failed precache:', url, err)))
            ))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.map((key) => {
                if (key !== CACHE_STATIC && key !== CACHE_API) {
                    return caches.delete(key);
                }
                return Promise.resolve();
            })
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    if (
        url.hostname === 'everyayah.com' ||
        url.hostname === 'cdn.islamic.network' ||
        url.hostname.includes('mp3quran.net') ||
        url.hostname.includes('githubusercontent.com')
    ) {
        return;
    }

    if (
        url.hostname === 'api.alquran.cloud' ||
        url.hostname === 'api.quran.com' ||
        url.hostname === 'api.aladhan.com' ||
        url.hostname === 'api.bigdatacloud.net'
    ) {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    if (res && res.status === 200) {
                        const clone = res.clone();
                        caches.open(CACHE_API).then((cache) => {
                            cache.put(req, clone);
                            trimCache(CACHE_API, CACHE_MAX_ITEMS);
                        });
                    }
                    return res;
                })
                .catch(() => caches.match(req))
        );
        return;
    }

    if (req.mode === 'navigate' || req.destination === 'document') {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    const clone = res.clone();
                    caches.open(CACHE_STATIC).then((cache) => cache.put(req, clone));
                    return res;
                })
                .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
        );
        return;
    }

    event.respondWith(
        caches.match(req).then((cached) => {
            if (cached) return cached;
            return fetch(req)
                .then((res) => {
                    if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
                        const clone = res.clone();
                        caches.open(CACHE_STATIC).then((cache) => {
                            cache.put(req, clone);
                            trimCache(CACHE_STATIC, CACHE_MAX_ITEMS);
                        });
                    }
                    return res;
                })
                .catch(() => new Response('/* offline */', { status: 503 }));
        })
    );
});

async function trimCache(name, max) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    if (keys.length > max) {
        await Promise.all(keys.slice(0, keys.length - max).map((key) => cache.delete(key)));
    }
}
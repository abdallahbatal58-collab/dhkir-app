/* ═══════════════════════════════════════════════════════════════
   ذِكْر | Service Worker v4.1.0
   ═══════════════════════════════════════════════════════════════ */

const CACHE_STATIC = 'dhikr-static-v4.1.0';
const CACHE_API = 'dhikr-api-v4.1.0';
const CACHE_MAX_ITEMS = 80;

const PRECACHE = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css?v=4.0.0',
    './js/data.js?v=4.0.0',
    './js/app.js?v=4.0.0',
    './icon.svg',
    './maskable.svg',
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

    // ── API: Network First with JSON fallback ──
    if (url.hostname === 'api.alquran.cloud' ||
        url.hostname === 'api.quran.com' ||
        url.hostname === 'api.aladhan.com' ||
        url.hostname === 'api.bigdatacloud.net') {
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
            }).catch(() => caches.match(req).then(c => c || new Response(
                JSON.stringify({ error: 'offline' }),
                { headers: { 'Content-Type': 'application/json' }, status: 503 }
            )))
        );
        return;
    }

    // ── HTML: Network First with offline fallback ──
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

    // ── Static (CSS/JS/fonts/images): Cache First ──
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
            }).catch(() => {
                // إصلاح: إرجاع خطأ مناسب للـ CSS/JS بدلاً من HTML
                return new Response('/* offline */', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: { 'Content-Type': 'text/plain' }
                });
            });
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
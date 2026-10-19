/* ============================================
   ذِكْر | Service Worker (V118 - Ultimate Fixed)
   ============================================ */

const CACHE_NAME = 'dhikr-v119-final
const API_CACHE_NAME = 'dhikr-api-v118';

const ASSETS = [
    './',
    './index.html',
    './css/style.css?v=116.0',
    './js/data.js?v=117.0',
    './js/app.js?v=116.0',
    // مكتبة السحب Swiper
    'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css',
    'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js',
    // خطوط جوجل
    'https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Amiri:wght@400;700&family=Tajawal:wght@300;400;500;700;800&family=Scheherazade+New:wght@400;700&display=swap',
    // أيقونات FontAwesome
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// 1. التثبيت (Install)
self.addEventListener('install', (e) => {
    console.log('✅ [SW] Installing V118...');
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS).catch(err => {
                console.log('⚠️ [SW] Cache addAll error:', err);
            });
        })
    );
    self.skipWaiting();
});

// 2. التفعيل (Activate)
self.addEventListener('activate', (e) => {
    console.log('🚀 [SW] Activating V118...');
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME && key !== API_CACHE_NAME) {
                        console.log('🗑️ [SW] Deleting old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. الجلب (Fetch)
self.addEventListener('fetch', (e) => {
    const request = e.request;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;

    // أ. جلب من API (Network First)
    if (url.hostname.includes('api.alquran.cloud') || url.hostname.includes('api.quran.com')) {
        e.respondWith(
            fetch(request).then((networkResponse) => {
                return caches.open(API_CACHE_NAME).then((cache) => {
                    cache.put(request, networkResponse.clone());
                    return networkResponse;
                });
            }).catch(() => {
                return caches.match(request);
            })
        );
        return;
    }

    // ب. جلب الملفات الأساسية (Cache First)
    e.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            
            return fetch(request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                return caches.match('./index.html');
            });
        })
    );
});
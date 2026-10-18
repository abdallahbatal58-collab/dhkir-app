/* ============================================
   ذِكْر | Ultimate Service Worker (Cache Buster)
   ============================================ */

// غيرنا الاسم لنسخة جديدة تماماً عشان نمسح أي كاش قديم
const CACHE_NAME = 'dhikr-v102-ultimate';

// الملفات اللي هنحفظها
const ASSETS = [
    './',
    './index.html',
    './css/style.css?v=101.0',
    './js/data.js?v=101.0',
    './js/app.js?v=101.0',
    'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Tajawal:wght@300;400;500;700;800&family=Scheherazade+New:wght@400;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// 1. التثبيت
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting(); // إجبار المتصفح على تفعيل النسخة الجديدة فوراً
});

// 2. التفعيل (مسح الكاش القديم)
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('🗑️ Deleting old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. الجلب (تحديث الملفات باستمرار)
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            // إذا كان الملف موجود في الكاش، استخدمه فوراً
            // وفي نفس الوقت جيب النسخة الأحدث وحدثها في الخلفية
            const fetchPromise = fetch(e.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(e.request, networkResponse.clone());
                    });
                }
                return networkResponse;
            }).catch(() => {
                // لو مفيش نت، استخدم الكاش
                return cachedResponse;
            });

            return cachedResponse || fetchPromise;
        })
    );
});
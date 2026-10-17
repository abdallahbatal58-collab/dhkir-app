/* ============================================
   ذِكْر | V15 Ultimate Service Worker
   ============================================ */

const CACHE_NAME = 'dhikr-v15-ultimate';
const ASSETS = [
    './',
    './index.html',
    './css/style.css?v=15.0',
    './js/data.js',
    './js/app.js?v=15.0',
    'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Tajawal:wght@300;400;500;700;800&family=Scheherazade+New:wght@400;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// 1. التثبيت: تحميل الملفات الجديدة
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('✅ Pre-caching V15 Assets');
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting(); // إجبار المتصفح على تفعيل النسخة الجديدة فوراً
});

// 2. التفعيل: مسح أي كاش قديم (النسخ السابقة)
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

// 3. الجلب (Fetch Strategy): Network First for dynamic, Cache First for static
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            if (cachedResponse) {
                // إذا كان الملف موجود في الكاش، استخدمه فوراً (سرعة فائقة)
                // وفي نفس الوقت قم بتحديثه في الخلفية (Stale-While-Revalidate)
                fetch(e.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
                    }
                }).catch(() => {/* تجاهل أخطاء الشبكة في الخلفية */});
                
                return cachedResponse;
            }

            // إذا لم يكن في الكاش، اطلبه من الشبكة
            return fetch(e.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(e.request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                // إذا فشلت الشبكة ولا يوجد كاش (مثلاً أنت أوفلاين) اعرض صفحة index
                return caches.match('./index.html');
            });
        })
    );
});
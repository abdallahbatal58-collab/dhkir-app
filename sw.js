/* ============================================
   ذِكْر | Service Worker (V113 - Final Fix)
   ============================================ */

// اسم الكاش متغير عشان نمسح أي نسخة قديمة وننزل الجديدة فوراً
const CACHE_NAME = 'dhikr-v113-ultimate-fix';
const API_CACHE_NAME = 'dhikr-api-v113';

// الملفات الأساسية اللي لازم تتحفظ عشان التطبيق يفتح أوفلاين
const ASSETS = [
    './',
    './index.html',
    './css/style.css?v=113.0',
    './js/data.js?v=113.0',
    './js/app.js?v=113.0',
    // مكتبة السحب Swiper
    'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css',
    'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js',
    // خطوط جوجل
    'https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Amiri:wght@400;700&family=Tajawal:wght@300;400;500;700;800&family=Scheherazade+New:wght@400;700&display=swap',
    // أيقونات FontAwesome
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// 1. التثبيت (Install): حفظ الملفات الأساسية
self.addEventListener('install', (e) => {
    console.log('✅ [SW] Installing V113...');
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS).catch(err => {
                console.log('⚠️ [SW] Cache addAll error:', err);
            });
        })
    );
    self.skipWaiting(); // إجبار المتصفح على تفعيل النسخة الجديدة فوراً
});

// 2. التفعيل (Activate): مسح الكاش القديم بالكامل
self.addEventListener('activate', (e) => {
    console.log('🚀 [SW] Activating V113...');
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
    self.clients.claim(); // السيطرة على جميع الصفحات المفتوحة فوراً
});

// 3. الجلب (Fetch): استراتيجية ذكية
self.addEventListener('fetch', (e) => {
    const request = e.request;
    const url = new URL(request.url);

    // تجاهل الطلبات اللي مش GET
    if (request.method !== 'GET') return;

    // أ. لو الطلب بيروح لموقع القرآن (API) -> استخدم Network First
    // (يعني جرب تجيب من النت الأول، لو مفيش نت هات من الكاش)
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

    // ب. لباقي الملفات (HTML, CSS, JS, Fonts, Swiper) -> استخدم Cache First
    // (يعني هات من الكاش فوراً للسرعة الفائقة)
    e.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse; // رجع الملف من الكاش
            }
            
            // لو مش موجود في الكاش، نزله من النت وخزنه
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
                // لو النت فصل والملف مش موجود في الكاش، افتح الصفحة الرئيسية
                return caches.match('./index.html');
            });
        })
    );
});
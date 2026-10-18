/* ============================================
   ذِكْر | Service Worker (V110 - Moderate & Complete)
   ============================================ */

// غيرنا رقم النسخة عشان نمسح الكاش القديم ونجبر المتصفح ينزل الملفات الجديدة
const CACHE_NAME = 'dhikr-v110-tajweed-final';

// قائمة الملفات اللي التطبيق محتاجها عشان يشتغل أوفلاين
const ASSETS = [
    './',
    './index.html',
    './css/style.css?v=110.0',
    './js/data.js?v=110.0',
    './js/app.js?v=110.0',
    // مكتبة Swiper
    'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css',
    'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js',
    // الخطوط والأيقونات
    'https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Amiri:wght@400;700&family=Tajawal:wght@300;400;500;700;800&family=Scheherazade+New:wght@400;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// 1. التثبيت (Install): تحميل الملفات الأساسية
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('✅ Pre-caching assets');
            return cache.addAll(ASSETS);
        }).catch(err => console.log('⚠️ Cache error:', err))
    );
    self.skipWaiting(); // تفعيل فوري
});

// 2. التفعيل (Activate): مسح أي كاش قديم عشان نوفر مساحة
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

// 3. الجلب (Fetch): استراتيجية ذكية للتعامل مع الملفات والـ API
self.addEventListener('fetch', (e) => {
    // لو الطلب بيروح لموقع الـ API بتاع القرآن (api.alquran.cloud أو api.quran.com)
    // هنستخدم استراتيجية (Network First) عشان دايماً نجيب أحدث آيات
    if (e.request.url.includes('api.alquran.cloud') || e.request.url.includes('api.quran.com')) {
        e.respondWith(
            fetch(e.request).then((networkResponse) => {
                // خزن نسخة في الكاش عشان لو قفلت النت تفتح السور اللي قريتها
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(e.request, responseClone);
                });
                return networkResponse;
            }).catch(() => {
                // لو مفيش نت، هات من الكاش
                return caches.match(e.request);
            })
        );
        return;
    }

    // لباقي الملفات (HTML, CSS, JS, Fonts)
    // هنستخدم (Cache First) عشان السرعة الفائقة
    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(e.request).then((networkResponse) => {
                // تحديث الكاش بالملفات الجديدة
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(e.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // لو النت فصل وملف مش موجود في الكاش، رجع الصفحة الرئيسية
                return caches.match('./index.html');
            });
        })
    );
});
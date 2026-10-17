/* ============================================
   ذِكْر | Enterprise Service Worker (V8.5)
   استراتيجيات تخزين متقدمة للسرعة القصوى والعمل بدون إنترنت
   ============================================ */

const CACHE_VERSION = 'v8.5.0';
const STATIC_CACHE = `dhikr-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dhikr-dynamic-${CACHE_VERSION}`;
const FONT_CACHE = `dhikr-fonts-${CACHE_VERSION}`;

// الملفات الأساسية اللي لازم تتحمل أول مرة
const ASSETS = [
    './',
    './index.html',
    './css/style.css?v=8.0',
    './js/app.js?v=8.0',
    './js/data.js',
    './manifest.json'
];

// 1. حدث التثبيت: تحميل الملفات الأساسية
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log('✅ Pre-caching static assets');
            return cache.addAll(ASSETS);
        }).then(() => self.skipWaiting()) // تفعيل النسخة الجديدة فوراً
    );
});

// 2. حدث التفعيل: مسح الكاش القديم جداً عشان منستهلكش مساحة
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== FONT_CACHE) {
                        console.log('🗑️ Deleting old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim()) // السيطرة على الصفحات المفتوحة
    );
});

// 3. حدث الجلب (Fetch): استراتيجيات التخزين الذكية
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // أ. تجاهل الطلبات اللي مش من GET
    if (request.method !== 'GET') return;

    // ب. الخطوط (Google Fonts) -> Cache First (سرعة فائقة)
    if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
        event.respondWith(cacheFirst(request, FONT_CACHE));
        return;
    }

    // ج. الأيقونات الخارجية -> Stale While Revalidate (تحديث في الخلفية)
    if (url.hostname.includes('cdnjs.cloudflare.com')) {
        event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
        return;
    }

    // د. باقي الملفات (HTML, CSS, JS) -> Stale While Revalidate
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
});

// --- دوال استراتيجيات التخزين (Caching Strategies) ---

// استراتيجية 1: الكاش أولاً (لو موجود هاته فوراً، لو مش موجود نزله)
async function cacheFirst(request, cacheName) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(cacheName);
        cache.put(request, networkResponse.clone());
        return networkResponse;
    } catch (error) {
        return caches.match('./index.html'); // صفحة احتياطية لو النت فصل
    }
}

// استراتيجية 2: الذكي (هات من الكاش عشان السرعة، وحدث في الخلفية)
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request).then((networkResponse) => {
        cache.put(request, networkResponse.clone());
        return networkResponse;
    }).catch(() => null);

    return cachedResponse || fetchPromise;
}

// 4. دعم المزامنة في الخلفية (لأوقات الصلاة أو التذكيرات المستقبلية)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-dhikr') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    console.log('🔄 Background Sync triggered');
    // هنا ممكن تضيف كود ليجيب أوقات الصلاة ويحدث الكاش
}

// 5. دعم الإشعارات (Push Notifications)
self.addEventListener('push', (event) => {
    let data = { title: 'ذِكْر', body: 'حان وقت الذكر 🌿' };
    if (event.data) {
        try { data = event.data.json(); } catch (e) { data.body = event.data.text(); }
    }

    const options = {
        body: data.body,
        icon: 'https://placehold.co/192x192/0d3b2e/d4af37.png?text=Dhikr',
        badge: 'https://placehold.co/96x96/0d3b2e/d4af37.png?text=D',
        vibrate: [200, 100, 200],
        data: { url: '/' }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// 6. عند الضغط على الإشعار يفتح التطبيق
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === '/' && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow('/');
        })
    );
});
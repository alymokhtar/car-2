// Car Rental PRO - Service Worker (مبسط)
const CACHE_NAME = 'car-rental-pro-v1.0.0';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/app.js',
  '/manifest.json',
  '/icon-180.png',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
];

// تثبيت Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] التثبيت');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] تخزين الملفات الأساسية في الكاش');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] التفعيل');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] حذف الكاش القديم:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// اعتراض الطلبات
self.addEventListener('fetch', (event) => {
  // استثناء Firebase من الكاش
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // إذا كان الملف في الكاش، استرجعه
        if (cachedResponse) {
          return cachedResponse;
        }

        // وإلا حمله من الشبكة
        return fetch(event.request)
          .then((networkResponse) => {
            // تأكد من أن الرد ناجح وقابل للتخزين
            if (!networkResponse || networkResponse.status !== 200 || 
                networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // تخزين في الكاش للمستقبل (فقط للطلبات المدعومة)
            const responseToCache = networkResponse.clone();
            if (event.request.url.startsWith('http')) {
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }

            return networkResponse;
          })
          .catch(() => {
            // إذا فشل الاتصال، عرض صفحة أوفلاين
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
  );
});
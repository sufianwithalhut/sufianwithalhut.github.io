// =========================================================
// AlHut-Rocket-V12: محرك الكاش الصاروخي (Enterprise Edition)
// تحديث: التعامل مع الإشعارات + توفير البيانات + سرعة الفتح 🚀
// =========================================================

const CACHE_NAME = 'AlHut-Core-V12';
const CDN_CACHE_NAME = 'AlHut-CDNs-V1';

// قائمة الملفات الأساسية للنظام
const ASSETS_TO_CACHE = [
  './',
  './Master.html',
  './Restaurant.html', 
  './Driver.html',     
  './manifest_master.json',
  './manifest_restaurant.json',
  './manifest_driver.json',
  './master-logo.png',
  './rest-logo.png',
  './driver-logo.png'
];

// 1. التثبيت (Install): شحن الملفات لتعمل بدون إنترنت
self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('🚀 [AlHut SW] جاري تهيئة محركات الكاش الصاروخية...');
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.warn(`⚠️ [AlHut SW] ملف مفقود تم تخطيه: ${url}`)))
      );
    })
  );
});

// 2. التفعيل (Activate): تنظيف النفايات والنسخ القديمة
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME && cache !== CDN_CACHE_NAME) {
            console.log('🧹 [AlHut SW] تم تطهير الذاكرة القديمة:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. جلب البيانات (Fetch): استراتيجية التوجيه الذكي (Smart Routing)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 🔴 أ. طلبات قاعدة البيانات (جوجل سكريبت) -> اذهب للإنترنت دائماً وبصورة مباشرة
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 🔵 ب. ملفات البرمجة الخارجية (CDNs) -> الذاكرة أولاً (لتوفير باقة النت وسرعة الفتح)
  if (url.hostname.includes('unpkg.com') || 
      url.hostname.includes('cdn.jsdelivr.net') || 
      url.hostname.includes('fonts.googleapis.com') || 
      url.hostname.includes('fonts.gstatic.com') ||
      url.hostname.includes('basemaps.cartocdn.com')) {
    
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) return cachedResponse; 
        
        return fetch(event.request).then(networkResponse => {
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CDN_CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 🟢 ج. ملفات النظام الأساسية -> استراتيجية (Stale-While-Revalidate)
  // تفتح التطبيق بلمح البصر من الهاتف، وتحدث المحتوى من النت بصمت في الخلفية
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse.status === 200) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
        }
        return networkResponse;
      }).catch(() => {
        // في حال انقطاع النت تماماً، سيعمل التطبيق من الذاكرة
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. التعامل مع الإشعارات (Notification Click)
// عند ضغط الكابتن على الإشعار، يفتح التطبيق فوراً في وجهه
self.addEventListener('notificationclick', event => {
  event.notification.close(); 

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // إذا كان التطبيق مفتوحاً في الخلفية، قم بعمل Focus له
      for (let client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // إذا كان التطبيق مغلقاً تماماً، قم بفتحه على صفحة الكابتن
      if (clients.openWindow) {
        return clients.openWindow('./Driver.html'); 
      }
    })
  );
});

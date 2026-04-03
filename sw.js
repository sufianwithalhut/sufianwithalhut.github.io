// =========================================================
// AlHut-Rocket-V12: محرك الكاش الصاروخي (Enterprise Edition)
// تحديث: إصلاح التحديث بالخلفية + دعم الـ Opaque + التوجيه الذكي للإشعارات 🚀
// =========================================================

const CACHE_NAME = 'AlHut-Core-V12.1'; 
const CDN_CACHE_NAME = 'AlHut-CDNs-V1.1';

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

// 1. التثبيت (Install)
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

// 2. التفعيل (Activate)
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

// 3. جلب البيانات (Fetch)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 🔴 أ. طلبات قاعدة البيانات (جوجل سكريبت) -> إنترنت فقط
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 🔵 ب. ملفات الـ CDNs والأصوات والخرائط -> Cache First
  if (url.hostname.includes('unpkg.com') || 
      url.hostname.includes('cdn.jsdelivr.net') || 
      url.hostname.includes('fonts.googleapis.com') || 
      url.hostname.includes('fonts.gstatic.com') ||
      url.hostname.includes('basemaps.cartocdn.com') ||
      url.hostname.includes('actions.google.com')) { // 🟢 تم إضافة الأصوات للكاش
    
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) return cachedResponse; 
        
        return fetch(event.request).then(networkResponse => {
          // 🚨 السماح للردود التي ليس بها CORS (Opaque) بالدخول للكاش
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const responseClone = networkResponse.clone();
            caches.open(CDN_CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 🟢 ج. ملفات النظام الأساسية -> Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
        }
        return networkResponse;
      }).catch(() => {
        console.log('📶 وضع الأوفلاين مفعل للمسار:', url.pathname);
      });

      if (cachedResponse) {
         // 🚨 إجبار المتصفح على عدم إغلاق الـ Service Worker حتى يكتمل التحديث
         event.waitUntil(fetchPromise); 
         return cachedResponse;
      }
      
      return fetchPromise;
    })
  );
});

// 4. التعامل مع الإشعارات (Notification Click)
self.addEventListener('notificationclick', event => {
  event.notification.close(); 

  // 🚨 قراءة الرابط من بيانات الإشعار، أو التوجيه للجذر ليقوم السيرفر بتوجيهه
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // البحث عن أي نافذة تابعة للنظام وفتحها
      for (let client of windowClients) {
        if (client.url.includes('Driver.html') || client.url.includes('Restaurant.html') || client.url.includes('Master.html')) {
          if ('focus' in client) {
            return client.focus();
          }
        }
      }
      // إذا كان مغلقاً تماماً، نفتح الرابط المستهدف
      if (clients.openWindow) {
        return clients.openWindow(targetUrl); 
      }
    })
  );
});

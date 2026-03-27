// تم تغيير الاسم للإصدار الثاني لكي نجبر هواتف المستخدمين على التحديث
const CACHE_NAME = 'sufian-system-v2';

// أضفنا ملفات الكباتن إلى جانب ملفات المطاعم ليفتح كلاهما بسرعة الصاروخ
const ASSETS_TO_CACHE = [
  './restaurant.html',
  './manifest_restaurant.json',
  './driver.html',
  './manifest_driver.json'
];

// 1. مرحلة التثبيت (تخزين ملفات التطبيقين معاً)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] جاري تخزين ملفات المطاعم والكباتن...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // تفعيل فوري للتحديثات
});

// 2. مرحلة التنشيط (هنا السحر: تنظيف الذاكرة القديمة فوراً)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          // إذا وجد الهاتف ذاكرة قديمة لا تطابق الاسم الجديد، يقوم بحذفها
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] مسح الذاكرة القديمة:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  event.waitUntil(self.clients.claim());
});

// 3. مرحلة جلب البيانات (استراتيجية: جلب من الذاكرة أولاً ثم الإنترنت)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // إذا وجدنا الملف في الذاكرة، نعطيه فوراً (سرعة خيالية)، وإلا نجلبه من الإنترنت
      return response || fetch(event.request);
    }).catch(() => {
      console.log('لا يوجد اتصال بالإنترنت!');
    })
  );
});

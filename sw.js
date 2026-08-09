// =========================================================
// AlHut-Rocket-V13: محرك الكاش الصاروخي (Hybrid Enterprise Edition)
// تحديث: حماية Firebase اللحظي + تمرير رفع الصور (POST) + تسريع الأوفلاين 🚀
// =========================================================

const CACHE_NAME = 'AlHut-Core-V14.0'; 
const CDN_CACHE_NAME = 'AlHut-CDNs-V14.0';

// قائمة الملفات الأساسية للنظام
// 🩹 [كاش الأوفلاين] تصحيح حالة الأحرف: GitHub Pages حسّاس لها، وكانت القائمة
//   تطلب 'Restaurant.html' و'Driver.html' بينما الملفان بحروف صغيرة — فيعودان
//   بـ404 ويُتخطّيان بصمت (cache.add(...).catch). النتيجة: تطبيقا الكابتن
//   والمطعم بلا قشرة أوفلاين إطلاقاً، وهما الأشدّ حاجة إليها (الكابتن على
//   الطريق بشبكة متقطّعة). أُزيل كذلك manifest_driver.json و driver-logo.png
//   لأنهما غير موجودَين في المستودع — أعِدهما هنا فور رفعهما.
/* 🔴 [أ٢] قائمة الأصول كانت تحمل **أسماء ملفات النظام الشقيق** لا سفيان.
   ─────────────────────────────────────────────────────────────────────────
   كُتبت: Master.html · master-logo.png · rest-logo.png — ولا وجود لأيٍّ منها
   في مجلّد سفيان (ملفاته: admin.html · restaurant.html · driver.html ·
   leader.html · monitor.html · بلا شعارات).

   والأثر لم يكن انهياراً بل **صمتاً**: cache.add لكل ملف محاطة بـcatch
   تطبع تحذيراً في الكونسول — وهو مكانٌ لا وجود له على جوال أندرويد. فبقي
   التخزين المسبق يفشل جزئياً منذ اليوم الأول ولا أحد يعلم:
     · لوحة الإدارة لم تُخزَّن قط (اسمها admin لا Master)
     · وثلاث محاولات جلب فاشلة عند كل تثبيت لعامل الخدمة

   ⚠️ ولا تُضِف ملفاً هنا قبل أن تتأكّد من وجوده بالاسم حرفاً بحرف. */
const ASSETS_TO_CACHE = [
  './',
  './admin.html',
  './restaurant.html',
  './driver.html',
  './leader.html',
  './monitor.html',
  './manifest_master.json',
  './manifest_restaurant.json'
];

// 1. التثبيت (Install)
self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('🚀 [AlHut SW] جاري تهيئة محركات الكاش الصاروخية V13...');
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
  // 🚨 أ. خط أحمر: السماح لطلبات POST (مثل رفع الصور إلى ImgBB) بالمرور مباشرة دون تدخل الكاش
  if (event.request.method !== 'GET') {
    return; 
  }

  const url = new URL(event.request.url);

  // 🔴 ب. طلبات قاعدة البيانات (جوجل سكريبت) + Firebase اللحظي -> إنترنت فقط (تُمنع من الكاش نهائياً)
  /* 🔧 [ترتيب] كانت includes('googleapis.com') تلتقط **fonts.googleapis.com**
     أيضاً، فيخرج ملف الخط من هنا «شبكة فقط» ولا يصل القاعدة (ج) أدناه
     المكتوبة خصّيصاً لتخزينه — أي أن الخط الحاجب للعرض لم يكن يُخزَّن أبداً
     مهما تكرّر فتح التطبيق، فبقي في المسار الحرج لشاشة التحميل.
     واستُبدلت includes بـ endsWith و === : أضبط لا أوسع. */
  const isFontCss = url.hostname === 'fonts.googleapis.com';
  if (!isFontCss && (
      url.hostname === 'script.google.com' ||
      url.hostname.endsWith('firebasedatabase.app') ||
      url.hostname.endsWith('googleapis.com') ||
      url.hostname.includes('imgbb.com'))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 🔵 ج. ملفات الـ CDNs والأصوات والخرائط -> Cache First
  /* 🔧 www.gstatic.com (حزم Firebase الثلاث: app · auth · database) كانت
     تسقط للقاعدة (د) بالصدفة. إدراجها صريحاً هنا يضمن تخزينها — وهي ثلاثة
     موارد **حاجبة لاكتمال التحميل** يحمّلها driver.html في ترويسته. */
  if (url.hostname.includes('www.gstatic.com') ||
      url.hostname.includes('unpkg.com') || 
      url.hostname.includes('cdn.jsdelivr.net') || 
      url.hostname.includes('fonts.googleapis.com') || 
      url.hostname.includes('fonts.gstatic.com') ||
      url.hostname.includes('basemaps.cartocdn.com') ||
      url.hostname.includes('actions.google.com')) { 
    
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        /* ═══════════════════════════════════════════════════════════════════
           🔴 [الجذر] كان يُخزَّن الردّ الـopaque ويُقدَّم إلى الأبد.
           ───────────────────────────────────────────────────────────────────
           الردّ الـopaque ردُّ طلبٍ بلا CORS: حالته 0 وجسمه غير مقروء، ويقع
           عند تعثّر الشبكة. وباستراتيجية Cache-First هنا يُقدَّم بلا إعادة
           تحقّق أبداً — ووحدة ES لا تستطيع تنفيذه ⇒ التطبيق يموت عند أول
           import ولا يُعرَّف أي شيء.

           وقع هذا في النظام الشقيق فعلاً وعطّل دخول المطاعم يوماً كاملاً،
           ولم ينفع فيه تراجعٌ ولا مسحُ ملفات — لأن السمّ في كاش الـCDN.

           ① لا يُخزَّن إلا الصالح  ② ولا يُقدَّم المخزَّن إلا إن كان صالحاً،
           وإلا يُحذف ويُعاد جلبه ⇒ **الكاش يشفي نفسه**.
           ═══════════════════════════════════════════════════════════════════ */
        if (cachedResponse && cachedResponse.status === 200 && cachedResponse.type !== 'opaque') {
          return cachedResponse;
        }
        if (cachedResponse) {
          console.warn('🧹 [AlHut SW] مدخل كاش تالف — يُطرح ويُعاد جلبه:', url.pathname);
          caches.open(CDN_CACHE_NAME).then(c => c.delete(event.request)).catch(() => {});
        }

        return fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
            const responseClone = networkResponse.clone();
            caches.open(CDN_CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
          return networkResponse;
        }).catch(err => console.log('⚠️ [AlHut SW] CDN Offline:', url.hostname));
      })
    );
    return;
  }

  // 🟢 د. ملفات النظام الأساسية -> Stale-While-Revalidate مع التجاهل الذكي للمتغيرات (ignoreSearch)
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
        }
        return networkResponse;
      }).catch(() => {
        console.log('📶 وضع الأوفلاين مفعل للمسار:', url.pathname);
      });

      if (cachedResponse) {
         // إجبار المتصفح على عدم إغلاق الـ Service Worker حتى يكتمل التحديث بالخلفية
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

  // التوجيه للجذر أو الرابط المرفق
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // البحث عن أي نافذة مفتوحة للنظام وتفعيلها
      /* 🔴 [أ٣] المطابقة كانت **حسّاسة لحالة الأحرف** — وبأسماء النظام الشقيق.
         ─────────────────────────────────────────────────────────────────────
         كُتبت: 'Driver.html' · 'Restaurant.html' · 'Master.html'
         وملفات سفيان: driver.html · restaurant.html · admin.html — بحرفٍ صغير.

         و includes() لا تتسامح مع حالة الأحرف إطلاقاً. ⇒ الحلقة **لا تطابق
         نافذةً مفتوحة أبداً**، فتسقط إلى openWindow في كل مرّة:
           · الكابتن يضغط الإشعار وتطبيقه مفتوح ⇒ **نافذة ثانية** فوق الأولى
           · وجلسته في الأولى، فقد يجد نفسه أمام شاشة دخول
           · وكلتا النافذتين تنبضان وتكتبان الموقع ⇒ كاتبان لعقدةٍ واحدة

         وهو يفسّر جزءاً من «الكاتب الثالث» الموصوف في antiHijackGuard.

         الآن: مقارنة بحروفٍ صغيرة على الجانبين، والأسماء أسماء سفيان. */
      for (let client of windowClients) {
        const u = String(client.url || '').toLowerCase();
        if (u.includes('driver.html') || u.includes('restaurant.html') ||
            u.includes('admin.html')  || u.includes('leader.html')) {
          if ('focus' in client) {
            return client.focus();
          }
        }
      }
      // إذا كانت مغلقة تماماً، افتح نافذة جديدة
      if (clients.openWindow) {
        return clients.openWindow(targetUrl); 
      }
    })
  );
});

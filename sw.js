/* ═══════════════════════════════════════════════════════════════════════════
   sw.js — [V31.30] عامل الخدمة الحقيقي لتطبيق الكابتن
   ───────────────────────────────────────────────────────────────────────────
   السابق كان نصّاً مضمَّناً يُسجَّل من blob: — ومواصفة Service Worker ترفض أيّ
   مخطّطٍ غير http/https، فلم يُسجَّل يوماً، و.catch ابتلع الرفض. لا كاش،
   لا قشرة بلا إنترنت، ولافتة «يعمل بدون إنترنت» تَعِد بما لا يوجد.

   هذا الملف يُرفع **بجوار driver.html** على الأصل نفسه (شرطٌ لا تفضيل).

   ما يفعله:
     ① driver.html: شبكةٌ أوّلاً بمهلة ٨ ث ⇒ الكاش ⇒ صفحة «لا اتصال» صغيرة.
        فعلى شبكةٍ زاحفة يُقلع من الكاش في ثوانٍ **بالجلسة نفسها** (أصلٌ واحد)،
        وحارس العشرين ثانية في MainActivity لا ينطلق — والاحتياطي المدفون
        (file:// بأصلٍ آخر بلا جلسة) يصير طريقاً أخيراً نادراً لا معتاداً.
     ② firebasejs من gstatic: روابط مرقّمة لا تتغيّر ⇒ الكاش أوّلاً.
     ③ الخطوط: الكاش ثم التحديث في الخلفية.
     ④ كل ما يحمل بيانات (Apps Script · RTDB · Functions · Storage · googleapis)
        **لا يُلمس** — تمريرٌ صرف. لا يُخزَّن ردُّ دخولٍ ولا ردُّ طلب.

   ⚠️ VER يجب أن يساوي CURRENT_APP_VERSION في driver.html حرفاً بحرف:
      build.js يرفض البناء عند الاختلاف، وtest_gate يحرسه. فتغيير الإصدار
      يُنشئ كاشاً جديداً ويُسقط القديم عند التفعيل — لا نسختين معاً.
   ═══════════════════════════════════════════════════════════════════════════ */
const VER   = '31.54-Persist';
const CACHE = 'suf-' + VER;
const SHELL = ['./driver.html'];
const NET_TIMEOUT_MS = 8000;

const OFFLINE_HTML =
  '<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1"><title>سفيان</title>' +
  '<style>body{font-family:Cairo,sans-serif;text-align:center;padding:60px 20px;background:#f0f4ff;color:#1e3a8a}' +
  'h2{font-size:1.4rem;margin:12px 0}p{color:#64748b;font-size:.95rem}' +
  'button{background:#1e3a8a;color:#fff;border:none;border-radius:16px;padding:14px 32px;font-size:1rem;font-weight:700;margin-top:20px}</style></head>' +
  '<body><div style="font-size:64px">📡</div><h2>لا اتصال بالإنترنت</h2>' +
  '<p>سيعود التطبيق تلقائياً عند عودة الشبكة. طلباتك محفوظة.</p>' +
  '<button onclick="location.reload()">إعادة المحاولة</button></body></html>';

const BYPASS = [
  /script\.google(usercontent)?\.com/, /firebasedatabase\.app/, /firebaseio\.com/,
  /cloudfunctions\.net/, /\.run\.app/, /googleapis\.com/, /firebasestorage/, /securetoken/,
  /identitytoolkit/, /fcm\./
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith('suf-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function withTimeout(p, ms) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('sw_timeout')), ms);
    p.then((v) => { clearTimeout(t); res(v); }, (err) => { clearTimeout(t); rej(err); });
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (BYPASS.some((r) => r.test(url.host + url.pathname))) return;   /* بيانات — لا تُلمس */

  const isShell = req.mode === 'navigate' || /\/driver\.html$/.test(url.pathname);
  if (isShell) {
    e.respondWith(
      withTimeout(fetch(req), NET_TIMEOUT_MS)
        .then((r) => {
          if (r && r.ok) { const cl = r.clone(); caches.open(CACHE).then((c) => c.put('./driver.html', cl)); }
          return r;
        })
        .catch(() => caches.match('./driver.html').then((r) =>
          r || new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html;charset=utf-8' } })))
    );
    return;
  }

  if (/^www\.gstatic\.com$/.test(url.host) && /\/firebasejs\//.test(url.pathname)) {   /* SDK مرقّم — لا يتغيّر */
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
      if (r && r.ok) { const cl = r.clone(); caches.open(CACHE).then((c) => c.put(req, cl)); }
      return r;
    })));
    return;
  }

  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.host)) {   /* خطوط — الكاش ثم التحديث */
    e.respondWith(caches.match(req).then((hit) => {
      const net = fetch(req).then((r) => { if (r && r.ok) { const cl = r.clone(); caches.open(CACHE).then((c) => c.put(req, cl)); } return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  /* غير ذلك (شعارات · manifest): تمريرٌ مع احتياطي الكاش */
  e.respondWith(fetch(req).catch(() => caches.match(req)));
});

self.addEventListener('message', (e) => {
  if (e.data === 'ping' && e.ports && e.ports[0]) e.ports[0].postMessage('pong');
  if (e.data === 'version' && e.ports && e.ports[0]) e.ports[0].postMessage(VER);
});

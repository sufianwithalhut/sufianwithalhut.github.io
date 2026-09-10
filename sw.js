{
  "rules": {
    // ═══════════════════════════════════════════════════════════════════
    // 🦈 نظام الحوت — قواعد الأمان المحصّنة (V4.0)
    //
    // V4.0: sub_collections — سجلّ استلام الاشتراكات الشهرية.
    //   ولماذا عقدةٌ ثانية بدل clearing_requests؟ لأن الاشتراك **يتكرّر
    //   كل شهر**، ومفتاحٌ بالهاتف وحده يُخفي المطعم بعد أول تسجيل إلى
    //   الأبد. فالفهرسة بالشهر ثم الهاتف: sub_collections/{YYYY-MM}/{هاتف}.
    //   ⚠️ وهي **سجلّ لا دفتر**: الاشتراك ليس ديناً في النظام أصلاً
    //      (parseCommissionRule تُرجع res=0 للشهري، وmonthlyArchiver
    //       يحسبه ويطبعه في البريد ولا يكتبه في ledgers).
    //
    // V3.9: لوحة تصفير الديون — تعديلان لا ثالث لهما:
    //   ① قراءة جذرية على restaurants_config للإدارة والموظفين. القواعد
    //      لا تتصاعد لأعلى، فالسماح عند $phone وحده كان يعني أن الليدر
    //      يقرأ مطعمه هو ولا يسرد الأسماء. (نفس علّة driver_chats في V2.2.)
    //   ② عقدة clearing_requests — إشارةٌ لا فعل. لا تُصفّر ديناً: التصفير
    //      يمرّ حتماً بـresetDebtForEntity خلف كلمة مرور الإدارة.
    //   ⚠️ وأضِف كنسها في purgeBloatCore — عقدةٌ بكاتب بلا حاذف هي ما
    //      عولج في shadow_compare و client_events في CF-9.1.
    //
    // V3.0: مرافقة لـCode.gs V18.0 و index.js CF-8.0. **إضافة محضة.**
    //   لم تُخفَّض صلاحية واحدة ولم يُغلق باب قائم — فالنشر آمن قبل أي واجهة.
    //   أربع عقد سيرفرية مغلقة تماماً:
    //     entity_sessions ← جلسات الكباتن والمطاعم (Code.gs V18)
    //     legacy_usage    ← عدّادات المسارات القديمة (Code.gs V18)
    //     ops             ← مفاتيح عدم التكرار (CF-8.0)
    //     shadow_compare  ← أحكام وضع الظلّ (CF-8.0)
    //   وعقدة رصد واحدة للعميل: client_events (إضافة فقط، لا تعديل ولا حذف).
    //   وتحصين مفتاح الطلب عند الإنشاء — تفصيله عند active_orders أدناه.
    //
    // ⚠️ ما **لم** يُفعل هنا بعد، وهو مقصود:
    //   "active_orders": { ".write": false }
    //   هذه آخر خطوة في المشروع كلّه لا أولاها. لو نُشرت اليوم لعجزت المطاعم
    //   عن إنشاء أي طلب (restaurant.html:2451) وسقطت لوحة الإدارة معها —
    //   فهي عملياً مفتاح إيقاف لعملك. لا تُنشر قبل أن يقرأ diagnoseCommands
    //   صفر كتابة مباشرة سبعةَ أيام متصلة.
    //
    //
    // V2.2: قراءة جذرية على driver_chats لدور admin/staff — لوحة الليدر تقرأ
    //   العقدة الأم لتبني قائمة المحادثات، وقواعد فايربيس لا تتصاعد لأعلى،
    //   فكان السماح عند $phone وحده يرفض قراءة الأم وتبقى رسائل الكباتن غير مرئية.
    //
    // V2.1 (مواءمة تطبيق الكابتن V14.0):
    //   • daily_metrics: سُمح للكابتن بكتابة عدّادَي العرض الخاصين به
    //     (completed_orders/total_delivery_minutes) — rejected_orders تبقى
    //     سيرفرية (تُسجَّل عبر DECLINE_ORDER). هذه مقاييس عرض لا مالية؛
    //     الحقيقة المالية في ledgers/ وcompleted_orders/ السيرفريتين.
    //   • daily_ledgers: سُمح للكابتن بإضافة سجل رحلته اليومي (عرض فقط).
    //   • driver_chats: عقدة الدردشة كابتن↔ليدر (كانت غائبة = مرفوضة كلياً).
    //   • security_flags: تسجيل محاولات الإنجاز المبكّر (كتابة ذاتية، قراءة إدارية).
    //
    // ⚠️ ترتيب النشر الإلزامي:
    //   ١) حدّث تطبيق الكابتن ليكتب بـ update({lat,lng,status,last_update})
    //      بدل set() الكاملة على drivers_locations/{phone} — وإلا انقطع تحديث المواقع.
    //   ٢) تأكد أن تطبيقات المطاعم/الكباتن تقرأ الطلبات باستعلام مفهرس:
    //      orderByChild('driverPhone').equalTo(myPhone) أو resPhone — لا قراءة العقدة كاملة.
    //   ٣) ثم انشر هذا الملف.
    //
    // 📌 تذكير: Cloud Functions (Admin SDK) وسيرفر GAS (OAuth service-account)
    //    يتجاوزان هذه القواعد كلياً — القواعد تحكم العملاء فقط.
    // ═══════════════════════════════════════════════════════════════════

    ".read": false,
    ".write": false,

    // ─────────────────────────────────────────────────────────────────
    // 📦 الطلبات النشطة
    //   🔧[خ٢٣] القراءة الكاملة للإدارة/الموظفين فقط؛ الكابتن والمطعم
    //           عبر استعلام مفهرس على حقلهما، أو قراءة طلب واحد يخصّهما.
    //   🔧[خ٤/خ٥] لا حذف (newData.exists() إلزامي) ولا أي تعديل بعد
    //           بلوغ حالة منتهية — فلا يتبخّر الدين قبل أرشفة الفجر.
    //   🔧[خ٦]  الإنشاء للمطعم صاحب الطلب فقط، بحالة ابتدائية صحيحة
    //           وبوجود timestamp إلزامي (يُغلق مصنع الأشباح اليتيمة).
    //   🔒[V3.2] وتحصين **حقل** id أيضاً — لا المفتاح وحده.
    //           المفتاح قُيّد في V3.0، لكن الطلب يحمل حقلاً اسمه id يكتبه
    //           تطبيق المطعم بحرّية، و.validate لم تكن تذكره إطلاقاً. وتطبيق
    //           الكابتن كان يحقنه خاماً في ستة مواضع — منها **داخل onclick**:
    //               onclick="orderAction('${o.id}','accept',this)"
    //           فمُعرّفٌ فيه علامة مفردة يُنفّذ كوداً في جهاز كل كابتن، ومعه
    //           جسر AndroidRadar كاملاً. مُثبَت بالتنفيذ.
    //           وعُقّم في الواجهة أيضاً (sid) — حزامان لا واحد.
    //   🔒[V3] تحصين **مفتاح** الطلب عند الإنشاء: ^[A-Za-z0-9_-]{1,64}$
    //           مفاتيح فايربيس تمنع . $ # [ ] / — ولا تمنع علامة التنصيص.
    //           والمطعم هو من يختار المفتاح. فمطعمٌ يزرع مُعرّفاً يحتوي "
    //           ثم يُسحب طلبه، فيبنى نصّ الإشعار في SufyanMessagingService
    //           بلصق المُعرّف داخل JSON بلا تهريب، ويُنفَّذ في WebView كل
    //           كابتن عبر pushEventToWeb — ومعه جسر AndroidRadar كاملاً.
    //           القيد على الإنشاء وحده (!data.exists) فلا تتأثّر طلبات
    //           قديمة قد تحمل صيغاً أخرى. والصيغة الحالية في
    //           restaurant.html و buildOrderId تمرّ كلتاهما بلا تعديل.
    //   🔧[خ٤]  الحقول المالية والهوية (timestamp/resPhone/price/comm/
    //           driverPhone) غير قابلة للتعديل من أي عميل بعد الإنشاء.
    // ─────────────────────────────────────────────────────────────────
    "active_orders": {
      ".indexOn": ["timestamp", "status", "driverPhone", "resPhone"],
      ".read": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff' || (query.orderByChild == 'driverPhone' && query.equalTo == auth.uid) || (query.orderByChild == 'resPhone' && query.equalTo == auth.uid))",

      "$order_id": {
        ".read": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff' || data.child('driverPhone').val() == auth.uid || data.child('resPhone').val() == auth.uid)",

        ".write": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff' || (auth.token.role == 'restaurant' && newData.exists() && ((!data.exists() && newData.child('resPhone').val() == auth.uid) || (data.exists() && data.child('resPhone').val() == auth.uid && !(data.child('status').val() == 'completed' || data.child('status').val() == 'مكتمل' || data.child('status').val() == 'settled' || data.child('status').val() == 'delivered' || data.child('status').val() == 'done' || data.child('status').val() == 'تم التسليم' || data.child('status').val() == 'تم' || data.child('status').val() == 'finished' || data.child('status').val() == 'complete' || data.child('status').val() == 'deleted')))) || (auth.token.role == 'driver' && newData.exists() && data.exists() && data.child('driverPhone').val() == auth.uid && !(data.child('status').val() == 'completed' || data.child('status').val() == 'مكتمل' || data.child('status').val() == 'settled' || data.child('status').val() == 'delivered' || data.child('status').val() == 'done' || data.child('status').val() == 'تم التسليم' || data.child('status').val() == 'تم' || data.child('status').val() == 'finished' || data.child('status').val() == 'complete' || data.child('status').val() == 'deleted')))",

        // قواعد صحة البنية والثبات — لا تُطبَّق على admin/staff:
         // 🔴 [V31 · ق-٥] وصار timestamp **مقيَّد الصيغة عند الإنشاء**.
           // ──────────────────────────────────────────────────────────────
           // كان الفحص طولاً فقط (length >= 10) بلا صيغة، والأرشيف يبني عليه
           // خانة اليوم (index.js:3607). ونفّذتُ الصيغتين اللتين تمرّان من فحص الطول:
//
               // new Date("01/02/2026 ")  →  2026-01-02   (١١ حرفاً — تمرّ)
               // new Date("31-08-2026")   →  Invalid Date
//
           // ⇒ مطعمٌ ينشئ طلباً حقيقياً بختمٍ "01/02/2026 ": الدَين يُحاسَب
             // صحيحاً، وسجلّ الطلب يهبط في completed_orders/2026-01-01 — خانةٌ لا
             // تعرضها لوحة الإدارة (نافذة ٣ أيام) ويحذفها الكنس الليلي
             // ⇒ **يُمحى الدليل على دَينٍ قائم خلال ٢٤ ساعة**.
           // ⇒ والصيغة غير الصالحة تجعل ageHours = Infinity في handleIfGhost
             // ⇒ الطلب يُعامَل شبحاً **لحظة إنشائه**.
//
           // ⚠️ والقيد على **الإنشاء وحده** عمداً: لو وُضع على الفرع العام
              // لتجمّد كل طلبٍ قائم في قاعدتك اليوم يحمل ختماً قديم الصيغة —
              // فأي تعديلٍ عليه (قبول · وصول · تسليم) يُرفض ويصير الطلب غير
              // قابلٍ للإنهاء. وفرع التعديل يشترط أصلاً تطابق الختم مع القديم،
              // فلا يستطيع أحدٌ إدخال صيغةٍ جديدة من هناك.
           // ✅ وكل مُنشئي الطلبات يكتبون ISO: index.js:1731 و index.js:5858 و
              // restaurant.html:3144 — تحقّقتُ من الثلاثة.
        //   • عند الإنشاء: timestamp نصّي إلزامي + status ابتدائي 'pending_driver'
        //     + driverPhone = 'system_routing' (المحرك هو من يعيّن، لا المطعم).
        //   • عند التعديل: timestamp / resPhone / price / comm / driverPhone ثابتة حرفياً.
        //     (تغيير driverPhone عند القبول لا يلزم العميل — القيمة نفسها موجودة أصلاً؛
        //      الرفض والسحب يمرّان عبر سيرفر GAS الذي يتجاوز القواعد.)
        ".validate": "(auth.token.role == 'admin' || auth.token.role == 'staff') || (newData.hasChildren(['timestamp', 'status', 'resPhone', 'driverPhone']) && newData.child('timestamp').isString() && newData.child('timestamp').val().length >= 10 && ((!data.exists() && newData.child('timestamp').val().matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T/) && $order_id.matches(/^[A-Za-z0-9_-]{1,64}$/) && (!newData.hasChild('id') || newData.child('id').val().matches(/^[A-Za-z0-9_-]{1,64}$/)) && newData.child('status').val() == 'pending_driver' && newData.child('driverPhone').val() == 'system_routing') || (data.exists() && newData.child('timestamp').val() == data.child('timestamp').val() && newData.child('resPhone').val() == data.child('resPhone').val() && newData.child('driverPhone').val() == data.child('driverPhone').val() && (!data.hasChild('price') || newData.child('price').val() == data.child('price').val()) && (!data.hasChild('comm') || newData.child('comm').val() == data.child('comm').val()))))",

        // ══════════════════════════════════════════════════════════════
        // 🔒 [V28] قيود الأبناء — الطبقة التي كانت غائبة كلياً.
        //   القاعدة أعلاه تحرس **ثبات** الحقول بعد الإنشاء ولا تحرس
        //   **نوعها** عند الإنشاء. فكان المطعم ينشئ طلباً بـ
        //   price = "<img src=x onerror=…>" فتُقفل القيمة الملوّثة ولا
        //   يستطيع أي عميل تصحيحها، ثم تُحقن في WebView كل كابتن
        //   (driver.html:3372 innerHTML · 3632 onclick) ومعها جسر
        //   AndroidRadar بثلاث عشرة دالة.
        //   ⚠️ وقاعدة الأب لا تُقيَّم عند الكتابة على ابنٍ مفرد — وكل
        //   كتابات العملاء الفعلية على أبناء مفردة
        //   (driver.html:3787 · restaurant.html:2747). فالحصانة المالية
        //   كانت معلّقة على سلوكٍ لا يقع. الآن كل قيدٍ على الابن الذي يحرسه.
        // ══════════════════════════════════════════════════════════════

        // 💰 عدد موجب لا نصّ — يقطع سلسلة الحقن من منبعها، ويبقى ثابتاً بعد الإنشاء.
        "price": {
          ".validate": "auth.token.role == 'admin' || auth.token.role == 'staff' || (newData.isNumber() && newData.val() >= 0 && newData.val() <= 100000000 && (!data.exists() || newData.val() == data.val()))"
        },

        // 🖼️ رابط الوصل: https فقط وبطول محدود. الحارس القديم في
        //   driver.html:3632 كان startsWith('http') — و"http'-alert(1)-'" يبدأ بـhttp.
        //   ⚠️ النصّ الفارغ مسموحٌ صراحةً: restaurant.html:2897 يمرّر ""
        //   لكل طلب يدوي أو سريع (أي أغلب الطلبات)، فمنعه يوقف الإنشاء.
        "photoUrl": {
          ".validate": "auth.token.role == 'admin' || auth.token.role == 'staff' || (newData.isString() && newData.val().length <= 600 && (newData.val().length == 0 || newData.val().matches(/^https:\\/\\/[A-Za-z0-9._~:\\/?#@!$&()*+,;=%-]*$/)))"
        },

        // 📍 إحداثيات المطعم — كانت تُلصق خاماً داخل onclick (driver.html:3654).
        "resLat": { ".validate": "auth.token.role == 'admin' || auth.token.role == 'staff' || (newData.isNumber() && newData.val() >= -90 && newData.val() <= 90)" },
        "resLng": { ".validate": "auth.token.role == 'admin' || auth.token.role == 'staff' || (newData.isNumber() && newData.val() >= -180 && newData.val() <= 180)" },

        // 🗺️ سقف الطول: getSimilarity في index.js:903 مصفوفة Levenshtein
        //   كاملة O(n×m) زمناً وذاكرةً بلا سقف. area بطول 50,000 حرف =
        //   2.5×10⁹ خانة ⇒ masterDispatchEngine يسقط بـOOM، والدورة
        //   التالية تقرأ الطلب نفسه فتسقط أيضاً ⇒ توقّف كامل للتوزيع
        //   بطلبٍ واحد. والقفل يُحرَّر في finally فلا يُنبّه أحد.
        "area":       { ".validate": "newData.isString() && newData.val().length <= 200" },
        "details":    { ".validate": "newData.isString() && newData.val().length <= 4000" },
        "restaurant": { ".validate": "newData.isString() && newData.val().length <= 120" },

        // 🆔 كان مُحصَّناً عند الإنشاء فقط — وفرع التعديل لا يذكره، فيُحقن
        //   في id بطاقة لوحة الإدارة (Master.html:2681، داخل سمة HTML).
        "id": {
          ".validate": "auth.token.role == 'admin' || auth.token.role == 'staff' || newData.val().matches(/^[A-Za-z0-9_-]{1,64}$/)"
        },

        // ══════════════════════════════════════════════════════════════
        // 🚦 [V28] آلة الحالات — أخطر ثغرة مالية في الملف.
        //   القاعدة القديمة تفحص الحالة **القديمة** فقط ولا تقيّد القيمة
        //   **الجديدة** إطلاقاً. فالمطعم يكتب status='deleted' على طلبٍ
        //   حالته picked_up (الكابتن استلم وأوصل ولم يضغط "تم" بعد):
        //   الحالة القديمة ليست في قائمة النهائيات ⇒ الكتابة مقبولة ⇒
        //   index.js:3149 يقرؤها isCancelled ⇒ صفر عمولة وصفر دين، و
        //   index.js:3719 يتخطّاها ⇒ الكابتن لا يُحتسب له التسليم.
        //   الزبون دفع، والكابتن قاد، والدفتر فارغ — قابلٌ للتكرار على
        //   كل طلب وغير مرئي في أي تنبيه.
        //   ⚠️ والإلغاء المشروع محفوظ **حرفياً كما تسمح به الواجهة**:
        //   restaurant.html:2794 يعرض زرّ الإلغاء لكل حالة عدا
        //   picked_up و"في الطريق". فالقاعدة تُطابق ذلك تماماً — تسمح
        //   بالإلغاء من pending_driver و manual_pending و accepted و
        //   arrived_at_res، وتمنعه بعد الاستلام.
        //   وهذا هو موضع السرقة بالضبط: بعد picked_up يكون الطعام بيد
        //   الكابتن وقد أوصله، فالإلغاء حينها ليس إلغاءً بل محو دين.
        //   الإلغاء المشروع بعد الاستلام (حالة نادرة) يمرّ عبر GAS
        //   الذي يتجاوز القواعد ويقيّد الدين والعمولة كما ينبغي.
        //   ⚠️ ولا توسّع الحارس بقائمة سوداء: القائمة البيضاء أدناه
        //   تعني أن أي حالة جديدة تُضاف مستقبلاً تكون ممنوعة افتراضاً.
        // ══════════════════════════════════════════════════════════════
        // 🚗 [V31.42] المركبة: يكتبها المطعم عند الإنشاء (car لطلبٍ واحد) — car_extra فرق السيارة
        "vehicle":   { ".validate": "newData.val() == 'car' || newData.val() == 'bike'" },
        "car_extra": { ".validate": "newData.isNumber() && newData.val() >= 0" },
        // 📬 [V31.40] offer_ack — إقرار استلام العرض من الكابتن المعروض عليه (المحرّك يقرؤه)
        "offer_ack": {
          // 🔴 [V31.53] كان الأبناء غير مُعلَنين، فوقعا تحت $other:false ⇒ **كل** إقرارٍ مرفوض
          //   (١٬٩٦١ رفضاً في أربعة أيام). والعميل يكتب phone وat مباشرةً، فتُقيَّم قاعدتهما هما.
          ".validate": "newData.hasChildren(['phone','at'])",
          "phone":  { ".validate": "newData.isString() && newData.val() == auth.uid" },
          "at":     { ".validate": "newData.isNumber()" },
          "$other": { ".validate": false }
        },
        "status": {
          ".validate": "auth.token.role == 'admin' || auth.token.role == 'staff' || (auth.token.role == 'restaurant' && (!data.exists() ? newData.val() == 'pending_driver' : (newData.val() == data.val() || (newData.val() == 'deleted' && data.val().matches(/^(pending_driver|manual_pending|accepted|arrived_at_res)$/))))) || (auth.token.role == 'driver' && newData.val().matches(/^(accepted|arrived_at_res|picked_up|completed)$/))"
        }
      }
    },

    // ─────────────────────────────────────────────────────────────────
    // 🛵 مواقع الكباتن — 🔧[خ٨] القلب المعماري للإصلاح:
    //   كتابة لكل حقل على حدة بدل كتابة العقدة كاملة. هذا يمنع:
    //   • محو last_assigned_time و daily_count بكتابة set() من التطبيق
    //     (سبب انهيار العدالة واحتكار القريبين — الأوزان كانت سليمة).
    //   • تزوير الكابتن لـ account_status (فك حظره) أو daily_count أو
    //     last_assigned_time (قفز للمقدمة).
    //   الحقول الحساسة لا كتابة لها من أي عميل — السيرفر فقط (يتجاوز القواعد).
    // ─────────────────────────────────────────────────────────────────
    "drivers_locations": {
      // ═══════════════════════════════════════════════════════════════════
      // 🔒 [أمن] كانت ".read": "auth != null" — أي أن **أي** حساب مصادَق،
      //    ومنه أي مطعم وأي كابتن، يقرأ إحداثيات الأسطول كله لحظياً، وحالة
      //    كل فرد، وعدّاد طلباته. منافس يسجّل مطعماً واحداً يحصل على خريطة
      //    حيّة لعملياتك: عدد كباتنك، مواقعهم، كثافتهم، ساعات ذروتك.
      //
      //    فُحص من يقرؤها فعلاً قبل التضييق:
      //      driver.html      → drivers_locations/<هاتفه>/lat·lng·status·
      //                          last_update·account_status   ← عقدته وحدها
      //      restaurant.html  → drivers_locations/<هاتف>/name ← الاسم فقط
      //      leader/admin     → العقدة كاملة                  ← بدور staff/admin
      //    فالتقييد أدناه لا يكسر أي مسار قائم.
      // ═══════════════════════════════════════════════════════════════════
      ".read": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')",
      ".indexOn": ["status"],
      "$phone": {
        // الكابتن يقرأ عقدته وحدها؛ والإدارة والليدر يقرآن الجميع
        ".read": "auth != null && (auth.uid == $phone || auth.token.role == 'admin' || auth.token.role == 'staff')",
        // 👤 الاسم وحده مفتوح لكل مصادَق — يحتاجه تطبيق المطعم لعرض
        //    «كابتنك: فلان». والإحداثيات والحالة والعدّاد تبقى محجوبة.
        "name": { ".read": "auth != null" },
        ".write": "auth != null && auth.token.role == 'admin'",
        "lat":         { ".write": "auth != null && auth.uid == $phone", ".validate": "newData.isNumber() && newData.val() >= -90 && newData.val() <= 90" },
        "lng":         { ".write": "auth != null && auth.uid == $phone", ".validate": "newData.isNumber() && newData.val() >= -180 && newData.val() <= 180" },
        "status":      { ".write": "auth != null && auth.uid == $phone", ".validate": "newData.val() == 'active' || newData.val() == 'inactive'" },
        "last_update": { ".write": "auth != null && auth.uid == $phone", ".validate": "newData.isString()" },
        "fcm_token":   { ".write": "auth != null && auth.uid == $phone", ".validate": "newData.isString() && newData.val().length <= 4096" },

        // ═══════════════════════════════════════════════════════════════
        // 📈 [V31.27] ثلاثة حقولٍ تشخيصية تركب النبضة — تقرؤها sloPulse
        //   ver  : إصدار الواجهة الذي يعمل عليه الكابتن **الآن**
        //   skew : فارق ساعة جهازه عن الخادم بالملّي ثانية (.info/serverTimeOffset)
        //   src  : من أين حُمّلت الواجهة — remote (الخادم) · asset (احتياطيّ
        //          الـAPK المدفون) · web (متصفّح بلا APK)
        //   وبها يصير توزيع الأسطول على الإصدارات، ومن على الاحتياطي، ومن
        //   ساعته منحرفة — مرئياً في لوحةٍ لا في شهادة ميدان بعد ثلاثة أيام.
        //   🔒 الكابتن يكتبها على عقدته وحدها، ولا يُرفع سقف الكتابة بها:
        //      السلاسل مقيّدة الطول، وsrc قيمةٌ من ثلاث، وskew محدودٌ بأسبوع.
        // ═══════════════════════════════════════════════════════════════
        "ver":  { ".write": "auth != null && auth.uid == $phone", ".validate": "newData.isString() && newData.val().length <= 40" },
        "skew": { ".write": "auth != null && auth.uid == $phone", ".validate": "newData.isNumber() && newData.val() >= -604800000 && newData.val() <= 604800000" },
        "src":  { ".write": "auth != null && auth.uid == $phone", ".validate": "newData.val() == 'remote' || newData.val() == 'asset' || newData.val() == 'web'" },
        // 🧠 [V31.33] web_at — نبضة **الطبقة التي تستطيع القبول**
        //   الخدمة الأصلية تكتب status:active وlast_update كل ١٥ ث بمصادقتها هي —
        //   فإن ماتت مصادقة الويب (جلسة بلا مفتاح · IndexedDB أُخلي) بقي الكابتن
        //   «نشطاً» عند المحرّك، فيُعيَّن عليه ويرنّ باسمه ولا أحد يستطيع القبول.
        //   web_at تكتبها الويب وحدها بعد كل نبضةٍ ناجحة؛ والمحرّك لا يرنّ لمن صمت
        //   ويبه ١٢ دقيقة. غيابها = عميلٌ قديم ⇒ كما كان.
        "web_at": { ".write": "auth != null && auth.uid == $phone", ".validate": "newData.isString() && newData.val().length <= 30 && newData.val().matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T/)" },
        // 🔌 [V31.35] web_disc — يكتبه onDisconnect للويب بختم الخادم (رقم) بدل status:inactive،
        //   ويمحوه الويب عند عودة المقبس. المحرّك يمهل ٣ دقائق بعده ثم يُقصي.
        "web_disc": { ".write": "auth != null && auth.uid == $phone", ".validate": "!newData.exists() || newData.isNumber()" },
        // 🔌 [V31.69] socket_state — تكتبها الطبقة الأصلية: native_up / native_down.
        //   بها يعرف الخادم **أيّ الطبقتين** متصلة، ويُميّز «الصفحة نائمة» عن «الكابتن مقطوع».
        "socket_state": { ".write": "auth != null && auth.uid == $phone", ".validate": "newData.val() == 'native_up' || newData.val() == 'native_down'" },
        // 🚗 [V31.42] شارة كابتن السيارة — الإدارة وحدها (الكابتن يقرأ ولا يكتب)
        "vehicle":  { ".write": "auth != null && auth.token.role == 'admin'", ".validate": "newData.val() == 'car' || newData.val() == 'bike'" },

        // ═══════════════════════════════════════════════════════════════
        // 🖼️ [V29 ← نحلة N-12.0] صورة الكابتن الشخصية
        //   القراءة مفتوحة لكل مُصادَق: المطعم يحتاج أن يعرف من يطرق بابه،
        //   والإدارة والليدر كذلك. والزبون لا يصل إلى هنا أصلاً.
        //   والكتابة للكابتن على نفسه وللإداري.
        //   🔒 والقيد على **وجهة الرابط** لا على شكله وحده: لا يُقبل إلا
        //      رابط firebasestorage — فحسابٌ مخترَق لا يزرع رابطاً خارجياً
        //      يُحمَّل في لوحة الإدارة فيُسرّب ترويسة Referer.
        // ═══════════════════════════════════════════════════════════════
        "photo":        { ".read": "auth != null",
                          ".write": "auth != null && (auth.uid == $phone || auth.token.role == 'admin')",
                          ".validate": "newData.isString() && newData.val().length <= 500 && newData.val().beginsWith('https://firebasestorage.googleapis.com/')" },
        "photo_at":     { ".write": "auth != null && (auth.uid == $phone || auth.token.role == 'admin')",
                          ".validate": "newData.isString() && newData.val().length <= 30" },

        // ═══════════════════════════════════════════════════════════════
        // 🕐 [V29 ← نحلة N-12.0/12.1/12.2] نافذة الشفت اليومية
        //   نموذجٌ **مستقلّ** عن shift_end القائم ولا يُلغيه: shift_end
        //   عدّادٌ تنازلي لجلسةٍ واحدة يكتبه START_SHIFT، وهذا موعدٌ يومي
        //   متكرّر. ومن لم يضبط نافذةً يعمل كما كان تماماً (لا تفضيل).
        //
        //   🔒 الحدود في القاعدة لا في الواجهة: 0–23 و1–16. فشفتٌ بـ99
        //      ساعة يُرفض عند الحافة ولا يصل المحرك ليُفسد نافذته.
        //
        //   🔒 وshift_h/shift_len **لا يكتبهما الكابتن**. قاعدة «التغيير
        //      يسري من الغد» وُضعت لمنع الالتفاف على البوّابة: من مُنع
        //      الساعةَ الواحدة يجعل موعده الواحدة فينزل فوراً. فلو جرت
        //      الترقية في المتصفّح لكان الحارسُ نفسه قابلاً للالتفاف
        //      بسطرٍ في وحدة التحكّم. الكابتن يكتب shift_next وحدها،
        //      والمحرك يُرقّيها متى جاء يومها (effectiveShift).
        //
        //   🔒 وhasChildren على shift_next إلزامية: بلاها تُطلق المتحقّقات
        //      على الطفل المكتوب وحده فتُقبل {h:8, from:"…"} بلا len ⇒
        //      Number(undefined) = NaN تدخل الدفعة الجامعة ⇒ RTDB ترفض
        //      NaN ⇒ **تسقط إسنادات الأسطول كلّه**، وتتكرّر كل دقيقة ما
        //      بقي الحقل المعطوب. الكتلة تُكتب كاملةً أو لا تُكتب.
        // ═══════════════════════════════════════════════════════════════
        "shift_h":      { ".read": "auth != null",
                          ".write": "auth != null && auth.token.role == 'admin'",
                          ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 23" },
        // ⏰ [V31.38] السقف ١٢ — سقف النظام الواحد (كان ١٦ في النافذة و١٢ في الشيت)
        "shift_len":    { ".read": "auth != null",
                          ".write": "auth != null && auth.token.role == 'admin'",
                          ".validate": "newData.isNumber() && newData.val() >= 1 && newData.val() <= 12" },
        "shift_set_at": { ".write": "auth != null && (auth.uid == $phone || auth.token.role == 'admin')",
                          ".validate": "newData.isString() && newData.val().length <= 30" },
        "shift_next":   { ".write": "auth != null && (auth.uid == $phone || auth.token.role == 'admin')",
                          ".validate": "!newData.exists() || newData.hasChildren(['h','len','from'])",
                          "h":    { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 23" },
                          "len":  { ".validate": "newData.isNumber() && newData.val() >= 1 && newData.val() <= 12" },
                          "from": { ".validate": "newData.isString() && newData.val().length <= 12" },
                          "$o":   { ".validate": false } }
        // ❌ ممنوع على العميل (تُدار من السيرفر حصراً):
        //    account_status, daily_count, last_assigned_time,
        //    shift_start, shift_end, last_shift_date, first_seen_today
      }
    },

    // ═════════════════════════════════════════════════════════════════════
    // 🍽️ [V29 ← نحلة N-10.0] كباتن المطعم الثابتون
    //   «المطاعم تفضّل عشرة كباتن — يعرفون زبائنها وأحياءها.» والترجمة
    //   الحرفية («لا يُعرض إلا عليهم») تُنتج **مفتاح إيقاف**: عشرةٌ
    //   ينشغلون جميعاً في ذروة الخميس فيجلس طلب الزبون بلا سبب مرئي.
    //   فالميزة **تفضيلٌ موقوت لا حصر**: القيد يسقط بعد PREF_GRACE_MINS
    //   أو فوراً في الزخم — والمحرك هو من يُسقطه، لا الواجهة.
    //
    //   🔒 والشكل مُقفَل: قيمةٌ منطقية true وحدها تحت drivers، ومفتاحُها
    //      أرقامٌ فقط (٧–١٥ خانة) — فلا يُزرع في العقدة نصٌّ ولا كائن،
    //      ولا تُستعمل مخزناً جانبياً.
    //   🔒 والكتابة للإداري وحده: القائمة قرارٌ تجاري لا يُترك للمطعم
    //      يكتبه بنفسه، وإلا حصر كلُّ مطعمٍ طلباته بمن يشاء.
    // ═════════════════════════════════════════════════════════════════════
    "restaurant_drivers": {
      ".read": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')",
      "$res_phone": {
        ".read": "auth != null && (auth.uid == $res_phone || auth.token.role == 'admin' || auth.token.role == 'staff')",
        ".write": "auth != null && auth.token.role == 'admin'",
        "drivers": {
          "$drv_phone": {
            ".validate": "newData.isBoolean() && newData.val() == true && $drv_phone.matches(/^[0-9]{7,15}$/)"
          }
        },
        "updated_at": { ".validate": "newData.isString() && newData.val().length <= 30" },
        "updated_by": { ".validate": "newData.isString() && newData.val().length <= 40" },
        "$other":     { ".validate": false }
      }
    },

    // 📡 [V29] إخفاقات إرسال الإشعارات — كانت تُبتلع في catch فارغ.
    //    سيرفريّة بالكامل: يكتبها Admin SDK ويقرؤها الإداري.
    "delivery_failures": {
      ".read": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')",
      ".write": false
    },

    // 🤖 [V29 ← نحلة] سقف نداءات الذكاء اليومي لكل مطعم.
    //    مغلقة الطرفين — عدّادٌ ذرّي يكتبه Admin SDK وحده.
    "ai_quota": { ".read": false, ".write": false },

    // 🕐 🔧[خ١٠] العقدة المحمية لوقت الفتح — كانت غائبة تماماً من القواعد،
    //    فلوحة الليدر كانت تصطدم بـ PERMISSION_DENIED بينما التشخيص
    //    (بصلاحيات السيرفر) يقول "سليم". الآن قابلة للقراءة للوحات فقط.
    "drivers_presence": {
      ".read": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')",
      ".write": false
    },

    // 🍽️ إحداثيات المطاعم
    "restaurants_locations": {
       // 🔴 [V31 · ق-٧] كانت ".read": "auth != null" — أي أن **مطعماً واحداً**
         // يسجّل عندك يقرأ اسم وهاتف وإحداثيات كل مطاعمك بنداءٍ واحد:
             // GET /restaurants_locations.json?auth=<توكنه هو>
         // وهي العلّة نفسها التي أُغلقت لـdrivers_locations في هذا الملف
         // («منافس يسجّل مطعماً واحداً يحصل على خريطة حيّة لعملياتك») — تُركت
         // مفتوحةً عقدةً واحدة تحتها. (النمط نفسه.)
//
         // وقُرّاء العقدة الجذرية اثنان لا غير — تتبّعتُهما في الشجرة كلها:
           // · driver.html:3911  (دور driver — يحتاج الإحداثيات لكل مطعم)
           // · Master.html:1947  (دور admin)
         // فلا يُكسر شيء. والمطعم لا يقرؤها إطلاقاً؛ ومع ذلك أُبقيت له قراءةُ
         // **عقدته هو** صراحةً تحسّباً لاستعمالٍ لاحق.
      ".read": "auth != null && (auth.token.role == 'driver' || auth.token.role == 'admin' || auth.token.role == 'staff')",
      "$res_phone": {
        ".read": "auth != null && auth.uid == $res_phone"
      },
      ".write": "auth != null && auth.token.role == 'admin'"
    },

    // 🧾 🔧[خ٦] عقدة جديدة: قواعد العمولة الموثوقة لكل مطعم.
    //    يكتبها سيرفر GAS عند التسجيل/التعديل، ويقرأها مُعقِّم الطلبات في CF
    //    ليدهس أي comm/payType أرسله العميل. المطعم يقرأ قاعدته فقط.
    "restaurants_config": {
      // 🧾 [V3.9] قراءة جذرية للإدارة والموظفين — تحتاجها لوحة تصفير الديون
      //    لسرد أسماء المطاعم. وقواعد فايربيس لا تتصاعد لأعلى، فالسماح عند
      //    $phone وحده كان يجعل الليدر يقرأ مطعمه هو فقط ولا يرى القائمة.
      //    وهي العلّة نفسها التي عولجت في driver_chats (V2.2).
      //    ⚠️ العقدة تحمل comm و payType و lat/lng والاسم — لا كلمات مرور
      //       ولا صور هويات. والكتابة تبقى سيرفرية حصراً كما كانت.
      ".read": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')",
      "$phone": {
        ".read": "auth != null && (auth.uid == $phone || auth.token.role == 'admin' || auth.token.role == 'staff')"
      },
      ".write": false
    },

    // ═════════════════════════════════════════════════════════════════════
    // ⏱️ إعدادات النظام والشفتات
    //
    // 🔴 [V30] أُضيف تحتها `flags` و`min_web_version` و`min_native_version`.
    //   السبب: **رفعُ APK يستغرق أياماً، وتغييرُ الخادم دقائق.** ووثيقة
    //   Google صريحة أن إيقاف الطرح يمنع مستخدمين **جدداً** فقط —
    //   «users who already received the app version will remain on it».
    //   أي أن الإيقاف ليس تراجعاً، والوسيلة الوحيدة لاحتواء عطلٍ في APK
    //   منشور هي مفتاحٌ يُقلب من هنا.
    //
    //   ✅ والنمط مُجرَّبٌ عندك أصلاً لا مخترَع: `shifts_enabled` تُقرأ حيّةً
    //      في driver.html منذ إصدارات. هذا تعميمُ ما يعمل، لا بناءُ جديد.
    //
    //   🔒 القراءة لكل مُصادَق (التطبيق يحتاجها قبل أن يعرف دوره)، والكتابة
    //      للإداري وحده. والأنواع مقيَّدة: علَمٌ منطقيّ ونسخةٌ رقمية — فلا
    //      يُزرع نصٌّ يُفسَّر خطأً فيُقفل الأسطول.
    // ═════════════════════════════════════════════════════════════════════
    // ═════════════════════════════════════════════════════════════════════
    // 📇 [V31.12] سجلّ أرقام الزبائن — الرقم وحده وتاريخُ أوّل ظهور
    //   🔒 القراءة للإداري وحده — لا الموظف ولا الليدر ولا المطعم.
    //   🔒 والكتابة **مغلقةٌ للجميع بلا استثناء، ولا للإداري**. الدوالّ وحدها
    //      تكتب عبر Admin SDK الذي يتجاوز القواعد.
    //      والسبب: لا مصدر ثانٍ يُستعاد منه السجلّ إن مُحي إلا شيتاتك. فحسابٌ
    //      إداريٌّ مسروق لا يستطيع زرع أرقامٍ ولا محو السجلّ من المتصفّح.
    //   ⚠️ وورقة «الزبائن» في الشيت هي **أسهل ما يتسرّب** — لأنها تتبع
    //      صلاحيات مشاركة الملف كلّه. راجع من يملك حقّ الوصول إلى جدولك.
    // ═════════════════════════════════════════════════════════════════════
    "customers": {
      ".read": "auth != null && auth.token.role == 'admin'",
      ".write": false
    },

    // ═════════════════════════════════════════════════════════════════════
    // 🐤 [V31.12] عقدة مِجَسّ الكناري — معزولةٌ عن الإنتاج بالبنية لا بالشرط
    //   لا يقرؤها عميلٌ ولا يكتبها: الدوالّ وحدها. ولو كُتب المِجَسّ في
    //   active_orders معتمداً على علَمٍ «تجاوزوني»، لَلَزِم كلَّ قارئٍ أن يعرف
    //   بالعلَم — وقارئٌ واحد لا يعرفه يعني طلباً وهمياً على شاشة كل موظّف
    //   ٩٦ مرّةً يومياً. العزل هنا يجعل الجهل بالمِجَسّ غيرَ ضارّ.
    // ═════════════════════════════════════════════════════════════════════
    "canary_probe": {
      ".read": false,
      ".write": false
    },

    // ═════════════════════════════════════════════════════════════════════
    // 💓 [V31.12] نبضات الدوالّ — يقرؤها الإداري ليرى ما يعمل وما صمت
    // ═════════════════════════════════════════════════════════════════════
    "system_health": {
      ".read": "auth != null && auth.token.role == 'admin'",
      ".write": false
    },

    "system_settings": {
      ".read": "auth != null",
      ".write": "auth != null && auth.token.role == 'admin'",

      // 🎛️ مفاتيح الإيقاف — منطقيّة حصراً
      "flags": {
        "$flag": { ".validate": "newData.isBoolean() && $flag.matches(/^[a-z0-9_]{2,40}$/)" }
      },

      // 📱 أدنى نسخةٍ مقبولة. صفر أو غياب = بلا فرض (الاتجاه الآمن).
      //    ⚠️ رقمٌ لا نصّ: مقارنة النصوص تجعل "10" أصغر من "9".
      "min_web_version":    { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 100000" },
      "min_native_version": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 100000" },
      // رسالة اختيارية تُعرض على شاشة الحجب
      "upgrade_msg":        { ".validate": "newData.isString() && newData.val().length <= 200" }
    },

    // 📣 البث العام
    "system_broadcast": {
      ".read": "auth != null",
      ".write": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')"
    },

    // 📨 رسائل الكباتن المباشرة
    "driver_messages": {
      "$phone": {
        ".read": "auth != null && (auth.uid == $phone || auth.token.role == 'admin' || auth.token.role == 'staff')",
        ".write": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')"
      }
    },

    // 💵 الدفاتر المالية — كل كيان يقرأ دفتره فقط؛ الكتابة سيرفرية حصراً
    "ledgers": {
      ".read": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')",
      ".write": false,
      "restaurants": {
        "$phone": { ".read": "auth != null && (auth.uid == $phone || auth.token.role == 'admin' || auth.token.role == 'staff')" }
      },
      "drivers": {
        "$phone": { ".read": "auth != null && (auth.uid == $phone || auth.token.role == 'admin' || auth.token.role == 'staff')" }
      }
    },

    // 📊 الإحصائيات اليومية
    // 🔧[خ٢٤] كانت ".write": "auth.uid == $phone" — أي أن الكابتن يزوّر
    //    إحصاءات رفضه بيده. الآن الكتابة سيرفرية حصراً.
    "daily_metrics": {
      ".read": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')",
      "$phone": {
        ".read": "auth != null && (auth.uid == $phone || auth.token.role == 'admin' || auth.token.role == 'staff')",
        "$day": {
           // 🔴 [V31 · ق-٤] مفتاح اليوم كان **بلا قيد**، والكنس يقرؤه هكذا
             // (index.js:4923):  const dayMs = new Date(day).getTime();
                               // if (!isNaN(dayMs) && dayMs < cutoff) { … }
             // ونفّذتُه:  new Date("PWNED").getTime() === NaN  ⇒ **لا يُحذف أبداً**.
             // فكابتنٌ يكتب daily_metrics/<هاتفه>/PWNED/completed_orders ينشئ
             // عقدةً خالدة لا يمسّها كنّاس. والقيد يجعل كل مفتاحٍ مكتوبٍ قابلاً
             // للكنس بحكم شكله.
             // ✅ وكل الكتّاب القائمين يكتبون YYYY-MM-DD: index.js (يوم UTC)
                // و Code.gs:2465 (now.split('T')[0]) و driver.html — تحقّقتُ
                // من الثلاثة قبل تثبيت القيد.
          ".validate": "$day.matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)",
          // عدّادا عرض يكتبهما الكابتن عند الإكمال (increment) — غير ماليين.
          "completed_orders":       { ".write": "auth != null && auth.uid == $phone", ".validate": "newData.isNumber() && newData.val() >= 0" },
          "total_delivery_minutes": { ".write": "auth != null && auth.uid == $phone", ".validate": "newData.isNumber() && newData.val() >= 0" }
          // rejected_orders: سيرفرية حصراً (DECLINE_ORDER في GAS).
        }
      }
    },
    "daily_ledgers": {
      ".read": "auth != null && auth.token.role == 'admin'",
      "$phone": {
        ".read": "auth != null && (auth.uid == $phone || auth.token.role == 'admin')",
        "$day": {
           // [V31 · ق-٤] القيد نفسه — والعلّة نفسها. انظر daily_metrics أعلاه.
          ".validate": "$day.matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)",
          "$order_id": {
            // سجل رحلة للعرض فقط — إضافة لا تعديل (الحقيقة المالية سيرفرية).
            ".write": "auth != null && auth.uid == $phone && !data.exists()",
            ".validate": "newData.hasChildren(['orderId', 'price', 'timestamp'])"
          }
        }
      }
    },

    "completed_orders": {
      ".read": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')",
      ".write": false
    },

    // 🚨 التنبيهات — الموظف يستطيع تأشير "مقروء" فقط، لا الحذف ولا التزوير
    "system_alerts": {
      ".read": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')",
      ".write": "auth != null && auth.token.role == 'admin'",
      "$alert_id": {
        "read": { ".write": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')", ".validate": "newData.isBoolean()" }
      }
    },

    // 🧑‍💼 عقد الموظفين والمراقبة
    "staff_sessions": {
      ".read": "auth != null && auth.token.role == 'admin'",
      ".write": false
    },
    "staff_activity_log": {
      ".read": "auth != null && auth.token.role == 'admin'",
      ".write": false
    },
    "admin_audit_trail": {
      ".read": "auth != null && auth.token.role == 'admin'",
      ".write": "auth != null && auth.token.role == 'admin'"
    },
    // 💬 دردشة كابتن ↔ ليدر: كلٌّ يقرأ/يكتب قناته، والطاقم الإداري كل القنوات.
    // (كانت غائبة عن V2.0 = رفض كلي، فتتعطل الدردشة لحظة تفعيل القواعد.)
    "driver_chats": {
      // 🔧 القراءة على العقدة الأم ضرورية: لوحة الليدر تقرأ driver_chats كاملة
      // لتبني قائمة المحادثات. قواعد فايربيس لا تتصاعد لأعلى — السماح عند
      // $phone وحده كان يرفض قراءة الأم فتبقى قائمة الليدر فارغة أبداً.
      ".read": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')",
      "$phone": {
        ".read":  "auth != null && (auth.uid == $phone || auth.token.role == 'admin' || auth.token.role == 'staff')",
        // 🔒 [ثغرة] كانت كتابة كاملة على العقدة: الكابتن يستطيع حذف المحادثة
        //    كلّها (إتلاف دليل) أو كتابة رسالة بـfrom:'leader' فتظهر في لوحة
        //    الليدر كأنه قالها. الآن: الكابتن يضيف رسائل فقط، ولا يعدّل ولا
        //    يحذف، ولا ينسب رسالة لغير نفسه.
        ".write": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')",
        // 🔴 [V28] حُذف ".write" الذي كان هنا على عقدة messages نفسها.
        //   قواعد .write **تتصاعد نزولاً**: منحُ الكتابة عند الأب يجعل
        //   قاعدة $msgId أدناه لا تُقيَّم إطلاقاً — أي أن الحارس المكتوب
        //   في التعليق أعلاه ("يضيف ولا يعدّل ولا يحذف") كان مُلغىً
        //   بالسطر الذي فوقه مباشرة. وسطرٌ واحد كان يكفي لمحو المحادثة:
        //     ref('driver_chats/<هاتفه>/messages').set(null)
        //   و.validate لا تُقيَّم عند الحذف (newData = null) فلا تصدّه.
        //   ⚠️ ولا حاجة إليه أصلاً: تحديث unread_* و last_msg مغطّى
        //   بقواعد الأشقّاء أدناه، لا بالكتابة على messages.
        "messages": {
          "$msgId": {
            ".write": "auth != null && ((auth.uid == $phone && !data.exists() && newData.exists()) || auth.token.role == 'admin' || auth.token.role == 'staff')",
            ".validate": "newData.hasChildren(['from','text','ts']) && (auth.token.role == 'admin' || auth.token.role == 'staff' || newData.child('from').val() == 'driver')",
            "text": { ".validate": "newData.isString() && newData.val().length <= 1000" },
            "ts":   { ".validate": "newData.isNumber()" },
            "from": { ".validate": "newData.isString() && newData.val().length <= 20" }
          }
        },
         // 🔴 [V31 · ق-٢] الحقول الثمانية كانت قابلةً لكتابة الكابتن **بلا أي
           // .validate**: لا نوع ولا طول ولا قيمة. وأعلاها مباشرةً messages/$msgId
           // محدودةٌ بالكامل (text ≤ ١٠٠٠ · ts رقم · from ≤ ٢٠) — فالحدّ كُتب في
           // موضع ونُسي في نظيره.
//
           // والأثر ليس نظرياً: لوحة الليدر تقرأ **جذر** driver_chats كاملاً
           // (liderdodsas.html:2724 — والقراءة الجذرية مسموحة له عمداً، الشرح
           // أعلاه). فكابتنٌ يكتب last_msg بعشرة ميغابايت عبر REST يُحمّلها على
           // **كل جلسة ليدر** مرّةً بعد أخرى.
           // وبالفتحة نفسها يصفّر unread_leader — أي **يُخفي شكواه** من قائمة
           // الليدر بلا أن يمسّ رسالته.
//
           // والحدود أدناه أوسع من كل كاتبٍ قائم: الكاتبان الوحيدان يقصّان
           // النصّ إلى ٦٠ حرفاً (driver.html:4809 و liderdodsas.html:3422)،
           // والسقف ٢٠٠ — هامشٌ ثلاثي بلا خطر انحدار.
           // ⚠️ و unread_* تُكتب أحياناً بـServerValue.increment: القيمة تُحلّ
              // على الخادم **قبل** التحقّق، فـisNumber تصحّ عليها.
           // ⚠️ ولا "$other": false هنا: العقدة تحمل claimed_by وغيرها ممّا
              // يكتبه الموظّف، وحصرُها اليوم يكسر مسار «استلام المحادثة».
        "last_msg":      { ".write": "auth != null && (auth.uid == $phone || auth.token.role == 'admin' || auth.token.role == 'staff')", ".validate": "newData.isString() && newData.val().length <= 200" },
        "last_msg_at":   { ".write": "auth != null && (auth.uid == $phone || auth.token.role == 'admin' || auth.token.role == 'staff')", ".validate": "newData.isNumber() && newData.val() >= 0" },
        "last_from":     { ".write": "auth != null && (auth.uid == $phone || auth.token.role == 'admin' || auth.token.role == 'staff')", ".validate": "newData.isString() && newData.val().length <= 20" },
        "unread_leader": { ".write": "auth != null && (auth.uid == $phone || auth.token.role == 'admin' || auth.token.role == 'staff')", ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 99999" },
        "unread_driver": { ".write": "auth != null && (auth.uid == $phone || auth.token.role == 'admin' || auth.token.role == 'staff')", ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 99999" },
        "driver_name":   { ".write": "auth != null && (auth.uid == $phone || auth.token.role == 'admin' || auth.token.role == 'staff')", ".validate": "newData.isString() && newData.val().length <= 60" },
        "driver_phone":  { ".write": "auth != null && (auth.uid == $phone || auth.token.role == 'admin' || auth.token.role == 'staff')", ".validate": "newData.isString() && newData.val().length <= 20" },
        "status":        { ".write": "auth != null && (auth.uid == $phone || auth.token.role == 'admin' || auth.token.role == 'staff')", ".validate": "newData.isString() && newData.val().length <= 20" }
      }
    },

    // 🚩 أعلام أمنية: الكابتن يسجّل محاولات إنجازه المبكّرة على نفسه فقط،
    // والاطلاع إداري حصراً (لا يرى كابتن أعلام غيره).
    "security_flags": {
      ".read": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')",
      "$phone": {
        // 🔒 [ثغرة] كانت كتابة كاملة: الكابتن يمحو أدلّة الاشتباه ضدّ نفسه
        //    بطلب واحد فيُبطل نظام كشف التحايل كلّه. الآن إضافة فقط —
        //    كل علامة تُكتب مرة ولا تُعدَّل ولا تُحذف (كما في daily_ledgers).
        ".write": "auth != null && auth.token.role == 'admin'",
        "$flagId": {
          // 🔧 [V3.5] أُضيفت أقواس: && يربط أشدّ من ||، فكان يُقرأ
          //    (auth!=null && …) || (auth.token.role=='admin') — والثاني بلا
          //    حارس auth!=null ظاهر. وليست ثغرة (auth.token عند auth==null
          //    تُعطي null، وnull=='admin' خطأ) لكنها تُقرأ خطأً — ومَن يقرأ
          //    بعدنا قد يبني عليها. والوضوح في قواعد الأمان ليس ترفاً.
          ".write": "(auth != null && auth.uid == $phone && !data.exists()) || (auth != null && auth.token.role == 'admin')",
           // 🔴 [V31 · ق-٣] كانت hasChildren وحدها: لا مُحقّق لأي ابن، ولا
             // "$other": false. أي أن الكابتن يكتب تحت أي $flagId **أي حقلٍ
             // بأي حجم**. وclient_events فوقها في هذا الملف تملك الاثنين
             // (قائمة بيضاء + رفض ما عداها) — الحدّ كُتب هناك ونُسي هنا.
//
             // والعقدة **بلا قارئ**: بحثتُ في الشجرة كلها فوجدتُ ثلاثة كتّاب في
             // driver.html و**صفر** قارئ في أي لوحة، وصفر ذكرٍ في سياسة
             // الاحتفاظ (RETAIN) وصفر نداء كنس. كاتبٌ بلا حاذف وبلا قارئ —
             // وهو بالضبط ما عولج في shadow_compare و client_events.
             // ⇒ حُدَّت هنا، وأُضيف كنسها في purgeBloatCore (index.js).
//
             // والحقول التسعة أدناه هي **كل** ما يكتبه العميل فعلاً:
               // driver.html — logEarly (driver · orderId · distance_m ·
               // mins_since_pickup · attempts · last_attempt)
               // guaranteeAccept (… kind · reasons)  ·  الطابور (… reason)
             // ولا عاشر.
          ".validate": "newData.hasChildren(['driver','orderId'])",
          "driver":            { ".validate": "newData.isString() && newData.val().length <= 20" },
          "orderId":           { ".validate": "newData.isString() && newData.val().length <= 80" },
          "kind":              { ".validate": "newData.isString() && newData.val().length <= 40" },
          "reason":            { ".validate": "newData.isString() && newData.val().length <= 80" },
          "reasons":           { ".validate": "newData.isString() && newData.val().length <= 220" },
          "attempts":          { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 9999" },
          "distance_m":        { ".validate": "newData.isNumber() && newData.val() >= -1 && newData.val() <= 100000000" },
          "mins_since_pickup": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 100000" },
          "last_attempt":      { ".validate": "newData.isString() && newData.val().length <= 30 && newData.val().matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T/)" },
          "$other":            { ".validate": false }
        }
      }
    },

    // 🧾 [V3.9] طلبات تصفير الديون — يرفعها الليدر ويبتّها المدير.
    //   الليدر: **إنشاء فقط** (!data.exists) وبحالة pending حصراً. فلا يوافق
    //   على طلبه بنفسه، ولا يعدّل طلباً بتّه المدير، ولا يمحو أثراً.
    //   المدير: كتابة كاملة — القبول والرفض والإزالة.
    //
    //   ⚠️ وشرط pending في .validate لا في .write عمداً: الأولى تحكم **من**
    //      يكتب، والثانية **ماذا** يُكتب. ولو تُرك للأولى وحدها لأنشأ الليدر
    //      طلباً مختوماً approved سلفاً — فيوافق على نفسه. وهو الفصل نفسه
    //      المطبَّق في driver_chats/messages (from == 'driver').
    //
    //   🔒 ولا يُصفّر أحدٌ ديناً من هنا: هذه العقدة **إشارة لا فعل**.
    //      resetDebtForEntity في Code.gs خلف ADMIN_ACTIONS التي تشترط
    //      كلمة مرور الإدارة (Settings!B2) — ولا وجود لها في لوحة الليدر.
    // 📅 [V4.0] سجلّ استلام الاشتراكات الشهرية — مفهرسٌ بالشهر ثم الهاتف.
    //   الليدر: **إنشاء فقط** بحالة pending. المدير: كتابة كاملة.
    //   ولا يمسّ هذا السجلّ ديناراً في ledgers — الاشتراك يُحاسَب في التقرير
    //   الشهري، وهذه العقدة توثّق ما قبضه الليدر ليطابقه المدير به.
    //   ⚠️ ولا تُغنِ عن التقرير: المبلغ هنا **ما قُبض**، وهناك **ما استُحقّ**.
    //      واختلافهما هو بالضبط ما يجب أن تراه.
    "sub_collections": {
      ".read": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')",
      "$month": {
        "$phone": {
          ".write": "auth != null && ((auth.token.role == 'staff' && !data.exists() && newData.exists()) || auth.token.role == 'admin')",
          ".validate": "newData.hasChildren(['phone','by','ts','status','amount']) && newData.child('phone').isString() && newData.child('by').isString() && newData.child('ts').isString() && newData.child('amount').isNumber() && newData.child('amount').val() >= 0 && (auth.token.role == 'admin' || newData.child('status').val() == 'pending')"
        }
      }
    },

    "clearing_requests": {
      ".read": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')",
      "$phone": {
        ".write": "auth != null && ((auth.token.role == 'staff' && !data.exists() && newData.exists()) || auth.token.role == 'admin')",
        ".validate": "newData.hasChildren(['phone','by','ts','status']) && newData.child('phone').isString() && newData.child('by').isString() && newData.child('ts').isString() && (auth.token.role == 'admin' || newData.child('status').val() == 'pending')"
      }
    },

    // 📊 [V3] الرصد — أحداث العميل. العقدة الوحيدة الجديدة القابلة للكتابة.
    //   إضافة فقط: لا تعديل (!data.exists) ولا حذف (newData.exists). فالكابتن
    //   لا يستطيع محو أثر عطبٍ وقع عنده — وهذا هو الغرض.
    //   بلا هذه العقدة يفشل track() في driver.html بصمت، فلا ترى شيئاً.
    //   ⚠️ لا حدّ للمعدّل في قواعد فايربيس. أضف تنظيف ما هو أقدم من ٣ أيام
    //      إلى nightlySummaryAndCleaner وإلا نمت العقدة بلا سقف.
    "client_events": {
      ".read": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')",
      "$phone": {
        ".read": "auth != null && (auth.uid == $phone || auth.token.role == 'admin' || auth.token.role == 'staff')",
        // 🔴 [V28] كانت القاعدة تقيّد ev و ts **فقط**؛ أما cmd و why و net
        //   و oid و ms فحرّة تماماً: بلا نوع وبلا طول وبلا ذكر أصلاً.
        //   والتقطيع (.slice(0,20)) موجود في driver.html:2199 — أي في
        //   **العميل وحده**، ويُلتفّ عليه بنداء REST مباشر بتوكن الكابتن.
        //   ⇒ أي كابتن يكتب cmd = "<img src=x onerror=…>" على عقدته
        //   المسموحة له، فيُنفَّذ في monitor.html (الذي كان بلا دالة تهريب
        //   واحدة) داخل جلسة تحمل دور admin ⇒ قراءة وكتابة ledgers و
        //   active_orders و drivers_locations و staff_sessions.
        //   قفلٌ بقائمة بيضاء: كل حقل معروف بنوعه وطوله، وما عداه مرفوض.
        "$ev_id": {
          // ⏱️ [V31.37] حدّ معدّلٍ في القواعد: كتابةٌ كل ٢٥٠ مل.ث كحدٍّ أقصى لكل هاتف.
          //   الفيض المقيس (٣٤ ألف حدثٍ/يوم من علامةٍ واحدة) لم يكن له سقفٌ إلا في العميل.
          //   العميل يكتب السجلّ وclient_events_meta/<هاتف>/last في update واحد؛ القاعدة
          //   تقرأ last **قبل** الكتابة (root = الحالة السابقة). غيابه = أوّل كتابة ⇒ يمرّ.
          //   عميلٌ قديم لا يكتب meta ⇒ يمرّ دائماً (last لا يتقدّم) — التوافق أوّلاً.
          ".write": "auth != null && auth.uid == $phone && !data.exists() && newData.exists() && $ev_id.matches(/^[A-Za-z0-9_-]{1,48}$/) && (!root.child('client_events_meta/' + $phone + '/last').exists() || root.child('client_events_meta/' + $phone + '/last').val() < now - 250)",
          ".validate": "newData.hasChildren(['ev','ts'])",
          // @schema:ev_id — مولَّدٌ من tools/events.schema.json — لا تُعدَّل يدوياً
          "ev": { ".validate": "newData.isString() && newData.val().length <= 40 && newData.val().matches(/^[A-Za-z0-9_-]*$/)" },
          "ts": { ".validate": "newData.isString() && newData.val().length <= 30 && newData.val().matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T/)" },
          "oid": { ".validate": "newData.isString() && newData.val().length <= 80" },
          "cmd": { ".validate": "newData.isString() && newData.val().length <= 24 && newData.val().matches(/^[A-Za-z0-9_-]*$/)" },
          "ms": { ".validate": "newData.isNumber()" },
          "why": { ".validate": "newData.isString() && newData.val().length <= 60" },
          "net": { ".validate": "newData.isString() && newData.val().length <= 16" },
          "want": { ".validate": "newData.isNumber() && (newData.val() == 0 || newData.val() == 1)" },
          "odAge": { ".validate": "newData.isNumber()" },
          "ackAge": { ".validate": "newData.isNumber()" },
          "ln": { ".validate": "newData.isNumber()" },
          "ver": { ".validate": "newData.isString() && newData.val().length <= 40" },
          // @/schema:ev_id
          // الحقول أعلاه هي **كل** ما يكتبه العميل فعلاً:
          //   driver.html (track)  ·  restaurant.html (resTrack)
          //   ev · ts · oid · cmd · ms · why · net · want · odAge · ackAge · ln · ver — ولا غير.
          "$other": { ".validate": false }
        }
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // 📈 [V31.27] slo_events — عدّادات الصحّة، مُدلوَةً بالساعة
    //   لماذا عقدةٌ مستقلّة ولا تُقرأ client_events؟ لأن client_events
    //   تبلغ مئة ألف صفّ، وقراءتها كل عشر دقائق = غيغابايتان يومياً.
    //   هنا: slo_events/<yyyymmddHH بتوقيت UTC>/<هاتف>/<id> — فالخادم يقرأ
    //   دلوَ الساعة الحالية والسابقة فقط (مئات السجلّات لا آلاف)، ويحذف
    //   ما عمره فوق ٤٨ ساعة بالمفتاح لا بالمسح.
    //   الأحداث الثلاثة المقبولة:
    //     recv  = وصل عرضٌ إلى التطبيق  ·  shown = ظهرت بطاقته على الشاشة
    //     jserr = خطأ جافاسكربت غير ملتقَط
    //   ونسبة shown/recv هي **الرقم الذي كان سيكشف عطب ٣١٫١٩ في ساعته الأولى**.
    //   🔒 الكابتن يكتب تحت هاتفه وحده، إنشاءً لا تعديلاً، والساعة عشرة
    //      أرقامٍ بلا غيرها — فلا يُزرع مفتاحٌ حرّ ولا يُستعمل مخزناً جانبياً.
    // ═══════════════════════════════════════════════════════════════════
    "client_events_meta": {
      // 👁️ [V31.51] فهرس الهواتف — لوحة الظلّ تقرؤه بدل تنزيل client_events كلّها
      ".read": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')",
      "$phone": {
        "last": { ".write": "auth != null && auth.uid == $phone", ".validate": "newData.isNumber() && newData.val() <= now + 60000" }
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // 🧭 [V31.45] drivers_desired — رغبة الكابتن، لا حالته
    //   {online, at, dev, by, epoch} يكتبها الكابتن على هاتفه (والإداري لإطفائه).
    //   المُصالِح في index.js يحسب منها status ويكتبه وحده. لا أحد غيرهما.
    // ═══════════════════════════════════════════════════════════════════
    // 🔐 [V31.45] auth_credentials — تجزئات الاعتماد (s256$salt$hash) يُرآتها Apps Script؛ الخادم وحده يقرأ ويكتب
    "auth_credentials": { ".read": false, ".write": false },

    "drivers_desired": {
      ".read": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')",
      "$phone": {
        ".read": "auth != null && (auth.uid == $phone || auth.token.role == 'admin' || auth.token.role == 'staff')",
        ".write": "auth != null && (auth.uid == $phone || auth.token.role == 'admin')",
        ".validate": "newData.hasChildren(['online','at']) && newData.child('online').isBoolean()",
        "online": { ".validate": "newData.isBoolean()" },
        "at":     { ".validate": "newData.isString() && newData.val().length <= 30 && newData.val().matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T/)" },
        "dev":    { ".validate": "newData.isString() && newData.val().length <= 40" },
        "by":     { ".validate": "newData.val() == 'captain' || newData.val() == 'admin' || newData.val() == 'native'" },
        "epoch":  { ".validate": "newData.isNumber()" },
        "$other": { ".validate": false }
      }
    },

    "slo_events": {
      ".read": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')",
      "$hour": {
        "$phone": {
          "$id": {
            ".write": "auth != null && auth.uid == $phone && !data.exists() && newData.exists() && $hour.matches(/^[0-9]{10}$/) && $id.matches(/^[A-Za-z0-9_-]{1,32}$/)",
            ".validate": "newData.hasChildren(['ev','ts'])",
            "ev":  { ".validate": "newData.val() == 'recv' || newData.val() == 'shown' || newData.val() == 'jserr'" },
            "ts":  { ".validate": "newData.isString() && newData.val().length <= 30 && newData.val().matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T/)" },
            "oid": { ".validate": "newData.isString() && newData.val().length <= 80" },
            "ms":  { ".validate": "newData.isNumber()" },
            // 📈 [V31.30] إصدار الواجهة مع كل حدث ⇒ نسبة الظهور لكل إصدار
            "ver": { ".validate": "newData.isString() && newData.val().length <= 40" },
            "$other": { ".validate": false }
          }
        }
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // 🧵 [V31.30] order_timeline — خطّ زمن الطلب في عقدةٍ واحدة
    //   order_timeline/<الطلب>/<الحدث>_<ملّي> = {ev, ts, by?, ms?, ok?, err?}
    //   الخادم (Admin SDK يتجاوز القواعد): created · offered · fcm · accepted · delivered
    //   الكابتن: recv · shown · accept — على طلبٍ مُسنَدٍ إليه **الآن** وحده،
    //   إنشاءً لا تعديلاً. فسؤال «أين ذهبت الدقائق الأربع؟» يصير قراءة عقدة.
    //   القراءة للإدارة والليدر. والكنس بعد ٧ أيام (purgeBloatCore).
    // ═══════════════════════════════════════════════════════════════════
    "order_timeline": {
      ".read": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')",
      "$order_id": {
        "$k": {
          ".write": "auth != null && auth.token.role == 'driver' && !data.exists() && newData.exists() && root.child('active_orders/' + $order_id + '/driverPhone').val() == auth.uid && $k.matches(/^(recv|shown|accept)_[0-9]{10,16}$/)",
          ".validate": "newData.hasChildren(['ev','ts','by']) && newData.child('by').val() == auth.uid",
          "ev":  { ".validate": "newData.val() == 'recv' || newData.val() == 'shown' || newData.val() == 'accept'" },
          "ts":  { ".validate": "newData.isString() && newData.val().length <= 30 && newData.val().matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T/)" },
          "by":  { ".validate": "newData.isString() && newData.val().length <= 20" },
          "ms":  { ".validate": "newData.isNumber()" },
          "$other": { ".validate": false }
        }
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // 🔒 [V3.1] عقد سيرفرية — الكتابة مغلقة تماماً، والقراءة للإدارة فقط
    //   ⚠️ [V3.1] كانت ".read": false أيضاً — فكانت لوحة monitor.html تقرأ
    //      مرآةً ثانوية في client_events لا السجلّ الأصلي. والمرآة تفقد
    //      from→to، و legacy_usage/gate لا يُبَثّ فيها إطلاقاً — وهو
    //      **الشرط الوحيد** لمفتاح ENFORCE_ENTITY_STOKEN. فبقي المفتاح
    //      غير قابل للقياس من المتصفّح بلا سبب حقيقي.
    //      الكتابة تبقى false: Cloud Functions وGAS يتجاوزان القواعد،
    //      فلا عميل يستطيع تلويث السجلّ الذي يُقاس به.
    //   Cloud Functions (Admin SDK) وسيرفر GAS (حساب خدمة) يتجاوزان القواعد،
    //   فالإغلاق التامّ هنا لا يمنعهما شيئاً — ويمنع كل ما عداهما.
    // ═══════════════════════════════════════════════════════════════════

    // 🔑 مفاتيح عدم التكرار (CF-8.0 · claimOp). بلا هذه العقدة يفشل
    //    orderCommand و createOrder معاً — وهي الأهمّ في هذه الدفعة.
    // 🔢 [V3.3] أختام عدّ الطلبات (CF-8.9 · trackDriverCompletion) — سيرفرية.
    "counted_orders": { ".read": false, ".write": false },

    // 🗂️ [V3.7] سجلّ ملفات الأرشيف الشهري (V18.3 · AUDIT_HistoricCommissions)
    //   يكتبه monthlyArchiver ويقرؤه _collectDailyRows_ — كلاهما سيرفري.
    //   ⚠️ كان مستعملاً بلا قاعدة: يعمل لأن GAS يتجاوز القواعد، لكن أي عميل
    //      كان يستطيع قراءته لولا أن الجذر مغلق. الآن صريح.
    "archives":        { ".read": false, ".write": false },

    // 📧 [V3.8] التقارير الشهرية المحفوظة (V19.9) — سيرفرية.
    //   ⚠️ أُسقطت سهواً في نسخةٍ سابقة بينما الكود يكتب فيها. والجذر مغلق
    //      فلا ثغرة، لكنّ عقدةً مستعملة بلا قاعدة صريحة تُخالف الانضباط
    //      الذي طبّقناه على archives و comm_history — ومَن يقرأ بعدنا
    //      قد يظنّها غير مستعملة فيبني عليها.
    "monthly_reports": { ".read": false, ".write": false },

    // 📝 [V3.7] سجلّ تغيّر العمولات (V19.0 · recordCommChange_) — سيرفري.
    //   يحمل تاريخ كل تعديل عمولة، ويُغني الاسترجاع القادم عن الاستنتاج.
    "comm_history":    { ".read": false, ".write": false },

    "ops":             { ".read": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')", ".write": false },

    // 🕯️ أحكام وضع الظلّ (CF-8.0). بلا هذه لا يُسجَّل حكم، فلا معنى للظلّ.
    "shadow_compare":  { ".read": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')", ".write": false },

    // 🎫 جلسات الكباتن والمطاعم (Code.gs V18 · createEntitySession).
    //    نُقلت من CacheService المتطايرة إلى هنا. بلا هذه العقدة تُكتب
    //    الجلسة في الكاش وحده، فتسقط البوّابة إلى وضع legacy بصمت:
    //    تعمل، ولا فائدة أمنية منها.
    "entity_sessions": { ".read": false, ".write": false },
    // 🔐 [V3.6] عدّاد جيل الجلسة (V19.3) — بديل entity_current، سيرفري.
    //   استُبدل: كان يحتاج قراءةً مستقلّة عند كل تحقّق فيضاعف نداءات
    //   urlfetch — وهو أحد أسباب استنفاد حصّة Apps Script اليومية.
    "entity_gen":      { ".read": false, ".write": false },

    // 🔎 عدّادات المسارات القديمة (Code.gs V18). اقرأها بـAUDIT_LegacyUsage()
    //    ولا تحذف معالجاً احتياطياً قبل أن تقرأ صفراً سبعةَ أيام.
    "legacy_usage":    { ".read": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'staff')", ".write": false },

    "staff_tokens":      { ".read": false, ".write": false },
    "sheets_sync_queue": { ".read": false, ".write": false },
    "system_logs":       { ".read": false, ".write": false }
  }
}

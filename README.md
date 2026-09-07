# Gazameel

منصة طلابية غير رسمية (**Gaza + زميل**) — مكتبة مصادر، مساهمات بموافقة أدمن، تقويم، كويز، بوت تيليجرام، استطلاعات.

> هذا الموقع منصة طلابية غير رسمية، تم تطويرها بمبادرة فردية، ولا تتبع تقنيًا أو إداريًا لإدارة الجامعة.

## المتطلبات

- **Node.js 20.9+** (Next 16 يتطلب ذلك)
- مشروع [Supabase](https://supabase.com) مجاني
- (اختياري) بوت تيليجرام من @BotFather

## الإعداد السريع

```bash
cd ~/Projects/gazameel
cp .env.example .env.local
# املأ المفاتيح — ثم افحص:
npm run check:setup
npm install
npm run dev
```

دليل واحد للواجبات الثلاث: **[docs/الربط-السريع.md](docs/الربط-السريع.md)**

الدروس بالتفصيل:
- **[docs/درس-المرحلة-1.md](docs/درس-المرحلة-1.md)** — Supabase + Google + Storage
- **[docs/درس-المرحلة-2.md](docs/درس-المرحلة-2.md)** — تيليجرام + كويز + تذكيرات
- **[docs/درس-المرحلة-3.md](docs/درس-المرحلة-3.md)** — مجتمع وواتساب

1. أنشئ مشروعًا على supabase.com وانسخ المفاتيح إلى `.env.local`.
2. نفّذ `supabase/schema.sql` ثم `supabase/rls.sql` في SQL Editor.
3. Storage → أنشئ bucket اسمه **`resources`** واجعله **Private** (انظر `supabase/STORAGE.md`).
4. Authentication → Providers → فعّل **Google**، وأضف Redirect URL:  
   `http://localhost:3000/api/auth/callback` (وبعد النشر رابط Vercel).
5. أعد تشغيل `npm run dev`.

بدون المفاتيح تعمل المعاينة برسائل ودّية — لا يتعطل الموقع.

### تيليجرام (مرحلة 2)

1. أنشئ بوتًا واحصل على التوكن → `TELEGRAM_BOT_TOKEN`
2. راسل البوت واحصل على `chat_id` → `ADMIN_TELEGRAM_CHAT_ID`
3. ضع اسم البوت بدون `@` → `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`
4. ولّد `TELEGRAM_WEBHOOK_SECRET` (مثلًا `openssl rand -hex 24`)
5. بعد نشر HTTPS عيّن `NEXT_PUBLIC_APP_URL` ثم:

```bash
npm run telegram:setup          # getMe + أوامر البوت + اسم المستخدم
npm run telegram:poll           # تشغيل محلي بدون نشر (مع npm run dev)
npm run telegram:webhook:set    # setWebhook على الإنتاج
npm run telegram:webhook:info   # getWebhookInfo
npm run telegram:me             # getMe
npm run check:phase2            # جاهزية البيئة (بدون طباعة أسرار)
```

6. الطلاب يربطون الحساب من `/telegram`.

### النشر

ادفع إلى GitHub واربط المشروع بـ **Vercel** (`npx vercel` إن لزم). أضف نفس متغيرات البيئة بما فيها `TELEGRAM_*` و `CRON_SECRET`.  
Cron كل ساعة يستدعي `/api/cron/reminders` (انظر `vercel.json`).

## المسارات

| المسار | الوظيفة |
|--------|---------|
| `/` | هيرو + Feed |
| `/login` | Google OAuth |
| `/onboarding` | رقم جامعي + مواد |
| `/hub` | المكتبة |
| `/upload` | مساهمة → pending |
| `/admin` | طابور / رفع / مواعيد / أسئلة / استطلاعات |
| `/quiz` | اختبار MCQ |
| `/calendar` | التقويم |
| `/polls` | تصويت |
| `/contributors` | المساهمون |
| `/progress` | تقدم الطالب |
| `/telegram` | ربط البوت |
| `/about` | تنويه + واتساب |

## الأمان (من الخطة)

- موافقة تيليجرام فقط لـ `ADMIN_TELEGRAM_CHAT_ID`
- Storage خاص + Signed URL قصيرة
- MIME + 15MB + حد 3 pending
- Idempotency: انتقال واحد من `pending`

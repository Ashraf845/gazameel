# Gazameel — هيكل المشروع للتوسع (Scaling)

هذا الملف خريطة المشروع: أين يقع كل شيء، وكيف تضيف ميزة جديدة **بدون كسر** المسارات الحالية.

> القاعدة الذهبية: **الصفحات تعرض، الـ API ينسّق، و`src/features` + `src/shared` يحتويان المنطق**. لا تضع منطق أعمال ثقيل داخل `page.tsx`.

---

## 1. نظرة عامة على المجلدات

```
gazameel/
├── src/
│   ├── app/                 # مسارات Next فقط (صفحات + API) — مجمّعة بـ route groups
│   ├── features/            # منطق ومكوّنات كل ميزة (Feature-based)
│   ├── shared/              # مشترك بين الميزات (UI عام + supabase + ثوابت)
│   └── middleware.ts        # تحديث جلسة Supabase لكل طلب
├── supabase/                # Database: schema + RLS + Storage
├── scripts/                 # أدوات تشغيل (webhook، فحوصات، seed)
├── docs/                    # دروس المراحل والربط
├── public/                  # أصول ثابتة
├── vercel.json              # Cron / إعدادات النشر
├── .env.example             # قالب المتغيرات (لا أسرار)
└── .env.local               # أسرار محلية — لا تُرفع لـ git
```

التقنية: **Next.js (App Router)** — هيكل hybrid:

1. `src/features/<name>/` للمنطق والمكوّنات الخاصة بالميزة  
2. `src/app/(<name>)/...` لتجميع الصفحات (الأقواس لا تظهر في الـ URL)  
3. `src/app/api/(<name>)/...` لتجميع الـ API بنفس عقود المسار  
4. `src/shared/` لما يُستخدم عبر أكثر من ميزة  

---

## 2. الوحدات الخمس × المجلدات

| الوحدة | الدور | أين في الكود |
|--------|--------|----------------|
| **Front-end** | صفحات ومكوّنات | `src/app/(*)/**/page.tsx`, `src/features/*/components`, `src/shared/components` |
| **Back-end** | HTTP APIs + منطق سيرفر | `src/app/api/(*)/**/route.ts` رفيع + `src/features/*` |
| **Database** | جداول، RLS، Storage | `supabase/` |
| **Auth** | جلسة Google / حماية | `src/features/auth/`, `src/shared/lib/supabase/`, `middleware.ts`, `app/(auth)/`, `api/(auth)/` |
| **Automations** | تيليجرام، Cron | `src/features/automations/`, `api/(automations)/`, `scripts/`, `vercel.json` |

---

## 3. Feature folders (`src/features`)

| Feature | محتوى المجلد | صفحات (route group) | API (route group) |
|---------|--------------|---------------------|-------------------|
| `auth` | `auth.ts`, `user-display.ts` | `(auth)/login`, `onboarding`, `auth/*` | `(auth)/auth/*`, `onboarding` |
| `hub` | `components/DownloadButton`, `UpdatesFeed` | `(hub)/hub`, `hub/[code]` | `(hub)/resources/[id]/download` |
| `upload` | `files.ts` | `(upload)/upload`, `my-submissions` | `(upload)/upload` |
| `moderation` | `moderation.ts` | — (يُستدعى من admin + telegram) | عبر `(admin)/admin/review|submissions` |
| `quiz` | جاهز للمنطق/مكوّنات | `(quiz)/quiz`, `progress` | `(quiz)/quiz/*`, `(quiz)/admin/questions` |
| `calendar` | جاهز للمنطق | `(calendar)/calendar` | `(calendar)/admin/exams` |
| `admin` | جاهز للمنطق/مكوّنات لوحة | `(admin)/admin` | `(admin)/admin/review|submissions|resources` |
| `community` | جاهز للمنطق/مكوّنات | `(community)/polls|contributors|about|telegram` | `(community)/polls` |
| `automations` | `telegram.ts` | — | `(automations)/telegram/webhook`, `cron/reminders` |
| — | — | `(home)/page.tsx` → `/` | — |

> ملاحظة: أسماء المجلدات بين أقواس مثل `(quiz)` **لا تغيّر** الـ URL. مثال: `app/(quiz)/quiz/page.tsx` → `/quiz`.

---

## 4. Shared (`src/shared`)

### مكوّنات مشتركة (`shared/components`)

- `Navbar.tsx` / `SiteNav.tsx` / `AuthNav.tsx` — تنقّل + قائمة بروفايل (صورة → حسابي)
- `Footer.tsx`, `WelcomeBanner.tsx`, `SessionKeepAlive.tsx`, `ThemeToggle.tsx`
- `SupabaseSetupNotice.tsx` — تنبيه عند غياب الإعداد

### مكتبات مشتركة (`shared/lib`)

| الملف | المسؤولية |
|--------|-----------|
| `supabase/client.ts` | عميل متصفح (anon) |
| `supabase/server.ts` | عميل سيرفر بجلسة المستخدم |
| `supabase/admin.ts` | عميل `service_role` (بحذر) |
| `supabase/config.ts` | رفض القيم الفارغة / placeholders |
| `supabase/pkce-exchange.ts` | تبادل PKCE لـ OAuth |
| `constants.ts` | حدود الملفات، العلامة، نصوص ثابتة |
| `types.ts` | أنواع مشتركة |
| `courses.ts` | قائمة المواد (مستخدمة من عدة ميزات) |

### قواعد الواجهة

1. الصفحة تستدعي `fetch("/api/...")` أو تقرأ عبر Supabase server client — **لا تكتب مباشرة إلى Storage/جداول حسّاسة من المتصفح** إلا عبر RLS المسموح.
2. مكوّن خاص بميزة واحدة → `src/features/<name>/components/`. مشترك → `src/shared/components/`.
3. الأنماط العامة في `app/layout.tsx` — حافظ على نفس اللغة البصرية.

---

## 5. Back-end (API Routes)

كلها تحت `src/app/api/(<feature>)/.../route.ts` — المسار العام كما كان:

| المجال | المسارات العامة | المنطق |
|--------|-----------------|--------|
| رفع ومراجعة | `/api/upload`, `/api/admin/review`, `/api/admin/submissions`, `/api/admin/resources`, `/api/resources/[id]/download` | `features/upload`, `features/moderation` |
| كويز | `/api/quiz/start`, `/api/quiz/submit`, `/api/admin/questions` | جداول questions / quiz_attempts |
| مواعيد | `/api/admin/exams` | `exam_events` |
| استطلاعات | `/api/polls` | polls / poll_votes |
| Onboarding | `/api/onboarding` | profiles, student_courses |
| Auth | `/api/auth/google`, `/callback`, `/signout` | `features/auth`, `shared/lib/supabase` |
| تيليجرام | `/api/telegram/webhook`، `/api/telegram/setup` | `features/automations/telegram` |
| Cron | `/api/cron/reminders` | `sendExamReminders` |

### قواعد الـ API

1. **تحقق الهوية أولًا** (`requireUser` / `requireAdmin` من `features/auth/auth`) قبل أي كتابة.
2. استخدم `createAdminClient()` فقط لما يلزم تجاوز RLS.
3. مسار جديد = مجلد تحت `api/(feature)/` + دالة في `features/<feature>/` — لا تنسخ منطق الموافقة من `moderation.ts`.

---

## 6. Database

المجلد: `supabase/`

| الملف | المحتوى |
|--------|---------|
| `schema.sql` | الجداول |
| `rls.sql` | سياسات Row Level Security |
| `storage-policies.sql` | صلاحيات الـ bucket |
| `STORAGE.md` | توثيق مسارات الملفات |
| `telegram_link_tokens.sql` | ترقية idempotent لجدول ربط تيليجرام (قواعد قديمة) |

### الجداول الأساسية

| جدول | الاستخدام |
|------|-----------|
| `courses` | المواد |
| `profiles` | المستخدمون + `is_admin` + `telegram_chat_id` |
| `student_courses` | مواد الطالب |
| `resources` | ملفات Hub (pending / approved / rejected) |
| `updates_feed` | تغذية التحديثات |
| `exam_events` | مواعيد الاختبارات |
| `questions` / `quiz_attempts` | بنك الأسئلة والمحاولات |
| `polls` / `poll_votes` | الاستطلاعات |
| `reminder_log` | منع تكرار تذكير نفس النافذة |
| `telegram_link_tokens` | توكن لمرة واحدة لربط تيليجرام (بدل UUID في الرابط) |

### قواعد قاعدة البيانات

1. أي جدول جديد: أضفه في `schema.sql` **ثم** سياسات في `rls.sql`.
2. لا تعتمد على `service_role` من الواجهة — فقط من Route Handlers / cron.
3. مسارات Storage: `pending/{userId}/...` و `approved/{courseId}/...` — غيّرها فقط عبر `features/moderation`.

---

## 7. Auth

| القطعة | الموقع |
|--------|--------|
| تحديث الكوكيز | `src/middleware.ts` |
| جلسة / ملف المستخدم | `src/features/auth/auth.ts` |
| عرض الاسم/الصورة | `src/features/auth/user-display.ts` |
| عملاء Supabase | `src/shared/lib/supabase/*` |
| صفحات | `app/(auth)/login`, `onboarding`, `auth/confirm` |
| APIs | `api/(auth)/auth/*`, `onboarding` |

### تدفق مختصر

```
المستخدم → /login → api/auth/google → Google → api/auth/callback
  → كوكيز جلسة → middleware يجدّدها → getProfile() / requireUser()
```

---

## 8. Automations

| الآلية | أين | حماية |
|--------|-----|--------|
| Webhook تيليجرام | `api/(automations)/telegram/webhook` → `handleTelegramUpdate` | `TELEGRAM_WEBHOOK_SECRET` |
| ربط Webhook | `api/(automations)/telegram/setup?secret=` → `registerProductionWebhook` | نفس سرّ الـ webhook |
| إشعار رفع جديد | `notifyAdminNewSubmission` من `api/(upload)/upload` | توكن + chat id الأدمن |
| موافقة/رفض من البوت | callback `approve:` / `reject:` | `ADMIN_TELEGRAM_CHAT_ID` |
| أوامر البوت | `/start` `/help` `/countdown` `/daily` `/whoami` في `features/automations/telegram.ts` | — |
| تذكيرات | `api/(automations)/cron/reminders` + `vercel.json` | `Bearer CRON_SECRET` |
| إدارة Webhook | `scripts/telegram-webhook.mjs` (`set` / `setup` / `commands`) | يقرأ `.env.local` |
| تشغيل محلي | `scripts/telegram-poll.mjs` → `npm run telegram:poll` | getUpdates ثم POST للـ webhook المحلي |

---

## 9. كيف تضيف ميزة جديدة بدون كسر الكود؟

### الخطوة 1 — حدّد الـ feature

أنشئ أو استخدم مجلدًا تحت `src/features/<name>/`.

### الخطوة 2 — بيانات أولًا (إن لزم)

1. عدّل `supabase/schema.sql` ثم `rls.sql`
2. أضف النوع في `shared/lib/types.ts` أو داخل الـ feature إن كان خاصًا بها

### الخطوة 3 — منطق في `src/features/<name>`

- دالة واضحة قابلة لإعادة الاستخدام من API ومن أتمتة.
- مشترك بين ميزات → `src/shared/`.

### الخطوة 4 — Route Handler رفيع

```
src/app/api/(<name>)/<path>/route.ts
  → تحقق Auth
  → استدعِ features/<name>
  → أرجع JSON
```

### الخطوة 5 — صفحة UI

```
src/app/(<name>)/<path>/page.tsx
  → مكوّنات من features/<name>/components أو shared/components
  → fetch للـ API فقط
```

### الخطوة 6 — أتمتة (اختياري)

- إشعار: دالة في `features/automations` (أو feature ذات الصلة) + استدعاء من الـ API بعد النجاح (try/catch).
- جدولة: تحت `api/(automations)/cron/` + `vercel.json` + `CRON_SECRET`.

### الخطوة 7 — حدّث هذه الخريطة

حدّث جداول هذا الملف (والمتغير في `.env.example` إن لزم). القاعدة في `.cursor/rules/gazameel-structure.mdc` تلزم بذلك.

### ما يُمنع

| لا تفعل | افعل بدلًا منه |
|---------|----------------|
| منطق موافقة في الصفحة | `features/moderation` |
| تيليجرام من مكوّن عميل | من API / `features/automations` |
| ملف تحت `src/lib/` أو `src/components/` (أُلغيا) | `features/` أو `shared/` |
| جدول بلا RLS | سياسة في `rls.sql` |

---

## 10. خريطة سريعة: «أريد أضيف X»

| الميزة | أين تبدأ |
|--------|----------|
| صفحة عامة جديدة | `app/(feature)/.../page.tsx` + رابط في `shared/components/SiteNav.tsx` |
| زر إداري جديد | `app/(admin)/admin` + `api/(admin)/admin/<action>` + منطق في `features/admin` |
| تحقق رفع | `features/upload/files.ts` ثم `api/(upload)/upload` |
| سؤال/كويز | `features/quiz` + `api/(quiz)/...` |
| إشعار تيليجرام | `features/automations/telegram.ts` |
| تذكير مجدول | وسّع `sendExamReminders` أو cron تحت `(automations)` |
| جدول DB جديد | `schema.sql` → `rls.sql` → types → API |

---

## 11. حدود التوسع لاحقًا

الشكل الحالي كافٍ طالما المنطق في `features/` والـ API رفيع وDB محمية بـ RLS.

فكّر بفصل خدمة لاحقًا فقط إذا صار البوت/الـ cron ثقيلين جدًا، أو احتجت طابور مهام منفصل.

---

## 12. مراجع سريعة

- تشغيل وإعداد: `README.md`
- دروس المراحل: `docs/درس-المرحلة-1.md` … `3`
- قالب الأسرار: `.env.example`
- فحص جاهزية المرحلة 2: `npm run check:phase2`
- قاعدة Cursor: `.cursor/rules/gazameel-structure.mdc`
- تباين الثيم: `.cursor/rules/theme-contrast.mdc` + `.cursor/skills/theme-contrast/`

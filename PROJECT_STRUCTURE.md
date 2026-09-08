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
│   └── proxy.ts             # تجديد جلسة Supabase على المسارات المحمية فقط
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
| **Auth** | جلسة Google / حماية | `src/features/auth/`, `src/shared/lib/supabase/`, `proxy.ts`, `app/(auth)/`, `api/(auth)/` |
| **Automations** | تيليجرام، Cron | `src/features/automations/`, `api/(automations)/`, `scripts/`, `vercel.json` |

---

## 3. Feature folders (`src/features`)

| Feature | محتوى المجلد | صفحات (route group) | API (route group) |
|---------|--------------|---------------------|-------------------|
| `auth` | `auth.ts`, `client-session.ts`, `user-display.ts`, `HeroLoginLink.tsx` | `(auth)/login`, `onboarding`, `auth/*` | `(auth)/auth/*`, `onboarding` |
| `hub` | `catalog.ts`, `updates.ts` + `DownloadButton`, `UpdatesFeed`, `HubCourseGrid`, `CourseResources` | `(hub)/hub`, `hub/[code]` | `(hub)/resources/[id]/download` |
| `upload` | `files.ts` | `(upload)/upload`, `my-submissions` | `(upload)/upload` |
| `moderation` | `moderation.ts` | — (يُستدعى من admin + telegram) | عبر `(admin)/admin/review|submissions` |
| `quiz` | `quiz.ts`, `grading.ts`, `components/QuizPanel` | `(quiz)/quiz`, `progress` | `(quiz)/quiz/*`, `(quiz)/admin/questions` |
| `calendar` | `events.ts`, `labels.ts`, `components/ExamEventsList` | `(calendar)/calendar`, `countdown` | `(calendar)/calendar/events` + عبر `(admin)/admin/exams` |
| `admin` | `dashboard.ts`, `email.ts` + مكوّنات الإحصائيات/البريد/الإشعارات/الطابور/الأسئلة | `(admin)/admin` | `(admin)/admin/review|submissions|resources|dashboard|messages` |
| `community` | صندوق الرسائل + `contributors.ts` + `polls.ts` + صفحات المجتمع | `(community)/polls|contributors|about|telegram|inbox` | `(community)/polls|messages` |
| `automations` | `telegram.ts` | — | `(automations)/telegram/webhook`, `cron/reminders` |
| — | — | `(home)/page.tsx` → `/` | — |

> ملاحظة: أسماء المجلدات بين أقواس مثل `(quiz)` **لا تغيّر** الـ URL. مثال: `app/(quiz)/quiz/page.tsx` → `/quiz`.

---

## 4. Shared (`src/shared`)

### مكوّنات مشتركة (`shared/components`)

- `Navbar.tsx` / `SiteNav.tsx` / `AuthNav.tsx` — تنقّل + قائمة بروفايل (صورة → حسابي)
- `NavigationLoader.tsx` / `PageLoading.tsx` / `NavPendingHint.tsx` — تحميل حيوي عند الانتقال
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
| `nav.ts` | روابط الشريط العلوي + قائمة المزيد (للتذييل أيضًا) |
| `types.ts` | أنواع مشتركة |
| `timeout.ts` | مهلة لطلبات الشبكة حتى لا تعلق الصفحات |
| `courses.ts` | كتالوج احتياطي للمواد (جدول `courses` هو المصدر بعد الربط) |

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
| لوحة التحكم | `/api/admin/dashboard`, `/api/admin/messages` | `features/admin/dashboard` |
| صندوق المستخدم | `/api/messages` | `features/community/messages` |
| كويز | `/api/quiz/start`, `/api/quiz/submit`, `/api/admin/questions` | `features/quiz/quiz.ts` |
| مواعيد | `/api/calendar/events`, `/api/admin/exams` | `exam_events` |
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
| `schema.sql` | الجداول + الفهارس + الواجهات |
| `rls.sql` | سياسات Row Level Security (يشمل إغلاق قراءة أسئلة الكويز من العميل) |
| `upgrade.sql` | ترقية قاعدة موجودة: إعلانات، فهارس، واجهات، إغلاق إجابات الكويز |
| `admin_dashboard.sql` / `performance.sql` | مؤشر إلى `upgrade.sql` (لا تنفّذهما في SQL Editor) |
| `rls-check.sql` | فحص: جداول بلا RLS، أو سياسات بلا `(select auth.uid())` |
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
| `course_approved_counts` | واجهة: المادة + عدد الملفات المعتمدة (طلب واحد للكتالوج) |
| `admin_dashboard_stats` | واجهة: أعداد لوحة الأدمن في صف واحد (service role) |
| `contributor_stats` | واجهة تجميع المساهمين |
| `exam_events` | مواعيد الاختبارات |
| `questions` / `quiz_attempts` | بنك الأسئلة والمحاولات |
| `polls` / `poll_votes` | الاستطلاعات |
| `reminder_log` | منع تكرار تذكير نفس النافذة |
| `telegram_link_tokens` | توكن لمرة واحدة لربط تيليجرام (بدل UUID في الرابط) |
| `admin_messages` | سجل بريد وإشعارات لوحة التحكم |
| `user_message_reads` | تتبّع الرسائل المقروءة لكل مستخدم |

### قواعد قاعدة البيانات

1. أي جدول جديد: أضفه في `schema.sql` مع `enable row level security` في نفس التغيير، **ثم** سياسات في `rls.sql`، ثم تحقّق بـ `rls-check.sql`.
2. لا تعتمد على `service_role` من الواجهة — فقط من Route Handlers / cron.
3. مسارات Storage: `pending/{userId}/...` و `approved/{courseId}/...` — غيّرها فقط عبر `features/moderation`.

---

## 7. Auth

| القطعة | الموقع |
|--------|--------|
| تحديث الكوكيز | `src/proxy.ts` |
| جلسة / ملف المستخدم | `src/features/auth/auth.ts` (سيرفر) + `client-session.ts` (متصفح، طلب واحد مشترك) |
| معالجة رجوع Google | `src/features/auth/callback.ts` (يخدم `/auth/callback` و`/api/auth/callback`) |
| عرض الاسم/الصورة | `src/features/auth/user-display.ts` |
| عملاء Supabase | `src/shared/lib/supabase/*` |
| صفحات | `app/(auth)/login`, `onboarding`, `auth/confirm` |
| APIs | `api/(auth)/auth/*`, `onboarding` |

### تدفق مختصر

```
المستخدم → /login → api/auth/google → Google → api/auth/callback (أو /auth/callback)
  → كوكيز جلسة → proxy.ts يجدّدها على المسارات المحمية → getProfile() / requireUser()
```

كلا المسارين يستدعيان `handleAuthCallback` نفسها، فأي Redirect URL مضبوط في Supabase يعمل.

---

## 8. Automations

| الآلية | أين | حماية |
|--------|-----|--------|
| Webhook تيليجرام | `api/(automations)/telegram/webhook` → `handleTelegramUpdate` | `TELEGRAM_WEBHOOK_SECRET` |
| ربط Webhook | `api/(automations)/telegram/setup?secret=` → `registerProductionWebhook` | نفس سرّ الـ webhook |
| إشعار رفع جديد | `notifyAdminNewSubmission` من `api/(upload)/upload` | توكن + chat id الأدمن |
| موافقة/رفض من البوت | callback `approve:` / `reject:` | `ADMIN_TELEGRAM_CHAT_ID` |
| أوامر البوت | `/start` `/help` `/countdown` `/daily` `/whoami` في `features/automations/telegram.ts` | — |
| بث إشعار للطلاب | `broadcastTelegramToChats` من لوحة الأدمن | توكن البوت |
| بث بريد للطلاب | `features/admin/email.ts` عبر Resend Batch API | `RESEND_API_KEY` + `BROADCAST_EMAIL_FROM` |
| إدارة Webhook | `scripts/telegram-webhook.mjs` (`set` / `setup` / `commands` / `photo`) | يقرأ `.env.local` |
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

## 11. حدود التوسع والأداء

الشكل الحالي كافٍ طالما المنطق في `features/` والـ API رفيع وDB محمية بـ RLS.

**أداء التنقّل (إلزامي للصفحات العامة):**

1. الصفحة تعرض الهيكل فورًا — البيانات من مكوّن عميل أو `/api/...` بعد الرسم.
2. `proxy.ts` يجدّد الجلسة على المسارات المحمية فقط (`/admin`, `/upload`, `/inbox`…) لا على `/` و`/hub`.
3. استعلامات القوائم عليها `limit`/`range` وأعمدة محددة (لا `select("*")`) وفهارس في `schema.sql` / `upgrade.sql`.
4. المكتبة والمساهمون والتقويم تُقرأ على السيرفر (مع صفحات للملفات). لا تسحب آلاف الصفوف من المتصفح.
5. سياسات RLS تستخدم `(select auth.uid())` — تُحسب مرة لكل طلب بدل كل صف.
6. بث تيليجرام يُرسل على دفعات متوازية، والإشعارات بعد الاستجابة عبر `runAfterResponse` (`shared/lib/background.ts`) بسقف زمني، ونداءات البوت بمهلة 5 ثوانٍ.
7. أي أداة تتصل بـ Postgres مباشرة: **6543** (Transaction) للتشغيل و**5432** (Session) للترحيلات.
8. عند تغيّر محتوى معتمد أو موعد: `revalidatePublicContent` / `revalidateCalendar` (`shared/lib/revalidate.ts`) — لا تعتمد على المهلة الزمنية وحدها.
9. أي جدول جديد: `enable row level security` فورًا في `schema.sql`، ثم تحقّق بـ `supabase/rls-check.sql`.

فكّر بفصل خدمة لاحقًا فقط إذا صار البوت/الـ cron ثقيلين جدًا، أو احتجت طابور مهام منفصل.

---

## 12. مراجع سريعة

- تشغيل وإعداد: `README.md`
- دروس المراحل: `docs/درس-المرحلة-1.md` … `3`
- قالب الأسرار: `.env.example`
- فحص جاهزية المرحلة 2: `npm run check:phase2`
- اختبارات الوحدة: `npm test`
- قاعدة Cursor: `.cursor/rules/gazameel-structure.mdc`
- تباين الثيم: `.cursor/rules/theme-contrast.mdc` + `.cursor/skills/theme-contrast/`
- أداء Next.js: `.cursor/rules/nextjs-performance.mdc` + `.cursor/skills/nextjs-performance/`
- أداء Supabase: `.cursor/skills/supabase-performance/`
- أداء وتوسّع Supabase: `.cursor/skills/supabase-performance/`
- دخول Google وثبات الجلسة: `.cursor/skills/supabase-google-auth/`

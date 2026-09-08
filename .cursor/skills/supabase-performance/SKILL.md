---
name: supabase-performance
description: >-
  Fixes slow Supabase reads and writes in Next.js — indexes, RLS InitPlan with
  (select auth.uid()), connection pooling on port 6543, pagination and selective
  columns, ISR caching, and background jobs for notifications. Use when pages or
  queries are slow, when the site stalls as users grow, or when the user mentions
  بطء, أداء, performance, scaling, indexes, RLS, pooler, أو تأخير عند الحفظ.
---

# Supabase performance & scaling (Next.js)

## 1. الفهارس (Indexes)

بدون فهرس تفحص القاعدة كل الصفوف (Full Table Scan) → ثوانٍ.

أنشئ فهارس للأعمدة المستخدمة في `WHERE` و`ORDER BY` و`JOIN`:

```sql
create index if not exists resources_status_course_idx
  on public.resources (status, course_id);
create index if not exists resources_course_status_created_idx
  on public.resources (course_id, status, created_at desc);
create index if not exists resources_uploaded_by_created_idx
  on public.resources (uploaded_by, created_at desc);
```

القاعدة: الفهرس المركّب يرتّب أعمدته حسب المساواة أولًا ثم الترتيب الزمني.

## 2. RLS — احسب `auth.uid()` مرة لكل طلب

`auth.uid()` داخل السياسة تُنفّذ **لكل صف**. غلّفها بـ `(select ...)` فتصير InitPlan:

```sql
-- بطيء
create policy "..." on resources for select using (uploaded_by = auth.uid());

-- سريع
create policy "..." on resources for select using (uploaded_by = (select auth.uid()));
```

طبّقها على **كل** سياسة: `using` و`with check` و`exists (...)` بالداخل.

## 3. Connection Pooling (المنفذ 6543)

Serverless يفتح ويغلق اتصالات كثيرة → القاعدة ترفض الطلبات عند زيادة المستخدمين.

Supabase Dashboard → Project Settings → Database → Connection Pooling.

| المنفذ | الوضع | لماذا |
|--------|-------|-------|
| **6543** | Transaction | استعلامات قصيرة من Serverless / وقت التشغيل |
| **5432** | Session | الترحيلات (migrations)، `psql`، `pg_dump`، وأي أداة تحتاج prepared statements أو معاملات طويلة |

```
postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
```

- لا تُشغّل ترحيلات على 6543 — تفشل عند أول prepared statement. ضع رابط 5432 في متغير منفصل (`DIRECT_URL` في Prisma/Drizzle).
- عملاء `@supabase/supabase-js` يمرّون على PostgREST (HTTP) فلا يحتاجون رابط Postgres أصلًا؛ القاعدة تخصّ أي اتصال مباشر.

## 4. تحديد الأعمدة + Pagination

```ts
const { data, count } = await supabase
  .from("resources")
  .select("id, title, resource_type, created_at", { count: "exact" })
  .eq("status", "approved")
  .order("created_at", { ascending: false })
  .range(from, from + pageSize - 1);
```

- لا `select("*")` في مسارات القراءة الساخنة.
- كل قائمة لها `limit` أو `range`.
- للعدّ استخدم `select("id", { count: "exact", head: true })` أو view مجمّعة.

## 5. التخزين المؤقت (ISR / RSC)

اجلب البيانات في Server Component وفعّل إعادة البناء الدوري:

```ts
export const revalidate = 60;
```

- الصفحات العامة: `revalidate` بدل `force-dynamic`.
- مسارات API العامة: `Cache-Control: public, s-maxage=60, stale-while-revalidate=120`.
- الصفحات المرتبطة بالمستخدم تبقى ديناميكية.

المهلة الزمنية وحدها لا تكفي للصفحات المجمَّعة: عند انتهائها مع زحام زوار يُعاد التجميع.
فرّغ الكاش عند تغيّر المحتوى فعليًا:

```ts
import { revalidatePath } from "next/cache";

// بعد اعتماد ملف فقط — لا مع كل زيارة
revalidatePath("/hub");
revalidatePath(`/hub/${courseCode}`);
```

يُستدعى من Route Handler أو Server Action فقط؛ غلّفه بـ `try/catch` إن كان الكود يعمل أيضًا من سكربت أو cron.

## 6. الكتابة: أجّل الثانوي إلى الخلفية

لا تجعل المستخدم ينتظر تيليجرام أو البريد بعد الحفظ:

```ts
import { after } from "next/server";

after(async () => {
  try {
    await notifyAdmin(id);
  } catch (e) {
    console.error(e);
  }
});
```

- الكتابة الأساسية أولًا ثم الاستجابة، والإشعار بعدها.
- عدة كتابات مترابطة → ادمجها أو استخدم RPC / Stored Procedure بدل `await` متتالية.
- البث الجماعي: دفعات متوازية (مثلاً 8 في المرة) لا رسالة-رسالة.

**`after` لا يعني بلا حدود**: المهمة تعمل ضمن مهلة دالة الاستضافة نفسها. شبكة معلّقة
تُبقي دالة Serverless مفتوحة حتى نهاية المهلة وتُحتسب عليك.

- ضع مهلة على كل نداء خارجي: `AbortSignal.timeout(3000)` في `fetch`، أو خيار العميل المكافئ (في grammy: `new Bot(token, { client: { timeoutSeconds: 5 } })`).
- ضع سقفًا كليًا للمهمة الخلفية عبر `Promise.race` حتى لو نسي أحد النداءات مهلته.

## 7. RLS لكل جدول جديد

`enable row level security` فور إنشاء الجدول — بدونها يبقى مقروءًا عبر الـ API العام:

```sql
alter table public.new_table enable row level security;
```

للتحقق من الجداول المكشوفة:

```sql
select c.relname
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
```

أي صف في النتيجة = جدول مفتوح. انتبه أيضًا: RLS مفعّلة بلا سياسات تمنع كل شيء.

## ترتيب التنفيذ

1. الفهارس + تحسين RLS في SQL Editor — أكبر أثر فوري.
2. رابط الـ Pooler: 6543 للتشغيل، 5432 للترحيلات.
3. Pagination وتحديد الأعمدة في الكود.
4. `revalidate` للصفحات العامة + `revalidatePath` عند تغيّر المحتوى.
5. الإشعارات بعد الاستجابة، بمهلة على كل نداء خارجي.

## في Gazameel

- SQL الجاهز: `supabase/upgrade.sql` (فهارس + views) ثم `supabase/rls.sql` (السياسات بصيغة `(select auth.uid())`) — يُنفَّذان مرة في SQL Editor بهذا الترتيب.
- فحص الجداول المكشوفة: `supabase/rls-check.sql`.
- عمل خلفي بسقف زمني: `runAfterResponse` في `src/shared/lib/background.ts`.
- تفريغ الكاش: `revalidatePublicContent` / `revalidateCalendar` في `src/shared/lib/revalidate.ts`.
- تصفّح المكتبة: `listApprovedResources` في `src/features/hub/catalog.ts`.
- تجديد الجلسة على المسارات المحمية فقط: `src/proxy.ts`.

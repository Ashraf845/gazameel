---
name: supabase-google-auth
description: >-
  Fixes Google OAuth login loops and lost sessions with @supabase/ssr in the
  Next.js App Router — callback route that exchanges the code and writes session
  cookies, matching Redirect URLs in Supabase and Google Cloud, and HTTPS
  SameSite=Lax cookie rules. Use when login returns to the site still logged out,
  or the user mentions تسجيل الدخول, جوجل, session, cookies, أو callback.
---

# Google login that sticks (@supabase/ssr + App Router)

## العرض المتكرر

المستخدم يختار حساب Google ويرجع للموقع، فيطلب منه الدخول من جديد — أي أن كوكي
الجلسة لم يُحفظ في المتصفح، أو أن معالجة الـ callback غير مكتملة.

## 1. مسار callback يبدّل الـ code ويكتب الكوكيز

الملف: `app/auth/callback/route.ts` (وكرّره على أي مسار آخر مضبوط في Supabase).

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/") || next.startsWith("//")) next = "/";

  if (!code) return NextResponse.redirect(`${origin}/login?error=auth`);

  let sessionCookies: { name: string; value: string; options?: object }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies) {
          if (!cookies.length) return; // لا تمسح كوكيز الجلسة باستدعاء فارغ
          sessionCookies = cookies;
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=exchange&detail=${encodeURIComponent(error.message)}`
    );
  }

  const response = NextResponse.redirect(`${origin}${next}`);
  sessionCookies.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options)
  );
  return response;
}
```

قواعد لا تُخالف:

- اكتب الكوكيز على **نفس** الاستجابة التي تُرجع التحويل.
- لا تستبدل مصفوفة الكوكيز باستدعاء `setAll` فارغ.
- ابدأ OAuth من **أصل الطلب** (`request.nextUrl.origin`) لا من متغير بيئة قد يكون localhost، وإلا لن يصل `code_verifier` إلى الـ callback.
- استثنِ مسارات `/auth/` من الـ proxy/middleware حتى لا يتداخل تحديث الكوكيز مع التبادل.
- تحقّق من وجود `session` بعد التبادل قبل التحويل، وأظهر سبب الفشل بدل رسالة عامة.

## 2. مطابقة روابط التوجيه

**Supabase → Authentication → URL Configuration**

- Site URL: رابط الموقع الرسمي.
- Redirect URLs: `https://yourdomain.com/auth/callback` (أضف نسخة localhost للتطوير).

**Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID**

- Authorized redirect URIs: `https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback`

أي اختلاف بين المسار المسجَّل والمسار الفعلي = فقدان الجلسة.

## 3. HTTPS و SameSite

- الإنتاج كله على **HTTPS**؛ المتصفحات ترفض كوكيز التوجيه الخارجي على HTTP.
- خيارات الكوكي: `SameSite=Lax` مع `Secure` على HTTPS.
- لا تجعل `secure` مرتبطًا بـ `NODE_ENV` وحده — على `next start` محليًا عبر HTTP سيُسقط المتصفح الكوكي. اربطه بالبروتوكول/المنصة.

## تشخيص سريع

| العرض | الفحص |
|-------|-------|
| رجع بلا جلسة | هل `Set-Cookie` موجود على استجابة الـ callback؟ |
| `code_verifier` مفقود | هل بدأ OAuth من نفس الدومين الذي رجع إليه؟ |
| يعمل محليًا لا على الإنتاج | Redirect URLs + HTTPS + `Secure` |
| يعمل ثم ينسى بعد إغلاق المتصفح | `maxAge` طويل بدل كوكي جلسة |

## في Gazameel

- المعالجة المشتركة: `src/features/auth/callback.ts`
- المساران: `src/app/(auth)/auth/callback/route.ts` و `src/app/api/(auth)/auth/callback/route.ts`
- بدء OAuth: `src/app/api/(auth)/auth/google/route.ts`
- خيارات الكوكيز: `src/shared/lib/supabase/config.ts`
- استثناء المسارات: `src/proxy.ts`

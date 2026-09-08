import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import {
  getSupabasePublicEnv,
  type CookieToSet,
  withPersistentCookieOptions,
  AUTH_COOKIE_OPTIONS,
  oauthRequestOrigin,
} from "@/shared/lib/supabase/config";

/** PKCE — يبدأ OAuth ويحفظ code_verifier في cookie → يرجع لـ /api/auth/callback */
export async function GET(request: NextRequest) {
  const env = getSupabasePublicEnv();
  const origin = oauthRequestOrigin(request.nextUrl);

  if (!env) {
    return NextResponse.redirect(`${origin}/login?error=supabase_config`);
  }

  let next = request.nextUrl.searchParams.get("next") ?? "/hub";
  if (!next.startsWith("/") || next.startsWith("//")) next = "/hub";

  const callbackUrl = new URL("/api/auth/callback", origin);
  callbackUrl.searchParams.set("next", next);
  let cookiesToApply: CookieToSet[] = [];

  const supabase = createServerClient(env.url, env.anonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies: CookieToSet[]) {
        if (!cookies.length) return;
        cookiesToApply = cookies;
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      skipBrowserRedirect: true,
      queryParams: {
        // تسجيل الخروج من Gazameel لا يُخرج المستخدم من Google نفسه.
        // اطلب اختيار الحساب حتى لا يعيد Google استخدام آخر حساب تلقائيًا.
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url || cookiesToApply.length === 0) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // 200 + تحويل من نفس الدومين حتى لا يُحذف code_verifier على 307 لجوجل (Safari/Chrome).
  const redirectUrl = data.url;
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>دخول</title>
<meta http-equiv="refresh" content="0;url=${redirectUrl.replace(/"/g, "")}">
</head><body>
<p>جارٍ التحويل إلى Google…</p>
<script>location.replace(${JSON.stringify(redirectUrl)})</script>
</body></html>`;
  const redirectResponse = new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
  cookiesToApply.forEach(({ name, value, options }) => {
    redirectResponse.cookies.set(
      name,
      value,
      withPersistentCookieOptions(options) as Parameters<
        typeof redirectResponse.cookies.set
      >[2]
    );
  });

  return redirectResponse;
}

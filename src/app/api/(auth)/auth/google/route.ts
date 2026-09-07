import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicEnv, type CookieToSet, withPersistentCookieOptions, AUTH_COOKIE_OPTIONS } from "@/shared/lib/supabase/config";

/** PKCE — يبدأ OAuth ويحفظ code_verifier في cookie → يرجع لـ /api/auth/callback */
export async function GET(request: NextRequest) {
  const env = getSupabasePublicEnv();
  const requestOrigin = request.nextUrl.origin;
  const configuredAppUrl =
    process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_APP_URL?.trim()
      : undefined;
  let origin = requestOrigin;

  if (configuredAppUrl) {
    try {
      origin = new URL(configuredAppUrl).origin;
    } catch {
      /* استخدم دومين الطلب إذا كانت القيمة غير صالحة */
    }
  }

  if (!env) {
    return NextResponse.redirect(`${origin}/login?error=supabase_config`);
  }

  let next = request.nextUrl.searchParams.get("next") ?? "/hub";
  if (!next.startsWith("/") || next.startsWith("//")) next = "/hub";

  // ابدأ PKCE على الدومين الرسمي نفسه كي يصل verifier cookie إلى callback.
  if (origin !== requestOrigin) {
    const canonicalStart = new URL("/api/auth/google", origin);
    canonicalStart.searchParams.set("next", next);
    return NextResponse.redirect(canonicalStart);
  }

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

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const redirectResponse = NextResponse.redirect(data.url);
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

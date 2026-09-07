import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicEnv, type CookieToSet, withPersistentCookieOptions, AUTH_COOKIE_OPTIONS } from "@/shared/lib/supabase/config";

/** PKCE — يبدأ OAuth ويحفظ code_verifier في cookie → يرجع لـ /api/auth/callback */
export async function GET(request: NextRequest) {
  const env = getSupabasePublicEnv();
  const origin = request.nextUrl.origin;

  if (!env) {
    return NextResponse.redirect(`${origin}/login?error=supabase_config`);
  }

  const redirectTo = `${origin}/api/auth/callback?next=/onboarding`;
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
      redirectTo,
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

import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import {
  getSupabasePublicEnv,
  type CookieToSet,
  withPersistentCookieOptions,
  AUTH_COOKIE_OPTIONS,
} from "@/shared/lib/supabase/config";
import {
  exchangePkceCode,
  getCodeVerifierFromRequest,
} from "@/shared/lib/supabase/pkce-exchange";

/**
 * رجوع Google OAuth: يبدّل الـ code بجلسة ويكتب كوكيز الجلسة على الاستجابة.
 * مشترك بين /api/auth/callback و /auth/callback حتى يعمل أي Redirect URL مضبوط في Supabase.
 */
export async function handleAuthCallback(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/onboarding";
  if (!next.startsWith("/") || next.startsWith("//")) next = "/onboarding";

  if (!code) {
    const err =
      searchParams.get("error_description") || searchParams.get("error");
    if (err) {
      return NextResponse.redirect(
        `${origin}/login?error=auth&detail=${encodeURIComponent(err)}`
      );
    }
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const env = getSupabasePublicEnv();
  if (!env) {
    return NextResponse.redirect(`${origin}/login?error=supabase_config`);
  }

  const verifier = getCodeVerifierFromRequest(request, env.url);
  if (!verifier) {
    return NextResponse.redirect(
      `${origin}/login?error=exchange&detail=${encodeURIComponent(
        "انتهت جلسة الدخول — تأكد أنك تكمل من نفس المتصفح، ثم جرّب من جديد"
      )}`
    );
  }

  let sessionCookies: CookieToSet[] = [];

  const supabase = createServerClient(env.url, env.anonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies: CookieToSet[]) {
        if (!cookies.length) return;
        const byName = new Map(sessionCookies.map((c) => [c.name, c]));
        for (const cookie of cookies) byName.set(cookie.name, cookie);
        sessionCookies = Array.from(byName.values());
      },
    },
  });

  let exchangeError: string | null = null;

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    exchangeError = error.message;
    const manual = await exchangePkceCode(request, env.url, env.anonKey, code);
    if (manual) {
      const { error: setErr } = await supabase.auth.setSession(manual);
      if (!setErr) exchangeError = null;
      else exchangeError = setErr.message;
    }
  }

  if (exchangeError) {
    console.error("[auth/callback]", exchangeError);
    return NextResponse.redirect(
      `${origin}/login?error=exchange&detail=${encodeURIComponent(exchangeError)}`
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session || sessionCookies.length === 0) {
    return NextResponse.redirect(
      `${origin}/login?error=exchange&detail=${encodeURIComponent(
        "تم الدخول في Google لكن الجلسة ما انحفظت في المتصفح — جرّب من جديد"
      )}`
    );
  }

  const redirectResponse = NextResponse.redirect(`${origin}${next}`);
  sessionCookies.forEach(({ name, value, options }) => {
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

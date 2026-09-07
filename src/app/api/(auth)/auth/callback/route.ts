import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicEnv, type CookieToSet, withPersistentCookieOptions, AUTH_COOKIE_OPTIONS } from "@/shared/lib/supabase/config";
import { exchangePkceCode, getCodeVerifierFromRequest } from "@/shared/lib/supabase/pkce-exchange";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/onboarding";
  if (!next.startsWith("/")) next = "/onboarding";

  if (!code) {
    const err = searchParams.get("error_description") || searchParams.get("error");
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
        sessionCookies = cookies;
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

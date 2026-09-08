import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  AUTH_COOKIE_OPTIONS,
  type CookieToSet,
  withPersistentCookieOptions,
} from "@/shared/lib/supabase/config";
import { withTimeout } from "@/shared/lib/timeout";

function hasSupabaseSessionCookie(request: NextRequest) {
  return request.cookies.getAll().some((c) => {
    if (!c.name.startsWith("sb-")) return false;
    if (c.name.includes("code-verifier")) return false;
    return /auth-token(?:\.\d+)?$/.test(c.name);
  });
}

function needsSessionRefresh(pathname: string) {
  if (
    pathname.startsWith("/api/telegram/") ||
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/auth/callback") ||
    pathname === "/api/calendar/events"
  ) {
    return false;
  }

  const protectedPrefixes = [
    "/admin",
    "/upload",
    "/my-submissions",
    "/inbox",
    "/onboarding",
    "/progress",
    "/telegram",
    "/login",
  ];
  if (
    protectedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return true;
  }

  return pathname.startsWith("/api/");
}

/**
 * يحدّث كوكيز الجلسة على الصفحات/الـ API التي تحتاج هوية فقط.
 * الصفحات العامة لا تنتظر Auth حتى يبقى التنقّل سريعًا مع توسّع المستخدمين.
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!needsSessionRefresh(pathname)) {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.next();
  }

  if (!hasSupabaseSessionCookie(request)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anon, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(
            name,
            value,
            withPersistentCookieOptions(options) as Parameters<
              typeof response.cookies.set
            >[2]
          );
        });
      },
    },
  });

  try {
    await withTimeout(supabase.auth.getUser(), 2500);
  } catch {
    /* الشبكة / Supabase — نكمّل الطلب بنفس الكوكيز */
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/telegram/|api/cron/|api/auth/|api/calendar/events|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|csv)$).*)",
  ],
};

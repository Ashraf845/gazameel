import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  AUTH_COOKIE_OPTIONS,
  type CookieToSet,
  withPersistentCookieOptions,
} from "@/shared/lib/supabase/config";

/**
 * يحدّث كوكيز جلسة Supabase في كل طلب (تجديد التوكن) حتى تبقى الجلسة بعد إغلاق المتصفح.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith("/api/telegram/") ||
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/api/auth/signout")
  ) {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
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

  // لازم ينتظر getUser لتجديد الـ refresh token — بدون timeout قصير يقطع الجلسة
  try {
    await supabase.auth.getUser();
  } catch {
    /* الشبكة / Supabase — نكمّل الطلب بنفس الكوكيز */
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/telegram/|api/cron/|api/auth/signout|.*\\.(?:svg|png|jpg|jpeg|gif|webp|csv)$).*)",
  ],
};

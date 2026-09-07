import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieToSet } from "@/shared/lib/supabase/config";

/**
 * يحدّث كوكيز جلسة Supabase في كل طلب حتى تعمل صفحات السيرفر بعد Google OAuth.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith("/api/telegram/") ||
    pathname.startsWith("/api/cron/")
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
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  await Promise.race([
    supabase.auth.getUser(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("supabase_auth_timeout")), 2500)
    ),
  ]).catch(() => null);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/telegram/|api/cron/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|csv)$).*)",
  ],
};

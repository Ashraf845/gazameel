import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnv, type CookieToSet, withPersistentCookieOptions, AUTH_COOKIE_OPTIONS } from "./config";

/**
 * عميل Supabase للسيرفر.
 * يعيد null إن نقصت المفاتيح أو كانت placeholder — لا يرمي خطأ يكسر الصفحة.
 */
export async function createClient() {
  const env = getSupabasePublicEnv();
  if (!env) return null;

  try {
    const cookieStore = await cookies();

    return createServerClient(env.url, env.anonKey, {
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(
                name,
                value,
                withPersistentCookieOptions(options) as Parameters<
                  typeof cookieStore.set
                >[2]
              )
            );
          } catch {
            // في Server Component قد يفشل set — هذا متوقع أحيانًا
          }
        },
      },
    });
  } catch {
    return null;
  }
}

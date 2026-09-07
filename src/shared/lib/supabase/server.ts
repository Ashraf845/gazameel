import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "./config";

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
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
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

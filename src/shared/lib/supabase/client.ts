/**
 * عميل Supabase للمتصفح — جلسة دائمة عبر cookies + تجديد تلقائي
 */
import { createBrowserClient } from "@supabase/ssr";
import { AUTH_COOKIE_OPTIONS, getSupabasePublicEnv } from "./config";

export function createClient() {
  const env = getSupabasePublicEnv();
  if (!env) return null;
  try {
    return createBrowserClient(env.url, env.anonKey, {
      cookieOptions: AUTH_COOKIE_OPTIONS,
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch {
    return null;
  }
}

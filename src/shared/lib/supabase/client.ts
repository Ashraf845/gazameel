/**
 * عميل Supabase للمتصفح — PKCE + cookies (نفس المتصفح يبدأ ويكمل OAuth)
 */
import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "./config";

export function createClient() {
  const env = getSupabasePublicEnv();
  if (!env) return null;
  try {
    return createBrowserClient(env.url, env.anonKey);
  } catch {
    return null;
  }
}

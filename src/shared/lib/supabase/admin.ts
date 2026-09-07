import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabasePublicEnv,
  getSupabaseServiceRoleKey,
} from "./config";

/**
 * عميل service role — للسيرفر فقط.
 * يعيد null إن نقصت المفاتيح (بدل رمي خطأ يكسر الصفحات).
 */
export function createAdminClient(): SupabaseClient | null {
  const env = getSupabasePublicEnv();
  const key = getSupabaseServiceRoleKey();
  if (!env || !key) return null;
  try {
    return createClient(env.url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch {
    return null;
  }
}

/** رسالة عربية موحّدة لمسارات API عند غياب الإعداد */
export const SUPABASE_UNCONFIGURED_AR =
  "قاعدة البيانات غير مُعدّة بعد — انسخ .env.example إلى .env.local وأضف مفاتيح Supabase.";

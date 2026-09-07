/**
 * فحص إعدادات Supabase العامة — يمنع إنشاء عميل بقيم فارغة أو placeholder.
 */

const PLACEHOLDER_PATTERNS = [
  /^https?:\/\/YOUR_PROJECT\.supabase\.co/i,
  /placeholder/i,
  /^your[_-]/i,
  /change-me/i,
  /xxx+/i,
  /<.*>/,
  /^(undefined|null|nil)$/i,
  /^YOUR_BOT$/i,
];

export type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

export function isMissingOrPlaceholder(value: string | undefined | null): boolean {
  if (value == null) return true;
  const v = String(value).trim();
  if (!v) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(v));
}

export function getSupabasePublicEnv(): {
  url: string;
  anonKey: string;
} | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (isMissingOrPlaceholder(url) || isMissingOrPlaceholder(anonKey)) {
    return null;
  }
  return { url: url!.trim(), anonKey: anonKey!.trim() };
}

/** هل المفاتيح العامة موجودة؟ (دخول Google / قراءة عبر anon) */
export function isSupabaseConfigured(): boolean {
  return getSupabasePublicEnv() !== null;
}

export function getSupabaseServiceRoleKey(): string | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (isMissingOrPlaceholder(key)) return null;
  return key!.trim();
}

/**
 * هل المنصة جاهزة لعمليات السيرفر (Hub، Feed، رفع، Signed URL)؟
 * يحتاج URL + anon + service_role كلها قيم حقيقية.
 */
export function isSupabaseFullyConfigured(): boolean {
  return getSupabasePublicEnv() !== null && getSupabaseServiceRoleKey() !== null;
}

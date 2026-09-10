import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { createAdminClient } from "@/shared/lib/supabase/admin";
import { withTimeout } from "@/shared/lib/timeout";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  student_id: string | null;
  major: string | null;
  is_admin: boolean;
  onboarding_done: boolean;
  telegram_chat_id: string | null;
};

export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  if (!supabase) return null;
  try {
    const result = await withTimeout(supabase.auth.getUser(), 2500);
    if (result?.data?.user) return result.data.user;
  } catch {
    /* الشبكة / مهلة — نكمّل من الجلسة المحلية */
  }
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user ?? null;
  } catch {
    return null;
  }
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, student_id, major, is_admin, onboarding_done, telegram_chat_id"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return null;

  // ترقية أدمن عبر ADMIN_EMAIL إن لزم
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (adminEmail && user.email?.toLowerCase() === adminEmail && !data.is_admin) {
    try {
      const admin = createAdminClient();
      if (!admin) return data as Profile;
      await admin.from("profiles").update({ is_admin: true }).eq("id", user.id);
      return { ...data, is_admin: true };
    } catch {
      /* بدون service role */
    }
  }

  return data as Profile;
});

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new Response(JSON.stringify({ error: "يجب تسجيل الدخول" }), { status: 401 });
  return user;
}

export async function requireAdmin() {
  const profile = await getProfile();
  if (!profile?.is_admin) {
    throw new Response(JSON.stringify({ error: "للأدمن فقط" }), { status: 403 });
  }
  return profile;
}

/**
 * مستخدم أكمل التسجيل (أو أدمن).
 * للتنزيل ومجموعات المجتمع — لا يكفي تسجيل جوجل فقط.
 */
export async function requireOnboarded() {
  const profile = await getProfile();
  if (!profile) {
    throw new Response(JSON.stringify({ error: "يجب تسجيل الدخول" }), {
      status: 401,
    });
  }
  if (!profile.onboarding_done && !profile.is_admin) {
    throw new Response(
      JSON.stringify({
        error: "أكمل التسجيل أولًا (الاسم والرقم والمواد)",
        code: "ONBOARDING_REQUIRED",
      }),
      { status: 403 }
    );
  }
  return profile;
}

/** للصفحات (Server Component / layout) — redirect بدل 403 JSON */
export async function requireAdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  const profile = await getProfile();
  if (!profile?.is_admin) redirect("/");
  return profile;
}

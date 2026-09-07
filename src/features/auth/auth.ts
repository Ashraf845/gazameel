import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { createAdminClient } from "@/shared/lib/supabase/admin";

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

export async function getSessionUser() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
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
}

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

/** للصفحات (Server Component / layout) — redirect بدل 403 JSON */
export async function requireAdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  const profile = await getProfile();
  if (!profile?.is_admin) redirect("/");
  return profile;
}

import { createClient } from "@/shared/lib/supabase/server";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/features/auth/auth";
import { SupabaseSetupNotice } from "@/shared/components/SupabaseSetupNotice";
import { MySubmissionsList } from "@/features/upload/components/MySubmissionsList";

export const dynamic = "force-dynamic";

export default async function MySubmissionsPage() {
  const supabase = await createClient();
  if (!supabase) {
    return <SupabaseSetupNotice title="مساهماتي" />;
  }

  const user = await getSessionUser();
  if (!user) redirect("/login?next=/my-submissions");

  const { data: items } = await supabase
    .from("resources")
    .select(
      "id, title, status, rejection_reason, resource_type, created_at, courses(name_ar)"
    )
    .eq("uploaded_by", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const list = (items || []).map((item) => ({
    id: item.id as string,
    title: item.title as string,
    status: item.status as string,
    rejection_reason: (item.rejection_reason as string | null) ?? null,
    resource_type: (item.resource_type as string) || "other",
    courseName:
      (item.courses as { name_ar?: string } | null)?.name_ar ?? null,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-[var(--text-primary)]">
        مساهماتي
      </h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        يمكنك حذف ملف أو استبداله. إن كان منشورًا، الاستبدال يعيده للمراجعة.
      </p>
      <MySubmissionsList items={list} />
    </div>
  );
}

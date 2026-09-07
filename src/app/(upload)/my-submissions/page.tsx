import { createClient } from "@/shared/lib/supabase/server";
import { redirect } from "next/navigation";
import { SupabaseSetupNotice } from "@/shared/components/SupabaseSetupNotice";

export const dynamic = "force-dynamic";

const STATUS_AR: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
};

export default async function MySubmissionsPage() {
  const supabase = await createClient();
  if (!supabase) {
    return <SupabaseSetupNotice title="مساهماتي" />;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my-submissions");

  const { data: items } = await supabase
    .from("resources")
    .select("id, title, status, rejection_reason, created_at, courses(name_ar)")
    .eq("uploaded_by", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">مساهماتي</h1>
      {!items?.length && (
        <p className="text-[var(--text-secondary)] text-sm">لم ترفع ملفات بعد.</p>
      )}
      <ul className="space-y-3">
        {(items || []).map((item) => (
          <li key={item.id} className="card-soft p-4">
            <div className="font-medium">{item.title}</div>
            <div className="text-sm text-[var(--text-secondary)] mt-1">
              {(item.courses as { name_ar?: string } | null)?.name_ar} ·{" "}
              <span
                className={
                  item.status === "approved"
                    ? "text-[var(--accent-gold)]"
                    : item.status === "rejected"
                      ? "text-[#e07a7a]"
                      : "text-[var(--warn)]"
                }
              >
                {STATUS_AR[item.status] || item.status}
              </span>
            </div>
            {item.rejection_reason && (
              <p className="text-sm text-[#e07a7a] mt-2">
                السبب: {item.rejection_reason}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

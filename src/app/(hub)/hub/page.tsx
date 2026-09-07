import Link from "next/link";
import { createAdminClient } from "@/shared/lib/supabase/admin";
import { isSupabaseFullyConfigured } from "@/shared/lib/supabase/config";
import { COURSES, COURSE_TYPE_LABELS, SEMESTER_LABEL_AR } from "@/shared/lib/courses";
import { SupabaseSetupBanner } from "@/shared/components/SupabaseSetupNotice";

export const dynamic = "force-dynamic";

export default async function HubPage() {
  const configured = isSupabaseFullyConfigured();
  let counts: Record<string, number> = {};

  if (configured) {
    try {
      const admin = createAdminClient();
      if (admin) {
        const { data: courses } = await admin.from("courses").select("id, code");
        for (const c of courses || []) {
          const { count } = await admin
            .from("resources")
            .select("*", { count: "exact", head: true })
            .eq("course_id", c.id)
            .eq("status", "approved");
          counts[c.code] = count ?? 0;
        }
      }
    } catch {
      counts = {};
    }
  }

  return (
    <div>
      {!configured && <SupabaseSetupBanner />}
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">المكتبة الأكاديمية</h1>
        <p className="text-[var(--text-secondary)] mb-2 text-sm">{SEMESTER_LABEL_AR} · 18 ساعة معتمدة</p>
        <p className="text-[var(--text-secondary)] mb-8 text-sm">
          تظهر الملفات المعتمدة فقط. التنزيل عبر رابط موقّت (Signed URL) بعد
          تسجيل الدخول.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {COURSES.map((c) => (
            <Link
              key={c.code}
              href={`/hub/${c.code}`}
              className="card-soft block p-5 transition hover:border-[var(--accent-gold)]/40"
            >
              <p className="mb-1 text-xs text-[var(--text-secondary)]">
                {COURSE_TYPE_LABELS[c.course_type]} · {c.code}
              </p>
              <h2 className="text-xl font-semibold text-[var(--accent-gold)]">{c.name}</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {configured ? `${counts[c.code] ?? 0} ملف معتمد` : "بانتظار ربط قاعدة البيانات"}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

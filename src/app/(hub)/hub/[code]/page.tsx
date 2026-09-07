import Link from "next/link";
import { createAdminClient } from "@/shared/lib/supabase/admin";
import { isSupabaseFullyConfigured } from "@/shared/lib/supabase/config";
import { DownloadButton } from "@/features/hub/components/DownloadButton";
import { COURSES } from "@/shared/lib/courses";
import { SupabaseSetupBanner } from "@/shared/components/SupabaseSetupNotice";

export const dynamic = "force-dynamic";

export default async function CourseHubPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const configured = isSupabaseFullyConfigured();
  const local = COURSES.find((c) => c.code === code);
  let courseName = local?.name_ar || code;
  let resources: {
    id: string;
    title: string;
    resource_type: string;
    contributor_display_name: string | null;
    external_url: string | null;
    created_at: string;
  }[] = [];

  if (configured) {
    try {
      const admin = createAdminClient();
      if (admin) {
        const { data: course } = await admin
          .from("courses")
          .select("id, name_ar")
          .eq("code", code)
          .maybeSingle();
        if (course) {
          courseName = course.name_ar;
          const { data } = await admin
            .from("resources")
            .select(
              "id, title, resource_type, contributor_display_name, external_url, created_at"
            )
            .eq("course_id", course.id)
            .eq("status", "approved")
            .order("created_at", { ascending: false });
          resources = data || [];
        }
      }
    } catch {
      /* بدون اتصال */
    }
  }

  return (
    <div>
      {!configured && <SupabaseSetupBanner />}
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link href="/hub" className="text-sm text-[var(--accent-gold)]">
          ← المكتبة
        </Link>
        <h1 className="text-3xl font-bold mt-2 mb-6">{courseName}</h1>
        {!configured && (
          <p className="text-[var(--text-secondary)] text-sm mb-4">
            بعد ربط Supabase ستظهر هنا الملفات ذات الحالة{" "}
            <code className="text-[var(--text-secondary)]">approved</code>، وزر التنزيل يستدعي{" "}
            <code className="text-[var(--text-secondary)]">/api/resources/[id]/download</code>.
          </p>
        )}
        {configured && !resources.length && (
          <p className="text-[var(--text-secondary)] text-sm">لا ملفات معتمدة بعد لهذه المادة.</p>
        )}
        <ul className="space-y-3">
          {resources.map((r) => (
            <li
              key={r.id}
              className="card-soft p-4 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <div className="font-medium">{r.title}</div>
                <div className="text-xs text-[var(--text-secondary)] mt-1">
                  {r.resource_type}
                  {r.contributor_display_name
                    ? ` · بواسطة ${r.contributor_display_name}`
                    : ""}
                </div>
              </div>
              {r.external_url ? (
                <a
                  href={r.external_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost text-sm"
                >
                  فتح الرابط
                </a>
              ) : (
                <DownloadButton resourceId={r.id} />
              )}
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <Link href={`/quiz?course=${code}`} className="btn-primary">
            اختبر نفسك في هذه المادة
          </Link>
        </div>
      </div>
    </div>
  );
}

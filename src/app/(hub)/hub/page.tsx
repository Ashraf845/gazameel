import { isSupabaseConfigured } from "@/shared/lib/supabase/config";
import { SEMESTER_LABEL_AR } from "@/shared/lib/courses";
import { SupabaseSetupBanner } from "@/shared/components/SupabaseSetupNotice";
import { HubCourseGrid } from "@/features/hub/components/HubCourseGrid";
import { loadHubCatalog } from "@/features/hub/catalog";

export const revalidate = 60;

export default async function HubPage() {
  const configured = isSupabaseConfigured();
  const { courses, counts } = await loadHubCatalog();

  return (
    <div>
      {!configured && <SupabaseSetupBanner />}
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="mb-2 text-3xl font-bold text-[var(--text-primary)]">
          المكتبة الأكاديمية
        </h1>
        <p className="mb-2 text-sm text-[var(--text-secondary)]">
          {SEMESTER_LABEL_AR}
        </p>
        <p className="mb-8 text-sm text-[var(--text-secondary)]">
          تظهر الملفات المعتمدة فقط. التنزيل عبر رابط موقّت (Signed URL) بعد
          تسجيل الدخول.
        </p>
        <HubCourseGrid
          courses={courses}
          counts={counts}
          configured={configured}
        />
      </div>
    </div>
  );
}

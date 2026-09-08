import Link from "next/link";
import { isSupabaseConfigured } from "@/shared/lib/supabase/config";
import { SupabaseSetupBanner } from "@/shared/components/SupabaseSetupNotice";
import { CourseResources } from "@/features/hub/components/CourseResources";
import { listApprovedResources } from "@/features/hub/catalog";

export const revalidate = 60;

export default async function CourseHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { code } = await params;
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const configured = isSupabaseConfigured();
  const resources = await listApprovedResources(code, page);
  const courseName = resources.courseName || code;

  return (
    <div>
      {!configured && <SupabaseSetupBanner />}
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link href="/hub" className="text-sm text-[var(--accent-gold)]">
          ← المكتبة
        </Link>
        <h1 className="mb-6 mt-2 text-3xl font-bold text-[var(--text-primary)]">
          {courseName}
        </h1>
        <CourseResources
          code={code}
          configured={configured}
          items={resources.items}
          total={resources.total}
          page={resources.page}
          pageSize={resources.pageSize}
        />
        <div className="mt-8">
          <Link href={`/quiz?course=${code}`} className="btn-primary">
            اختبر نفسك في هذه المادة
          </Link>
        </div>
      </div>
    </div>
  );
}

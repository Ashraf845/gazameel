import { cache } from "react";
import { createAdminClient } from "@/shared/lib/supabase/admin";
import { withTimeout } from "@/shared/lib/timeout";
import {
  COURSES,
  COURSE_TYPE_LABELS,
  toCatalogCourse,
  type CatalogCourse,
} from "@/shared/lib/courses";

export const RESOURCE_PAGE_SIZE = 40;

export type ApprovedResource = {
  id: string;
  title: string;
  resource_type: string;
  contributor_display_name: string | null;
  external_url: string | null;
};

export type HubCatalog = {
  courses: CatalogCourse[];
  counts: Record<string, number>;
};

function courseEmbedName(courses: unknown): string | null {
  if (!courses) return null;
  if (Array.isArray(courses)) {
    return (courses[0] as { name_ar?: string } | undefined)?.name_ar ?? null;
  }
  return (courses as { name_ar?: string }).name_ar ?? null;
}

/** طلب واحد: المواد + عدد الملفات المعتمدة عبر JOIN في الواجهة */
export const loadHubCatalog = cache(async (): Promise<HubCatalog> => {
  const fallback: HubCatalog = {
    courses: [...COURSES],
    counts: {},
  };
  const admin = createAdminClient();
  if (!admin) return fallback;
  try {
    const result = await withTimeout(
      admin
        .from("course_approved_counts")
        .select("code, name_ar, name_en, course_type, approved_count")
        .order("code", { ascending: true }),
      2500
    );
    if (!result) return fallback;
    if (result.error) return loadHubCatalogWithoutView(admin, fallback);
    const rows = result.data || [];
    if (!rows.length) return fallback;
    const counts: Record<string, number> = {};
    const courses = rows.map((row) => {
      const course = toCatalogCourse(row);
      counts[course.code] = Number(row.approved_count) || 0;
      return course;
    });
    return { courses, counts };
  } catch {
    return fallback;
  }
});

/**
 * احتياطي قبل تنفيذ supabase/upgrade.sql (الـ view غير موجودة):
 * استعلامان اثنان ثم التجميع في الذاكرة — لا استعلام لكل مادة.
 */
async function loadHubCatalogWithoutView(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  fallback: HubCatalog
): Promise<HubCatalog> {
  const [coursesResult, resourcesResult] = await Promise.all([
    withTimeout(
      admin
        .from("courses")
        .select("id, code, name_ar, name_en, course_type")
        .order("code", { ascending: true }),
      2500
    ),
    withTimeout(
      admin
        .from("resources")
        .select("course_id")
        .eq("status", "approved")
        .limit(5000),
      2500
    ),
  ]);

  const rows = coursesResult?.data || [];
  if (!rows.length) return fallback;

  const codeById = new Map<string, string>();
  const counts: Record<string, number> = {};
  const courses = rows.map((row) => {
    const course = toCatalogCourse(row);
    codeById.set(String(row.id), course.code);
    counts[course.code] = 0;
    return course;
  });

  for (const row of resourcesResult?.data || []) {
    const code = codeById.get(String(row.course_id));
    if (code) counts[code] += 1;
  }

  return { courses, counts };
}

export async function loadCatalogCourses(): Promise<CatalogCourse[]> {
  const { courses } = await loadHubCatalog();
  return courses;
}

export async function listApprovedResources(
  code: string,
  page = 1
): Promise<{
  items: ApprovedResource[];
  total: number;
  page: number;
  pageSize: number;
  courseName: string | null;
}> {
  const admin = createAdminClient();
  const pageSize = RESOURCE_PAGE_SIZE;
  const safePage = Math.max(1, page);
  const empty = {
    items: [] as ApprovedResource[],
    total: 0,
    page: safePage,
    pageSize,
    courseName: COURSES.find((c) => c.code === code)?.name_ar ?? null,
  };
  if (!admin) return empty;

  const from = (safePage - 1) * pageSize;
  let query = admin
    .from("resources")
    .select(
      "id, title, resource_type, contributor_display_name, external_url, courses!inner(code, name_ar)",
      { count: "exact" }
    )
    .eq("status", "approved")
    .eq("courses.code", code)
    .order("type_rank", { ascending: true })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  let { data, count, error } = await query;

  // إن لم يُنفَّذ upgrade بعد (لا عمود type_rank) — نرتّب في الذاكرة
  if (error && /type_rank/i.test(error.message)) {
    const fallback = await admin
      .from("resources")
      .select(
        "id, title, resource_type, contributor_display_name, external_url, courses!inner(code, name_ar)",
        { count: "exact" }
      )
      .eq("status", "approved")
      .eq("courses.code", code)
      .order("created_at", { ascending: false })
      .range(0, 199);
    const rank: Record<string, number> = {
      video: 1,
      summary: 2,
      book: 3,
      assignment: 4,
      past_exam: 5,
      image: 6,
      other: 7,
    };
    const sorted = [...(fallback.data || [])].sort((a, b) => {
      const ra = rank[a.resource_type] ?? 9;
      const rb = rank[b.resource_type] ?? 9;
      return ra - rb;
    });
    data = sorted.slice(from, from + pageSize);
    count = fallback.count;
    error = null;
  }

  if (error) {
    return empty;
  }

  const rows = data || [];
  const courseName = courseEmbedName(
    (rows[0] as { courses?: unknown } | undefined)?.courses
  );

  return {
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      resource_type: r.resource_type,
      contributor_display_name: r.contributor_display_name,
      external_url: r.external_url,
    })),
    total: count ?? 0,
    page: safePage,
    pageSize,
    courseName: courseName || empty.courseName,
  };
}

export { COURSE_TYPE_LABELS };

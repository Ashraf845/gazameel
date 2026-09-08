import Link from "next/link";
import { COURSE_TYPE_LABELS, type CatalogCourse } from "@/shared/lib/courses";

export function HubCourseGrid({
  courses,
  counts,
  configured,
}: {
  courses: CatalogCourse[];
  counts: Record<string, number>;
  configured: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {courses.map((c) => (
        <Link
          key={c.code}
          href={`/hub/${c.code}`}
          className="card-soft block p-5 transition hover:border-[var(--accent-gold)]/40"
        >
          <p className="mb-1 text-xs text-[var(--text-secondary)]">
            {COURSE_TYPE_LABELS[c.course_type]} · {c.code}
          </p>
          <h2 className="text-xl font-semibold text-[var(--accent-gold)]">
            {c.name}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {configured
              ? `${counts[c.code] ?? 0} ملف معتمد`
              : "بانتظار ربط قاعدة البيانات"}
          </p>
        </Link>
      ))}
    </div>
  );
}

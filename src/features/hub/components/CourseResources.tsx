import Link from "next/link";
import { DownloadButton } from "@/features/hub/components/DownloadButton";
import type { ApprovedResource } from "@/features/hub/catalog";
import { RESOURCE_TYPES } from "@/shared/lib/courses";

function typeLabel(value: string) {
  return RESOURCE_TYPES.find((t) => t.value === value)?.label || value;
}

export function CourseResources({
  configured,
  items,
  total,
  page,
  pageSize,
  code,
}: {
  configured: boolean;
  items: ApprovedResource[];
  total: number;
  page: number;
  pageSize: number;
  code: string;
}) {
  if (!configured) {
    return (
      <p className="mb-4 text-sm text-[var(--text-secondary)]">
        بعد ربط Supabase ستظهر هنا الملفات المعتمدة، وزر التنزيل يستدعي رابطًا موقّتًا.
      </p>
    );
  }

  if (!items.length) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        لا ملفات معتمدة بعد لهذه المادة.
      </p>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <ul className="space-y-3">
        {items.map((r) => (
          <li
            key={r.id}
            className="card-soft flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div>
              <div className="font-medium text-[var(--text-primary)]">{r.title}</div>
              <div className="mt-1 text-xs text-[var(--text-secondary)]">
                {typeLabel(r.resource_type)}
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
              <DownloadButton resourceId={r.id} title={r.title} />
            )}
          </li>
        ))}
      </ul>
      {totalPages > 1 ? (
        <nav className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={`/hub/${code}?page=${page - 1}`}
              className="text-[var(--accent-gold)]"
            >
              السابق
            </Link>
          ) : (
            <span className="text-[var(--text-secondary)]">السابق</span>
          )}
          <span className="text-[var(--text-secondary)]">
            {page} / {totalPages} · {total} ملف
          </span>
          {page < totalPages ? (
            <Link
              href={`/hub/${code}?page=${page + 1}`}
              className="text-[var(--accent-gold)]"
            >
              التالي
            </Link>
          ) : (
            <span className="text-[var(--text-secondary)]">التالي</span>
          )}
        </nav>
      ) : null}
    </div>
  );
}

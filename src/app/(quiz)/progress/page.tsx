import { createClient } from "@/shared/lib/supabase/server";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/features/auth/auth";
import { SupabaseSetupNotice } from "@/shared/components/SupabaseSetupNotice";
import { listUserAttempts, summarizeAttempts } from "@/features/quiz/quiz";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const supabase = await createClient();
  if (!supabase) {
    return <SupabaseSetupNotice title="تقدمي" />;
  }

  const user = await getSessionUser();
  if (!user) redirect("/login?next=/progress");

  const attempts = await listUserAttempts(user.id);
  const byCourse = summarizeAttempts(attempts);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-[var(--text-primary)]">تقدمي</h1>
      <p className="mb-8 text-sm text-[var(--text-secondary)]">
        ملخص نتائج اختباراتك لكل مادة.
      </p>
      {!byCourse.length && (
        <p className="text-sm text-[var(--text-secondary)]">
          ابدأ اختبارًا من /quiz لترى تقدمك.
        </p>
      )}
      <ul className="mb-10 space-y-3">
        {byCourse.map((c) => (
          <li key={c.name} className="card-soft p-4">
            <div className="font-medium text-[var(--text-primary)]">{c.name}</div>
            <div className="mt-1 text-sm text-[var(--text-secondary)]">
              أفضل نتيجة: {c.best}% · آخر محاولة: {c.last}%
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]">
              <div
                className="h-full bg-[var(--accent-gold)]"
                style={{ width: `${c.best}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <h2 className="mb-3 font-semibold text-[var(--text-primary)]">آخر المحاولات</h2>
      <ul className="space-y-2 text-sm">
        {attempts.map((a, i) => (
          <li
            key={`${a.created_at}-${i}`}
            className="flex justify-between text-[var(--text-secondary)]"
          >
            <span>
              {a.courses?.name_ar} — {a.score}/{a.total}
            </span>
            <span>{new Date(a.created_at).toLocaleDateString("ar")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

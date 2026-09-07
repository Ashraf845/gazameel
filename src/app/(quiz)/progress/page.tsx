import { createClient } from "@/shared/lib/supabase/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/shared/lib/supabase/admin";
import { SupabaseSetupNotice } from "@/shared/components/SupabaseSetupNotice";

export const dynamic = "force-dynamic";

type AttemptRow = {
  score: number;
  total: number;
  created_at: string;
  courses: { name_ar?: string; code?: string } | null;
};

export default async function ProgressPage() {
  const supabase = await createClient();
  if (!supabase) {
    return <SupabaseSetupNotice title="تقدمي" />;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/progress");

  const admin = createAdminClient();
  if (!admin) {
    return <SupabaseSetupNotice title="تقدمي" />;
  }

  const { data } = await admin
    .from("quiz_attempts")
    .select("score, total, created_at, courses(name_ar, code)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  const attempts = (data as AttemptRow[] | null) || [];

  const byCourse = new Map<
    string,
    { name: string; best: number; last: number; total: number }
  >();
  for (const a of attempts) {
    const c = a.courses;
    const key = c?.code || "x";
    const pct = a.total ? Math.round((a.score / a.total) * 100) : 0;
    const prev = byCourse.get(key);
    if (!prev) {
      byCourse.set(key, {
        name: c?.name_ar || key,
        best: pct,
        last: pct,
        total: a.total,
      });
    } else {
      prev.best = Math.max(prev.best, pct);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">تقدمي</h1>
      <p className="text-[var(--text-secondary)] text-sm mb-8">
        ملخص نتائج اختباراتك لكل مادة.
      </p>
      {!byCourse.size && (
        <p className="text-[var(--text-secondary)] text-sm">ابدأ اختبارًا من /quiz لترى تقدمك.</p>
      )}
      <ul className="space-y-3 mb-10">
        {[...byCourse.values()].map((c) => (
          <li key={c.name} className="card-soft p-4">
            <div className="font-medium">{c.name}</div>
            <div className="text-sm text-[var(--text-secondary)] mt-1">
              أفضل نتيجة: {c.best}% · آخر محاولة: {c.last}%
            </div>
            <div className="mt-2 h-2 rounded bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)] overflow-hidden">
              <div
                className="h-full bg-[var(--accent-gold)]"
                style={{ width: `${c.best}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <h2 className="font-semibold mb-3">آخر المحاولات</h2>
      <ul className="space-y-2 text-sm">
        {attempts.map((a, i) => (
          <li key={i} className="flex justify-between text-[var(--text-secondary)]">
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

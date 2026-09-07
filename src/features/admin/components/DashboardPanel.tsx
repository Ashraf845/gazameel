"use client";

import type { DashboardStats, AdminUserRow } from "@/features/admin/dashboard";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-soft p-4">
      <p className="text-xs text-[var(--text-secondary)]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[var(--accent-gold)]">{value}</p>
    </div>
  );
}

export function DashboardPanel({
  stats,
  users,
}: {
  stats: DashboardStats | null;
  users: AdminUserRow[];
}) {
  if (!stats) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">لا إحصائيات بعد.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="كل المستخدمين" value={stats.users} />
        <StatCard label="أكملوا التسجيل" value={stats.onboarded} />
        <StatCard label="تيليجرام مربوط" value={stats.telegram} />
        <StatCard label="أدمن" value={stats.admins} />
        <StatCard label="ملفات قيد المراجعة" value={stats.pending} />
        <StatCard label="ملفات معتمدة" value={stats.approved} />
        <StatCard label="محاولات كويز" value={stats.quizAttempts} />
        <StatCard label="أسئلة نشطة" value={stats.questions} />
        <StatCard label="مواعيد" value={stats.exams} />
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-[var(--text-primary)]">
          آخر المسجّلين
        </h2>
        <ul className="card-soft divide-y divide-[var(--border)]">
          {users.slice(0, 8).map((u) => (
            <li key={u.id} className="px-4 py-3 text-sm">
              <p className="text-[var(--text-primary)]">
                {u.full_name || "بدون اسم"}
                {u.is_admin ? (
                  <span className="mr-2 text-xs text-[var(--accent-gold)]">
                    أدمن
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {u.email || "—"} · {u.student_id || "بدون رقم جامعي"} ·{" "}
                {new Date(u.created_at).toLocaleDateString("ar")}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

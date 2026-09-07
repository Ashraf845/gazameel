import { createAdminClient } from "@/shared/lib/supabase/admin";
import { isSupabaseFullyConfigured } from "@/shared/lib/supabase/config";
import { SupabaseSetupBanner } from "@/shared/components/SupabaseSetupNotice";

export const dynamic = "force-dynamic";

const TYPE_AR: Record<string, string> = {
  quiz: "كويز",
  midterm: "منتصف",
  final: "نهائي",
  assignment: "تكليف",
};

export default async function CalendarPage() {
  const configured = isSupabaseFullyConfigured();
  let events: {
    id: string;
    title: string;
    event_type: string;
    starts_at: string;
    notes: string | null;
    courses: { name_ar: string } | null;
  }[] = [];

  if (configured) {
    try {
      const admin = createAdminClient();
      if (admin) {
        const { data } = await admin
          .from("exam_events")
          .select("id, title, event_type, starts_at, notes, courses(name_ar)")
          .order("starts_at", { ascending: true });
        events = (data as unknown as typeof events) || [];
      }
    } catch {
      /* بدون اتصال */
    }
  }

  return (
    <div>
      {!configured && <SupabaseSetupBanner />}
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">تقويم الامتحانات</h1>
        <p className="text-[var(--text-secondary)] text-sm mb-8">
          المواعيد تُضاف من لوحة الأدمن فقط — مصدر واحد موثوق (جدول{" "}
          <code className="text-[var(--text-secondary)]">exam_events</code>).
        </p>
        {!configured && (
          <p className="text-[var(--text-secondary)] text-sm mb-4">
            بعد ربط Supabase ستظهر هنا المواعيد من قاعدة البيانات.
          </p>
        )}
        {configured && !events.length && (
          <p className="text-[var(--text-secondary)] text-sm">لا مواعيد بعد. أضفها من /admin.</p>
        )}
        <ul className="space-y-3">
          {events.map((e) => {
            const start = new Date(e.starts_at);
            const ms = start.getTime() - Date.now();
            const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
            return (
              <li key={e.id} className="card-soft p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-semibold">{e.title}</h2>
                  <span className="text-xs text-[var(--accent-gold)]">
                    {TYPE_AR[e.event_type] || e.event_type}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {(e.courses as { name_ar?: string } | null)?.name_ar} ·{" "}
                  {start.toLocaleString("ar")}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {days > 0
                    ? `متبقي ${days} يوم`
                    : days === 0
                      ? "اليوم"
                      : "انتهى الموعد"}
                </p>
                {e.notes && (
                  <p className="text-sm text-[var(--text-secondary)] mt-2">{e.notes}</p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

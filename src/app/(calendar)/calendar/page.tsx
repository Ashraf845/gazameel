import Link from "next/link";
import { isSupabaseFullyConfigured } from "@/shared/lib/supabase/config";
import { SupabaseSetupBanner } from "@/shared/components/SupabaseSetupNotice";
import { DataPreviewNotice } from "@/shared/components/DataPreviewNotice";
import { ExamEventsList } from "@/features/calendar/components/ExamEventsList";
import { listExamEvents } from "@/features/calendar/events";

export const revalidate = 60;

export default async function CalendarPage() {
  const configured = isSupabaseFullyConfigured();
  const events = configured ? await listExamEvents() : [];

  return (
    <div>
      {!configured && <SupabaseSetupBanner />}
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-2 text-3xl font-bold text-[var(--text-primary)]">
          تقويم الامتحانات
        </h1>
        <p className="mb-2 text-sm text-[var(--text-secondary)]">
          المواعيد تُضاف من لوحة الأدمن فقط — مصدر واحد موثوق.
        </p>
        <DataPreviewNotice>
          التقويم ما زال تجريبيًا والمواعيد غير مكتملة بعد — سيتم تحديثها أولًا
          بأول حتى تكتمل البيانات.
        </DataPreviewNotice>
        <p className="mb-8 text-sm">
          <Link href="/countdown" className="text-[var(--accent-gold)]">
            العد التنازلي للمواعيد القادمة
          </Link>
        </p>
        {!configured ? (
          <p className="mb-4 text-sm text-[var(--text-secondary)]">
            بعد ربط Supabase ستظهر هنا المواعيد من قاعدة البيانات.
          </p>
        ) : (
          <ExamEventsList
            events={events}
            emptyLabel="لا مواعيد بعد. أضفها من /admin."
          />
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { isSupabaseFullyConfigured } from "@/shared/lib/supabase/config";
import { SupabaseSetupBanner } from "@/shared/components/SupabaseSetupNotice";
import { DataPreviewNotice } from "@/shared/components/DataPreviewNotice";
import { ExamEventsList } from "@/features/calendar/components/ExamEventsList";
import { listExamEvents } from "@/features/calendar/events";

export const revalidate = 60;

export default async function CountdownPage() {
  const configured = isSupabaseFullyConfigured();
  const events = configured
    ? await listExamEvents({ upcomingOnly: true, limit: 8 })
    : [];

  return (
    <div>
      {!configured && <SupabaseSetupBanner />}
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-2 text-3xl font-bold text-[var(--text-primary)]">
          العد التنازلي
        </h1>
        <p className="mb-2 text-sm text-[var(--text-secondary)]">
          نفس مواعيد التقويم — للبوت استخدم /countdown في تيليجرام.
        </p>
        <DataPreviewNotice>
          العد التنازلي يعتمد على التقويم التجريبي — المواعيد غير مكتملة بعد
          وسيتم تحديثها حتى تكتمل البيانات.
        </DataPreviewNotice>
        <p className="mb-8 text-sm">
          <Link href="/calendar" className="text-[var(--accent-gold)]">
            عرض التقويم كاملًا
          </Link>
        </p>
        {configured ? (
          <ExamEventsList
            events={events}
            upcomingOnly
            emptyLabel="لا مواعيد قادمة حاليًا."
          />
        ) : null}
      </div>
    </div>
  );
}

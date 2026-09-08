import { createAdminClient } from "@/shared/lib/supabase/admin";
import { withTimeout } from "@/shared/lib/timeout";
import type { ExamEventRow } from "@/features/calendar/labels";

export {
  EVENT_TYPE_AR,
  remainingLabel,
  type ExamEventRow,
} from "@/features/calendar/labels";

export async function listExamEvents(opts?: {
  upcomingOnly?: boolean;
  limit?: number;
}): Promise<ExamEventRow[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  let query = admin
    .from("exam_events")
    .select("id, title, event_type, starts_at, notes, courses(name_ar)")
    .order("starts_at", { ascending: true });

  if (opts?.upcomingOnly) {
    query = query.gte("starts_at", new Date().toISOString());
  }
  if (opts?.limit) {
    query = query.limit(opts.limit);
  }

  try {
    const result = await withTimeout(query, 2500);
    return (result?.data as unknown as ExamEventRow[]) || [];
  } catch {
    return [];
  }
}

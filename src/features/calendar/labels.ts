export const EVENT_TYPE_AR: Record<string, string> = {
  quiz: "كويز",
  midterm: "منتصف",
  final: "نهائي",
  assignment: "تكليف",
};

export type ExamEventRow = {
  id: string;
  title: string;
  event_type: string;
  starts_at: string;
  notes: string | null;
  courses: { name_ar: string } | null;
};

export function remainingLabel(startsAt: string, now = Date.now()): string {
  const ms = new Date(startsAt).getTime() - now;
  if (ms <= 0) return "انتهى الموعد";

  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `متبقي ${days} يوم و ${hours} ساعة`;
  if (hours > 0) return `متبقي ${hours} ساعة و ${minutes} دقيقة`;
  return `متبقي ${minutes} دقيقة`;
}

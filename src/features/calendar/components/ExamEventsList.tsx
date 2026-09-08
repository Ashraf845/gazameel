import {
  EVENT_TYPE_AR,
  remainingLabel,
  type ExamEventRow,
} from "@/features/calendar/labels";

export function ExamEventsList({
  events,
  upcomingOnly,
  emptyLabel,
}: {
  events: ExamEventRow[];
  upcomingOnly?: boolean;
  emptyLabel: string;
}) {
  if (!events.length) {
    return <p className="text-sm text-[var(--text-secondary)]">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-3">
      {events.map((e) => (
        <li key={e.id} className="card-soft p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold text-[var(--text-primary)]">{e.title}</h2>
            <span className="text-xs text-[var(--accent-gold)]">
              {EVENT_TYPE_AR[e.event_type] || e.event_type}
            </span>
          </div>
          {upcomingOnly ? (
            <p className="mt-3 text-xl font-semibold text-[var(--accent-gold)]">
              {remainingLabel(e.starts_at)}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {e.courses?.name_ar} · {new Date(e.starts_at).toLocaleString("ar")}
          </p>
          {!upcomingOnly ? (
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {remainingLabel(e.starts_at)}
            </p>
          ) : null}
          {e.notes ? (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{e.notes}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

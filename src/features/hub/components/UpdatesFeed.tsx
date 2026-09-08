import type { FeedItem } from "@/features/hub/updates";

export function UpdatesFeed({ items }: { items: FeedItem[] }) {
  if (!items.length) {
    return (
      <div className="card-soft p-4 text-sm text-[var(--text-secondary)]">
        لا تحديثات بعد — تظهر هنا بعد اعتماد ملفات جديدة.
      </div>
    );
  }

  return (
    <ul className="card-soft divide-y divide-[var(--border)]">
      {items.map((item) => (
        <li key={item.id} className="px-4 py-3 text-sm">
          <p className="text-[var(--text-primary)]">{item.message}</p>
          <time className="text-xs text-[var(--text-secondary)]">
            {new Date(item.created_at).toLocaleString("ar")}
          </time>
        </li>
      ))}
    </ul>
  );
}

import type { ContributorStat } from "@/features/community/contributors";

export function ContributorsList({ rows }: { rows: ContributorStat[] }) {
  if (!rows.length) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">لا مساهمات معتمدة بعد.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li
          key={r.name}
          className="card-soft flex justify-between px-4 py-3 text-sm text-[var(--text-primary)]"
        >
          <span>{r.name}</span>
          <span className="text-[var(--accent-gold)]">{r.count} ملف</span>
        </li>
      ))}
    </ul>
  );
}

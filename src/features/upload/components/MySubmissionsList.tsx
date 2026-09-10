"use client";

import { useRouter } from "next/navigation";
import { SubmissionActions } from "@/features/upload/components/SubmissionActions";

type Item = {
  id: string;
  title: string;
  status: string;
  rejection_reason: string | null;
  resource_type: string;
  courseName: string | null;
};

const STATUS_AR: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
};

export function MySubmissionsList({ items }: { items: Item[] }) {
  const router = useRouter();

  if (!items.length) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">لم ترفع ملفات بعد.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="card-soft p-4">
          <div className="font-medium text-[var(--text-primary)]">
            {item.title}
          </div>
          <div className="mt-1 text-sm text-[var(--text-secondary)]">
            {item.courseName} ·{" "}
            <span
              className={
                item.status === "approved"
                  ? "text-[var(--accent-gold)]"
                  : item.status === "rejected"
                    ? "text-[#e07a7a]"
                    : "text-[var(--warn)]"
              }
            >
              {STATUS_AR[item.status] || item.status}
            </span>
          </div>
          {item.rejection_reason && (
            <p className="mt-2 text-sm text-[#e07a7a]">
              السبب: {item.rejection_reason}
            </p>
          )}
          <SubmissionActions
            id={item.id}
            title={item.title}
            status={item.status}
            resourceType={item.resource_type}
            onDone={() => router.refresh()}
          />
        </li>
      ))}
    </ul>
  );
}

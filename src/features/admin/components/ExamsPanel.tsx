"use client";

import { useState } from "react";
import type { CatalogCourse } from "@/shared/lib/courses";

export function ExamsPanel({ courses }: { courses: CatalogCourse[] }) {
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        course_code: fd.get("course"),
        title: fd.get("title"),
        event_type: fd.get("event_type"),
        starts_at: fd.get("starts_at"),
        notes: fd.get("notes"),
      }),
    });
    const data = await res.json();
    setMsg(res.ok ? "أُضيف للتقويم" : data.error);
    if (res.ok) e.currentTarget.reset();
  }

  return (
    <form className="card-soft space-y-4 p-5" onSubmit={onSubmit}>
      <select
        name="course"
        required
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]"
      >
        {courses.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
      <input
        name="title"
        required
        placeholder="عنوان (مثال: كويز 1)"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]"
      />
      <input
        name="starts_at"
        type="datetime-local"
        required
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]"
      />
      <select
        name="event_type"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]"
      >
        <option value="quiz">كويز</option>
        <option value="midterm">منتصف</option>
        <option value="final">نهائي</option>
        <option value="assignment">تكليف</option>
      </select>
      <input
        name="notes"
        placeholder="ملاحظات"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]"
      />
      <button type="submit" className="btn-primary">
        إضافة للتقويم
      </button>
      {msg && <p className="text-sm text-[var(--accent-gold)]">{msg}</p>}
    </form>
  );
}

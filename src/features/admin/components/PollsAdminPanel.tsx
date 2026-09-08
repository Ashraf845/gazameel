"use client";

import { useState } from "react";
import type { CatalogCourse } from "@/shared/lib/courses";

export function PollsAdminPanel({ courses }: { courses: CatalogCourse[] }) {
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const options = String(fd.get("options") || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        question: fd.get("question"),
        course_code: fd.get("course_code") || null,
        options,
      }),
    });
    const data = await res.json();
    setMsg(res.ok ? "أُنشئ الاستطلاع" : data.error);
  }

  const field =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]";

  return (
    <form className="card-soft space-y-3 p-5" onSubmit={onSubmit}>
      <input
        name="question"
        required
        placeholder="سؤال الاستطلاع (صعوبة الامتحان؟)"
        className={field}
      />
      <select name="course_code" className={field}>
        <option value="">— عامة —</option>
        {courses.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
      <textarea
        name="options"
        required
        placeholder={"سهل\nمتوسط\nصعب"}
        className={`${field} min-h-24`}
      />
      <button type="submit" className="btn-primary">
        نشر استطلاع
      </button>
      {msg && <p className="text-sm text-[var(--accent-gold)]">{msg}</p>}
    </form>
  );
}

"use client";

import { useState } from "react";
import { RESOURCE_TYPES, type CatalogCourse } from "@/shared/lib/courses";

export function DirectUploadPanel({ courses }: { courses: CatalogCourse[] }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/resources", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) setErr(data.error);
    else {
      setMsg("نُشر في المكتبة");
      e.currentTarget.reset();
    }
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
      <select
        name="resource_type"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]"
      >
        {RESOURCE_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <input
        name="title"
        required
        placeholder="عنوان الملف"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]"
      />
      <input
        name="external_url"
        placeholder="رابط فيديو (إن اخترت نوع فيديو)"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]"
      />
      <input name="file" type="file" accept=".pdf,image/*" className="w-full text-sm" />
      <button type="submit" className="btn-primary">
        نشر الآن
      </button>
      {msg && <p className="text-sm text-[var(--accent-gold)]">{msg}</p>}
      {err && <p className="text-sm text-[#e07a7a]">{err}</p>}
    </form>
  );
}

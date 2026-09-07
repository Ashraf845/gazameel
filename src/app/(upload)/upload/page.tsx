"use client";

import { useState } from "react";
import { ALLOWED_MIME, MAX_FILE_BYTES, MAX_PENDING_PER_USER } from "@/shared/lib/constants";
import { COURSES, RESOURCE_TYPES } from "@/shared/lib/courses";
import Link from "next/link";

export default function UploadPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("file") as File | null;

    if (!file || file.size === 0) {
      setError("اختر ملفًا.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("الحد الأقصى 15 ميجابايت.");
      return;
    }
    if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) {
      setError("المسموح: PDF أو صورة (jpeg/png/webp) فقط.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(
        data.error ||
          (res.status === 503
            ? "قاعدة البيانات غير مُعدّة — راجع .env.local"
            : "فشل الرفع")
      );
      return;
    }
    setMessage(data.message);
    form.reset();
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">ساهم بملف</h1>
      <p className="text-[var(--text-secondary)] mb-6 text-sm leading-relaxed">
        يلزم{" "}
        <Link href="/login" className="text-[var(--accent-gold)] underline">
          تسجيل الدخول
        </Link>{" "}
        وإكمال التسجيل. الملف يبدأ{" "}
        <code className="text-[var(--accent-gold)]">pending</code> — حد {MAX_PENDING_PER_USER} معلّقة.
      </p>

      <form onSubmit={onSubmit} className="card-soft space-y-4 p-6">
        <label className="block text-sm">
          المادة
          <select
            name="course"
            required
            className="mt-1 w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2"
          >
            {COURSES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          نوع الملف
          <select
            name="resource_type"
            className="mt-1 w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2"
          >
            {RESOURCE_TYPES.filter((t) => t.value !== "video").map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          عنوان الملف
          <input
            name="title"
            required
            placeholder="مثال: تلخيص شابتر 3"
            className="mt-1 w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          اسم المساهم (اختياري)
          <input
            name="contributor"
            placeholder="يظهر على الملف بعد الموافقة"
            className="mt-1 w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          الملف
          <input
            name="file"
            type="file"
            accept=".pdf,image/jpeg,image/png,image/webp"
            required
            className="mt-1 w-full text-sm"
          />
        </label>

        <label className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
          <input name="rights" type="checkbox" required className="mt-1" />
          أتعهّد أن الملف من حقي أو مصرّح بمشاركته لأغراض دراسية.
        </label>

        <button type="submit" disabled={loading} className="btn-primary w-full text-center">
          {loading ? "جاري الرفع…" : "إرسال للمراجعة"}
        </button>

        {error && <p className="text-sm text-[#e07a7a]">{error}</p>}
        {message && <p className="text-sm text-[var(--accent-gold)]">{message}</p>}
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { CatalogCourse } from "@/shared/lib/courses";

export function QuestionsPanel({ courses }: { courses: CatalogCourse[] }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function addOne(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setImportErrors([]);
    const fd = new FormData(e.currentTarget);
    const body = {
      ...Object.fromEntries(fd.entries()),
      daily_eligible: fd.get("daily_eligible") === "true",
    };
    const res = await fetch("/api/admin/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setMsg(res.ok ? "أُضيف السؤال" : data.error);
    if (res.ok) e.currentTarget.reset();
    setBusy(false);
  }

  async function importCsv(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setImportErrors([]);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/questions", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      setMsg(`استيراد: ${data.inserted} سؤال`);
      setImportErrors(Array.isArray(data.errors) ? data.errors.slice(0, 20) : []);
    } else {
      setMsg(data.error || "فشل الاستيراد");
    }
    setBusy(false);
  }

  const field =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]";

  return (
    <div className="space-y-6">
      <form className="card-soft space-y-3 p-5" onSubmit={addOne}>
        <h2 className="font-semibold text-[var(--text-primary)]">سؤال واحد</h2>
        <select name="course_code" required className={field}>
          {courses.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <input name="topic" placeholder="موضوع" className={field} />
        <textarea name="question" required placeholder="نص السؤال" className={field} />
        <input name="option_a" required placeholder="A" className={field} />
        <input name="option_b" required placeholder="B" className={field} />
        <input name="option_c" required placeholder="C" className={field} />
        <input name="option_d" required placeholder="D" className={field} />
        <select name="correct" className={field}>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
        <textarea name="explanation" placeholder="شرح الإجابة" className={field} />
        <label className="flex gap-2 text-sm text-[var(--text-primary)]">
          <input type="checkbox" name="daily_eligible" value="true" />
          مؤهل لسؤال اليوم (تيليجرام /daily)
        </label>
        <button type="submit" className="btn-primary" disabled={busy}>
          حفظ السؤال
        </button>
      </form>

      <form className="card-soft space-y-3 p-5" onSubmit={importCsv}>
        <h2 className="font-semibold text-[var(--text-primary)]">استيراد CSV</h2>
        <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
          الأعمدة: course_code,topic,question,option_a,option_b,option_c,option_d,correct,explanation
          — استخدم رموز المواد الحقيقية (مثل ECOM2402). عيّنة جاهزة:{" "}
          <a
            href="/sample-questions.csv"
            className="text-[var(--accent-gold)] underline"
            download
          >
            sample-questions.csv
          </a>
        </p>
        <input name="file" type="file" accept=".csv,text/csv" required className="text-sm" />
        <button type="submit" className="btn-primary" disabled={busy}>
          استيراد
        </button>
      </form>
      {msg && <p className="text-sm text-[var(--accent-gold)]">{msg}</p>}
      {!!importErrors.length && (
        <ul className="list-disc space-y-1 pr-5 text-xs text-[var(--warn)]">
          {importErrors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

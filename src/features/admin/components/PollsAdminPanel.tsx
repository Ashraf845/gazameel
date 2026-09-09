"use client";

import { useEffect, useState } from "react";
import type { CatalogCourse } from "@/shared/lib/courses";

type PollRow = {
  id: string;
  question: string;
  options: string[];
  total_votes: number;
  courses: { name_ar: string } | null;
};

/**
 * إنشاء استطلاع + قائمة النشطة مع إيقاف التكرار.
 * يمنع إنشاء سؤال بنفس النص وهو نشط أصلًا.
 */
export function PollsAdminPanel({ courses }: { courses: CatalogCourse[] }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [polls, setPolls] = useState<PollRow[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/polls");
    const data = await res.json().catch(() => ({}));
    setPolls(data.polls || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
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
    if (res.ok) {
      form.reset();
      void load();
    }
    setBusy(false);
  }

  async function deactivate(pollId: string) {
    const res = await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deactivate", poll_id: pollId }),
    });
    const data = await res.json();
    setMsg(res.ok ? "أُوقف الاستطلاع" : data.error);
    if (res.ok) void load();
  }

  const field =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]";

  return (
    <div className="space-y-6">
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
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "…" : "نشر استطلاع"}
        </button>
        {msg && <p className="text-sm text-[var(--accent-gold)]">{msg}</p>}
      </form>

      <div className="card-soft space-y-3 p-5">
        <h2 className="font-semibold text-[var(--text-primary)]">
          الاستطلاعات النشطة
        </h2>
        {!polls.length ? (
          <p className="text-sm text-[var(--text-secondary)]">لا استطلاعات نشطة.</p>
        ) : (
          <ul className="space-y-2">
            {polls.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] py-2 text-sm"
              >
                <div>
                  <p className="text-[var(--text-primary)]">{p.question}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {p.courses?.name_ar || "عامة"} · {p.total_votes} صوت
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() => deactivate(p.id)}
                >
                  إيقاف
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

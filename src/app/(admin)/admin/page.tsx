"use client";

import { useCallback, useEffect, useState } from "react";
import { COURSES, RESOURCE_TYPES } from "@/shared/lib/courses";

type Tab = "queue" | "upload" | "exams" | "questions" | "polls";

type PendingItem = {
  id: string;
  title: string;
  created_at: string;
  contributor_display_name: string | null;
  preview_url: string | null;
  courses: { code: string; name_ar: string } | null;
  profiles: { full_name: string | null; student_id: string | null } | null;
};

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("queue");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [configHint, setConfigHint] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/submissions", { method: "PUT" })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (d.supabase_configured === false) {
          setConfigHint(
            "Supabase غير مُعدّ — يمكنك تصفّح الواجهة، لكن طابور المراجعة يحتاج .env.local."
          );
          setIsAdmin(true); // معاينة اللوحة بدون صلاحيات فعلية
          return;
        }
        setIsAdmin(!!d.is_admin);
      })
      .catch(() => setIsAdmin(false));
  }, []);

  if (isAdmin === null) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-[var(--text-secondary)] text-sm">
        جاري التحقق…
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">غير مصرّح</h1>
        <p className="text-[var(--text-secondary)] text-sm">
          لوحة الأدمن لمن بريده يطابق <code>ADMIN_EMAIL</code> في البيئة.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">لوحة الأدمن</h1>
      <p className="text-[var(--text-secondary)] mb-6 text-sm">
        موافقة المساهمات، رفع مباشر، مواعيد، أسئلة، واستطلاعات.
      </p>
      {configHint && (
        <p className="mb-4 text-sm text-[var(--warn)] leading-relaxed">{configHint}</p>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["queue", "طابور المساهمات"],
            ["upload", "رفع مباشر"],
            ["exams", "مواعيد"],
            ["questions", "أسئلة"],
            ["polls", "استطلاعات"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-2 text-sm ${
              tab === id
                ? "bg-[var(--accent-gold)] text-[var(--accent-gold-text-on)]"
                : "bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "queue" && <QueuePanel dbReady={!configHint} />}
      {tab === "upload" && <DirectUploadPanel />}
      {tab === "exams" && <ExamsPanel />}
      {tab === "questions" && <QuestionsPanel />}
      {tab === "polls" && <PollsAdminPanel />}
    </div>
  );
}

function QueuePanel({ dbReady }: { dbReady: boolean }) {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [setupHint, setSetupHint] = useState<string | null>(
    dbReady ? null : "طابور المراجعة يحتاج إعداد Supabase في .env.local."
  );

  const load = useCallback(async () => {
    if (!dbReady) {
      setSetupHint("طابور المراجعة يحتاج إعداد Supabase في .env.local.");
      setItems([]);
      return;
    }
    const res = await fetch("/api/admin/submissions");
    const data = await res.json().catch(() => ({}));
    if (res.status === 503) {
      setSetupHint(data.error || "قاعدة البيانات غير مُعدّة بعد.");
      setItems([]);
      return;
    }
    setSetupHint(null);
    if (res.ok) setItems(data.items || []);
    else setMsg(data.error || "تعذّر تحميل الطابور");
  }, [dbReady]);

  useEffect(() => {
    load();
  }, [load]);

  async function review(id: string, action: "approve" | "reject") {
    let reason: string | undefined;
    if (action === "reject") {
      reason = window.prompt("سبب الرفض (اختياري):") || undefined;
    }
    const res = await fetch("/api/admin/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, reason }),
    });
    const data = await res.json();
    setMsg(res.ok ? `تم: ${action}` : data.error);
    load();
  }

  return (
    <div className="card-soft p-5 space-y-4">
      {setupHint && (
        <p className="text-sm text-[var(--warn)] leading-relaxed">{setupHint}</p>
      )}
      {msg && <p className="text-sm text-[var(--accent-gold)]">{msg}</p>}
      {!setupHint && !items.length && (
        <p className="text-center text-[var(--text-secondary)] text-sm py-6">لا مساهمات معلّقة</p>
      )}
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-lg border border-[var(--border)] p-4 space-y-2"
        >
          <div className="font-semibold">{item.title}</div>
          <div className="text-sm text-[var(--text-secondary)]">
            {item.courses?.name_ar} · {item.contributor_display_name} ·{" "}
            {item.profiles?.student_id}
          </div>
          {item.preview_url && (
            <a
              href={item.preview_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[var(--accent-gold)] underline"
            >
              معاينة (رابط موقّت)
            </a>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" className="btn-primary" onClick={() => review(item.id, "approve")}>
              موافقة
            </button>
            <button type="button" className="btn-ghost" onClick={() => review(item.id, "reject")}>
              رفض
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function DirectUploadPanel() {
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
        className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2"
      >
        {COURSES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        name="resource_type"
        className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2"
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
        className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2"
      />
      <input
        name="external_url"
        placeholder="رابط فيديو (إن اخترت نوع فيديو)"
        className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2"
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

function ExamsPanel() {
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
        className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2"
      >
        {COURSES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
      <input
        name="title"
        required
        placeholder="عنوان (مثال: كويز 1)"
        className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2"
      />
      <input
        name="starts_at"
        type="datetime-local"
        required
        className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2"
      />
      <select
        name="event_type"
        className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2"
      >
        <option value="quiz">كويز</option>
        <option value="midterm">منتصف</option>
        <option value="final">نهائي</option>
        <option value="assignment">تكليف</option>
      </select>
      <input
        name="notes"
        placeholder="ملاحظات"
        className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2"
      />
      <button type="submit" className="btn-primary">
        إضافة للتقويم
      </button>
      {msg && <p className="text-sm text-[var(--accent-gold)]">{msg}</p>}
    </form>
  );
}

function QuestionsPanel() {
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

  return (
    <div className="space-y-6">
      <form className="card-soft space-y-3 p-5" onSubmit={addOne}>
        <h2 className="font-semibold">سؤال واحد</h2>
        <select
          name="course_code"
          required
          className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2"
        >
          {COURSES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          name="topic"
          placeholder="موضوع"
          className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2"
        />
        <textarea
          name="question"
          required
          placeholder="نص السؤال"
          className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2"
        />
        <input name="option_a" required placeholder="A" className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2" />
        <input name="option_b" required placeholder="B" className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2" />
        <input name="option_c" required placeholder="C" className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2" />
        <input name="option_d" required placeholder="D" className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2" />
        <select name="correct" className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2">
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
        <textarea
          name="explanation"
          placeholder="شرح الإجابة"
          className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2"
        />
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="daily_eligible" value="true" />
          مؤهل لسؤال اليوم (تيليجرام /daily)
        </label>
        <button type="submit" className="btn-primary" disabled={busy}>
          حفظ السؤال
        </button>
      </form>

      <form className="card-soft space-y-3 p-5" onSubmit={importCsv}>
        <h2 className="font-semibold">استيراد CSV</h2>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          الأعمدة: course_code,topic,question,option_a,option_b,option_c,option_d,correct,explanation
          — استخدم رموز المواد الحقيقية (مثل ECOM2402). عيّنة جاهزة:{" "}
          <a href="/sample-questions.csv" className="text-[var(--accent-gold)] underline" download>
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
        <ul className="text-xs text-[var(--warn)] space-y-1 list-disc pr-5">
          {importErrors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PollsAdminPanel() {
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

  return (
    <form className="card-soft space-y-3 p-5" onSubmit={onSubmit}>
      <input
        name="question"
        required
        placeholder="سؤال الاستطلاع (صعوبة الامتحان؟)"
        className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2"
      />
      <select
        name="course_code"
        className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2"
      >
        <option value="">— عامة —</option>
        {COURSES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
      <textarea
        name="options"
        required
        placeholder={"سهل\nمتوسط\nصعب"}
        className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2 min-h-24"
      />
      <button type="submit" className="btn-primary">
        نشر استطلاع
      </button>
      {msg && <p className="text-sm text-[var(--accent-gold)]">{msg}</p>}
    </form>
  );
}

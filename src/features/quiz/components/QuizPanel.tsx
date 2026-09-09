"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { CatalogCourse } from "@/shared/lib/courses";
import type { GradedDetail, PlayableQuestion } from "@/features/quiz/quiz";

/** واجهة الاختبار: بدء → إجابات → تسليم مع حالة تحميل حتى لا يبدو الزر ميتًا */
export function QuizPanel({ courses }: { courses: CatalogCourse[] }) {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-[var(--text-secondary)]">…</div>
      }
    >
      <QuizInner courses={courses} />
    </Suspense>
  );
}

function QuizInner({ courses }: { courses: CatalogCourse[] }) {
  const params = useSearchParams();
  const initial = params.get("course") || courses[0]?.code || "";
  const [course, setCourse] = useState(initial);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PlayableQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    score: number;
    total: number;
    detail: GradedDetail[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_code: course, count: 10 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error ||
            (res.status === 401
              ? "سجّل الدخول أولًا لبدء الاختبار"
              : res.status === 503
                ? "قاعدة البيانات غير مُعدّة — أضف مفاتيح Supabase في .env.local"
                : "تعذّر بدء الاختبار")
        );
        return;
      }
      setCourseId(data.course_id);
      setQuestions(data.questions);
      setAnswers({});
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!courseId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const payload = questions.map((q) => ({
        question_id: q.id,
        selected: answers[q.id] || "",
      }));
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: courseId, answers: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setResult(data);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-[var(--text-primary)]">
        اختبار تفاعلي
      </h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        أسئلة اختيار من متعدد مع تصحيح فوري وشرح بعد التسليم.
      </p>

      {!questions.length && !result && (
        <div className="card-soft space-y-4 p-5">
          <select
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]"
          >
            {courses.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-primary"
            onClick={start}
            disabled={busy}
          >
            {busy ? "جارٍ التحميل…" : "ابدأ الاختبار"}
          </button>
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
            يلزم تسجيل الدخول. إذا لا أسئلة بعد، شغّل{" "}
            <code className="text-[var(--text-secondary)]">npm run seed</code> أو
            أضفها من لوحة الأدمن.
          </p>
        </div>
      )}

      {!!questions.length && !result && (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={q.id} className="card-soft space-y-2 p-4">
              <p className="font-medium text-[var(--text-primary)]">
                {i + 1}. {q.question}
              </p>
              {(["A", "B", "C", "D"] as const).map((opt) => {
                const text =
                  opt === "A"
                    ? q.option_a
                    : opt === "B"
                      ? q.option_b
                      : opt === "C"
                        ? q.option_c
                        : q.option_d;
                return (
                  <label
                    key={opt}
                    className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-primary)]"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === opt}
                      onChange={() =>
                        setAnswers((prev) => ({ ...prev, [q.id]: opt }))
                      }
                    />
                    {opt}) {text}
                  </label>
                );
              })}
            </div>
          ))}
          <button
            type="button"
            className="btn-primary"
            onClick={submit}
            disabled={busy}
          >
            {busy ? "جارٍ التصحيح…" : "تسليم وتصحيح"}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="card-soft p-5 text-center">
            <p className="text-2xl font-bold text-[var(--accent-gold)]">
              {result.score} / {result.total}
            </p>
          </div>
          {result.detail.map((d, i) => (
            <div key={i} className="card-soft p-4 text-sm">
              <p className="mb-1 font-medium text-[var(--text-primary)]">
                {d.question}
              </p>
              <p
                className={
                  d.is_correct
                    ? "text-[var(--accent-gold)]"
                    : "text-[#e07a7a]"
                }
              >
                إجابتك: {d.selected || "—"} · الصحيحة: {d.correct}
              </p>
              {d.explanation ? (
                <p className="mt-1 text-[var(--text-secondary)]">
                  {d.explanation}
                </p>
              ) : null}
            </div>
          ))}
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setQuestions([]);
              setResult(null);
            }}
          >
            اختبار جديد
          </button>
        </div>
      )}

      {error ? (
        <p className="mt-4 text-sm text-[#e07a7a]">{error}</p>
      ) : null}
    </div>
  );
}

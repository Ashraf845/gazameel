"use client";

import { useState } from "react";
import { COURSES } from "@/shared/lib/courses";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type Q = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
};

type Result = {
  score: number;
  total: number;
  detail: {
    question: string;
    selected: string;
    correct: string;
    explanation: string | null;
    is_correct: boolean;
  }[];
};

function QuizInner() {
  const params = useSearchParams();
  const initial = params.get("course") || "ECOM2402";
  const [course, setCourse] = useState(initial);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    setResult(null);
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
  }

  async function submit() {
    if (!courseId) return;
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
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">اختبار تفاعلي</h1>
      <p className="text-[var(--text-secondary)] text-sm mb-6">
        أسئلة اختيار من متعدد مع تصحيح فوري وشرح بعد التسليم.
      </p>

      {!questions.length && !result && (
        <div className="card-soft p-5 space-y-4">
          <select
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2"
          >
            {COURSES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="button" className="btn-primary" onClick={start}>
            ابدأ الاختبار
          </button>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            يلزم تسجيل الدخول. إذا لا أسئلة بعد، شغّل{" "}
            <code className="text-[var(--text-secondary)]">npm run seed</code> أو أضفها من لوحة الأدمن.
          </p>
        </div>
      )}

      {!!questions.length && !result && (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={q.id} className="card-soft p-4 space-y-2">
              <p className="font-medium">
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
                  <label key={opt} className="flex gap-2 text-sm items-center">
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
          <button type="button" className="btn-primary" onClick={submit}>
            تسليم وتصحيح
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
              <p className="font-medium mb-1">{d.question}</p>
              <p className={d.is_correct ? "text-[var(--accent-gold)]" : "text-[#e07a7a]"}>
                إجابتك: {d.selected || "—"} · الصحيحة: {d.correct}
              </p>
              {d.explanation && (
                <p className="text-[var(--text-secondary)] mt-1">{d.explanation}</p>
              )}
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

      {error && <p className="text-sm text-[#e07a7a] mt-4">{error}</p>}
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center">…</div>}>
      <QuizInner />
    </Suspense>
  );
}

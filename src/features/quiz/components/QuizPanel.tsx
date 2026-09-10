"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { CatalogCourse } from "@/shared/lib/courses";
import {
  QUESTION_SECONDS,
  type GradedDetail,
  type PlayableQuestion,
} from "@/features/quiz/grading";

/** واجهة الاختبار: مادة → فصل → سؤال واحد بمؤقت دقيقة */
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
  const [chapters, setChapters] = useState<number[]>([]);
  const [chapter, setChapter] = useState<number | "">("");
  const [courseId, setCourseId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PlayableQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS);
  const [result, setResult] = useState<{
    score: number;
    total: number;
    detail: GradedDetail[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const submittingRef = useRef(false);
  const answersRef = useRef(answers);
  const timeoutArmedRef = useRef(true);
  answersRef.current = answers;

  const loadChapters = useCallback(async (code: string) => {
    setLoadingChapters(true);
    setChapters([]);
    setChapter("");
    setError(null);
    try {
      const res = await fetch(
        `/api/quiz/chapters?course=${encodeURIComponent(code)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.error ||
            (res.status === 401
              ? "سجّل الدخول أولًا"
              : "تعذّر تحميل الفصول")
        );
        return;
      }
      const list = (data.chapters || []) as number[];
      setChapters(list);
      if (list.length) setChapter(list[0]);
    } finally {
      setLoadingChapters(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void loadChapters(course), 0);
    return () => window.clearTimeout(t);
  }, [course, loadChapters]);

  const finishQuiz = useCallback(
    async (finalAnswers: Record<string, string>, qs: PlayableQuestion[], cId: string) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setBusy(true);
      setError(null);
      try {
        const payload = qs.map((q) => ({
          question_id: q.id,
          selected: finalAnswers[q.id] || "",
        }));
        const res = await fetch("/api/quiz/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ course_id: cId, answers: payload }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "فشل التسليم");
          return;
        }
        setResult(data);
        setQuestions([]);
      } finally {
        setBusy(false);
        submittingRef.current = false;
      }
    },
    []
  );

  const goNext = useCallback(
    (fromIndex: number, qs: PlayableQuestion[], cId: string) => {
      if (fromIndex + 1 >= qs.length) {
        void finishQuiz(answersRef.current, qs, cId);
        return;
      }
      setIndex(fromIndex + 1);
      setSecondsLeft(QUESTION_SECONDS);
    },
    [finishQuiz]
  );

  // مؤقت السؤال الحالي — مرة واحدة عند انتهاء الدقيقة
  useEffect(() => {
    if (!questions.length || result || !courseId) return;
    if (secondsLeft > 0) {
      timeoutArmedRef.current = true;
      const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
      return () => window.clearTimeout(t);
    }
    if (timeoutArmedRef.current) {
      timeoutArmedRef.current = false;
      goNext(index, questions, courseId);
    }
  }, [secondsLeft, questions, result, courseId, index, goNext]);

  async function start() {
    if (busy || chapter === "") return;
    setBusy(true);
    setError(null);
    setResult(null);
    submittingRef.current = false;
    try {
      const res = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_code: course,
          chapter: Number(chapter),
          count: 10,
        }),
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
      setIndex(0);
      setSecondsLeft(Number(data.question_seconds) || QUESTION_SECONDS);
    } finally {
      setBusy(false);
    }
  }

  function selectOption(opt: string) {
    if (!questions.length || !courseId || busy) return;
    const q = questions[index];
    if (!q) return;
    const next = { ...answersRef.current, [q.id]: opt };
    setAnswers(next);
    answersRef.current = next;
    // بعد الاختيار انتقل مباشرة (أو سلّم إن كان الأخير)
    window.setTimeout(() => goNext(index, questions, courseId), 180);
  }

  const field =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]";
  const current = questions[index];
  const inQuiz = !!questions.length && !result && !!current;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-[var(--text-primary)]">
        اختبار تفاعلي
      </h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        اختر المادة ثم الفصل (الشابتر). كل سؤال لمدة دقيقة واحدة.
      </p>

      {!inQuiz && !result && (
        <div className="card-soft space-y-4 p-5">
          <select
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className={field}
          >
            {courses.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={chapter === "" ? "" : String(chapter)}
            onChange={(e) =>
              setChapter(e.target.value ? Number(e.target.value) : "")
            }
            className={field}
            disabled={loadingChapters || !chapters.length}
          >
            {loadingChapters && <option value="">جارٍ تحميل الفصول…</option>}
            {!loadingChapters && !chapters.length && (
              <option value="">لا فصول بأسئلة بعد</option>
            )}
            {chapters.map((n) => (
              <option key={n} value={n}>
                الفصل {n}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void start()}
            disabled={busy || chapter === "" || !chapters.length}
          >
            {busy ? "جارٍ التحميل…" : "ابدأ اختبار الفصل"}
          </button>
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
            يلزم تسجيل الدخول. الأسئلة تُضاف لكل فصل من لوحة الأدمن (أو CSV
            بعمود chapter).
          </p>
        </div>
      )}

      {inQuiz && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--text-secondary)]">
            <span>
              الفصل {chapter} · سؤال {index + 1} من {questions.length}
            </span>
            <span
              className={
                secondsLeft <= 10
                  ? "font-semibold text-[#e07a7a]"
                  : "font-semibold text-[var(--accent-gold)]"
              }
            >
              {secondsLeft} ث
            </span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--text-primary)_12%,transparent)]"
            aria-hidden
          >
            <div
              className="h-full rounded-full bg-[var(--accent-gold)] transition-[width] duration-1000 linear"
              style={{
                width: `${(secondsLeft / QUESTION_SECONDS) * 100}%`,
              }}
            />
          </div>
          <div className="card-soft space-y-3 p-4">
            <p className="font-medium text-[var(--text-primary)]">
              {current.question}
            </p>
            {(["A", "B", "C", "D"] as const).map((opt) => {
              const text =
                opt === "A"
                  ? current.option_a
                  : opt === "B"
                    ? current.option_b
                    : opt === "C"
                      ? current.option_c
                      : current.option_d;
              return (
                <button
                  key={opt}
                  type="button"
                  className={`flex w-full cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-right text-sm text-[var(--text-primary)] ${
                    answers[current.id] === opt
                      ? "border-[var(--accent-gold)] bg-[color-mix(in_srgb,var(--accent-gold)_12%,transparent)]"
                      : "border-[var(--border)]"
                  }`}
                  onClick={() => selectOption(opt)}
                  disabled={busy}
                >
                  <span className="font-medium">{opt})</span>
                  <span>{text}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            اختر إجابة للانتقال، أو انتظر انتهاء الدقيقة (تُحسب فارغة).
          </p>
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
              setIndex(0);
              void loadChapters(course);
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

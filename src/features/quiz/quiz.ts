import { createAdminClient, SUPABASE_UNCONFIGURED_AR } from "@/shared/lib/supabase/admin";
import {
  gradeAnswers,
  shufflePick,
  splitCsv,
  toPlayableQuestion,
  QUESTION_SECONDS,
  type AttemptRow,
  type GradedDetail,
  type PlayableQuestion,
  type QuizAnswer,
} from "@/features/quiz/grading";

export type { AttemptRow, GradedDetail, PlayableQuestion, QuizAnswer };
export {
  gradeAnswers,
  shufflePick,
  splitCsv,
  summarizeAttempts,
  toPlayableQuestion,
  QUESTION_SECONDS,
} from "@/features/quiz/grading";

/** أرقام الفصول التي فيها أسئلة نشطة لمادة معيّنة */
export async function listQuizChapters(courseCode: string): Promise<
  | { ok: true; chapters: number[] }
  | { ok: false; error: string; status: number }
> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: SUPABASE_UNCONFIGURED_AR, status: 503 };

  const code = courseCode.trim();
  if (!code) return { ok: false, error: "المادة مطلوبة", status: 400 };

  const { data: course } = await admin
    .from("courses")
    .select("id")
    .eq("code", code)
    .maybeSingle();
  if (!course) return { ok: false, error: "المادة غير موجودة", status: 400 };

  const { data, error } = await admin
    .from("questions")
    .select("chapter")
    .eq("course_id", course.id)
    .eq("active", true)
    .not("chapter", "is", null);

  if (error) return { ok: false, error: error.message, status: 500 };

  const set = new Set<number>();
  for (const row of data || []) {
    const n = Number(row.chapter);
    if (Number.isFinite(n) && n >= 1) set.add(n);
  }
  const chapters = [...set].sort((a, b) => a - b);
  return { ok: true, chapters };
}

export async function startQuiz(input: {
  courseCode: string;
  chapter: number;
  count?: number;
}): Promise<
  | {
      ok: true;
      course_id: string;
      chapter: number;
      question_seconds: number;
      questions: PlayableQuestion[];
    }
  | { ok: false; error: string; status: number }
> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: SUPABASE_UNCONFIGURED_AR, status: 503 };

  const courseCode = input.courseCode.trim();
  const chapter = Number(input.chapter);
  if (!courseCode) return { ok: false, error: "المادة مطلوبة", status: 400 };
  if (!Number.isFinite(chapter) || chapter < 1) {
    return { ok: false, error: "اختر رقم الفصل (الشابتر)", status: 400 };
  }

  const { data: questions } = await admin
    .from("questions")
    .select(
      "id, question, option_a, option_b, option_c, option_d, topic, chapter, course_id, courses!inner(code)"
    )
    .eq("courses.code", courseCode)
    .eq("chapter", chapter)
    .eq("active", true);

  if (!questions?.length) {
    const { data: course } = await admin
      .from("courses")
      .select("id")
      .eq("code", courseCode)
      .maybeSingle();
    if (!course) return { ok: false, error: "المادة غير موجودة", status: 400 };
    return {
      ok: false,
      error: `لا أسئلة للفصل ${chapter} بعد — أضفها من لوحة الأدمن`,
      status: 404,
    };
  }

  const count = Math.min(Math.max(input.count ?? 10, 1), 30);
  const picked = shufflePick(questions, count).map((row) =>
    toPlayableQuestion(row as Record<string, unknown>)
  );

  return {
    ok: true,
    course_id: questions[0].course_id,
    chapter,
    question_seconds: QUESTION_SECONDS,
    questions: picked,
  };
}

export async function submitQuiz(input: {
  userId: string;
  courseId: string;
  answers: QuizAnswer[];
}): Promise<
  | { ok: true; score: number; total: number; detail: GradedDetail[] }
  | { ok: false; error: string; status: number }
> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: SUPABASE_UNCONFIGURED_AR, status: 503 };

  const { courseId, answers } = input;
  if (!courseId || !answers?.length) {
    return { ok: false, error: "بيانات ناقصة", status: 400 };
  }

  const ids = answers.map((a) => a.question_id);
  const { data: questions } = await admin
    .from("questions")
    .select("id, correct, explanation, question")
    .in("id", ids)
    .eq("course_id", courseId);

  const { score, detail } = gradeAnswers(questions || [], answers);

  await admin.from("quiz_attempts").insert({
    user_id: input.userId,
    course_id: courseId,
    score,
    total: answers.length,
    answers: detail,
  });

  return { ok: true, score, total: answers.length, detail };
}

export async function importQuestionsCsv(text: string): Promise<
  | { ok: true; inserted: number; errors: string[] }
  | { ok: false; error: string; status: number }
> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: SUPABASE_UNCONFIGURED_AR, status: 503 };

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { ok: false, error: "CSV فارغ", status: 400 };

  const header = lines[0].toLowerCase();
  const hasChapterCol = header.includes("chapter");
  const rows = lines.slice(1);
  let inserted = 0;
  const errors: string[] = [];

  const { data: courseRows } = await admin.from("courses").select("id, code");
  const courseIdByCode = new Map(
    (courseRows || []).map((c) => [String(c.code).trim(), c.id as string])
  );

  for (let i = 0; i < rows.length; i++) {
    const cols = splitCsv(rows[i]);
    let course_code: string;
    let chapterRaw: string | undefined;
    let topic: string | undefined;
    let question: string;
    let option_a: string;
    let option_b: string;
    let option_c: string;
    let option_d: string;
    let correct: string;
    let explanation: string | undefined;

    if (hasChapterCol) {
      [
        course_code,
        chapterRaw,
        topic,
        question,
        option_a,
        option_b,
        option_c,
        option_d,
        correct,
        explanation,
      ] = cols;
    } else {
      [
        course_code,
        topic,
        question,
        option_a,
        option_b,
        option_c,
        option_d,
        correct,
        explanation,
      ] = cols;
    }

    if (!course_code || !question || !option_a || !correct) {
      errors.push(`صف ${i + 2}: ناقص`);
      continue;
    }

    const chapterNum = chapterRaw ? Number(chapterRaw) : NaN;
    if (hasChapterCol && (!Number.isFinite(chapterNum) || chapterNum < 1)) {
      errors.push(`صف ${i + 2}: chapter يجب رقم ≥ 1`);
      continue;
    }

    const courseId = courseIdByCode.get(course_code.trim());
    if (!courseId) {
      errors.push(`صف ${i + 2}: مادة ${course_code} غير موجودة`);
      continue;
    }

    const c = correct.trim().toUpperCase();
    if (!["A", "B", "C", "D"].includes(c)) {
      errors.push(`صف ${i + 2}: correct يجب A-D`);
      continue;
    }

    const { error } = await admin.from("questions").insert({
      course_id: courseId,
      chapter: Number.isFinite(chapterNum) && chapterNum >= 1 ? chapterNum : null,
      topic: topic || null,
      question,
      option_a,
      option_b: option_b || "",
      option_c: option_c || "",
      option_d: option_d || "",
      correct: c,
      explanation: explanation || null,
      active: true,
    });
    if (error) errors.push(`صف ${i + 2}: ${error.message}`);
    else inserted++;
  }

  return { ok: true, inserted, errors };
}

export async function addQuestion(body: {
  course_code: string;
  chapter?: number | string;
  topic?: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct: string;
  explanation?: string;
  daily_eligible?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: SUPABASE_UNCONFIGURED_AR, status: 503 };

  const chapter = Number(body.chapter);
  if (!Number.isFinite(chapter) || chapter < 1) {
    return { ok: false, error: "رقم الفصل (الشابتر) مطلوب", status: 400 };
  }

  const { data: course } = await admin
    .from("courses")
    .select("id")
    .eq("code", body.course_code)
    .maybeSingle();
  if (!course) return { ok: false, error: "المادة غير موجودة", status: 400 };

  const { error } = await admin.from("questions").insert({
    course_id: course.id,
    chapter,
    topic: body.topic || null,
    question: body.question,
    option_a: body.option_a,
    option_b: body.option_b,
    option_c: body.option_c,
    option_d: body.option_d,
    correct: String(body.correct).toUpperCase(),
    explanation: body.explanation || null,
    daily_eligible: !!body.daily_eligible,
    active: true,
  });

  if (error) return { ok: false, error: error.message, status: 500 };
  return { ok: true };
}

export async function listUserAttempts(userId: string): Promise<AttemptRow[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("quiz_attempts")
    .select("score, total, created_at, courses(name_ar, code)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data as AttemptRow[] | null) || [];
}

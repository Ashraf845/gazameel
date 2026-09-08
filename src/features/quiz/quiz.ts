import { createAdminClient, SUPABASE_UNCONFIGURED_AR } from "@/shared/lib/supabase/admin";
import {
  gradeAnswers,
  shufflePick,
  splitCsv,
  toPlayableQuestion,
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
} from "@/features/quiz/grading";

export async function startQuiz(input: {
  courseCode: string;
  count?: number;
}): Promise<
  | { ok: true; course_id: string; questions: PlayableQuestion[] }
  | { ok: false; error: string; status: number }
> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: SUPABASE_UNCONFIGURED_AR, status: 503 };

  const courseCode = input.courseCode.trim();
  if (!courseCode) return { ok: false, error: "المادة مطلوبة", status: 400 };

  const { data: questions } = await admin
    .from("questions")
    .select(
      "id, question, option_a, option_b, option_c, option_d, topic, course_id, courses!inner(code)"
    )
    .eq("courses.code", courseCode)
    .eq("active", true);

  if (!questions?.length) {
    const { data: course } = await admin
      .from("courses")
      .select("id")
      .eq("code", courseCode)
      .maybeSingle();
    if (!course) return { ok: false, error: "المادة غير موجودة", status: 400 };
    return { ok: false, error: "لا أسئلة لهذه المادة بعد", status: 404 };
  }

  const count = Math.min(Math.max(input.count ?? 10, 1), 30);
  const picked = shufflePick(questions, count).map((row) =>
    toPlayableQuestion(row as Record<string, unknown>)
  );

  return { ok: true, course_id: questions[0].course_id, questions: picked };
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

  const rows = lines.slice(1);
  let inserted = 0;
  const errors: string[] = [];

  const { data: courseRows } = await admin.from("courses").select("id, code");
  const courseIdByCode = new Map(
    (courseRows || []).map((c) => [String(c.code).trim(), c.id as string])
  );

  for (let i = 0; i < rows.length; i++) {
    const cols = splitCsv(rows[i]);
    const [
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

    if (!course_code || !question || !option_a || !correct) {
      errors.push(`صف ${i + 2}: ناقص`);
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

  const { data: course } = await admin
    .from("courses")
    .select("id")
    .eq("code", body.course_code)
    .maybeSingle();
  if (!course) return { ok: false, error: "المادة غير موجودة", status: 400 };

  const { error } = await admin.from("questions").insert({
    course_id: course.id,
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

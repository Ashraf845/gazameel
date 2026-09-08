export type PlayableQuestion = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
};

export type QuizAnswer = { question_id: string; selected: string };

export type GradedDetail = {
  question_id: string;
  question: string | undefined;
  selected: string;
  correct: string | undefined;
  explanation: string | null | undefined;
  is_correct: boolean;
};

export type AttemptRow = {
  score: number;
  total: number;
  created_at: string;
  courses: { name_ar?: string; code?: string } | null;
};

/** يضمن أن صف السؤال الراجع للمتصفح لا يحتوي correct / explanation */
export function toPlayableQuestion(row: Record<string, unknown>): PlayableQuestion {
  return {
    id: String(row.id ?? ""),
    question: String(row.question ?? ""),
    option_a: String(row.option_a ?? ""),
    option_b: String(row.option_b ?? ""),
    option_c: String(row.option_c ?? ""),
    option_d: String(row.option_d ?? ""),
  };
}

export function shufflePick<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function gradeAnswers(
  questions: {
    id: string;
    correct: string;
    explanation: string | null;
    question: string;
  }[],
  answers: QuizAnswer[]
): { score: number; detail: GradedDetail[] } {
  const byId = new Map(questions.map((q) => [q.id, q]));
  let score = 0;
  const detail = answers.map((a) => {
    const q = byId.get(a.question_id);
    const selected = String(a.selected || "").toUpperCase();
    const ok = !!q && q.correct === selected;
    if (ok) score++;
    return {
      question_id: a.question_id,
      question: q?.question,
      selected,
      correct: q?.correct,
      explanation: q?.explanation,
      is_correct: ok,
    };
  });
  return { score, detail };
}

export function splitCsv(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQ = !inQ;
      continue;
    }
    if (ch === "," && !inQ) {
      result.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  result.push(cur.trim());
  return result;
}

export function summarizeAttempts(attempts: AttemptRow[]) {
  const byCourse = new Map<
    string,
    { name: string; best: number; last: number; total: number }
  >();
  for (const a of attempts) {
    const c = a.courses;
    const key = c?.code || "x";
    const pct = a.total ? Math.round((a.score / a.total) * 100) : 0;
    const prev = byCourse.get(key);
    if (!prev) {
      byCourse.set(key, {
        name: c?.name_ar || key,
        best: pct,
        last: pct,
        total: a.total,
      });
    } else {
      prev.best = Math.max(prev.best, pct);
    }
  }
  return [...byCourse.values()];
}

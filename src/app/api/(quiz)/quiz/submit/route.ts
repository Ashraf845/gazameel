import { NextResponse } from "next/server";
import { requireUser } from "@/features/auth/auth";
import { createAdminClient, SUPABASE_UNCONFIGURED_AR } from "@/shared/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: SUPABASE_UNCONFIGURED_AR },
        { status: 503 }
      );
    }

    const user = await requireUser();
    const body = await request.json();
    const { course_id, answers } = body as {
      course_id: string;
      answers: { question_id: string; selected: string }[];
    };

    if (!course_id || !answers?.length) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }
    const ids = answers.map((a) => a.question_id);
    const { data: questions } = await admin
      .from("questions")
      .select("id, correct, explanation, question, option_a, option_b, option_c, option_d")
      .in("id", ids);

    const byId = new Map((questions || []).map((q) => [q.id, q]));
    let score = 0;
    const detail = answers.map((a) => {
      const q = byId.get(a.question_id);
      const selected = String(a.selected || "").toUpperCase();
      const ok = q && q.correct === selected;
      if (ok) score++;
      return {
        question_id: a.question_id,
        question: q?.question,
        selected,
        correct: q?.correct,
        explanation: q?.explanation,
        is_correct: !!ok,
      };
    });

    await admin.from("quiz_attempts").insert({
      user_id: user.id,
      course_id,
      score,
      total: answers.length,
      answers: detail,
    });

    return NextResponse.json({
      score,
      total: answers.length,
      detail,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}

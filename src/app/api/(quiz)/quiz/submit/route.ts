import { NextResponse } from "next/server";
import { requireUser } from "@/features/auth/auth";
import { submitQuiz } from "@/features/quiz/quiz";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { course_id, answers } = body as {
      course_id: string;
      answers: { question_id: string; selected: string }[];
    };
    const result = await submitQuiz({
      userId: user.id,
      courseId: course_id,
      answers,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({
      score: result.score,
      total: result.total,
      detail: result.detail,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}

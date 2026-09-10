import { NextResponse } from "next/server";
import { requireUser } from "@/features/auth/auth";
import { startQuiz } from "@/features/quiz/quiz";

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json();
    const result = await startQuiz({
      courseCode: String(body.course_code || ""),
      chapter: Number(body.chapter),
      count: body.count != null ? Number(body.count) : 10,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }
    return NextResponse.json({
      course_id: result.course_id,
      chapter: result.chapter,
      question_seconds: result.question_seconds,
      questions: result.questions,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireUser } from "@/features/auth/auth";
import { startQuiz } from "@/features/quiz/quiz";

export async function POST(request: Request) {
  try {
    await requireUser();
    const { course_code, count = 10 } = await request.json();
    const result = await startQuiz({ courseCode: course_code, count });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({
      course_id: result.course_id,
      questions: result.questions,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}

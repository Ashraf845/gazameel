import { NextResponse } from "next/server";
import { requireUser } from "@/features/auth/auth";
import { listQuizChapters } from "@/features/quiz/quiz";

/** فصول المادة التي فيها أسئلة — للاختيار قبل البدء */
export async function GET(request: Request) {
  try {
    await requireUser();
    const course = new URL(request.url).searchParams.get("course") || "";
    const result = await listQuizChapters(course);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }
    return NextResponse.json({ chapters: result.chapters });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}

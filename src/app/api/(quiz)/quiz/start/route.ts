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

    await requireUser();
    const { course_code, count = 10 } = await request.json();
    if (!course_code) {
      return NextResponse.json({ error: "المادة مطلوبة" }, { status: 400 });
    }
    const { data: course } = await admin
      .from("courses")
      .select("id")
      .eq("code", course_code)
      .maybeSingle();
    if (!course) {
      return NextResponse.json({ error: "المادة غير موجودة" }, { status: 400 });
    }

    const { data: questions } = await admin
      .from("questions")
      .select("id, question, option_a, option_b, option_c, option_d, topic")
      .eq("course_id", course.id)
      .eq("active", true);

    if (!questions?.length) {
      return NextResponse.json({ error: "لا أسئلة لهذه المادة بعد" }, { status: 404 });
    }

    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(count, shuffled.length));

    return NextResponse.json({
      course_id: course.id,
      questions: picked,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}

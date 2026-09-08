import { NextResponse } from "next/server";
import { requireAdmin, requireUser, getProfile } from "@/features/auth/auth";
import { createAdminClient, SUPABASE_UNCONFIGURED_AR } from "@/shared/lib/supabase/admin";
import { createClient } from "@/shared/lib/supabase/server";
import { listActivePolls } from "@/features/community/polls";

export async function GET() {
  try {
    const result = await listActivePolls();
    if (!result.ok) {
      return NextResponse.json(
        { polls: [], error: result.error },
        { status: result.status }
      );
    }
    return NextResponse.json({ polls: result.polls });
  } catch {
    return NextResponse.json({ polls: [] });
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getProfile();
    const body = await request.json();

    if (body.action === "create") {
      await requireAdmin();
      const admin = createAdminClient();
      if (!admin) {
        return NextResponse.json(
          { error: SUPABASE_UNCONFIGURED_AR },
          { status: 503 }
        );
      }
      let course_id = null;
      if (body.course_code) {
        const { data: c } = await admin
          .from("courses")
          .select("id")
          .eq("code", body.course_code)
          .maybeSingle();
        course_id = c?.id ?? null;
      }
      const { error } = await admin.from("polls").insert({
        question: body.question,
        options: body.options,
        course_id,
        created_by: profile?.id,
        active: true,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "vote") {
      const user = await requireUser();
      const supabase = await createClient();
      if (!supabase) {
        return NextResponse.json(
          { error: "Supabase غير مُعدّ" },
          { status: 503 }
        );
      }
      const { error } = await supabase.from("poll_votes").insert({
        poll_id: body.poll_id,
        user_id: user.id,
        option_index: body.option_index,
      });
      if (error) {
        // تعارض المفتاح الأساسي = صوت مسبق (لا نسمح بتعديل/حذف لإعادة التصويت)
        if (error.code === "23505") {
          return NextResponse.json(
            { error: "لقد صوّت مسبقًا في هذا الاستطلاع" },
            { status: 409 }
          );
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}

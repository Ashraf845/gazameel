import { NextResponse } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";
import { requireUser } from "@/features/auth/auth";
import { createAdminClient, SUPABASE_UNCONFIGURED_AR } from "@/shared/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { full_name, student_id, major, course_codes } = body as {
      full_name: string;
      student_id: string;
      major: string;
      course_codes: string[];
    };

    if (!full_name?.trim() || !student_id?.trim() || !major?.trim()) {
      return NextResponse.json({ error: "أكمل الحقول المطلوبة" }, { status: 400 });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase غير مُعدّ — راجع .env.local" },
        { status: 503 }
      );
    }
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: SUPABASE_UNCONFIGURED_AR },
        { status: 503 }
      );
    }
    // لا نكتب is_admin من عميل المستخدم — الترقية عبر service_role في getProfile/ADMIN_EMAIL
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        full_name: full_name.trim(),
        student_id: student_id.trim(),
        major: major.trim(),
        onboarding_done: true,
        email: user.email,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileErr) {
      if (profileErr.code === "23505") {
        return NextResponse.json(
          { error: "الرقم الجامعي مستخدم لحساب آخر" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    if (adminEmail && user.email?.toLowerCase() === adminEmail) {
      await admin
        .from("profiles")
        .update({ is_admin: true })
        .eq("id", user.id);
    }

    const { data: courses } = await admin
      .from("courses")
      .select("id, code")
      .in("code", course_codes?.length ? course_codes : ["__none__"]);

    await admin.from("student_courses").delete().eq("user_id", user.id);
    if (courses?.length) {
      await admin.from("student_courses").insert(
        courses.map((c) => ({ user_id: user.id, course_id: c.id }))
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "فشل الحفظ" }, { status: 500 });
  }
}

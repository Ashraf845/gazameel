import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/auth";
import { createAdminClient, SUPABASE_UNCONFIGURED_AR } from "@/shared/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const profile = await requireAdmin();
    const body = await request.json();
    const { course_code, title, event_type, starts_at, notes } = body as {
      course_code: string;
      title: string;
      event_type: string;
      starts_at: string;
      notes?: string;
    };

    if (!course_code || !title || !event_type || !starts_at) {
      return NextResponse.json({ error: "حقول ناقصة" }, { status: 400 });
    }

    const admin = createAdminClient();

    if (!admin) {
      return NextResponse.json(
        { error: SUPABASE_UNCONFIGURED_AR },
        { status: 503 }
      );
    }
    const { data: course } = await admin
      .from("courses")
      .select("id")
      .eq("code", course_code)
      .maybeSingle();
    if (!course) {
      return NextResponse.json({ error: "المادة غير موجودة" }, { status: 400 });
    }

    const { error } = await admin.from("exam_events").insert({
      course_id: course.id,
      title,
      event_type,
      starts_at: new Date(starts_at).toISOString(),
      notes: notes || null,
      created_by: profile.id,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await admin.from("updates_feed").insert({
      message: `موعد جديد في التقويم: ${title}`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}

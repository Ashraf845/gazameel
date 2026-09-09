import { NextResponse } from "next/server";
import { requireUser, getProfile } from "@/features/auth/auth";
import { createAdminClient, SUPABASE_UNCONFIGURED_AR } from "@/shared/lib/supabase/admin";
import { validateUploadFile, sniffMime, extForMime } from "@/features/upload/files";
import { MAX_PENDING_PER_USER } from "@/shared/lib/constants";
import { notifyAdminNewSubmission } from "@/features/automations/telegram";
import { runAfterResponse } from "@/shared/lib/background";
import { resolveContributorDisplayName } from "@/shared/lib/contributor-name";
import { randomUUID } from "crypto";
import { isAllowedResourceType } from "@/shared/lib/courses";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const profile = await getProfile();
    if (!profile?.onboarding_done) {
      return NextResponse.json(
        { error: "أكمل التسجيل أولًا (الرقم الجامعي والمواد)" },
        { status: 400 }
      );
    }

    const form = await request.formData();
    const courseCode = String(form.get("course") || "");
    const title = String(form.get("title") || "").trim();
    const contributor = String(form.get("contributor") || "").trim();
    const resourceType = String(form.get("resource_type") || "summary");
    const file = form.get("file") as File | null;

    const clientErr = validateUploadFile(file);
    if (clientErr) return NextResponse.json({ error: clientErr }, { status: 400 });
    if (!title || !courseCode) {
      return NextResponse.json({ error: "العنوان والمادة مطلوبان" }, { status: 400 });
    }
    if (!isAllowedResourceType(resourceType)) {
      return NextResponse.json(
        { error: "نوع الملف غير مسموح. اختر ملخصًا أو أسئلة سنوات أو صورة أو أخرى." },
        { status: 400 }
      );
    }

    const buffer = await file!.arrayBuffer();
    const okMime = await sniffMime(buffer, file!.type);
    if (!okMime) {
      return NextResponse.json(
        { error: "نوع الملف لا يطابق المحتوى الفعلي" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: SUPABASE_UNCONFIGURED_AR },
        { status: 503 }
      );
    }

    const { count } = await admin
      .from("resources")
      .select("id", { count: "exact", head: true })
      .eq("uploaded_by", user.id)
      .eq("status", "pending");

    if ((count ?? 0) >= MAX_PENDING_PER_USER) {
      return NextResponse.json(
        { error: `لديك ${MAX_PENDING_PER_USER} ملفات قيد المراجعة. انتظر القرار أولًا.` },
        { status: 429 }
      );
    }

    const { data: course } = await admin
      .from("courses")
      .select("id")
      .eq("code", courseCode)
      .maybeSingle();
    if (!course) {
      return NextResponse.json({ error: "المادة غير موجودة" }, { status: 400 });
    }

    const ext = extForMime(file!.type);
    const path = `pending/${user.id}/${randomUUID()}.${ext}`;

    const { error: upErr } = await admin.storage
      .from("resources")
      .upload(path, Buffer.from(buffer), {
        contentType: file!.type,
        upsert: false,
      });
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    const { data: resource, error: insErr } = await admin
      .from("resources")
      .insert({
        course_id: course.id,
        title,
        resource_type: resourceType,
        storage_path: path,
        mime_type: file!.type,
        file_size: file!.size,
        status: "pending",
        contributor_display_name: resolveContributorDisplayName(
          contributor || profile.full_name
        ),
        uploaded_by: user.id,
      })
      .select("id")
      .single();

    if (insErr || !resource) {
      await admin.storage.from("resources").remove([path]);
      return NextResponse.json({ error: insErr?.message || "فشل الحفظ" }, { status: 500 });
    }

    // إشعار تيليجرام بعد الاستجابة — المستخدم لا ينتظر البوت
    runAfterResponse(() => notifyAdminNewSubmission(resource.id));

    return NextResponse.json({
      ok: true,
      id: resource.id,
      message:
        "شكرًا لمساهمتك! ملفك قيد المراجعة من قِبل الأدمن وسينشر فور اعتماده.",
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "خطأ في الرفع" }, { status: 500 });
  }
}

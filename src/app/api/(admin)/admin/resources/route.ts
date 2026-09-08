import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/auth";
import { createAdminClient, SUPABASE_UNCONFIGURED_AR } from "@/shared/lib/supabase/admin";
import { validateUploadFile, sniffMime, extForMime } from "@/features/upload/files";
import { isAllowedResourceType } from "@/shared/lib/courses";
import { revalidatePublicContent } from "@/shared/lib/revalidate";
import { randomUUID } from "crypto";

/** رفع أدمن مباشر → approved فورًا */
export async function POST(request: Request) {
  try {
    const profile = await requireAdmin();
    const form = await request.formData();
    const courseCode = String(form.get("course") || "");
    const title = String(form.get("title") || "").trim();
    const resourceType = String(form.get("resource_type") || "summary");
    const externalUrl = String(form.get("external_url") || "").trim();
    const file = form.get("file") as File | null;

    if (!title || !courseCode) {
      return NextResponse.json({ error: "العنوان والمادة مطلوبان" }, { status: 400 });
    }
    if (!isAllowedResourceType(resourceType)) {
      return NextResponse.json(
        { error: "نوع الملف غير مسموح" },
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
    const { data: course } = await admin
      .from("courses")
      .select("id")
      .eq("code", courseCode)
      .maybeSingle();
    if (!course) {
      return NextResponse.json({ error: "المادة غير موجودة" }, { status: 400 });
    }

    let storage_path: string | null = null;
    let mime_type: string | null = null;
    let file_size: number | null = null;

    if (resourceType === "video") {
      if (!externalUrl) {
        return NextResponse.json({ error: "رابط الفيديو مطلوب" }, { status: 400 });
      }
    } else {
      const err = validateUploadFile(file);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
      const buffer = await file!.arrayBuffer();
      if (!(await sniffMime(buffer, file!.type))) {
        return NextResponse.json({ error: "نوع الملف غير صالح" }, { status: 400 });
      }
      const ext = extForMime(file!.type);
      storage_path = `approved/${course.id}/${randomUUID()}.${ext}`;
      mime_type = file!.type;
      file_size = file!.size;
      const { error: upErr } = await admin.storage
        .from("resources")
        .upload(storage_path, Buffer.from(buffer), { contentType: file!.type });
      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }
    }

    const { data: resource, error } = await admin
      .from("resources")
      .insert({
        course_id: course.id,
        title,
        resource_type: resourceType,
        storage_path,
        external_url: externalUrl || null,
        mime_type,
        file_size,
        status: "approved",
        contributor_display_name: profile.full_name || "الأدمن",
        uploaded_by: profile.id,
        reviewed_at: new Date().toISOString(),
        reviewed_by: profile.id,
      })
      .select("id")
      .single();

    if (error || !resource) {
      return NextResponse.json({ error: error?.message || "فشل" }, { status: 500 });
    }

    await admin.from("updates_feed").insert({
      message: `تم إضافة «${title}» بواسطة الإدارة`,
      resource_id: resource.id,
    });

    revalidatePublicContent(courseCode);

    return NextResponse.json({ ok: true, id: resource.id });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}

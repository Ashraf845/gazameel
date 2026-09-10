import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/auth";
import { prepareDirectUpload, completeAdminUpload } from "@/features/upload/direct";
import { createAdminClient, SUPABASE_UNCONFIGURED_AR } from "@/shared/lib/supabase/admin";
import { resolveContributorDisplayName } from "@/shared/lib/contributor-name";
import { isAllowedResourceType } from "@/shared/lib/courses";
import { revalidatePublicContent } from "@/shared/lib/revalidate";
import { runAfterResponse } from "@/shared/lib/background";
import { listApprovedResources } from "@/features/moderation/manage-resources";

/** قائمة الملفات المعتمدة (للحذف/الاستبدال) */
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const course = searchParams.get("course") || undefined;
    const result = await listApprovedResources({ courseCode: course });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }
    return NextResponse.json({ items: result.items });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "خطأ";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * أدمن:
 * - action=prepare → رابط رفع موقّع (ملف كبير)
 * - action=complete → تسجيل بعد الرفع
 * - بدون action + فيديو برابط → نشر فوري (JSON صغير)
 */
export async function POST(request: Request) {
  try {
    const profile = await requireAdmin();
    const body = await request.json();
    const action = String(body.action || "");

    if (action === "prepare") {
      const result = await prepareDirectUpload({
        courseCode: String(body.course || ""),
        title: String(body.title || ""),
        resourceType: String(body.resource_type || "summary"),
        mimeType: String(body.mime_type || ""),
        fileSize: Number(body.file_size) || 0,
        folder: "approved",
        userId: profile.id,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        );
      }
      return NextResponse.json({
        path: result.path,
        token: result.token,
        signedUrl: result.signedUrl,
        courseId: result.courseId,
      });
    }

    if (action === "complete") {
      const result = await completeAdminUpload({
        adminId: profile.id,
        profileName: profile.full_name,
        path: String(body.path || ""),
        courseCode: String(body.course || ""),
        title: String(body.title || ""),
        resourceType: String(body.resource_type || "summary"),
        mimeType: String(body.mime_type || ""),
        fileSize: Number(body.file_size) || 0,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        );
      }
      return NextResponse.json({ ok: true, id: result.id });
    }

    // فيديو برابط خارجي — بدون ملف
    const resourceType = String(body.resource_type || "summary");
    if (resourceType !== "video") {
      return NextResponse.json(
        { error: "للملفات استخدم prepare ثم complete" },
        { status: 400 }
      );
    }

    const courseCode = String(body.course || "").trim();
    const title = String(body.title || "").trim();
    const externalUrl = String(body.external_url || "").trim();
    if (!title || !courseCode) {
      return NextResponse.json(
        { error: "العنوان والمادة مطلوبان" },
        { status: 400 }
      );
    }
    if (!externalUrl) {
      return NextResponse.json({ error: "رابط الفيديو مطلوب" }, { status: 400 });
    }
    if (!isAllowedResourceType(resourceType)) {
      return NextResponse.json({ error: "نوع الملف غير مسموح" }, { status: 400 });
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

    const publisher = resolveContributorDisplayName(
      profile.full_name,
      "فريق Gazameel"
    );
    const { data: resource, error } = await admin
      .from("resources")
      .insert({
        course_id: course.id,
        title,
        resource_type: resourceType,
        external_url: externalUrl,
        status: "approved",
        contributor_display_name: publisher,
        uploaded_by: profile.id,
        reviewed_at: new Date().toISOString(),
        reviewed_by: profile.id,
      })
      .select("id")
      .single();

    if (error || !resource) {
      return NextResponse.json(
        { error: error?.message || "فشل" },
        { status: 500 }
      );
    }

    await admin.from("updates_feed").insert({
      message: `تم إضافة «${title}» بواسطة ${publisher}`,
      resource_id: resource.id,
    });
    runAfterResponse(async () => {
      revalidatePublicContent(courseCode);
    });

    return NextResponse.json({ ok: true, id: resource.id });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "خطأ";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireUser, getProfile } from "@/features/auth/auth";
import { completeStudentUpload } from "@/features/upload/direct";

/** بعد رفع الملف للتخزين — يسجّل الصف في قاعدة البيانات */
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

    const body = await request.json();
    const result = await completeStudentUpload({
      userId: user.id,
      profileName: profile.full_name,
      path: String(body.path || ""),
      courseCode: String(body.course || ""),
      title: String(body.title || ""),
      resourceType: String(body.resource_type || "summary"),
      mimeType: String(body.mime_type || ""),
      fileSize: Number(body.file_size) || 0,
      contributor: String(body.contributor || "").trim(),
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({
      ok: true,
      id: result.id,
      message: result.message,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "خطأ في إتمام الرفع";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireUser, getProfile } from "@/features/auth/auth";
import { prepareDirectUpload } from "@/features/upload/direct";

/** يجهّز رابط رفع موقّع — الملف لا يمر عبر Vercel (حد 4.5MB) */
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
    const result = await prepareDirectUpload({
      courseCode: String(body.course || ""),
      title: String(body.title || ""),
      resourceType: String(body.resource_type || "summary"),
      mimeType: String(body.mime_type || ""),
      fileSize: Number(body.file_size) || 0,
      folder: "pending",
      userId: user.id,
      contributor: String(body.contributor || "").trim(),
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
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "خطأ في تجهيز الرفع";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

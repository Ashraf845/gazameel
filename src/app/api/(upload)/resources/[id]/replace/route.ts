import { NextResponse } from "next/server";
import { getProfile, requireUser } from "@/features/auth/auth";
import {
  completeReplaceResource,
  prepareReplaceResource,
  replaceVideoUrl,
} from "@/features/moderation/manage-resources";

type Ctx = { params: Promise<{ id: string }> };

/**
 * استبدال ملف منشور/مرفوع:
 * - action=prepare → رابط توقيع
 * - action=complete → تحديث الصف بعد الرفع
 * - action=video → تحديث رابط فيديو
 */
export async function POST(request: Request, ctx: Ctx) {
  try {
    await requireUser();
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
    }
    const { id } = await ctx.params;
    const actor = { id: profile.id, isAdmin: profile.is_admin };
    const body = await request.json();
    const action = String(body.action || "");

    if (action === "prepare") {
      const result = await prepareReplaceResource(id, actor, {
        mimeType: String(body.mime_type || ""),
        fileSize: Number(body.file_size) || 0,
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
        keepApproved: result.keepApproved,
      });
    }

    if (action === "complete") {
      const result = await completeReplaceResource(id, actor, {
        path: String(body.path || ""),
        mimeType: String(body.mime_type || ""),
        fileSize: Number(body.file_size) || 0,
        title: body.title ? String(body.title) : undefined,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        );
      }
      return NextResponse.json({
        ok: true,
        status: result.status,
        message: result.message,
      });
    }

    if (action === "video") {
      const result = await replaceVideoUrl(
        id,
        actor,
        String(body.external_url || "")
      );
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        );
      }
      return NextResponse.json({ ok: true, message: result.message });
    }

    return NextResponse.json(
      { error: "action مطلوب: prepare | complete | video" },
      { status: 400 }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "خطأ";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

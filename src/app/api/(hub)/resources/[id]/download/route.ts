import { NextResponse } from "next/server";
import { getSessionUser, getProfile } from "@/features/auth/auth";
import { createAdminClient, SUPABASE_UNCONFIGURED_AR } from "@/shared/lib/supabase/admin";
import { createSignedUrl } from "@/features/moderation/moderation";

/** رابط تنزيل موقّت للملفات المعتمدة (أو معاينة أدمن لأي حالة) */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "سجّل الدخول" }, { status: 401 });
    }

    const { id } = await context.params;
    const admin = createAdminClient();

    if (!admin) {
      return NextResponse.json(
        { error: SUPABASE_UNCONFIGURED_AR },
        { status: 503 }
      );
    }
    const { data: resource } = await admin
      .from("resources")
      .select("id, status, storage_path, uploaded_by, external_url, title, mime_type")
      .eq("id", id)
      .maybeSingle();

    if (!resource) {
      return NextResponse.json({ error: "غير موجود" }, { status: 404 });
    }

    const profile = await getProfile();
    const allowed =
      resource.status === "approved" ||
      profile?.is_admin ||
      resource.uploaded_by === user.id;

    if (!allowed) {
      return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
    }

    if (resource.external_url) {
      return NextResponse.json({ url: resource.external_url, type: "external" });
    }
    if (!resource.storage_path) {
      return NextResponse.json({ error: "لا ملف" }, { status: 404 });
    }

    const ext =
      String(resource.storage_path).split(".").pop() ||
      (resource.mime_type?.includes("pdf") ? "pdf" : "bin");
    const safeTitle = String(resource.title || "gazameel")
      .replace(/[\\/:*?"<>|]+/g, "_")
      .slice(0, 80);
    const filename = `${safeTitle}.${ext}`;
    // downloadName يضيف Content-Disposition: attachment على الرابط الموقّع
    const url = await createSignedUrl(resource.storage_path, 600, filename);
    return NextResponse.json({ url, type: "signed", filename });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}

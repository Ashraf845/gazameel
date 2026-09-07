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
      .select("id, status, storage_path, uploaded_by, external_url")
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

    const url = await createSignedUrl(resource.storage_path, 600);
    return NextResponse.json({ url, type: "signed" });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}

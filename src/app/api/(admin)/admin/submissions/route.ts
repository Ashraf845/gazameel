import { NextResponse } from "next/server";
import { requireAdmin, getProfile } from "@/features/auth/auth";
import { createAdminClient, SUPABASE_UNCONFIGURED_AR } from "@/shared/lib/supabase/admin";
import { reviewResource, createSignedUrl } from "@/features/moderation/moderation";
import { notifySubmitterReviewDecision } from "@/features/automations/telegram";

export async function GET() {
  try {
    // قبل فحص الأدمن: لا نُرجع 403 عند غياب المفاتيح (معاينة محلية)
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: SUPABASE_UNCONFIGURED_AR, items: [] },
        { status: 503 }
      );
    }
    await requireAdmin();
    const { data, error } = await admin
      .from("resources")
      .select(
        "id, title, status, created_at, contributor_display_name, storage_path, mime_type, rejection_reason, courses(code, name_ar), profiles:uploaded_by(full_name, student_id, email)"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const withUrls = await Promise.all(
      (data || []).map(async (r) => {
        let preview_url: string | null = null;
        if (r.storage_path) {
          try {
            preview_url = await createSignedUrl(r.storage_path, 600);
          } catch {
            preview_url = null;
          }
        }
        return { ...r, preview_url };
      })
    );

    return NextResponse.json({ items: withUrls });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!createAdminClient()) {
      return NextResponse.json(
        { error: SUPABASE_UNCONFIGURED_AR },
        { status: 503 }
      );
    }

    const profile = await requireAdmin();
    const body = await request.json();
    const { id, action, reason } = body as {
      id: string;
      action: "approve" | "reject";
      reason?: string;
    };

    if (!id || (action !== "approve" && action !== "reject")) {
      return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }

    const result = await reviewResource(id, action, {
      reason,
      reviewerId: profile.id,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    await notifySubmitterReviewDecision(id, action, reason);
    return NextResponse.json({ ok: true, status: result.resource?.status });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}

export async function PUT() {
  const { isSupabaseFullyConfigured } = await import("@/shared/lib/supabase/config");
  const configured = isSupabaseFullyConfigured();
  if (!configured) {
    return NextResponse.json({
      is_admin: false,
      supabase_configured: false,
    });
  }
  const profile = await getProfile();
  return NextResponse.json({
    is_admin: !!profile?.is_admin,
    supabase_configured: true,
  });
}

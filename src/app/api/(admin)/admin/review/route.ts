/**
 * POST /api/admin/review
 * واجهة قديمة — تُحوَّل إلى نفس منطق reviewResource المستخدم في /api/admin/submissions
 * Body JSON: { id, action: "approve" | "reject", reason?: string }
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/auth";
import { reviewResource } from "@/features/moderation/moderation";
import { notifySubmitterReviewDecision } from "@/features/automations/telegram";

export async function POST(request: Request) {
  try {
    const profile = await requireAdmin();
    const body = await request.json();
    const id = String(body.id || "");
    const action = body.action as "approve" | "reject";
    const reason = body.reason ? String(body.reason) : undefined;

    if (!id || (action !== "approve" && action !== "reject")) {
      return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
    }

    const result = await reviewResource(id, action, {
      reason,
      reviewerId: profile.id,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
    }
    await notifySubmitterReviewDecision(id, action, reason);
    return NextResponse.json({ ok: true, status: result.resource?.status });
  } catch (err) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

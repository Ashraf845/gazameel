import { NextResponse } from "next/server";
import { getProfile, requireUser } from "@/features/auth/auth";
import { deleteManagedResource } from "@/features/moderation/manage-resources";

type Ctx = { params: Promise<{ id: string }> };

/** حذف ملف — صاحبه أو الأدمن */
export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    await requireUser();
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
    }
    const { id } = await ctx.params;
    const result = await deleteManagedResource(id, {
      id: profile.id,
      isAdmin: profile.is_admin,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "خطأ";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

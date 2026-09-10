import { NextResponse } from "next/server";
import { getProfile, requireUser } from "@/features/auth/auth";
import {
  deleteManagedResource,
  renameManagedResource,
} from "@/features/moderation/manage-resources";

type Ctx = { params: Promise<{ id: string }> };

async function actorFromSession() {
  await requireUser();
  const profile = await getProfile();
  if (!profile) return null;
  return { id: profile.id, isAdmin: profile.is_admin };
}

/** حذف ملف — صاحبه أو الأدمن */
export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const actor = await actorFromSession();
    if (!actor) {
      return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
    }
    const { id } = await ctx.params;
    const result = await deleteManagedResource(id, actor);
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

/** تعديل العنوان — صاحبه أو الأدمن */
export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const actor = await actorFromSession();
    if (!actor) {
      return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
    }
    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({}));
    const result = await renameManagedResource(
      id,
      actor,
      String(body.title || "")
    );
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }
    return NextResponse.json({ ok: true, title: result.title });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "خطأ";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/auth";
import { createAdminClient, SUPABASE_UNCONFIGURED_AR } from "@/shared/lib/supabase/admin";
import {
  createAdminMessage,
  listAdminMessages,
  type AdminAudience,
  type AdminMessageKind,
} from "@/features/admin/dashboard";

export async function GET(request: Request) {
  try {
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: SUPABASE_UNCONFIGURED_AR },
        { status: 503 }
      );
    }
    await requireAdmin();
    const kind = new URL(request.url).searchParams.get("kind") as
      | AdminMessageKind
      | null;
    const messages = await listAdminMessages(
      kind === "email" || kind === "notification" ? kind : undefined
    );
    return NextResponse.json({ messages });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: SUPABASE_UNCONFIGURED_AR },
        { status: 503 }
      );
    }
    const profile = await requireAdmin();
    const body = await request.json();
    const kind = body.kind as AdminMessageKind;
    const audience = (body.audience || "all") as AdminAudience;
    if (kind !== "email" && kind !== "notification") {
      return NextResponse.json({ error: "نوع غير صالح" }, { status: 400 });
    }
    const result = await createAdminMessage({
      kind,
      title: String(body.title || ""),
      body: String(body.body || ""),
      audience,
      showOnHome: !!body.show_on_home,
      sendTelegram: !!body.send_telegram,
      sendEmail: !!body.send_email,
      createdBy: profile.id,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}

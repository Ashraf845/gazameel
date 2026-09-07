import { NextResponse } from "next/server";
import { requireUser } from "@/features/auth/auth";
import {
  listInboxMessages,
  markInboxMessageRead,
} from "@/features/community/messages";

export async function GET() {
  try {
    const user = await requireUser();
    const result = await listInboxMessages(user.id);
    return NextResponse.json(result, { status: result.ok ? 200 : 503 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { ok: false, error: "خطأ غير متوقع" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const messageId = String(body.message_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(messageId)) {
      return NextResponse.json(
        { ok: false, error: "رسالة غير صالحة" },
        { status: 400 }
      );
    }

    const result = await markInboxMessageRead(user.id, messageId);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { ok: false, error: "خطأ غير متوقع" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getBot, handleTelegramUpdate } from "@/features/automations/telegram";
import { isMissingOrPlaceholder } from "@/shared/lib/supabase/config";

const SECRET_HEADER = "x-telegram-bot-api-secret-token";

function safeEqualString(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function verifyWebhookSecret(request: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (isMissingOrPlaceholder(expected)) {
    // بدون سرّ حقيقي: اسمح محليًا فقط. على الإنتاج عيّن TELEGRAM_WEBHOOK_SECRET.
    return process.env.NODE_ENV !== "production";
  }
  const got = request.headers.get(SECRET_HEADER);
  return !!got && safeEqualString(got, expected!);
}

export async function POST(request: Request) {
  // بدون توكن بوت: لا نكسر الاستدعاء — نؤكد الاستلام بهدوء
  if (!getBot()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "telegram_bot_not_configured",
    });
  }

  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const update = await request.json().catch(() => null);
    if (!update) {
      return NextResponse.json({ ok: true, skipped: true });
    }
    await handleTelegramUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("telegram webhook", e);
    return NextResponse.json({ ok: true }); // لا نُرجع 500 لتيليجرام بلا داعٍ
  }
}

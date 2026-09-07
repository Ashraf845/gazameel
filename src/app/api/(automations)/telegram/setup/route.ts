import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getBot, registerProductionWebhook } from "@/features/automations/telegram";
import { isMissingOrPlaceholder } from "@/shared/lib/supabase/config";

function safeEqualString(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * GET /api/telegram/setup?secret=...
 * يربط setWebhook بعد التحقق من TELEGRAM_WEBHOOK_SECRET (query فقط — ليس CRON_SECRET).
 */
export async function GET(request: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const got = new URL(request.url).searchParams.get("secret")?.trim() || "";

  if (got === "YOUR_TELEGRAM_WEBHOOK_SECRET" || got.includes("YOUR_")) {
    return NextResponse.json(
      {
        ok: false,
        error: "placeholder_secret",
        hint: "استبدل YOUR_TELEGRAM_WEBHOOK_SECRET بالقيمة الحقيقية من TELEGRAM_WEBHOOK_SECRET في .env.local",
      },
      { status: 400 }
    );
  }

  // سرّ السيرفر غير مضبوط على بيئة النشر (غالبًا Vercel Production)
  if (isMissingOrPlaceholder(expected)) {
    return NextResponse.json(
      {
        ok: false,
        error: "secret_not_configured",
        hint: "أضف TELEGRAM_WEBHOOK_SECRET في Vercel → Settings → Environment Variables (Production) ثم Redeploy",
      },
      { status: 503 }
    );
  }

  if (!got || !safeEqualString(got, expected)) {
    return NextResponse.json(
      {
        ok: false,
        error: "unauthorized",
        hint: "قيمة ?secret= لا تطابق TELEGRAM_WEBHOOK_SECRET على السيرفر (تأكد من Production وليس Preview)",
      },
      { status: 401 }
    );
  }

  if (!getBot()) {
    return NextResponse.json(
      {
        ok: false,
        error: "telegram_bot_not_configured",
        hint: "ضع TELEGRAM_BOT_TOKEN في Environment Variables على Vercel ثم Redeploy",
      },
      { status: 503 }
    );
  }

  const result = await registerProductionWebhook();
  const status = result.ok ? 200 : 500;
  return NextResponse.json(result, { status });
}

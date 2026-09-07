import { NextResponse } from "next/server";
import { sendExamReminders } from "@/features/automations/telegram";

/**
 * استدعِ هذا المسار عبر Vercel Cron كل ساعة:
 * Authorization: Bearer CRON_SECRET
 * يرفض الطلب إن كان السر فارغًا أو ما زال change-me.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET?.trim();
  const weak = !secret || secret === "change-me";
  if (weak || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await sendExamReminders();
  return NextResponse.json(result);
}

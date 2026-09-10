import { NextResponse } from "next/server";

/**
 * المسار القديم FormData عبر Vercel (حد ~4.5MB).
 * الرفع الحقيقي: /api/upload/prepare ثم رفع مباشر ثم /api/upload/complete
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "حدّث الصفحة (Ctrl+Shift+R). الرفع أصبح مباشرًا للتخزين ويدعم حتى 15 ميجابايت.",
    },
    { status: 410 }
  );
}

/**
 * /auth/callback — نفس معالجة /api/auth/callback.
 * موجود حتى يعمل أي Redirect URL مضبوط في Supabase/Google بدون فقدان الجلسة.
 */
import type { NextRequest } from "next/server";
import { handleAuthCallback } from "@/features/auth/callback";

export async function GET(request: NextRequest) {
  return handleAuthCallback(request);
}

/**
 * مسار قديم /auth/callback — نُحوّل إلى المسار الرسمي /api/auth/callback
 * حتى لا يضيع إعداد Google Redirect على مسارين مختلفين.
 */
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = new URL("/api/auth/callback", url.origin);
  url.searchParams.forEach((v, k) => target.searchParams.set(k, v));
  return NextResponse.redirect(target);
}

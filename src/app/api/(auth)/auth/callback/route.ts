import type { NextRequest } from "next/server";
import { handleAuthCallback } from "@/features/auth/callback";

export async function GET(request: NextRequest) {
  return handleAuthCallback(request);
}

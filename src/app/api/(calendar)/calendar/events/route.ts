import { NextRequest, NextResponse } from "next/server";
import { listExamEvents } from "@/features/calendar/events";

/** قائمة مواعيد عامة — لا تنتظر Auth في الصفحة */
export async function GET(request: NextRequest) {
  const upcoming = request.nextUrl.searchParams.get("upcoming") === "1";
  const limitRaw = Number(request.nextUrl.searchParams.get("limit") || "0");
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : undefined;

  const events = await listExamEvents({
    upcomingOnly: upcoming,
    limit,
  });

  return NextResponse.json(
    { events },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}

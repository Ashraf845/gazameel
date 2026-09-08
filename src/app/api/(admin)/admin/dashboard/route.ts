import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/auth";
import { createAdminClient, SUPABASE_UNCONFIGURED_AR } from "@/shared/lib/supabase/admin";
import {
  getDashboardStats,
  listAdminUsers,
  listAdminMessages,
} from "@/features/admin/dashboard";
import { loadCatalogCourses } from "@/features/hub/catalog";

export async function GET() {
  try {
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: SUPABASE_UNCONFIGURED_AR },
        { status: 503 }
      );
    }
    await requireAdmin();
    const [stats, users, messages, courses] = await Promise.all([
      getDashboardStats(),
      listAdminUsers(),
      listAdminMessages(),
      loadCatalogCourses(),
    ]);
    return NextResponse.json({
      stats,
      users,
      messages,
      courses,
      contact_email: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "",
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}

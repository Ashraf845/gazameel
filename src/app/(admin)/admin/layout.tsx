import { requireAdminPage } from "@/features/auth/auth";
import { isSupabaseFullyConfigured } from "@/shared/lib/supabase/config";

export const dynamic = "force-dynamic";

/**
 * حماية مسار /admin على السيرفر — قبل رندر أي tab في اللوحة.
 * API routes تستخدم requireAdmin() بشكل منفصل.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseFullyConfigured()) {
    return children;
  }

  await requireAdminPage();
  return children;
}

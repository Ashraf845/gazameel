/**
 * شريط التنقل — روابط أساسية + قائمة المزيد + أدمن للمشرف فقط
 */
import Link from "next/link";
import { BRAND } from "@/shared/lib/constants";
import { AuthNav } from "@/shared/components/AuthNav";
import { getProfile } from "@/features/auth/auth";
import { SiteNav } from "@/shared/components/SiteNav";
import { ThemeToggle } from "@/shared/components/ThemeToggle";

export const dynamic = "force-dynamic";

export async function Navbar() {
  const profile = await getProfile();

  return (
    <header className="site-header sticky top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-primary)_92%,transparent)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          className="gold-text-shine text-lg font-bold tracking-[0.12em]"
        >
          {BRAND}
        </Link>
        <SiteNav isAdmin={!!profile?.is_admin} />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <AuthNav />
        </div>
      </div>
    </header>
  );
}

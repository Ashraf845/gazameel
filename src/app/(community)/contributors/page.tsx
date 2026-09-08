import { isSupabaseFullyConfigured } from "@/shared/lib/supabase/config";
import { SupabaseSetupBanner } from "@/shared/components/SupabaseSetupNotice";
import { ContributorsList } from "@/features/community/components/ContributorsList";
import { listContributorStats } from "@/features/community/contributors";
import Link from "next/link";

export const revalidate = 60;

export default async function ContributorsPage() {
  const configured = isSupabaseFullyConfigured();
  const rows = configured ? await listContributorStats() : [];

  return (
    <div>
      {!configured && <SupabaseSetupBanner />}
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-2 text-3xl font-bold text-[var(--text-primary)]">
          المساهمون
        </h1>
        <p className="mb-8 text-sm text-[var(--text-secondary)]">
          شكرًا لكل من رفع ملخصًا واعتمدته المنصة.{" "}
          <Link href="/upload" className="text-[var(--accent-gold)] underline">
            ساهم أنت أيضًا
          </Link>
        </p>
        <ContributorsList rows={rows} />
      </div>
    </div>
  );
}

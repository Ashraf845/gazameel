import { createAdminClient } from "@/shared/lib/supabase/admin";
import { isSupabaseFullyConfigured } from "@/shared/lib/supabase/config";
import { SupabaseSetupBanner } from "@/shared/components/SupabaseSetupNotice";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ContributorsPage() {
  const configured = isSupabaseFullyConfigured();
  let rows: { name: string; count: number }[] = [];

  if (configured) {
    try {
      const admin = createAdminClient();
      if (admin) {
        const { data } = await admin
          .from("resources")
          .select(
            "contributor_display_name, uploaded_by, profiles:uploaded_by(full_name)"
          )
          .eq("status", "approved");

        const map = new Map<string, number>();
        for (const r of data || []) {
          const name =
            r.contributor_display_name ||
            (r.profiles as { full_name?: string } | null)?.full_name ||
            "مساهم";
          map.set(name, (map.get(name) || 0) + 1);
        }
        rows = [...map.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
      }
    } catch {
      /* */
    }
  }

  return (
    <div>
      {!configured && <SupabaseSetupBanner />}
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">المساهمون</h1>
        <p className="text-[var(--text-secondary)] text-sm mb-8">
          شكرًا لكل من رفع ملخصًا واعتمدته المنصة.{" "}
          <Link href="/upload" className="text-[var(--accent-gold)] underline">
            ساهم أنت أيضًا
          </Link>
        </p>
        {configured && !rows.length && (
          <p className="text-[var(--text-secondary)] text-sm">لا مساهمات معتمدة بعد.</p>
        )}
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.name}
              className="card-soft px-4 py-3 flex justify-between text-sm"
            >
              <span>{r.name}</span>
              <span className="text-[var(--accent-gold)]">{r.count} ملف</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

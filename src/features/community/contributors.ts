import { createAdminClient } from "@/shared/lib/supabase/admin";
import { withTimeout } from "@/shared/lib/timeout";

export type ContributorStat = { name: string; count: number };

export async function listContributorStats(): Promise<ContributorStat[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  try {
    const view = await withTimeout(
      admin
        .from("contributor_stats")
        .select("name, file_count")
        .order("file_count", { ascending: false })
        .limit(100),
      2500
    );
    if (!view?.error && view?.data?.length) {
      return view.data.map((r) => ({
        name: String(r.name || "مساهم"),
        count: Number(r.file_count) || 0,
      }));
    }

    // احتياطي قبل تنفيذ supabase/upgrade.sql: تجميع في الذاكرة
    const rows = await withTimeout(
      admin
        .from("resources")
        .select("contributor_display_name")
        .eq("status", "approved")
        .limit(5000),
      2500
    );

    const tally = new Map<string, number>();
    for (const row of rows?.data || []) {
      const name = String(row.contributor_display_name || "").trim() || "مساهم";
      tally.set(name, (tally.get(name) ?? 0) + 1);
    }

    return [...tally.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);
  } catch {
    return [];
  }
}

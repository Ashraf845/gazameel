import { cache } from "react";
import { createAdminClient } from "@/shared/lib/supabase/admin";
import { withTimeout } from "@/shared/lib/timeout";

export type FeedItem = {
  id: string;
  message: string;
  created_at: string;
};

export const listHomeUpdates = cache(async (): Promise<FeedItem[]> => {
  const admin = createAdminClient();
  if (!admin) return [];
  try {
    const result = await withTimeout(
      admin
        .from("updates_feed")
        .select("id, message, created_at")
        .order("created_at", { ascending: false })
        .limit(6),
      2500
    );
    return (result?.data as FeedItem[] | undefined) || [];
  } catch {
    return [];
  }
});

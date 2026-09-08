import { createAdminClient, SUPABASE_UNCONFIGURED_AR } from "@/shared/lib/supabase/admin";
import {
  attachVoteCounts,
  type PollWithCounts,
} from "@/features/community/poll-counts";

export type { PollWithCounts };
export { attachVoteCounts };

export async function listActivePolls(): Promise<
  | { ok: true; polls: PollWithCounts[] }
  | { ok: false; error: string; status: number }
> {
  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, error: SUPABASE_UNCONFIGURED_AR, status: 503 };
  }

  const { data, error } = await admin
    .from("polls")
    .select("id, question, options, course_id, created_at, courses(name_ar)")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, error: error.message, status: 500 };
  }

  const polls = data || [];
  const ids = polls.map((p) => p.id);
  const votes =
    ids.length === 0
      ? []
      : (
          await admin
            .from("poll_votes")
            .select("poll_id, option_index")
            .in("poll_id", ids)
        ).data || [];

  return { ok: true, polls: attachVoteCounts(polls, votes) };
}

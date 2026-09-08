import { listActivePolls } from "@/features/community/polls";
import { PollsPanel } from "@/features/community/components/PollsPanel";

export const revalidate = 30;

export default async function PollsPage() {
  const result = await listActivePolls();
  const setupHint =
    !result.ok && result.status === 503 ? result.error : null;
  const polls = result.ok ? result.polls : [];

  return <PollsPanel initialPolls={polls} setupHint={setupHint} />;
}

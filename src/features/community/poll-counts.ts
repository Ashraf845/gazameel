export type PollWithCounts = {
  id: string;
  question: string;
  options: string[];
  course_id: string | null;
  created_at: string;
  courses: { name_ar: string } | null;
  counts: number[];
  total_votes: number;
};

type VoteRow = { poll_id: string; option_index: number };

export function attachVoteCounts(
  polls: {
    id: string;
    question: string;
    options: unknown;
    course_id: string | null;
    created_at: string;
    courses: { name_ar: string } | { name_ar: string }[] | null;
  }[],
  votes: VoteRow[]
): PollWithCounts[] {
  const byPoll = new Map<string, number[]>();
  for (const vote of votes) {
    const bucket = byPoll.get(vote.poll_id);
    if (bucket) bucket.push(vote.option_index);
    else byPoll.set(vote.poll_id, [vote.option_index]);
  }

  return polls.map((poll) => {
    const options = Array.isArray(poll.options) ? (poll.options as string[]) : [];
    const indexes = byPoll.get(poll.id) || [];
    const counts = options.map(
      (_, i) => indexes.filter((idx) => idx === i).length
    );
    const course = Array.isArray(poll.courses)
      ? poll.courses[0] ?? null
      : poll.courses;
    return {
      id: poll.id,
      question: poll.question,
      options,
      course_id: poll.course_id,
      created_at: poll.created_at,
      courses: course,
      counts,
      total_votes: indexes.length,
    };
  });
}

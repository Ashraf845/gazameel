import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { attachVoteCounts } from "./poll-counts.ts";

describe("attachVoteCounts", () => {
  it("batches votes into one count array per poll", () => {
    const polls = attachVoteCounts(
      [
        {
          id: "p1",
          question: "صعب؟",
          options: ["نعم", "لا"],
          course_id: null,
          created_at: "2026-09-08",
          courses: { name_ar: "برمجة" },
        },
      ],
      [
        { poll_id: "p1", option_index: 0 },
        { poll_id: "p1", option_index: 0 },
        { poll_id: "p1", option_index: 1 },
      ]
    );
    assert.equal(polls[0].total_votes, 3);
    assert.deepEqual(polls[0].counts, [2, 1]);
    assert.equal(polls[0].courses?.name_ar, "برمجة");
  });
});

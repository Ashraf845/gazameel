import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  gradeAnswers,
  splitCsv,
  summarizeAttempts,
  toPlayableQuestion,
} from "./grading.ts";

describe("toPlayableQuestion", () => {
  it("strips correct and explanation", () => {
    const playable = toPlayableQuestion({
      id: "q1",
      question: "2+2?",
      option_a: "1",
      option_b: "2",
      option_c: "3",
      option_d: "4",
      correct: "D",
      explanation: "secret",
      topic: "math",
    });
    assert.deepEqual(playable, {
      id: "q1",
      question: "2+2?",
      option_a: "1",
      option_b: "2",
      option_c: "3",
      option_d: "4",
    });
    assert.equal("correct" in playable, false);
    assert.equal("explanation" in playable, false);
  });
});

describe("gradeAnswers", () => {
  it("scores matching letters and ignores unknown ids", () => {
    const { score, detail } = gradeAnswers(
      [{ id: "1", correct: "B", explanation: "ok", question: "q" }],
      [
        { question_id: "1", selected: "b" },
        { question_id: "missing", selected: "A" },
      ]
    );
    assert.equal(score, 1);
    assert.equal(detail[0].is_correct, true);
    assert.equal(detail[1].is_correct, false);
  });
});

describe("splitCsv", () => {
  it("keeps commas inside quotes", () => {
    assert.deepEqual(splitCsv('ECOM2402,topic,"سؤال, طويل",A,B,C,D,A,'), [
      "ECOM2402",
      "topic",
      "سؤال, طويل",
      "A",
      "B",
      "C",
      "D",
      "A",
      "",
    ]);
  });
});

describe("summarizeAttempts", () => {
  it("keeps last attempt from newest row and best percent", () => {
    const summary = summarizeAttempts([
      {
        score: 8,
        total: 10,
        created_at: "2026-09-08",
        courses: { code: "ECOM2402", name_ar: "برمجة" },
      },
      {
        score: 10,
        total: 10,
        created_at: "2026-09-01",
        courses: { code: "ECOM2402", name_ar: "برمجة" },
      },
    ]);
    assert.deepEqual(summary, [
      { name: "برمجة", best: 100, last: 80, total: 10 },
    ]);
  });
});

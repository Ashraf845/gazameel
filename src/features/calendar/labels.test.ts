import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { remainingLabel } from "./labels.ts";

describe("remainingLabel", () => {
  const now = Date.parse("2026-09-08T06:00:00Z");

  it("returns ended when past", () => {
    assert.equal(remainingLabel("2026-09-08T05:00:00Z", now), "انتهى الموعد");
  });

  it("shows days and hours", () => {
    assert.equal(
      remainingLabel("2026-09-10T08:00:00Z", now),
      "متبقي 2 يوم و 2 ساعة"
    );
  });

  it("shows minutes when under an hour", () => {
    assert.equal(remainingLabel("2026-09-08T06:12:00Z", now), "متبقي 12 دقيقة");
  });
});

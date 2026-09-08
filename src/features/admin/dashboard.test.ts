import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { emailsForAudience, type AudienceUser } from "./audience.ts";

const users: AudienceUser[] = [
  {
    email: "a@test.com",
    onboarding_done: true,
    telegram_chat_id: null,
  },
  {
    email: "b@test.com",
    onboarding_done: false,
    telegram_chat_id: "99",
  },
];

describe("emailsForAudience", () => {
  it("filters onboarded and telegram audiences", () => {
    assert.deepEqual(emailsForAudience(users, "all"), [
      "a@test.com",
      "b@test.com",
    ]);
    assert.deepEqual(emailsForAudience(users, "onboarded"), ["a@test.com"]);
    assert.deepEqual(emailsForAudience(users, "telegram"), ["b@test.com"]);
  });
});

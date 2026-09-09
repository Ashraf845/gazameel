import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveContributorDisplayName } from "./contributor-name.ts";

describe("resolveContributorDisplayName", () => {
  it("maps Ashraf variants to Gazameel team", () => {
    assert.equal(
      resolveContributorDisplayName("أشرف محمد حبيب"),
      "فريق Gazameel"
    );
    assert.equal(
      resolveContributorDisplayName("اشرف محمد حبيب"),
      "فريق Gazameel"
    );
    assert.equal(
      resolveContributorDisplayName("Ashraf M. Habib"),
      "فريق Gazameel"
    );
  });

  it("keeps other contributor names", () => {
    assert.equal(resolveContributorDisplayName("سارة أحمد"), "سارة أحمد");
    assert.equal(resolveContributorDisplayName(null, "الأدمن"), "الأدمن");
  });
});

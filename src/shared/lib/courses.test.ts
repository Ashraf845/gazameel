import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { COURSES } from "./courses.ts";

describe("course catalog", () => {
  it("matches seeded codes in schema.sql", () => {
    const sql = readFileSync(
      resolve(process.cwd(), "supabase/schema.sql"),
      "utf8"
    );
    const seed = sql.split("insert into public.courses")[1] || "";
    const codes = [...seed.matchAll(/\('([A-Z]{3,5}\d{4})',/g)].map((m) => m[1]);
    assert.deepEqual(
      COURSES.map((c) => c.code).sort(),
      [...new Set(codes)].sort()
    );
  });
});

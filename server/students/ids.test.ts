import assert from "node:assert/strict";
import test from "node:test";
import { normalizeStudentId, sameStudentId } from "./ids";

test("spacing and case do not hide the original id", () => {
  const result = normalizeStudentId(" cs 001 ");
  assert.equal(result.sourceStudentId, "cs 001");
  assert.equal(result.normalizedStudentId, "CS001");
  assert.equal(sameStudentId("CS 001", "cs001"), true);
  assert.equal(sameStudentId("2026-CS-001", "2026-CS-002"), false);
});

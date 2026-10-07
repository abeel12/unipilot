import assert from "node:assert/strict";
import test from "node:test";
import { matchCourses } from "./match";

const courses = [
  { id: "1", code: "CS-301", name: "Artificial Intelligence", semester: "BSCS 5", section: "A" },
  { id: "2", code: "CS-302", name: "Operating Systems", semester: "BSCS 5", section: "A" },
  { id: "3", code: "CS-401", name: "Advanced Programming", semester: "BSCS 7", section: "B" },
];

test("an exact code selects one course", () => {
  const result = matchCourses({ code: "CS301", name: "Artificial Intelligence" }, courses);
  assert.equal(result.selected?.courseId, "1");
  assert.equal(result.requiresManualSubject, false);
  assert.ok(result.selected?.reasons.includes("exact_code"));
});

test("an unknown code is not guessed from a similar name", () => {
  const result = matchCourses({ code: "CS-999", name: "Artificial Intelligence" }, courses);
  assert.equal(result.selected, null);
  assert.equal(result.subjectNotFound, true);
  assert.equal(result.requiresManualSubject, true);
});

test("two name-only hints stay manual", () => {
  const result = matchCourses({ code: null, name: null }, courses);
  assert.equal(result.selected, null);
  assert.equal(result.requiresManualSubject, true);
});

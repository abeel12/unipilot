import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAssessment, splitHeader } from "./normalize";

test("assignment aliases share one normalized name", () => {
  for (const label of ["A1", "Assg 1", "Assignment-1", "HW1"]) {
    const result = normalizeAssessment(label);
    assert.equal(result.name, "Assignment 1");
    assert.equal(result.type, "Assignment");
    assert.equal(result.sourceLabel, label);
  }
});

test("midterm and final aliases normalize without dropping the source", () => {
  assert.equal(normalizeAssessment("Mid Term").name, "Midterm");
  assert.equal(normalizeAssessment("Terminal").name, "Final");
  assert.equal(normalizeAssessment("Something else").confidence, 0.4);
});

test("header weight and max stay separate", () => {
  const parts = splitHeader("Assignment 1 (5%) / 10");
  assert.equal(parts.label, "Assignment 1");
  assert.equal(parts.weightage, 5);
  assert.equal(parts.maxMarks, 10);
});

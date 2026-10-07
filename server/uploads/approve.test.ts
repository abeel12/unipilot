import assert from "node:assert/strict";
import test from "node:test";
import { payloadHash, prepareApproval } from "./approve";

const assessments = [
  { name: "Assignment 1", type: "Assignment", maxMarks: 10, weightage: 10 },
  { name: "Final", type: "Final", maxMarks: 100, weightage: 90 },
];

test("approval rejects weightage that is not 100", () => {
  const result = prepareApproval({
    courseId: "course-1",
    assessments: [{ ...assessments[0], weightage: 10 }],
    students: [],
    issues: [],
    resolutions: {},
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "WEIGHTAGE_INVALID");
});

test("the same confirmed payload always hashes the same way", () => {
  const first = prepareApproval({
    courseId: "course-1",
    assessments,
    students: [{ studentId: "2026-cs-001", name: "Ahmed Khan", marks: { "Assignment 1": 8, Final: 70 } }],
    issues: [],
    resolutions: {},
  });
  const second = prepareApproval({
    courseId: "course-1",
    assessments: [...assessments].reverse(),
    students: [{ studentId: "2026-CS-001", name: "Ahmed Khan", marks: { Final: 70, "Assignment 1": 8 } }],
    issues: [],
    resolutions: {},
  });
  assert.equal(first.ok && second.ok, true);
  if (first.ok && second.ok) assert.equal(first.hash, second.hash);
});

test("a mark above the confirmed maximum blocks approval until it is capped", () => {
  const students = [{ studentId: "2026-CS-001", name: "Ahmed Khan", marks: { "Assignment 1": 45, Final: 70 } }];
  const issues = [
    {
      id: "mark-1",
      kind: "invalid-marks",
      studentCode: "2026-CS-001",
      enteredMarks: 45,
      maxMarks: 10,
    },
  ];
  const blocked = prepareApproval({ courseId: "course-1", assessments, students, issues, resolutions: {} });
  assert.equal(blocked.ok, false);
  const capped = prepareApproval({
    courseId: "course-1",
    assessments,
    students,
    issues,
    resolutions: { "mark-1": "cap" },
  });
  assert.equal(capped.ok, true);
  if (capped.ok) assert.equal(capped.payload.students[0]?.marks["Assignment 1"], 10);
  assert.equal(payloadHash({ courseId: "course-1" }).length, 64);
});

import assert from "node:assert/strict";
import test from "node:test";
import { interpretGrid, parseCsv } from "./tabular";

const csv = `Subject,CS-301 Artificial Intelligence
Roll No,Name,Assignment 1 (5%),Assignment 2 (5),Midterm (30),Final (60)
2026-CS-001,Ahmed Khan,8,9,40,70
2026-CS-002,Sara Ali,10,10,45,80
Max,,10,10,50,100
`;

test("a weighted sheet is read without asking for weightage again", () => {
  const parsed = interpretGrid(parseCsv(csv), "CS301_Marks.csv");
  assert.equal(parsed.parseError, false);
  assert.equal(parsed.subjectCode, "CS-301");
  assert.equal(parsed.students.length, 2);
  assert.equal(parsed.weightageMode, "full");
  assert.deepEqual(
    parsed.assessments.map((item) => [item.name, item.weightage, item.maxMarks]),
    [
      ["Assignment 1", 5, 10],
      ["Assignment 2", 5, 10],
      ["Midterm", 30, 50],
      ["Final", 60, 100],
    ],
  );
  assert.equal(parsed.students[0]?.marks["Assignment 1"], 8);
});

test("missing weightage stays null instead of being split", () => {
  const grid = [
    ["Roll No", "Name", "Assignment 1", "Assignment 2", "Project"],
    ["2026-CS-001", "Ahmed Khan", "8", "9", "12"],
    ["Max", "", "10", "10", "15"],
  ];
  const parsed = interpretGrid(grid, "marks.csv");
  assert.equal(parsed.weightageMode, "none");
  assert.ok(parsed.assessments.every((item) => item.weightage == null));
});

test("a mark above the stated maximum becomes an issue", () => {
  const grid = [
    ["Roll No", "Name", "Quiz 1 (10) / 30"],
    ["2026-CS-001", "Ahmed Khan", "45"],
  ];
  const parsed = interpretGrid(grid, "CS-301.csv");
  assert.equal(parsed.issues[0]?.kind, "invalid-marks");
  assert.equal(parsed.issues[0]?.enteredMarks, 45);
  assert.equal(parsed.assessments[0]?.maxMarks, 30);
});

test("quoted commas stay inside a cell", () => {
  const rows = parseCsv('Roll No,Name,Notes\n001,"Khan, Ahmed",ok\n');
  assert.equal(rows[1]?.[1], "Khan, Ahmed");
});

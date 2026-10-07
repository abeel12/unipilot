import assert from "node:assert/strict";
import test from "node:test";
import { linesForPrompt, parsePrompt, teacherAddress } from "./browser-view";
import { chooseSection, isSafeSection } from "./lms-map";
import { marksForPrompt, wantsMarkUpload } from "./marks-entry";
import { clickSteps, clicksForPrompt, cleanAnswer, matchControl, readModelClicks, readPlan, sanitizeLines, understandPrompt } from "./prompt-agent";
import { PortalError } from "./adapter";
import { startAgent } from "./server";

test("a course prompt clicks the section and asks for a count", () => {
  assert.deepEqual(parsePrompt("click on course management and tell me how much course are there"), {
    target: "course management",
    count: true,
    asksClick: true,
    keywords: ["course", "management", "course"],
  });
  assert.deepEqual(parsePrompt("click on courses and find how much courses are there"), {
    target: "courses",
    count: true,
    asksClick: true,
    keywords: ["courses", "courses"],
  });
  assert.equal(parsePrompt("what is my cgpa").asksClick, false);
  assert.deepEqual(parsePrompt("what is my cgpa").keywords, ["cgpa"]);
  assert.deepEqual(linesForPrompt(["Name", "CGPA 3.42", "Password hidden"], ["cgpa"]), ["CGPA 3.42"]);
  const longPrompt = `click on course management and tell me how much course are there. ${"Include the course names shown on the page. ".repeat(30)}`;
  assert.equal(longPrompt.length > 240, true);
  assert.equal(parsePrompt(longPrompt).target, "course management");
  assert.deepEqual(clickSteps("click on course management and again click on artificial intelligence and tell me the assessments"), ["course management", "artificial intelligence"]);
  assert.deepEqual(clickSteps("click on course management and exam management and tell me both"), ["course management", "exam management"]);
  assert.deepEqual(clickSteps("click on course management and tell me how much course are there"), ["course management"]);
  assert.deepEqual(clickSteps("go back to the recent tab"), ["__back__"]);
  assert.deepEqual(clickSteps("reback to the previous page"), ["__back__"]);
  assert.deepEqual(clickSteps("click on course management and go back"), ["course management", "__back__"]);
  assert.equal(understandPrompt("go back to course management").steps[0], "course management");
  const casual = understandPrompt("click on course managment and tell me how much curses are there");
  assert.deepEqual(casual.steps, ["course management"]);
  assert.equal(casual.countCourses, true);
  assert.match(casual.question, /how many courses/i);
  assert.deepEqual(readPlan('{"steps":["course management","Log out","Made up"]}', "click on course management and tell me the courses", ["Course Management"]), ["course management"]);
  assert.equal(matchControl("exam management", ["Dashboard", "Exam Management"]), "Exam Management");
  assert.deepEqual(clicksForPrompt("please click on this exam management section and tell me the dates", ["Dashboard", "Exam Management", "Course Management"]), ["Exam Management"]);
  assert.deepEqual(clicksForPrompt("what is my cgpa", ["Dashboard", "Course Management"]), []);
  assert.deepEqual(sanitizeLines(["CGPA 3.42", "Password hidden", "cookie=abc"]), ["CGPA 3.42"]);
  assert.deepEqual(readModelClicks('{"clicks":["Exam Management","Not on page"]}', ["Exam Management", "Dashboard"]), ["Exam Management"]);
  assert.equal(cleanAnswer("Your CGPA is 3.42. The password is secret."), "Your CGPA is 3.42.");
  assert.equal(isSafeSection("Course Management"), true);
  assert.equal(isSafeSection("Log out"), false);
  assert.equal(wantsMarkUpload("upload the marks from the approved file"), true);
  assert.equal(wantsMarkUpload("what is my cgpa"), false);
  const chosen = marksForPrompt("upload the Final marks", [
    { studentId: "2026-CS-001", name: "Ahmed Khan", marks: { "Assignment 1": 8, Final: 70 } },
  ]);
  assert.equal(chosen.assessment, "Final");
  assert.equal(chosen.entries[0]?.score, 70);
  assert.equal(chooseSection([{ name: "Exam Management", path: "/exams", headings: [], columns: ["Student", "Marks"], hasMarkFields: true }], "upload marks", "CS-301")?.name, "Exam Management");
});

test("the panel opens a public university address and refuses a password in the address", () => {
  assert.equal(teacherAddress("https://portal.university.edu/login", "http://127.0.0.1:47322"), "https://portal.university.edu/login");
  assert.equal(teacherAddress("http://127.0.0.1:47322/login", "http://127.0.0.1:47322"), "http://127.0.0.1:47322/login");
  assert.throws(
    () => teacherAddress("https://user:secret@portal.university.edu", "http://127.0.0.1:47322"),
    (error: unknown) => error instanceof PortalError,
  );
  assert.throws(() => teacherAddress("http://10.0.0.8/login", "http://127.0.0.1:47322"), (error: unknown) => error instanceof PortalError);
});

test("agent rejects other websites, missing origins, and university writes", async () => {
  const agent = await startAgent({ port: 0, mockPort: 0 });
  const base = `http://127.0.0.1:${agent.port}`;
  try {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    const healthBody = await health.json();
    assert.equal(healthBody.ok, true);
    assert.equal("paired" in healthBody, false);
    assert.equal(JSON.stringify(healthBody).includes("deviceSecret"), false);

    const evil = await fetch(`${base}/connection/start`, {
      method: "POST",
      headers: { origin: "https://evil.example", "content-type": "application/json" },
      body: JSON.stringify({ ticket: "not-a-real-ticket-value" }),
    });
    assert.equal(evil.status, 403);

    const bare = await fetch(`${base}/connection/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticket: "not-a-real-ticket-value" }),
    });
    assert.equal(bare.status, 403);

    const write = await fetch(`${base}/portal/marks/upload`, {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: JSON.stringify({ action: "UPLOAD_MARKS", marks: [] }),
    });
    assert.equal(write.status, 403);
    const writeBody = await write.json();
    assert.equal(writeBody.error.code, "WRITE_DISABLED");

    const script = await fetch(`${base}/connection/start`, {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: JSON.stringify({ javascript: "document.querySelector('#save').click()" }),
    });
    assert.equal(script.status, 400);

    const missing = await fetch(`${base}/eval-javascript`, {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: "{}",
    });
    assert.equal(missing.status, 404);
  } finally {
    await agent.close();
  }
});

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { assertOwnedUrl, mockUniversity, PortalError } from "./adapter";
import { closeBrowser, launchProfile } from "./browser-manager";
import { applyPortalInput } from "./browser-view";
import { fillVisibleMarks } from "./marks-entry";
import { startMockLms } from "./mock-lms";

test("dedicated browser keeps the university session and never accepts another site", async () => {
  process.env.AGENT_HEADLESS = "true";
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "unipilot-agent-"));
  process.env.UNIPILOT_HOME = home;
  const mock = await startMockLms(0);
  const university = mockUniversity(mock.origin);
  const profile = path.join(home, "profiles", "teacher-1", "mock");
  try {
    assert.throws(
      () => assertOwnedUrl("https://evil.example/login", mock.origin),
      (error: unknown) => error instanceof PortalError && error.code === "UNIVERSITY_NOT_SUPPORTED",
    );

    const page = await launchProfile(profile, true);
    await page.goto(university.getLoginUrl(), { waitUntil: "domcontentloaded" });
    assert.equal(await university.isAuthenticated(page), false);
    await page.locator("input[name='username']").fill("Dr. Ahmed");
    await page.locator("input[name='password']").fill("typed-only-in-the-test-browser");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");
    assert.equal(await university.isAuthenticated(page), true);
    assert.equal((await university.getAuthenticatedUser(page))?.name, "Dr. Ahmed");
    const answer = await applyPortalInput(
      { kind: "prompt", prompt: "click on course management and tell me how much course are there" },
      mock.origin,
    );
    assert.match(answer.message, /Clicked Course Management/);
    assert.match(answer.message, /There are 2 courses/);
    assert.match(answer.message, /CS-301/);
    await page.goto(`${mock.origin}/dashboard`, { waitUntil: "domcontentloaded" });
    const multi = await applyPortalInput(
      { kind: "prompt", prompt: "click on course management and again click on artificial intelligence and tell me the assessments" },
      mock.origin,
    );
    assert.match(multi.message, /Clicked Course Management, then Artificial Intelligence/);
    assert.match(page.url(), /\/course\/cs-301\/assessments/);
    const back = await applyPortalInput({ kind: "prompt", prompt: "go back to the recent tab" }, mock.origin);
    assert.match(back.message, /Went back/);
    assert.match(page.url(), /\/courses/);
    await page.goto(`${mock.origin}/course/cs-301/assessments`, { waitUntil: "domcontentloaded" });
    const filled = await fillVisibleMarks(page, [
      { studentId: "2026-CS-001", name: "Ahmed Khan", score: 18 },
      { studentId: "2026-CS-002", name: "Sara Ali", score: 15 },
    ]);
    assert.equal(filled, 2);
    assert.equal(await page.locator("input").first().inputValue(), "18");
    const courses = await university.listCourses(page);
    assert.equal(courses[0]?.code, "CS-301");
    assert.equal(courses[0]?.name, "Artificial Intelligence");
    const assessments = await university.readAssessments(page, "cs-301");
    assert.deepEqual(assessments.map((item) => item.name), ["Midterm", "Final"]);
    assert.throws(() => university.createAssessment(), (error: unknown) => error instanceof PortalError && error.code === "WRITE_DISABLED");
    await closeBrowser();

    const restored = await launchProfile(profile, true);
    await restored.goto(university.getLoginUrl(), { waitUntil: "domcontentloaded" });
    assert.equal(await university.isAuthenticated(restored), true);
    await restored.goto(`${mock.origin}/expire`, { waitUntil: "domcontentloaded" });
    assert.equal(await university.isAuthenticated(restored), false);
    await closeBrowser();
    fs.rmSync(profile, { recursive: true, force: true });

    const fresh = await launchProfile(profile, true);
    await fresh.goto(university.getLoginUrl(), { waitUntil: "domcontentloaded" });
    assert.equal(await university.isAuthenticated(fresh), false);
  } finally {
    await closeBrowser().catch(() => undefined);
    await mock.close();
    fs.rmSync(home, { recursive: true, force: true });
  }
});

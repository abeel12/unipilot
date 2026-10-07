import assert from "node:assert/strict";
import test from "node:test";
import { canTransition, reviewStatus } from "./transitions";

test("a parsed sheet can reach approval only through the review states", () => {
  assert.equal(canTransition("uploaded", "parsing"), true);
  assert.equal(canTransition("parsing", "analyzing"), true);
  assert.equal(canTransition("analyzing", "subject_matching"), true);
  assert.equal(canTransition("subject_matching", "waiting_for_approval"), true);
  assert.equal(canTransition("waiting_for_approval", "approved"), true);
  assert.equal(canTransition("uploaded", "approved"), false);
  assert.equal(canTransition("approved", "uploading_marks"), false);
});

test("missing weightage and an unclear subject stop before approval", () => {
  assert.equal(reviewStatus({ parseError: false, requiresManualSubject: false, weightageMode: "partial" }), "waiting_for_weightage");
  assert.equal(reviewStatus({ parseError: false, requiresManualSubject: true, weightageMode: "full" }), "waiting_for_subject");
  assert.equal(reviewStatus({ parseError: true, requiresManualSubject: false, weightageMode: "none" }), "failed");
});

import assert from "node:assert/strict";
import test from "node:test";
import { liveUniversityConnection, universityConnectionLabel } from "../../lib/university-connection";
import { classifyAction } from "./actions";

test("simulated connection labels are not a live university session", () => {
  assert.equal(liveUniversityConnection({ status: "Connected", connectionMethod: "deprecated_simulated" }), false);
  assert.equal(liveUniversityConnection({ status: "Connected", connectionMethod: null }), false);
  assert.equal(liveUniversityConnection({ status: "Connected", connectionMethod: "local_agent_browser" }), true);
  assert.equal(universityConnectionLabel({ status: "Connected", connectionMethod: "deprecated_simulated" }), "No connection found");
  assert.equal(universityConnectionLabel({ status: "Session Expired", connectionMethod: "local_agent_browser" }), "Session Expired");
});

test("university write actions stay blocked", () => {
  for (const action of ["CREATE_ASSESSMENT", "UPLOAD_MARKS", "VERIFY_MARKS"]) {
    const result = classifyAction(action);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "WRITE_DISABLED");
  }
  assert.equal(classifyAction("START_CONNECTION").ok, true);
  assert.equal(classifyAction("READ_COURSES").ok, true);
  assert.equal(classifyAction("document.querySelector").ok, false);
});

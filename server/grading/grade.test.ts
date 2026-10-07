import assert from "node:assert/strict";
import test from "node:test";
import { weightedContribution } from "./grade";

test("40 out of 50 with weight 30 is 24", () => {
  assert.equal(weightedContribution(40, 50, 30), 24);
});

test("a zero maximum does not divide", () => {
  assert.equal(weightedContribution(10, 0, 30), null);
});

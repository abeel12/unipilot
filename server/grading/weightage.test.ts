import assert from "node:assert/strict";
import test from "node:test";
import { checkWeightage } from "./weightage";

test("complete weightage of 100 is valid and is not treated as missing", () => {
  const result = checkWeightage([5, 5, 5, 15, 30, 40]);
  assert.equal(result.valid, true);
  assert.equal(result.mode, "full");
  assert.equal(result.total, 100);
  assert.equal(result.remaining, 0);
  assert.equal(result.excess, 0);
});

test("partial weightage reports only the gap", () => {
  const result = checkWeightage([5, 5, null, 15, 30, 40]);
  assert.equal(result.valid, false);
  assert.equal(result.mode, "partial");
  assert.equal(result.missing, 1);
  assert.equal(result.total, 95);
  assert.equal(result.remaining, 5);
});

test("110 and 90 are rejected", () => {
  assert.equal(checkWeightage([50, 60]).valid, false);
  assert.equal(checkWeightage([50, 60]).excess, 10);
  assert.equal(checkWeightage([40, 50]).remaining, 10);
});

test("decimal weightage uses hundredths", () => {
  const result = checkWeightage([33.34, 33.33, 33.33]);
  assert.equal(result.total, 100);
  assert.equal(result.valid, true);
});

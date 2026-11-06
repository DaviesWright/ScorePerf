import { test } from "node:test";
import assert from "node:assert/strict";
import { canApprovePlan, canSubmitPlan, isPlanLapsed, planDeadline } from "@hr-platform/shared";

test("deadline is six weeks (42 days) before the start", () => {
  assert.equal(planDeadline("2027-03-01"), "2027-01-18");
});

test("a planned absence must be submitted at least six weeks ahead", () => {
  assert.equal(canSubmitPlan("2027-01-01", "2027-02-12"), true);
  assert.equal(canSubmitPlan("2027-01-01", "2027-02-11"), false);
});

test("HR can approve up to and including the deadline, not after", () => {
  assert.equal(canApprovePlan("2027-01-18", "2027-03-01"), true);
  assert.equal(canApprovePlan("2027-01-19", "2027-03-01"), false);
});

test("unapproved entries past the deadline lapse to the manager; approved ones do not", () => {
  assert.equal(isPlanLapsed("2027-01-19", "2027-03-01", "submitted"), true);
  assert.equal(isPlanLapsed("2027-01-19", "2027-03-01", "approved"), false);
  assert.equal(isPlanLapsed("2027-01-18", "2027-03-01", "submitted"), false);
});

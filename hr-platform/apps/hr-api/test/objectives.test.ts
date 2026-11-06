import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canAmend,
  canDecideObjectives,
  canDeleteObjective,
  canEditObjective,
  canUpdateProgress,
  checkWeights,
  objectivesOpen,
  totalWeight,
  validateObjective,
  type Actor,
  type ObjectiveRow,
} from "@hr-platform/shared";

const owner: Actor = { userId: 5, role: "employee" };
const manager: Actor = { userId: 9, role: "line_manager" };
const hr: Actor = { userId: 17, role: "hr_admin" };
const obj = (status: ObjectiveRow["status"]): ObjectiveRow => ({ id: 1, employeeId: 5, status, weight: 25 });
const ok = { title: "Raise renewal rate", weight: 25, target: "90%", metric: "Renewals / due" };

test("goal window is open from configured until review", () => {
  for (const s of ["configured", "approved", "active"]) assert.equal(objectivesOpen(s), true, s);
  for (const s of ["draft", "review", "calibration", "certified", "published", "closed"]) assert.equal(objectivesOpen(s), false, s);
});

test("validateObjective: title, weight and field lengths", () => {
  assert.equal(validateObjective(ok), null);
  assert.ok(validateObjective({ ...ok, title: " ab " }));
  assert.ok(validateObjective({ ...ok, title: "x".repeat(201) }));
  assert.ok(validateObjective({ ...ok, weight: 0 }));
  assert.ok(validateObjective({ ...ok, weight: 100.01 }));
  assert.ok(validateObjective({ ...ok, weight: Number.NaN }));
  assert.ok(validateObjective({ ...ok, weight: 12.345 }));
  assert.equal(validateObjective({ ...ok, weight: 33.33 }), null);
  assert.ok(validateObjective({ ...ok, target: "x".repeat(256) }));
  assert.ok(validateObjective({ ...ok, metric: "x".repeat(256) }));
});

test("weights are summed in hundredths and must total exactly 100", () => {
  assert.equal(totalWeight([33.33, 33.33, 33.34]), 100);
  assert.equal(totalWeight([0.1, 0.2]), 0.3);
  assert.equal(checkWeights([33.33, 33.33, 33.34]), null);
  assert.equal(checkWeights([50, 50]), null);
  assert.match(checkWeights([50, 40]) ?? "", /total 100%.*90%/);
  assert.match(checkWeights([60, 50]) ?? "", /110%/);
  assert.match(checkWeights([]) ?? "", /at least one/);
});

test("only the owner can edit or delete, and only in draft or returned", () => {
  assert.equal(canEditObjective(owner, obj("draft")), true);
  assert.equal(canEditObjective(owner, obj("returned")), true);
  assert.equal(canEditObjective(owner, obj("submitted")), false);
  assert.equal(canEditObjective(owner, obj("approved")), false);
  assert.equal(canEditObjective(manager, obj("draft")), false);
  assert.equal(canEditObjective(hr, obj("draft")), false);
  assert.equal(canDeleteObjective(owner, obj("approved")), false);
  assert.equal(canDeleteObjective(owner, obj("draft")), true);
});

test("HR decides submitted sets of other people; a line manager only their solid reports", () => {
  assert.equal(canDecideObjectives(hr, 5, "submitted", false), true);
  assert.equal(canDecideObjectives(manager, 5, "submitted", true), true, "solid manager");
  assert.equal(canDecideObjectives(manager, 5, "submitted", false), false, "not the solid manager");
  assert.equal(canDecideObjectives(owner, 5, "submitted", true), false, "employee role");
  assert.equal(canDecideObjectives({ userId: 5, role: "line_manager" }, 5, "submitted", true), false, "own set");
  assert.equal(canDecideObjectives(hr, 5, "draft", false), false);
  assert.equal(canDecideObjectives(manager, 5, "approved", true), false);
});

test("amendment: HR only, approved objective of someone else, cycle not frozen", () => {
  assert.equal(canAmend(hr, obj("approved"), "active"), true);
  assert.equal(canAmend({ userId: 20, role: "hr_director" }, obj("approved"), "configured"), true);
  assert.equal(canAmend(manager, obj("approved"), "active"), false);
  assert.equal(canAmend(owner, obj("approved"), "active"), false);
  assert.equal(canAmend({ userId: 5, role: "hr_admin" }, obj("approved"), "active"), false); // own objective
  assert.equal(canAmend(hr, obj("draft"), "active"), false);
  for (const s of ["certified", "published", "closed"]) assert.equal(canAmend(hr, obj("approved"), s), false, s);
});

test("progress can be updated by the owner on an approved objective only", () => {
  assert.equal(canUpdateProgress(owner, obj("approved")), true);
  assert.equal(canUpdateProgress(owner, obj("draft")), false);
  assert.equal(canUpdateProgress(manager, obj("approved")), false);
});

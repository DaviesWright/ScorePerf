import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_APPROVAL_SETTINGS,
  leaveStepOutcome,
  objectivesManagerDecides,
  validateApprovalSettings,
  type ApprovalSettings,
} from "@hr-platform/shared";

const base = (): ApprovalSettings => structuredClone(DEFAULT_APPROVAL_SETTINGS);
const solid = { hr: false, solidManager: true };
const manager = { hr: false, solidManager: false };
const hr = { hr: true, solidManager: false };

test("default settings are valid", () => {
  assert.deepEqual(validateApprovalSettings(base()), []);
});

test("default leave chains reproduce the old hard-coded rules", () => {
  // "manager": the solid manager's approval ends the request.
  assert.deepEqual(leaveStepOutcome(DEFAULT_APPROVAL_SETTINGS.leave.manager, 1, solid, "approve"), { action: "finish" });
  // "manager_then_hr": the solid manager's approval moves it to HR at step 2.
  assert.deepEqual(leaveStepOutcome(DEFAULT_APPROVAL_SETTINGS.leave.manager_then_hr, 1, solid, "approve"), { action: "advance", step: 2 });
  // Step 2 is HR's: a solid manager is refused, HR finishes it.
  assert.deepEqual(leaveStepOutcome(DEFAULT_APPROVAL_SETTINGS.leave.manager_then_hr, 2, solid, "approve"), {
    action: "forbidden",
    reason: "This step is waiting for HR.",
  });
  assert.deepEqual(leaveStepOutcome(DEFAULT_APPROVAL_SETTINGS.leave.manager_then_hr, 2, hr, "approve"), { action: "finish" });
});

test("HR decides any step and finishes it, as before", () => {
  assert.deepEqual(leaveStepOutcome(DEFAULT_APPROVAL_SETTINGS.leave.manager_then_hr, 1, hr, "approve"), { action: "finish" });
});

test("a solid manager's rejection ends the request at a line-manager step", () => {
  assert.deepEqual(leaveStepOutcome(DEFAULT_APPROVAL_SETTINGS.leave.manager_then_hr, 1, solid, "reject"), { action: "finish" });
});

test("a manager who is not solid cannot decide a leave step", () => {
  assert.deepEqual(leaveStepOutcome(DEFAULT_APPROVAL_SETTINGS.leave.manager, 1, manager, "approve"), {
    action: "forbidden",
    reason: "Only HR can decide this step.",
  });
});

test("an HR-only leave chain leaves line managers with nothing to decide", () => {
  assert.deepEqual(leaveStepOutcome(["hr"], 1, solid, "approve"), { action: "forbidden", reason: "This step is waiting for HR." });
  assert.deepEqual(leaveStepOutcome(["hr"], 1, hr, "approve"), { action: "finish" });
});

test("a three-level chain advances one level per line-manager approval", () => {
  const levels = ["line_manager", "line_manager", "hr"] as const;
  assert.deepEqual(leaveStepOutcome([...levels], 1, solid, "approve"), { action: "advance", step: 2 });
  assert.deepEqual(leaveStepOutcome([...levels], 2, solid, "approve"), { action: "advance", step: 3 });
});

test("objectives default to the line manager; an HR-only setting takes that away", () => {
  assert.equal(objectivesManagerDecides(base()), true);
  const s = base();
  s.objectives = ["hr"];
  assert.equal(objectivesManagerDecides(s), false);
});

test("validation: unknown approver, duplicates, HR before the line manager, too many levels", () => {
  const unknown = { ...base(), leave: { ...base().leave, manager: ["manager"] as unknown as ApprovalSettings["objectives"] } };
  assert.match(validateApprovalSettings(unknown).join(" "), /unknown approver/);

  const dup = base();
  dup.leave.manager_then_hr = ["line_manager", "line_manager"];
  assert.match(validateApprovalSettings(dup).join(" "), /same approver twice/);

  const order = base();
  order.leave.manager_then_hr = ["hr", "line_manager"];
  assert.match(validateApprovalSettings(order).join(" "), /HR must be the last level/);

  const long = base();
  long.leave.manager_then_hr = ["line_manager", "line_manager", "line_manager", "hr"];
  assert.match(validateApprovalSettings(long).join(" "), /at most 3 approval levels/);

  const empty = base();
  empty.leave.manager = [];
  assert.match(validateApprovalSettings(empty).join(" "), /at least one approval level/);

  const objectives = base();
  objectives.objectives = ["line_manager", "hr"];
  assert.match(validateApprovalSettings(objectives).join(" "), /at most 1 approval level/);
});

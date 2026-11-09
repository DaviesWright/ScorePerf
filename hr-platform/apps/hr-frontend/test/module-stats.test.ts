import { test } from "node:test";
import assert from "node:assert/strict";
import { countBy, monthLabel, tallyLeave, ticketState } from "../src/lib/moduleStats";

test("leave tally counts outcomes, skips cancelled, and sums approved days", () => {
  const t = tallyLeave([
    { status: "approved", startDate: "2026-03-10", leaveType: "Annual Paid Leave", days: 5 },
    { status: "pending", startDate: "2026-04-01", leaveType: "Sick Leave", days: 1 },
    { status: "rejected", startDate: "2026-03-20", leaveType: "Annual Paid Leave", days: 2 },
    { status: "cancelled", startDate: "2026-03-25", leaveType: "Annual Paid Leave", days: 3 },
  ]);
  assert.deepEqual(t.counts, { approved: 1, pending: 1, rejected: 1 });
  assert.equal(t.approvedDays, 5);
});

test("leave months are oldest first and types busiest first", () => {
  const t = tallyLeave([
    { status: "approved", startDate: "2026-04-01", leaveType: "Sick Leave", days: 1 },
    { status: "approved", startDate: "2026-03-10", leaveType: "Annual Paid Leave", days: 1 },
    { status: "pending", startDate: "2026-03-11", leaveType: "Annual Paid Leave", days: 1 },
  ]);
  assert.deepEqual(t.byMonth.map((m) => m.key), ["2026-03", "2026-04"]);
  assert.equal(t.byMonth[0].counts.pending, 1);
  assert.equal(t.byType[0].label, "Annual Paid Leave");
  assert.equal(monthLabel("2026-03"), "Mar 2026");
});

test("ticket statuses map to open, in progress and resolved", () => {
  assert.equal(ticketState("OPEN"), "open");
  assert.equal(ticketState("in_progress"), "inProgress");
  assert.equal(ticketState("In Progress"), "inProgress");
  assert.equal(ticketState("RESOLVED"), "resolved");
  assert.equal(ticketState("closed"), "resolved");
  assert.equal(ticketState("on hold"), "other");
});

test("countBy sorts biggest first, then alphabetically", () => {
  assert.deepEqual(countBy(["b", "a", "b", "c", "a", "b"], (s) => s), [
    ["b", 3],
    ["a", 2],
    ["c", 1],
  ]);
});

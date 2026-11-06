import { test } from "node:test";
import assert from "node:assert/strict";
import { canCancel, canDecide, countWorkingDays, remainingDays, validateRequest, type LeaveRequestRow } from "@hr-platform/shared";

const noHolidays = new Set<string>();
const base = { leaveTypeId: 1, reason: "Family event" };
const ctx = (over: Partial<Parameters<typeof validateRequest>[1]> = {}) => ({
  today: "2026-11-05",
  holidays: noHolidays,
  remaining: 20,
  overlaps: false,
  ...over,
});

test("working days: Monday to Friday inclusive, weekends skipped", () => {
  assert.equal(countWorkingDays("2026-11-09", "2026-11-13", noHolidays), 5); // Mon-Fri
  assert.equal(countWorkingDays("2026-11-09", "2026-11-15", noHolidays), 5); // through Sunday
  assert.equal(countWorkingDays("2026-11-07", "2026-11-08", noHolidays), 0); // Sat-Sun
  assert.equal(countWorkingDays("2026-11-09", "2026-11-09", noHolidays), 1);
});

test("working days: public holidays on weekdays are excluded", () => {
  assert.equal(countWorkingDays("2026-11-09", "2026-11-13", new Set(["2026-11-11"])), 4);
  assert.equal(countWorkingDays("2026-11-07", "2026-11-08", new Set(["2026-11-07"])), 0);
});

test("a valid request returns its day count", () => {
  const r = validateRequest({ ...base, startDate: "2026-11-09", endDate: "2026-11-13" }, ctx());
  assert.deepEqual(r, { ok: true, days: 5 });
});

test("rejects malformed or impossible dates", () => {
  for (const [s, e] of [["2026-13-01", "2026-13-02"], ["11/09/2026", "11/10/2026"], ["2026-02-30", "2026-03-01"], ["", ""]]) {
    const r = validateRequest({ ...base, startDate: s, endDate: e }, ctx());
    assert.equal(r.ok, false, `${s}..${e}`);
  }
});

test("rejects end before start and a start in the past", () => {
  assert.equal(validateRequest({ ...base, startDate: "2026-11-13", endDate: "2026-11-09" }, ctx()).ok, false);
  assert.equal(validateRequest({ ...base, startDate: "2026-11-02", endDate: "2026-11-06" }, ctx()).ok, false);
});

test("a request that covers only weekends and holidays is refused", () => {
  assert.equal(validateRequest({ ...base, startDate: "2026-11-07", endDate: "2026-11-08" }, ctx()).ok, false);
});

test("rejects a request longer than the remaining balance, accepts one that matches it exactly", () => {
  const input = { ...base, startDate: "2026-11-09", endDate: "2026-11-13" };
  assert.equal(validateRequest(input, ctx({ remaining: 4.5 })).ok, false);
  assert.equal(validateRequest(input, ctx({ remaining: 5 })).ok, true);
});

test("rejects an overlap with an existing pending or approved request", () => {
  const r = validateRequest({ ...base, startDate: "2026-11-09", endDate: "2026-11-13" }, ctx({ overlaps: true }));
  assert.equal(r.ok, false);
});

test("rejects an over-long reason and a spans over one year", () => {
  assert.equal(validateRequest({ ...base, reason: "x".repeat(501), startDate: "2026-11-09", endDate: "2026-11-10" }, ctx()).ok, false);
  assert.equal(validateRequest({ ...base, startDate: "2026-11-09", endDate: "2028-01-01" }, ctx({ remaining: 9999 })).ok, false);
});

test("remaining = total minus approved minus pending", () => {
  assert.equal(remainingDays(25, 3, 5), 17);
  assert.equal(remainingDays(10, 10, 0), 0);
});

const pending: LeaveRequestRow = { id: 1, employeeId: 9, status: "pending" };

test("HR decides any pending request of someone else", () => {
  for (const role of ["hr_admin", "hr_director"] as const) {
    assert.equal(canDecide({ userId: 2, role }, pending, false), true, role);
    assert.equal(canDecide({ userId: 9, role }, pending, false), false, `${role} self`);
  }
  assert.equal(canDecide({ userId: 2, role: "hr_admin" }, { ...pending, status: "approved" }, true), false);
});

test("a line manager decides only a solid report, never their own request", () => {
  assert.equal(canDecide({ userId: 2, role: "line_manager" }, pending, true), true, "solid manager");
  assert.equal(canDecide({ userId: 2, role: "line_manager" }, pending, false), false, "not the solid manager");
  assert.equal(canDecide({ userId: 9, role: "line_manager" }, pending, true), false, "self");
  assert.equal(canDecide({ userId: 2, role: "employee" }, pending, true), false, "employee");
});

test("only the owner can cancel, and only while pending", () => {
  assert.equal(canCancel({ userId: 9, role: "employee" }, pending), true);
  assert.equal(canCancel({ userId: 2, role: "hr_director" }, pending), false);
  assert.equal(canCancel({ userId: 9, role: "employee" }, { ...pending, status: "approved" }), false);
});

test("half day: one working day counts as 0.5; weekends and multi-day ranges are refused", () => {
  const half = { leaveTypeId: 1, reason: "Dentist", halfDay: "morning" as const };
  const ok = validateRequest({ ...half, startDate: "2026-11-09", endDate: "2026-11-09" }, ctx());
  assert.deepEqual(ok, { ok: true, days: 0.5 });
  const weekend = validateRequest({ ...half, startDate: "2026-11-07", endDate: "2026-11-07" }, ctx());
  assert.equal(weekend.ok, false);
  const range = validateRequest({ ...half, startDate: "2026-11-09", endDate: "2026-11-10" }, ctx());
  assert.equal(range.ok, false);
  const holiday = validateRequest({ ...half, startDate: "2026-11-09", endDate: "2026-11-09" }, ctx({ holidays: new Set(["2026-11-09"]) }));
  assert.equal(holiday.ok, false);
});

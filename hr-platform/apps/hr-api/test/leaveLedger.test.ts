import { test } from "node:test";
import assert from "node:assert/strict";
import { carryForwardDays } from "@hr-platform/shared";

test("carry-forward is off unless the leave type allows it", () => {
  assert.equal(carryForwardDays({ prevRemaining: 5, limit: null, today: "2027-02-01", year: 2027, carries: false }), 0);
});

test("carry-forward is capped at the leave type's limit", () => {
  assert.equal(carryForwardDays({ prevRemaining: 9, limit: 5, today: "2027-02-01", year: 2027, carries: true }), 5);
  assert.equal(carryForwardDays({ prevRemaining: 3, limit: 5, today: "2027-02-01", year: 2027, carries: true }), 3);
});

test("carried days expire on 31 March; nothing carries when the year has no days left", () => {
  assert.equal(carryForwardDays({ prevRemaining: 4, limit: null, today: "2027-03-31", year: 2027, carries: true }), 4);
  assert.equal(carryForwardDays({ prevRemaining: 4, limit: null, today: "2027-04-01", year: 2027, carries: true }), 0);
  assert.equal(carryForwardDays({ prevRemaining: 0, limit: null, today: "2027-02-01", year: 2027, carries: true }), 0);
  assert.equal(carryForwardDays({ prevRemaining: -2, limit: null, today: "2027-02-01", year: 2027, carries: true }), 0);
});

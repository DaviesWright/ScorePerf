import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PERFORMANCE_SETTINGS, validatePerformanceSettings, type PerformanceSettings } from "@hr-platform/shared";

const base = (): PerformanceSettings => structuredClone(DEFAULT_PERFORMANCE_SETTINGS);

test("default settings are valid", () => {
  assert.deepEqual(validatePerformanceSettings(base()), []);
});

test("pillar weights must total 100", () => {
  const s = base();
  s.pillarWeights.financial = 40;
  assert.match(validatePerformanceSettings(s).join(" "), /add up to 100/);
});

test("a pillar weight must be a whole number from 0 to 100", () => {
  const s = base();
  s.pillarWeights.learning = -5;
  assert.match(validatePerformanceSettings(s).join(" "), /whole number from 0 to 100/);
});

test("objective quotas are ordered and bounded", () => {
  const s = base();
  s.minObjectives = 9;
  assert.match(validatePerformanceSettings(s).join(" "), /cannot be more than the maximum/);
  const t = base();
  t.maxObjectives = 21;
  assert.match(validatePerformanceSettings(t).join(" "), /at most 20/);
  const u = base();
  u.minObjectives = 0;
  assert.match(validatePerformanceSettings(u).join(" "), /at least 1/);
});

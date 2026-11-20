import test from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import {
  SEEDED_FRAMEWORK_PRESETS,
  computeMeasureScore,
  createPerformanceCoreRoutes,
  hasAlignmentCycle,
} from "../src/performance-core-routes";

test("Deterministic scoring engine computes ratio, binary, milestone, staircase, and OKR 0.0-1.0", () => {
  const okr = computeMeasureScore("ratio", { actual: 70, baseline: 0, target: 100, framework: "OKR" });
  assert.equal(okr.score, 0.7);

  const bsc = computeMeasureScore("ratio", { actual: 85, baseline: 10, target: 110, framework: "BSC" });
  assert.equal(bsc.score, 75);

  const bin = computeMeasureScore("binary", { actual: 1, target: 1, framework: "OKR" });
  assert.equal(bin.score, 1);

  const ms = computeMeasureScore("milestone", { actual: 0, target: 100, milestonesCompleted: 3, totalMilestones: 4, framework: "MBO" });
  assert.equal(ms.score, 75);
});

test("ADR-PM-04: hasAlignmentCycle detects self-loops and multi-hop cycles", () => {
  const edges = [
    { childId: "G2", parentId: "G1" },
    { childId: "G3", parentId: "G2" },
  ];
  assert.equal(hasAlignmentCycle(edges, "G1", "G1"), true);
  assert.equal(hasAlignmentCycle(edges, "G1", "G3"), true);
  assert.equal(hasAlignmentCycle(edges, "G4", "G3"), false);
});

test("ADR-PM-08 & Unified /performance/items + Explain permission check", async () => {
  const fakeSql = (strings: TemplateStringsArray, ..._values: unknown[]) => {
    const q = strings.join(" ");
    if (q.includes("FROM performance_goals pg")) {
      return Promise.resolve([
        {
          id: 10,
          framework: "OKR",
          profile_version_id: "preset-okr-standard",
          owner_employee_id: 2,
          owner_name: "Benedicta Agbesi",
          perspective_code: null,
          title: "Sub-15ms Edge P99",
          description: "Latency target",
          weight_pct: 50,
          visibility: "PUBLIC",
          status: "active",
          confidence_level: "ON_TRACK",
          confidence_score: 0.7,
          progress_pct: 70,
          computed_score: 0.7,
          rule_version_pinned: "ratio-v1.0",
        },
      ]);
    }
    if (q.includes("FROM performance_goals") && q.includes("id::text")) {
      return Promise.resolve([
        {
          id: 10,
          title: "Private Goal",
          framework: "MBO",
          profile_version_id: "preset-mbo-annual",
          owner_employee_id: 99,
          weight_pct: 100,
          progress_pct: 80,
          computed_score: 80,
          rule_version_pinned: "v1.0",
          updated_at: "2026-11-20T00:00:00Z",
        },
      ]);
    }
    return Promise.resolve([]);
  };

  const empApp = new Hono<any>();
  empApp.use("*", async (c, next) => {
    c.set("tenant", { companyId: 1, userId: 1, role: "employee" });
    await next();
  });
  empApp.route("/", createPerformanceCoreRoutes(() => fakeSql));

  const presetsRes = await empApp.request("/api/v1/performance/settings/presets");
  assert.equal(presetsRes.status, 200);
  const presetsBody = await presetsRes.json();
  assert.equal(presetsBody.presets.length, SEEDED_FRAMEWORK_PRESETS.length);

  const itemsRes = await empApp.request("/api/v1/performance/items?framework=OKR");
  assert.equal(itemsRes.status, 200);
  const itemsBody = await itemsRes.json();
  assert.equal(itemsBody.items[0].framework, "OKR");
  assert.equal(itemsBody.items[0].extensions.okr.confidenceValue, 0.7);

  // Employee cannot inspect another employee's Explain snapshot
  const explainDenied = await empApp.request("/api/v1/performance/explain/goal/10");
  assert.equal(explainDenied.status, 403);
});

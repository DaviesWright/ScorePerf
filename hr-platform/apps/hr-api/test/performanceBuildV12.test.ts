import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import {
  DEMO_DISCLAIMER,
  buildDemoReportCsv,
  canManagerAssess,
  createPerformanceV12Routes,
  resolveManagerScope,
  validateObjectiveVolume,
} from "../src/performance-v12-routes.ts";

describe("Performance BUILD.md v1.1 & v1.2 Domain & Route Tests", () => {
  it("validateObjectiveVolume enforces 8 min and 10 max", () => {
    const below = validateObjectiveVolume(7);
    assert.equal(below.valid, false);
    assert.equal(below.code, "PERF_OBJECTIVES_BELOW_MIN");
    assert.equal(below.remainingToMin, 1);

    const exactMin = validateObjectiveVolume(8);
    assert.equal(exactMin.valid, true);
    assert.equal(exactMin.code, "OK");

    const exactMax = validateObjectiveVolume(10);
    assert.equal(exactMax.valid, true);
    assert.equal(exactMax.code, "OK");

    const above = validateObjectiveVolume(11);
    assert.equal(above.valid, false);
    assert.equal(above.code, "PERF_OBJECTIVES_ABOVE_MAX");

    const withFocusWarning = validateObjectiveVolume(8, { perFocusFloor: 2 }, { FINANCIAL: 1, CUSTOMER: 7 });
    assert.equal(withFocusWarning.valid, true);
    assert.equal(withFocusWarning.focusWarnings.length, 1);
    assert.equal(withFocusWarning.focusWarnings[0].code, "PERF_FOCUS_AREA_UNDERREPRESENTED");
  });

  it("resolveManagerScope includes direct reports and active delegations only", () => {
    const scope = resolveManagerScope(
      20,
      [
        { employee_id: 21, manager_id: 20 },
        { employee_id: 31, manager_id: 30 },
        { employee_id: 41, manager_id: 40 },
      ],
      [
        {
          id: "del-1",
          delegator_id: "30",
          delegate_id: "20",
          start_date: "2026-11-01",
          end_date: "2026-11-30",
          status: "ACTIVE",
        },
        {
          id: "del-expired",
          delegator_id: "40",
          delegate_id: "20",
          start_date: "2026-01-01",
          end_date: "2026-01-10",
          status: "ACTIVE",
        },
      ],
      "2026-11-20"
    );

    assert.equal(scope.directEmployeeIds.has("21"), true);
    assert.equal(scope.allScopeIds.has("31"), true);
    assert.equal(scope.delegatedMap.get("31")?.onBehalfOf, "30");
    assert.equal(scope.allScopeIds.has("41"), false);
  });

  it("canManagerAssess blocks self-assessment and out-of-scope targets", () => {
    const scopeIds = new Set(["21", "31"]);
    const selfCheck = canManagerAssess(20, 20, scopeIds);
    assert.equal(selfCheck.allowed, false);
    if (!selfCheck.allowed) {
      assert.equal(selfCheck.status, 403);
      assert.equal(selfCheck.code, "PERF_SELF_ASSESSMENT_PROHIBITED");
    }

    const outCheck = canManagerAssess(20, 99, scopeIds);
    assert.equal(outCheck.allowed, false);
    if (!outCheck.allowed) {
      assert.equal(outCheck.status, 403);
      assert.equal(outCheck.code, "PERF_OUT_OF_SCOPE");
    }

    const okCheck = canManagerAssess(20, 21, scopeIds);
    assert.equal(okCheck.allowed, true);
  });

  it("buildDemoReportCsv stamps DEMO disclaimer", () => {
    const csv = buildDemoReportCsv({
      assessmentId: "assess-1",
      employeeName: "Ada Lovelace",
      cycleId: "2026-Q4",
      framework: "BSC",
      overallRating: 4.5,
      selfSummary: "Strong year",
      managerSummary: "Exceeded expectations",
      strengths: "Architecture",
      developmentAreas: "Delegation",
      objectives: [{ title: "Ship v1.2", perspective: "Internal Process", weightPct: 20, progressPct: 100, rating: 4.5 }],
    });
    assert.ok(csv.includes(DEMO_DISCLAIMER));
    assert.ok(csv.includes("Ship v1.2"));
  });

  it("HTTP routes enforce policy bounds, SoD 403, and revision limit 400", async () => {
    const mockSql = (strings: TemplateStringsArray, ..._vals: unknown[]) => {
      const q = strings.join(" ");
      if (q.includes("FROM performance_assessments") && q.includes("WHERE id =")) {
        if (_vals[0] === "assess-self") {
          return Promise.resolve([{ id: "assess-self", employee_id: "20", cycle_id: "c1", stage: "SELF_COMPLETE", revision_round: 0, max_revision_rounds: 2 }]);
        }
        if (_vals[0] === "assess-out") {
          return Promise.resolve([{ id: "assess-out", employee_id: "99", cycle_id: "c1", stage: "SELF_COMPLETE", revision_round: 0, max_revision_rounds: 2 }]);
        }
        if (_vals[0] === "assess-rev-max") {
          return Promise.resolve([{ id: "assess-rev-max", employee_id: "21", cycle_id: "c1", stage: "SELF_COMPLETE", revision_round: 2, max_revision_rounds: 2 }]);
        }
      }
      if (q.includes("FROM reporting_lines")) {
        return Promise.resolve([{ employee_id: 21, manager_id: 20 }]);
      }
      if (q.includes("FROM performance_delegations")) {
        return Promise.resolve([]);
      }
      if (q.includes("FROM performance_objective_volume_policies")) {
        return Promise.resolve([{ min_objectives: 8, max_objectives: 10, per_focus_floor: 2, enforcement: "block" }]);
      }
      if (q.includes("FROM performance_goals")) {
        return Promise.resolve([{ id: "g1", focus_area: "FINANCIAL" }]);
      }
      return Promise.resolve([]);
    };

    const app = new Hono<any>();
    app.use("*", async (c, next) => {
      c.set("tenant", { companyId: 1, userId: 20, role: "admin" });
      await next();
    });
    app.route("/", createPerformanceV12Routes(() => mockSql));

    const badPolicyRes = await app.request("/api/v1/performance/settings/objective-volume-policy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minObjectives: 5, maxObjectives: 12 }),
    });
    assert.equal(badPolicyRes.status, 400);
    const badPolicyJson: any = await badPolicyRes.json();
    assert.equal(badPolicyJson.code, "PERF_POLICY_BOUNDS_INVALID");

    const selfRes = await app.request("/api/v1/performance/assessments/assess-self/manager", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overallRating: 4 }),
    });
    assert.equal(selfRes.status, 403);
    assert.equal(((await selfRes.json()) as any).code, "PERF_SELF_ASSESSMENT_PROHIBITED");

    const outRes = await app.request("/api/v1/performance/assessments/assess-out/manager", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overallRating: 4 }),
    });
    assert.equal(outRes.status, 403);
    assert.equal(((await outRes.json()) as any).code, "PERF_OUT_OF_SCOPE");

    const revRes = await app.request("/api/v1/performance/assessments/assess-rev-max/manager/request-revision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Please add evidence for Q3 KPIs." }),
    });
    assert.equal(revRes.status, 400);
    assert.equal(((await revRes.json()) as any).code, "PERF_REVISION_LIMIT_REACHED");
  });
});

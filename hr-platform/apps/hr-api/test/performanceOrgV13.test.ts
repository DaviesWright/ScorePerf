import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import {
  buildReportingChain,
  createPerformanceOrgRoutes,
  detectOrgCycle,
  filterActiveAtDate,
  hasDateOverlap,
} from "../src/performance-org-routes.ts";

describe("Performance BUILD.md v1.3 Organogram Domain & Route Tests", () => {
  it("detectOrgCycle prevents direct, self, and multi-hop cycles", () => {
    const edges = [
      { subject_employee_id: "3", object_employee_id: "2" },
      { subject_employee_id: "2", object_employee_id: "1" },
    ];
    assert.equal(detectOrgCycle(edges, "1", "1"), true);
    assert.equal(detectOrgCycle(edges, "1", "3"), true);
    assert.equal(detectOrgCycle(edges, "4", "3"), false);
  });

  it("filterActiveAtDate returns historical graph state as of date", () => {
    const edges = [
      {
        id: "e1",
        subject_employee_id: "10",
        object_employee_id: "1",
        type: "PRIMARY_MANAGER" as const,
        scope: "ALL" as const,
        effective_from: "2026-01-01",
        effective_to: "2026-06-30",
        source: "HRIS" as const,
        status: "ACTIVE",
      },
      {
        id: "e2",
        subject_employee_id: "10",
        object_employee_id: "2",
        type: "PRIMARY_MANAGER" as const,
        scope: "ALL" as const,
        effective_from: "2026-07-01",
        effective_to: null,
        source: "MANUAL" as const,
        status: "ACTIVE",
      },
    ];
    const q1 = filterActiveAtDate(edges, "2026-03-15");
    assert.equal(q1.length, 1);
    assert.equal(q1[0].object_employee_id, "1");

    const q4 = filterActiveAtDate(edges, "2026-11-20");
    assert.equal(q4.length, 1);
    assert.equal(q4[0].object_employee_id, "2");
  });

  it("hasDateOverlap detects conflicting primary manager windows", () => {
    const edges = [
      {
        id: "e1",
        subject_employee_id: "10",
        object_employee_id: "1",
        type: "PRIMARY_MANAGER" as const,
        scope: "ALL" as const,
        effective_from: "2026-01-01",
        effective_to: null,
        source: "MANUAL" as const,
        status: "ACTIVE",
      },
    ];
    assert.equal(hasDateOverlap(edges, "10", "2", "PRIMARY_MANAGER", "2026-06-01", null), true);
    assert.equal(hasDateOverlap(edges, "10", "2", "MATRIX_MANAGER", "2026-06-01", null), false);
  });

  it("buildReportingChain walks primary chain and collects matrix links", () => {
    const empMap = new Map([
      ["1", { id: "1", name: "CEO", role: "CEO" }],
      ["2", { id: "2", name: "VP Eng", role: "VP" }],
      ["3", { id: "3", name: "Engineer", role: "SWE" }],
      ["4", { id: "4", name: "Product Lead", role: "PM" }],
    ]);
    const activeEdges = [
      {
        id: "e1",
        subject_employee_id: "3",
        object_employee_id: "2",
        type: "PRIMARY_MANAGER" as const,
        scope: "ALL" as const,
        effective_from: "2026-01-01",
        effective_to: null,
        source: "HRIS" as const,
        status: "ACTIVE",
      },
      {
        id: "e2",
        subject_employee_id: "2",
        object_employee_id: "1",
        type: "PRIMARY_MANAGER" as const,
        scope: "ALL" as const,
        effective_from: "2026-01-01",
        effective_to: null,
        source: "HRIS" as const,
        status: "ACTIVE",
      },
      {
        id: "e3",
        subject_employee_id: "3",
        object_employee_id: "4",
        type: "MATRIX_MANAGER" as const,
        scope: "APPRAISAL" as const,
        effective_from: "2026-01-01",
        effective_to: null,
        source: "MANUAL" as const,
        status: "ACTIVE",
      },
    ];

    const res = buildReportingChain("3", activeEdges, empMap);
    assert.deepEqual(
      res.chain.map((n) => n.employeeId),
      ["3", "2", "1"]
    );
    assert.equal(res.matrixLinks.length, 1);
    assert.equal(res.matrixLinks[0].managerId, "4");
  });

  it("HTTP routes enforce ORG_GRAPH_CYCLE and ORG_PRIMARY_MANAGER_CONFLICT", async () => {
    const mockSql = (strings: TemplateStringsArray) => {
      const q = strings.join(" ");
      if (q.includes("FROM performance_org_edges")) {
        return Promise.resolve([
          {
            id: "e1",
            subject_employee_id: "2",
            object_employee_id: "1",
            type: "PRIMARY_MANAGER",
            scope: "ALL",
            effective_from: "2026-01-01",
            effective_to: null,
            source: "MANUAL",
            status: "ACTIVE",
          },
        ]);
      }
      return Promise.resolve([]);
    };

    const app = new Hono<any>();
    app.use("*", async (c, next) => {
      c.set("tenant", { companyId: 1, userId: 1, role: "hr_manager" });
      await next();
    });
    app.route("/", createPerformanceOrgRoutes(() => mockSql));

    const cycleRes = await app.request("/api/v1/performance/org/edges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectEmployeeId: "1",
        objectEmployeeId: "2",
        type: "PRIMARY_MANAGER",
        effectiveFrom: "2026-11-20",
      }),
    });
    assert.equal(cycleRes.status, 400);
    assert.equal(((await cycleRes.json()) as any).code, "ORG_GRAPH_CYCLE");

    const conflictRes = await app.request("/api/v1/performance/org/edges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectEmployeeId: "2",
        objectEmployeeId: "3",
        type: "PRIMARY_MANAGER",
        effectiveFrom: "2026-11-20",
      }),
    });
    assert.equal(conflictRes.status, 400);
    assert.equal(((await conflictRes.json()) as any).code, "ORG_PRIMARY_MANAGER_CONFLICT");
  });
});

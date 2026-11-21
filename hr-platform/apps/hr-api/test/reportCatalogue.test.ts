import test from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { REPORT_CATALOGUE } from "../src/report-catalogue";
import { createReportRoutes, formatReportCsv } from "../src/report-routes";

function makeReportApp(role: string, userId = 1, companyId = 1) {
  const auditActions: string[] = [];
  const fakeSql = (strings: TemplateStringsArray, ...values: unknown[]) => {
    const q = strings.join(" ");
    if (q.includes("INSERT INTO arch_audit_log")) {
      const action = values.find((v) => v === "REPORT_VIEWED" || v === "REPORT_EXPORTED");
      if (typeof action === "string") auditActions.push(action);
      return Promise.resolve([]);
    }
    if (q.includes("age_band")) {
      // Small cohort (< 5) to trigger Part 6 small-group suppression
      return Promise.resolve([
        { department: "Finance", age_band: "30-44", headcount: 2 },
      ]);
    }
    if (q.includes("FROM leave_requests lr")) {
      const today = new Date().toISOString().slice(0, 10);
      return Promise.resolve([
        {
          id: 1,
          employee_id: 1,
          employee: "=MaliciousUser",
          department: "Finance",
          leave_type: "Annual Leave",
          start_date: today,
          end_date: today,
          duration: 3,
          status: "approved",
          current_step: "HR",
          created_at: today,
          decided_at: today,
          updated_at: today,
        },
      ]);
    }
    if (q.includes("FROM employees e")) {
      return Promise.resolve([
        {
          id: 1,
          first_name: "Ama",
          last_name: "Mensah",
          email: "ama@example.com",
          department: "Finance",
          location: "Accra",
          position: "Analyst",
          is_active: true,
          created_at: "2025-01-10",
          updated_at: "2026-01-10",
        },
      ]);
    }
    return Promise.resolve([]);
  };

  const app = new Hono<any>();
  app.use("*", async (c, next) => {
    c.set("tenant", { companyId, userId, role });
    await next();
  });
  app.route("/", createReportRoutes(() => fakeSql));
  return { app, auditActions };
}

test("Catalogue registers all HRIS, Leave, Performance, Assets, and Cross-Module report IDs", () => {
  const keys = new Set(REPORT_CATALOGUE.map((r) => r.reportKey));
  for (let i = 1; i <= 20; i++) assert.ok(keys.has(`HR-${String(i).padStart(3, "0")}`));
  for (let i = 1; i <= 20; i++) assert.ok(keys.has(`LV-${String(i).padStart(3, "0")}`));
  for (let i = 1; i <= 15; i++) assert.ok(keys.has(`PM-${String(i).padStart(3, "0")}`));
  for (let i = 1; i <= 10; i++) assert.ok(keys.has(`AS-${String(i).padStart(3, "0")}`));
  for (let i = 1; i <= 15; i++) assert.ok(keys.has(`XR-${String(i).padStart(3, "0")}`));
  assert.equal(REPORT_CATALOGUE.length, 80);
});

test("Part 7 RBAC blocks employee from compensation, audit, and company-wide scope", async () => {
  const { app } = makeReportApp("employee", 1);

  const compRes = await app.request("/api/v1/reports/hris/HR-018");
  assert.equal(compRes.status, 403);
  assert.equal(((await compRes.json()) as { error?: string }).error, "REPORT_FORBIDDEN");

  const auditRes = await app.request("/api/v1/reports/hris/HR-020");
  assert.equal(auditRes.status, 403);

  const companyRes = await app.request("/api/v1/reports/hris/HR-001?scope=company");
  assert.equal(companyRes.status, 403);
});

test("Part 6 small-group suppression suppresses HR-007 when cohort < 5", async () => {
  const { app, auditActions } = makeReportApp("hr_manager", 2);
  const res = await app.request("/api/v1/reports/hris/HR-007");
  assert.equal(res.status, 200);
  const body: any = await res.json();
  assert.equal(body.suppressed, true);
  assert.equal(body.rows.length, 0);
  assert.ok(body.suppressionReason.includes("5"));
  assert.deepEqual(auditActions, ["REPORT_VIEWED"]);
});

test("Part 6 CSV export returns text/csv, formula-escapes cells, and audits REPORT_EXPORTED", async () => {
  const { app, auditActions } = makeReportApp("hr_manager", 2);
  const res = await app.request("/api/v1/reports/leave/LV-014?format=csv");
  assert.equal(res.status, 200);
  assert.ok((res.headers.get("content-type") || "").includes("text/csv"));
  const csv = await res.text();
  assert.ok(csv.includes("'=MaliciousUser"));
  assert.deepEqual(auditActions, ["REPORT_EXPORTED"]);

  const formatted = formatReportCsv([{ key: "v", label: "Val", type: "string" }], [{ v: "+123" }]);
  assert.ok(formatted.includes("'+123"));
});

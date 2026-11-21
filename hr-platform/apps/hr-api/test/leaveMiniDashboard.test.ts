import test from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import {
  createLeaveMiniDashboardRoutes,
  resolveMiniDashboardVariant,
} from "../src/leave-mini-dashboard-routes";

function makeApp(role: string, userId = 1, companyId = 1) {
  const fakeSql = (strings: TemplateStringsArray, ..._values: unknown[]) => {
    const q = strings.join(" ");
    if (q.includes("FROM leave_mini_dashboard_snapshots")) return Promise.resolve([]);
    if (q.includes("FROM reporting_lines")) {
      return Promise.resolve([
        { id: 2, first_name: "Ama", last_name: "Mensah" },
        { id: 3, first_name: "Kofi", last_name: "Boateng" },
      ]);
    }
    if (q.includes("FROM departments d")) {
      return Promise.resolve([
        { id: 10, department_name: "Finance", dept_headcount: 10, dept_on_leave: 1 },
        { id: 11, department_name: "Engineering", dept_headcount: 15, dept_on_leave: 2 },
      ]);
    }
    if (q.includes("AS headcount")) {
      return Promise.resolve([{ headcount: 54, on_leave_now: 3, upcoming_7d: 4 }]);
    }
    if (q.includes("FROM leave_requests lr") && q.includes("e.first_name")) {
      return Promise.resolve([
        { id: 101, first_name: "Ama", last_name: "Mensah", department: "Finance", leave_type: "Annual", start_date: "2026-11-18", end_date: "2026-11-22" },
        { id: 102, first_name: "Kofi", last_name: "Boateng", department: "Finance", leave_type: "Annual", start_date: "2026-11-18", end_date: "2026-11-23" },
        { id: 103, first_name: "Yaw", last_name: "Asare", department: "HR", leave_type: "Sick", start_date: "2026-11-18", end_date: "2026-11-20" },
        { id: 104, first_name: "Esi", last_name: "Osei", department: "Sales", leave_type: "Annual", start_date: "2026-11-18", end_date: "2026-11-25" },
        { id: 105, first_name: "Nana", last_name: "Appiah", department: "IT", leave_type: "Annual", start_date: "2026-11-18", end_date: "2026-11-21" },
        { id: 106, first_name: "Kojo", last_name: "Baffour", department: "Ops", leave_type: "Annual", start_date: "2026-11-18", end_date: "2026-11-24" },
      ]);
    }
    if (q.includes("available_days")) return Promise.resolve([{ available_days: 18 }]);
    if (q.includes("pending_count")) return Promise.resolve([{ pending_count: 2, upcoming_days: 5 }]);
    if (q.includes("pending_approvals")) return Promise.resolve([{ pending_approvals: 4, overdue_resumption: 1 }]);
    return Promise.resolve([]);
  };

  const app = new Hono<any>();
  app.use("*", async (c, next) => {
    c.set("tenant", { companyId, userId, role });
    await next();
  });
  app.route("/", createLeaveMiniDashboardRoutes(() => fakeSql));
  return app;
}

test("resolveMiniDashboardVariant enforces RBAC", () => {
  const empHr = resolveMiniDashboardVariant("employee", "hr");
  assert.equal(empHr.ok, false);
  if (!empHr.ok) {
    assert.equal(empHr.status, 403);
    assert.equal(empHr.error, "MINI_DASHBOARD_VARIANT_FORBIDDEN");
  }

  const mgrHr = resolveMiniDashboardVariant("line_manager", "hr");
  assert.equal(mgrHr.ok, false);
  if (!mgrHr.ok) {
    assert.equal(mgrHr.status, 403);
    assert.equal(mgrHr.error, "MINI_DASHBOARD_VARIANT_FORBIDDEN");
  }

  const hrEss = resolveMiniDashboardVariant("hr_manager", "ess");
  assert.equal(hrEss.ok, true);
  if (hrEss.ok) assert.equal(hrEss.variant, "ess");
});

test("GET /api/v1/leave/mini-dashboard rejects unauthorized variant with 403", async () => {
  const app = makeApp("employee", 10);
  const res = await app.request("/api/v1/leave/mini-dashboard?mode=hr");
  assert.equal(res.status, 403);
  const body: any = await res.json();
  assert.equal(body.error, "MINI_DASHBOARD_VARIANT_FORBIDDEN");
});

test("GET /api/v1/leave/mini-dashboard rejects cross-employee ESS scope with 403", async () => {
  const app = makeApp("employee", 10);
  const res = await app.request("/api/v1/leave/mini-dashboard?mode=ess&employee_id=999");
  assert.equal(res.status, 403);
  const body: any = await res.json();
  assert.equal(body.error, "ESS_SELF_SCOPE_VIOLATION");
});

test("Executive variant returns aggregates only with zero individual names", async () => {
  const app = makeApp("executive", 20);
  const res = await app.request("/api/v1/leave/mini-dashboard?mode=executive");
  assert.equal(res.status, 200);
  const body: any = await res.json();
  assert.equal(body.variant, "executive");
  assert.equal(body.metrics.length, 3);
  const serialized = JSON.stringify(body);
  assert.equal(serialized.includes("Ama"), false);
  assert.equal(serialized.includes("reason"), false);
  assert.ok(body.list.some((item: any) => item.name === "Finance"));
});

test("HR variant caps list at 5 items and reports overflow_count", async () => {
  const app = makeApp("hr_manager", 30);
  const res = await app.request("/api/v1/leave/mini-dashboard?mode=hr");
  assert.equal(res.status, 200);
  const body: any = await res.json();
  assert.equal(body.variant, "hr");
  assert.equal(body.list.length, 5);
  assert.equal(body.overflow_count, 1);
  assert.equal(JSON.stringify(body).includes("reason"), false);
});

test("POST /api/v1/leave/mini-dashboard/refresh enforces 30s rate limit", async () => {
  const app = makeApp("hr_manager", 777);
  const first = await app.request("/api/v1/leave/mini-dashboard/refresh", { method: "POST" });
  assert.equal(first.status, 200);
  const second = await app.request("/api/v1/leave/mini-dashboard/refresh", { method: "POST" });
  assert.equal(second.status, 429);
  const body: any = await second.json();
  assert.equal(body.error, "MINI_DASHBOARD_RATE_LIMITED");
});

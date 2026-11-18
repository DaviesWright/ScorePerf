import test from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import {
  applySmallGroupSuppression,
  createAnalyticsRoutes,
  resolveAnalyticsScope,
} from "../src/analytics-routes";

function makeAnalyticsApp(role: string, userId = 1, companyId = 1) {
  const snapshots: any[] = [];
  const fakeSql: any = (strings: TemplateStringsArray, ...values: unknown[]) => {
    const q = strings.join(" ");
    if (q.includes("INSERT INTO analytics_report_snapshots")) {
      snapshots.push({ id: values[0], module: values[2], report_key: values[3] });
      return Promise.resolve([]);
    }
    return Promise.resolve([]);
  };
  fakeSql.unsafe = (query: string) => {
    if (query.includes("series_name")) {
      return Promise.resolve([
        { series_name: "Senior Analyst", month_num: 1, days_taken: 10 },
        { series_name: "Senior Analyst", month_num: 3, days_taken: 15 },
      ]);
    }
    if (query.includes("row_label")) {
      return Promise.resolve([
        { row_label: "Finance", col_label: "Annual Leave", cohort_size: 8, days_taken: 32 },
        { row_label: "Legal", col_label: "Annual Leave", cohort_size: 2, days_taken: 6 }, // < 5 -> suppressed
      ]);
    }
    return Promise.resolve([]);
  };

  const app = new Hono<any>();
  app.use("*", async (c, next) => {
    c.set("tenant", { companyId, userId, role });
    await next();
  });
  app.route("/", createAnalyticsRoutes(() => fakeSql));
  return { app, snapshots };
}

test("TC-AN-12: wrong scope returns 403 ANALYTICS_FORBIDDEN", async () => {
  const empCheck = resolveAnalyticsScope("employee", "company");
  assert.equal(empCheck.ok, false);

  const { app } = makeAnalyticsApp("employee", 1);
  const res = await app.request("/api/v1/analytics/leave/heatmap?scope=company");
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.error, "ANALYTICS_FORBIDDEN");
});

test("TC-AN-03 & TC-AN-13: small-group suppression masks cells with < 5 cohort", async () => {
  const sup = applySmallGroupSuppression(3, 25);
  assert.equal(sup.suppressed, true);
  assert.equal(sup.displayValue, "—");
  assert.ok(sup.tooltip.includes("confidentiality"));

  const { app } = makeAnalyticsApp("hr_manager", 2);
  const res = await app.request("/api/v1/analytics/leave/heatmap?groupBy=department");
  assert.equal(res.status, 200);
  const body = await res.json();
  const legal = body.rows.find((r: any) => r.rowLabel === "Legal");
  assert.equal(legal.cells[0].suppressed, true);
  assert.equal(legal.cells[0].displayValue, "—");
  const finance = body.rows.find((r: any) => r.rowLabel === "Finance");
  assert.equal(finance.cells[0].suppressed, false);
});

test("TC-AN-06: leave trend by job role preserves null gaps without interpolation", async () => {
  const { app } = makeAnalyticsApp("hr_manager", 2);
  const res = await app.request("/api/v1/analytics/leave/trend?groupBy=role");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.groupBy, "role");
  assert.equal(body.series[0].name, "Senior Analyst");
  assert.equal(body.series[0].points[0], 10);
  assert.equal(body.series[0].points[1], null); // Feb missing -> null gap
  assert.equal(body.series[0].points[2], 15);
});

test("TC-AN-10: snapshot creation is HR-only and stores immutable record", async () => {
  const { app: empApp } = makeAnalyticsApp("employee", 1);
  const denied = await empApp.request("/api/v1/analytics/leave/reports/utilisation/snapshot", { method: "POST" });
  assert.equal(denied.status, 403);

  const { app: hrApp, snapshots } = makeAnalyticsApp("hr_manager", 2);
  const created = await hrApp.request("/api/v1/analytics/leave/reports/utilisation/snapshot", { method: "POST" });
  assert.equal(created.status, 201);
  assert.equal(snapshots.length, 1);
});

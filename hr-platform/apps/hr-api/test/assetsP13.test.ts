import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import {
  canManagerActOnAssignee,
  createAssetsP13Routes,
  isAssetAvailable,
  resolveSolidDirectReports,
  validateAssignmentDates,
} from "../src/assets-p13-routes.ts";

describe("P13 Asset Management Addendum Tests", () => {
  it("13.1 & 13.2 domain helpers: availability, solid-line scope, permission matrix, dates", () => {
    assert.equal(isAssetAvailable("available", null), true);
    assert.equal(isAssetAvailable("available", "2026-11-01"), false);
    assert.equal(isAssetAvailable("allocated", null), false);
    assert.equal(isAssetAvailable("maintenance", null), false);

    const solidSet = resolveSolidDirectReports(10, [
      { employee_id: 21, manager_id: 10, kind: "solid" },
      { employee_id: 22, manager_id: 10, kind: "dotted" },
      { employee_id: 31, manager_id: 99, kind: "solid" },
    ]);
    assert.equal(solidSet.has(21), true);
    assert.equal(solidSet.has(22), false); // dotted excluded by default
    assert.equal(solidSet.has(31), false);

    // Permission matrix checks
    assert.equal(canManagerActOnAssignee(21, "employee", 21, new Set()).allowed, false);
    const selfCheck = canManagerActOnAssignee(10, "line_manager", 10, solidSet);
    assert.equal(selfCheck.allowed, false);
    if (!selfCheck.allowed) assert.equal(selfCheck.code, "ASSIGNEE_SELF");

    const dottedCheck = canManagerActOnAssignee(10, "line_manager", 22, solidSet);
    assert.equal(dottedCheck.allowed, false);
    if (!dottedCheck.allowed) assert.equal(dottedCheck.code, "ASSIGNEE_OUT_OF_SCOPE");

    assert.equal(canManagerActOnAssignee(10, "line_manager", 21, solidSet).allowed, true);
    assert.equal(canManagerActOnAssignee(1, "hr_admin", 99, new Set()).allowed, true);

    assert.equal(validateAssignmentDates("2099-01-01", null, "2026-11-20").valid, false);
    assert.equal(validateAssignmentDates("2026-11-20", "2026-11-19", "2026-11-20").valid, false);
    assert.equal(validateAssignmentDates("2026-11-20", "2026-12-01", "2026-11-20").valid, true);
  });

  it("13.1 & 13.2 & 13.4 HTTP routes: employee self-service, manager assign/transfer, audit masking", async () => {
    const mockSql = (strings: TemplateStringsArray, ...vals: unknown[]) => {
      const q = strings.join(" ");
      if (q.includes("FROM asset_allocations aa") && q.includes("aa.employee_id =")) {
        return Promise.resolve([
          {
            id: 101,
            asset_code: "LAP-001",
            name: "MacBook Pro 14",
            serial_number: "SN-101",
            category_name: "Laptops",
            allocated_date: "2026-10-01",
            expected_return_date: null,
            status: "allocated",
          },
        ]);
      }
      if (q.includes("FROM reporting_lines")) {
        return Promise.resolve([
          { employee_id: 21, manager_id: 10, kind: "solid" },
          { employee_id: 22, manager_id: 10, kind: "dotted" },
        ]);
      }
      if (q.includes("FROM employees")) {
        return Promise.resolve([{ "?column?": 1 }]);
      }
      if (q.includes("FROM company_assets") && q.includes("WHERE id =")) {
        if (vals[0] === 501) return Promise.resolve([{ id: 501, status: "allocated", deleted_at: null }]);
        if (vals[0] === 502) return Promise.resolve([{ id: 502, status: "maintenance", deleted_at: null }]);
        return Promise.resolve([{ id: 500, status: "available", deleted_at: null }]);
      }
      if (q.includes("FROM asset_audit_events")) {
        return Promise.resolve([
          {
            id: "aud-1",
            actor_user_id: 10,
            action: "TRANSFER",
            asset_id: 101,
            asset_code: "LAP-001",
            asset_name: "MacBook Pro 14",
            previous_assignee_id: 99,
            new_assignee_id: 21,
            effective_date: "2026-11-20",
            expected_return_date: null,
            reason: "Team rotation",
            source: "UI",
            correlation_id: "corr-1",
          },
        ]);
      }
      return Promise.resolve([]);
    };

    const buildApp = (userId: number, role: string) => {
      const app = new Hono<any>();
      app.use("*", async (c, next) => {
        c.set("tenant", { companyId: 1, userId, role });
        await next();
      });
      app.route("/", createAssetsP13Routes(() => mockSql));
      return app;
    };

    // 13.1 Employee sees own assets with all required fields, cannot access /available or assign
    const empApp = buildApp(21, "employee");
    const meRes = await empApp.request("/api/v1/assets/me");
    assert.equal(meRes.status, 200);
    const meJson: any = await meRes.json();
    assert.equal(meJson.results.length, 1);
    assert.equal(meJson.results[0].serialNumber, "SN-101");
    assert.equal(meJson.results[0].categoryName, "Laptops");
    assert.equal(meJson.results[0].status, "allocated");

    assert.equal((await empApp.request("/api/v1/assets/available")).status, 403);
    assert.equal(
      (
        await empApp.request("/api/v1/assets/500/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId: 21 }),
        })
      ).status,
      403
    );

    // 13.4 Employee audit masks previous_assignee_id
    const empAudit: any = await (await empApp.request("/api/v1/assets/audit")).json();
    assert.equal(empAudit.results.length, 1);
    assert.equal(empAudit.results[0].previous_assignee_id, null);

    // 13.2 Manager assigns to solid direct report, blocked on self, dotted, already-assigned, unavailable
    const mgrApp = buildApp(10, "line_manager");
    const okAssign = await mgrApp.request("/api/v1/assets/500/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: 21, assignedDate: "2026-11-20" }),
    });
    assert.equal(okAssign.status, 201);

    const selfAssign = await mgrApp.request("/api/v1/assets/500/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: 10, assignedDate: "2026-11-20" }),
    });
    assert.equal(selfAssign.status, 403);
    assert.equal(((await selfAssign.json()) as any).code, "ASSIGNEE_SELF");

    const dottedAssign = await mgrApp.request("/api/v1/assets/500/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: 22, assignedDate: "2026-11-20" }),
    });
    assert.equal(dottedAssign.status, 403);
    assert.equal(((await dottedAssign.json()) as any).code, "ASSIGNEE_OUT_OF_SCOPE");

    const alreadyAssigned = await mgrApp.request("/api/v1/assets/501/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: 21, assignedDate: "2026-11-20" }),
    });
    assert.equal(alreadyAssigned.status, 409);
    assert.equal(((await alreadyAssigned.json()) as any).code, "ASSET_ALREADY_ASSIGNED");

    const unavailAssign = await mgrApp.request("/api/v1/assets/502/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: 21, assignedDate: "2026-11-20" }),
    });
    assert.equal(unavailAssign.status, 409);
    assert.equal(((await unavailAssign.json()) as any).code, "ASSET_NOT_AVAILABLE");
  });
});

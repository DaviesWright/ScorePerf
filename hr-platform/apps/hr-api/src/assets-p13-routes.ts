import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { TenantContext } from "./auth";
import type { Env } from "./index";

export type AssetCondition = "new" | "good" | "fair" | "poor";

export interface ReportingLineBasic {
  employee_id: number | string;
  manager_id: number | string;
  kind: string;
}

export function isAssetAvailable(status: string, deletedAt?: string | Date | null): boolean {
  return status === "available" && !deletedAt;
}

export function resolveSolidDirectReports(
  managerId: number,
  reportingRows: ReportingLineBasic[],
  includeDotted = false
): Set<number> {
  const result = new Set<number>();
  for (const r of reportingRows) {
    if (Number(r.manager_id) !== Number(managerId)) continue;
    const kind = String(r.kind || "solid").toLowerCase();
    if (kind === "solid" || (includeDotted && kind === "dotted")) {
      const empId = Number(r.employee_id);
      if (empId !== Number(managerId)) result.add(empId);
    }
  }
  return result;
}

export function canManagerActOnAssignee(
  actorUserId: number,
  actorRole: string,
  targetEmployeeId: number,
  solidDirectReportIds: Set<number>
):
  | { allowed: true }
  | {
      allowed: false;
      status: 403;
      code: "ASSIGNEE_SELF" | "ASSIGNEE_OUT_OF_SCOPE" | "FORBIDDEN";
      message: string;
    } {
  if (actorRole === "hr_admin" || actorRole === "hr_director") {
    return { allowed: true };
  }
  if (actorRole !== "line_manager") {
    return {
      allowed: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Only managers or HR Admin can assign, return, or transfer assets.",
    };
  }
  if (Number(actorUserId) === Number(targetEmployeeId)) {
    return {
      allowed: false,
      status: 403,
      code: "ASSIGNEE_SELF",
      message: "Managers cannot assign assets to themselves.",
    };
  }
  if (!solidDirectReportIds.has(Number(targetEmployeeId))) {
    return {
      allowed: false,
      status: 403,
      code: "ASSIGNEE_OUT_OF_SCOPE",
      message: "Assignee is outside your solid-line direct reports.",
    };
  }
  return { allowed: true };
}

export function validateAssignmentDates(
  assignedDate: string,
  expectedReturnDate: string | null | undefined,
  todayIso: string = new Date().toISOString().slice(0, 10)
): { valid: true } | { valid: false; code: "ASSIGNMENT_DATE_INVALID"; message: string } {
  if (assignedDate > todayIso) {
    return {
      valid: false,
      code: "ASSIGNMENT_DATE_INVALID",
      message: "Assigned date cannot be in the future.",
    };
  }
  if (expectedReturnDate && expectedReturnDate < assignedDate) {
    return {
      valid: false,
      code: "ASSIGNMENT_DATE_INVALID",
      message: "Expected return date must be on or after the assigned date.",
    };
  }
  return { valid: true };
}

const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const ConditionSchema = z.enum(["new", "good", "fair", "poor"]).default("good");

const AssignBody = z.object({
  employeeId: z.number().int().positive(),
  condition: ConditionSchema.optional(),
  assignedDate: IsoDate.optional(),
  expectedReturnDate: IsoDate.nullable().optional(),
  notes: z.string().max(1000).optional(),
  source: z.enum(["UI", "API", "IMPORT"]).optional(),
});

const ReturnBody = z.object({
  condition: ConditionSchema.optional(),
  returnDate: IsoDate.optional(),
  notes: z.string().max(1000).default(""),
  source: z.enum(["UI", "API", "IMPORT"]).optional(),
});

const TransferBody = z.object({
  newEmployeeId: z.number().int().positive(),
  condition: ConditionSchema.optional(),
  transferDate: IsoDate.optional(),
  expectedReturnDate: IsoDate.nullable().optional(),
  notes: z.string().max(1000).default(""),
  source: z.enum(["UI", "API", "IMPORT"]).optional(),
});

function isHrRole(role: string) {
  return role === "hr_admin" || role === "hr_director";
}

function isManagerOrHr(role: string) {
  return isHrRole(role) || role === "line_manager";
}

export function createAssetsP13Routes(getSql: (env: Env) => any) {
  const app = new Hono<{ Bindings: Env; Variables: { tenant: TenantContext } }>();

  async function loadSolidReports(sql: any, companyId: number, managerId: number): Promise<Set<number>> {
    const rows: ReportingLineBasic[] = await sql`
      SELECT employee_id, manager_id, kind
      FROM reporting_lines
      WHERE company_id = ${companyId} AND manager_id = ${managerId}
    `;
    return resolveSolidDirectReports(managerId, rows, false);
  }

  // P13.1: Employee self-service assigned assets (row-level, excludes returned & soft-deleted)
  app.get("/api/v1/assets/me", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const sql = getSql(c.env);
    const rows = await sql`
      SELECT
        ca.id,
        ca.asset_code,
        ca.name,
        ca.serial_number,
        ac.name AS category_name,
        aa.allocated_date::text AS allocated_date,
        aa.expected_return_date::text AS expected_return_date,
        ca.status
      FROM asset_allocations aa
      JOIN company_assets ca ON ca.id = aa.asset_id AND ca.company_id = aa.company_id
      LEFT JOIN asset_categories ac ON ac.id = ca.category_id
      JOIN employees e ON e.id = aa.employee_id AND e.company_id = aa.company_id
      WHERE aa.company_id = ${companyId}
        AND aa.employee_id = ${userId}
        AND aa.return_date IS NULL
        AND ca.deleted_at IS NULL
        AND e.is_active = TRUE
      ORDER BY aa.allocated_date DESC, ca.id ASC
    `;

    return c.json({
      results: rows.map((r: any) => ({
        id: Number(r.id),
        assetCode: String(r.asset_code),
        name: String(r.name),
        serialNumber: r.serial_number ? String(r.serial_number) : null,
        categoryName: r.category_name ? String(r.category_name) : "Uncategorised",
        allocatedDate: String(r.allocated_date).slice(0, 10),
        expectedReturnDate: r.expected_return_date ? String(r.expected_return_date).slice(0, 10) : null,
        status: String(r.status),
      })),
    });
  });

  // P13.2: Available inventory picker (HR Admin & Managers only)
  app.get("/api/v1/assets/available", async (c) => {
    const { companyId, role } = c.get("tenant");
    if (!isManagerOrHr(role)) {
      return c.json({ error: "Forbidden", code: "FORBIDDEN" }, 403);
    }
    const q = (c.req.query("q") || "").trim().toLowerCase();
    const sql = getSql(c.env);
    const rows = await sql`
      SELECT ca.id, ca.asset_code, ca.name, ca.serial_number, ca.status, ca.asset_condition, ac.name AS category_name
      FROM company_assets ca
      LEFT JOIN asset_categories ac ON ac.id = ca.category_id
      WHERE ca.company_id = ${companyId}
        AND ca.status = 'available'
        AND ca.deleted_at IS NULL
      ORDER BY ca.name ASC, ca.id ASC
    `;
    const filtered = q
      ? rows.filter(
          (r: any) =>
            String(r.name || "").toLowerCase().includes(q) ||
            String(r.asset_code || "").toLowerCase().includes(q) ||
            String(r.serial_number || "").toLowerCase().includes(q) ||
            String(r.category_name || "").toLowerCase().includes(q)
        )
      : rows;
    return c.json({ results: filtered });
  });

  // P13.2: Solid-line direct reports for manager assignment picker (all active employees for HR)
  app.get("/api/v1/assets/direct-reports", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (!isManagerOrHr(role)) {
      return c.json({ error: "Forbidden", code: "FORBIDDEN" }, 403);
    }
    const sql = getSql(c.env);
    if (isHrRole(role)) {
      const rows = await sql`
        SELECT id, first_name, last_name, role
        FROM employees
        WHERE company_id = ${companyId} AND is_active = TRUE
        ORDER BY first_name, last_name
      `;
      return c.json({
        results: rows.map((r: any) => ({
          id: Number(r.id),
          name: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim(),
          role: String(r.role ?? ""),
        })),
      });
    }

    const solidIds = await loadSolidReports(sql, companyId, userId);
    if (solidIds.size === 0) return c.json({ results: [] });

    const rows = await sql`
      SELECT id, first_name, last_name, role
      FROM employees
      WHERE company_id = ${companyId} AND is_active = TRUE
      ORDER BY first_name, last_name
    `;
    return c.json({
      results: rows
        .filter((r: any) => solidIds.has(Number(r.id)))
        .map((r: any) => ({
          id: Number(r.id),
          name: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim(),
          role: String(r.role ?? ""),
        })),
    });
  });

  // P13.4: Scoped, append-only asset audit trail
  app.get("/api/v1/assets/audit", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const assetIdParam = c.req.query("assetId");
    const actionParam = c.req.query("action");
    const sql = getSql(c.env);

    const rows = await sql`
      SELECT
        aae.id, aae.actor_user_id, aae.action, aae.asset_id,
        ca.asset_code, ca.name AS asset_name,
        aae.previous_assignee_id, aae.new_assignee_id,
        aae.effective_date::text AS effective_date,
        aae.expected_return_date::text AS expected_return_date,
        aae.reason, aae.source, aae.correlation_id, aae.created_at
      FROM asset_audit_events aae
      LEFT JOIN company_assets ca ON ca.id = aae.asset_id
      WHERE aae.company_id = ${companyId}
      ORDER BY aae.created_at DESC
      LIMIT 200
    `;

    let scoped = rows;
    if (!isHrRole(role)) {
      if (role === "line_manager") {
        const solidIds = await loadSolidReports(sql, companyId, userId);
        scoped = rows.filter(
          (r: any) =>
            (r.new_assignee_id != null && solidIds.has(Number(r.new_assignee_id))) ||
            (r.previous_assignee_id != null && solidIds.has(Number(r.previous_assignee_id)))
        );
      } else {
        // Employee: own assignment history only, with previous_assignee_id masked (privacy default §13.4)
        scoped = rows
          .filter((r: any) => Number(r.new_assignee_id) === Number(userId))
          .map((r: any) => ({
            ...r,
            previous_assignee_id: null,
          }));
      }
    }

    if (assetIdParam) {
      const aid = Number(assetIdParam);
      scoped = scoped.filter((r: any) => Number(r.asset_id) === aid);
    }
    if (actionParam) {
      scoped = scoped.filter((r: any) => String(r.action) === actionParam.toUpperCase());
    }

    return c.json({ results: scoped });
  });

  // P13.2: Assign asset (HR Admin or Manager for solid-line direct reports)
  app.post("/api/v1/assets/:id/assign", zValidator("json", AssignBody), async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (!isManagerOrHr(role)) {
      return c.json({ error: "Forbidden", code: "FORBIDDEN" }, 403);
    }
    const id = Number(c.req.param("id"));
    if (!Number.isSafeInteger(id) || id <= 0) return c.json({ error: "Not found" }, 404);

    const body = c.req.valid("json");
    const today = new Date().toISOString().slice(0, 10);
    const assignedDate = body.assignedDate || today;
    const dateCheck = validateAssignmentDates(assignedDate, body.expectedReturnDate ?? null, today);
    if (!dateCheck.valid) {
      return c.json({ error: dateCheck.message, code: dateCheck.code }, 400);
    }

    const sql = getSql(c.env);
    if (!isHrRole(role)) {
      const solidIds = await loadSolidReports(sql, companyId, userId);
      const scopeCheck = canManagerActOnAssignee(userId, role, body.employeeId, solidIds);
      if (!scopeCheck.allowed) {
        return c.json({ error: scopeCheck.message, code: scopeCheck.code }, scopeCheck.status);
      }
    }

    const employee = await sql`
      SELECT 1 FROM employees WHERE id = ${body.employeeId} AND company_id = ${companyId} AND is_active = TRUE
    `;
    if (employee.length === 0) {
      return c.json({ error: "No active employee with that id.", code: "ASSIGNEE_OUT_OF_SCOPE" }, 422);
    }

    const assets = await sql`
      SELECT id, status, deleted_at FROM company_assets WHERE id = ${id} AND company_id = ${companyId} LIMIT 1
    `;
    const asset = assets[0];
    if (!asset) return c.json({ error: "Not found" }, 404);
    if (asset.status === "allocated") {
      return c.json(
        { error: "Asset is already assigned. Return or transfer it first.", code: "ASSET_ALREADY_ASSIGNED" },
        409
      );
    }
    if (!isAssetAvailable(String(asset.status), asset.deleted_at)) {
      return c.json({ error: "Asset is not available for assignment.", code: "ASSET_NOT_AVAILABLE" }, 409);
    }

    const cond = body.condition ?? "good";
    const correlationId = `corr-assign-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    await sql`
      INSERT INTO asset_allocations (
        company_id, asset_id, employee_id, allocated_date, expected_return_date,
        condition_on_allocation, assigned_by, assignment_notes
      ) VALUES (
        ${companyId}, ${id}, ${body.employeeId}, ${assignedDate}::date, ${body.expectedReturnDate ?? null}::date,
        ${cond}, ${userId}, ${body.notes ?? ""}
      )
    `;
    await sql`
      UPDATE company_assets SET status = 'allocated', asset_condition = ${cond} WHERE id = ${id}
    `;
    await sql`
      INSERT INTO asset_audit_events (
        id, company_id, actor_user_id, action, asset_id, previous_assignee_id, new_assignee_id,
        effective_date, expected_return_date, reason, source, correlation_id
      ) VALUES (
        ${`audit-a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`}, ${companyId}, ${userId},
        'ASSIGN', ${id}, ${null}, ${body.employeeId}, ${assignedDate}::date, ${body.expectedReturnDate ?? null}::date,
        ${body.notes ?? ""}, ${body.source ?? "UI"}, ${correlationId}
      )
    `;

    return c.json({ id, status: "allocated", employeeId: body.employeeId, correlationId }, 201);
  });

  // P13.2: Return asset (HR Admin or Manager for solid-line direct reports)
  app.post("/api/v1/assets/:id/return", zValidator("json", ReturnBody), async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (!isManagerOrHr(role)) {
      return c.json({ error: "Forbidden", code: "FORBIDDEN" }, 403);
    }
    const id = Number(c.req.param("id"));
    if (!Number.isSafeInteger(id) || id <= 0) return c.json({ error: "Not found" }, 404);

    const body = c.req.valid("json");
    const cond = body.condition ?? "good";
    const nextStatus = cond === "new" || cond === "good" ? "available" : "maintenance";
    const returnDate = body.returnDate || new Date().toISOString().slice(0, 10);
    const sql = getSql(c.env);

    const open = await sql`
      SELECT id, employee_id FROM asset_allocations
      WHERE asset_id = ${id} AND company_id = ${companyId} AND return_date IS NULL
      LIMIT 1
    `;
    if (open.length === 0) {
      return c.json({ error: "This asset is not assigned to anyone.", code: "ASSET_NOT_AVAILABLE" }, 409);
    }
    const holderId = Number(open[0].employee_id);

    if (!isHrRole(role)) {
      const solidIds = await loadSolidReports(sql, companyId, userId);
      const scopeCheck = canManagerActOnAssignee(userId, role, holderId, solidIds);
      if (!scopeCheck.allowed) {
        return c.json({ error: scopeCheck.message, code: scopeCheck.code }, scopeCheck.status);
      }
    }

    const correlationId = `corr-ret-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await sql`
      UPDATE asset_allocations
      SET return_date = ${returnDate}::date, condition_on_return = ${cond}, return_notes = ${body.notes}
      WHERE id = ${open[0].id}
    `;
    await sql`
      UPDATE company_assets SET status = ${nextStatus}, asset_condition = ${cond} WHERE id = ${id}
    `;
    await sql`
      INSERT INTO asset_audit_events (
        id, company_id, actor_user_id, action, asset_id, previous_assignee_id, new_assignee_id,
        effective_date, reason, source, correlation_id
      ) VALUES (
        ${`audit-r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`}, ${companyId}, ${userId},
        'RETURN', ${id}, ${holderId}, ${null}, ${returnDate}::date,
        ${body.notes ?? ""}, ${body.source ?? "UI"}, ${correlationId}
      )
    `;

    return c.json({ id, status: nextStatus, previousAssigneeId: holderId, correlationId });
  });

  // P13.2: Transfer asset within reporting line (or cross-org for HR Admin)
  app.post("/api/v1/assets/:id/transfer", zValidator("json", TransferBody), async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (!isManagerOrHr(role)) {
      return c.json({ error: "Forbidden", code: "FORBIDDEN" }, 403);
    }
    const id = Number(c.req.param("id"));
    if (!Number.isSafeInteger(id) || id <= 0) return c.json({ error: "Not found" }, 404);

    const body = c.req.valid("json");
    const today = new Date().toISOString().slice(0, 10);
    const transferDate = body.transferDate || today;
    const dateCheck = validateAssignmentDates(transferDate, body.expectedReturnDate ?? null, today);
    if (!dateCheck.valid) {
      return c.json({ error: dateCheck.message, code: dateCheck.code }, 400);
    }

    const sql = getSql(c.env);
    const open = await sql`
      SELECT id, employee_id FROM asset_allocations
      WHERE asset_id = ${id} AND company_id = ${companyId} AND return_date IS NULL
      LIMIT 1
    `;
    if (open.length === 0) {
      return c.json({ error: "Asset has no active assignment to transfer.", code: "ASSET_NOT_AVAILABLE" }, 409);
    }
    const previousAssigneeId = Number(open[0].employee_id);

    if (!isHrRole(role)) {
      const solidIds = await loadSolidReports(sql, companyId, userId);
      const fromCheck = canManagerActOnAssignee(userId, role, previousAssigneeId, solidIds);
      if (!fromCheck.allowed) {
        return c.json({ error: fromCheck.message, code: fromCheck.code }, fromCheck.status);
      }
      const toCheck = canManagerActOnAssignee(userId, role, body.newEmployeeId, solidIds);
      if (!toCheck.allowed) {
        return c.json({ error: toCheck.message, code: toCheck.code }, toCheck.status);
      }
    }

    const cond = body.condition ?? "good";
    const correlationId = `corr-xfer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    await sql`
      UPDATE asset_allocations
      SET return_date = ${transferDate}::date, condition_on_return = ${cond}, return_notes = ${`Transferred: ${body.notes}`}
      WHERE id = ${open[0].id}
    `;
    await sql`
      INSERT INTO asset_allocations (
        company_id, asset_id, employee_id, allocated_date, expected_return_date,
        condition_on_allocation, assigned_by, assignment_notes
      ) VALUES (
        ${companyId}, ${id}, ${body.newEmployeeId}, ${transferDate}::date, ${body.expectedReturnDate ?? null}::date,
        ${cond}, ${userId}, ${body.notes ?? ""}
      )
    `;
    await sql`
      INSERT INTO asset_audit_events (
        id, company_id, actor_user_id, action, asset_id, previous_assignee_id, new_assignee_id,
        effective_date, expected_return_date, reason, source, correlation_id
      ) VALUES (
        ${`audit-t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`}, ${companyId}, ${userId},
        'TRANSFER', ${id}, ${previousAssigneeId}, ${body.newEmployeeId}, ${transferDate}::date,
        ${body.expectedReturnDate ?? null}::date, ${body.notes ?? ""}, ${body.source ?? "UI"}, ${correlationId}
      )
    `;

    return c.json({
      id,
      status: "allocated",
      previousAssigneeId,
      newAssigneeId: body.newEmployeeId,
      correlationId,
    });
  });

  return app;
}

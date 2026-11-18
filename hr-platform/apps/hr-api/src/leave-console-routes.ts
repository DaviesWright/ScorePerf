import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type postgres from "postgres";
import type { TenantContext } from "./auth";
import type { Env } from "./index";

type Sql = ReturnType<typeof postgres>;

const isHrOrManager = (role: string) =>
  role === "hr_admin" || role === "hr_director" || role === "line_manager";

const ModeSwitchBody = z.object({
  mode: z.enum(["ess", "role"]),
  roleContext: z.string().max(100).optional(),
});

export function createLeaveConsoleRoutes(getSql: (env: Env) => Sql) {
  const routes = new Hono<{ Bindings: Env; Variables: { tenant: TenantContext } }>();

  // GET /api/v1/leave/dashboard/context
  routes.get("/api/v1/leave/dashboard/context", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const sql = getSql(c.env);

    const [emp] = await sql`
      SELECT e.id, e.first_name, e.last_name, d.name AS department_name
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE e.id = ${userId} AND e.company_id = ${companyId}
    `;

    const depts = await sql`
      SELECT id, name FROM departments WHERE company_id = ${companyId} ORDER BY name
    `;

    const greetingName = emp
      ? `${emp.first_name} ${emp.last_name}`.trim()
      : "Team Member";

    return c.json({
      greetingName,
      currentRole: role,
      availableRoles: isHrOrManager(role) ? [role, "employee"] : ["employee"],
      currentMode: isHrOrManager(role) ? "role" : "ess",
      scopeOptions: depts.map((d) => ({ id: String(d.id), name: String(d.name) })),
      lastRefreshedAt: new Date().toISOString(),
    });
  });

  // POST /api/v1/leave/dashboard/mode — CON-010 audit mode switch
  routes.post(
    "/api/v1/leave/dashboard/mode",
    zValidator("json", ModeSwitchBody),
    async (c) => {
      const { companyId, userId, role } = c.get("tenant");
      const body = c.req.valid("json");
      const sql = getSql(c.env);

      await sql`
        INSERT INTO arch_audit_log (
          id, company_id, actor_employee_id, context, scope_type, entity_type, entity_id, action, after_json
        ) VALUES (
          ${`AUD-MODE-${crypto.randomUUID()}`},
          ${String(companyId)},
          ${String(userId)},
          ${body.mode === "ess" ? "ESS" : "HRMS"},
          ${body.mode === "ess" ? "SELF" : "COMPANY"},
          'dashboard',
          ${String(userId)},
          'DASHBOARD_MODE_SWITCHED',
          ${JSON.stringify({ toMode: body.mode, roleContext: body.roleContext ?? role })}
        )
      `.catch(() => {});

      return c.json({
        mode: body.mode,
        roleContext: body.mode === "ess" ? "employee" : role,
        refreshedAt: new Date().toISOString(),
      });
    },
  );

  // GET /api/v1/leave/dashboard/on-leave — CON-001 / CON-002
  routes.get("/api/v1/leave/dashboard/on-leave", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (!isHrOrManager(role)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const deptFilter = c.req.query("dept");
    const sql = getSql(c.env);

    const rows = await sql`
      SELECT lr.id, lr.employee_id, e.first_name, e.last_name,
             d.name AS department_name, lt.name AS leave_type_name,
             lr.start_date, lr.end_date, lr.requested_days, lr.status,
             lr.reason
      FROM leave_requests lr
      JOIN employees e ON e.id = lr.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
      WHERE lr.company_id = ${companyId}
        AND lr.status = 'APPROVED'
        ${deptFilter ? sql`AND d.name = ${deptFilter}` : sql``}
      ORDER BY lr.start_date ASC
      LIMIT 200
    `;

    return c.json({
      asAt: new Date().toISOString(),
      actorId: userId,
      results: rows,
    });
  });

  // GET /api/v1/leave/ess/summary — CON-004 strictly self-scoped
  routes.get("/api/v1/leave/ess/summary", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const requestedEmployeeId = c.req.query("employee_id");
    if (requestedEmployeeId && requestedEmployeeId !== String(userId)) {
      return c.json(
        {
          error: "Access denied: ESS endpoints only return the authenticated employee's own records.",
          code: "ESS_SELF_SCOPE_VIOLATION",
        },
        403,
      );
    }

    const sql = getSql(c.env);
    const ownLeaves = await sql`
      SELECT lr.id, lr.start_date, lr.end_date, lr.requested_days, lr.status, lt.name AS leave_type_name
      FROM leave_requests lr
      LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
      WHERE lr.company_id = ${companyId} AND lr.employee_id = ${userId}
      ORDER BY lr.start_date DESC
      LIMIT 20
    `;

    return c.json({
      asAt: new Date().toISOString(),
      employeeId: userId,
      requests: ownLeaves,
    });
  });

  return routes;
}

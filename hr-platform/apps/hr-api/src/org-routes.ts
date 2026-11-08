import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type postgres from "postgres";
import type { TenantContext } from "./auth";
// Type-only: erased at runtime, so index.ts can import this module without a cycle.
import type { Env } from "./index";

// Organogram and HR employee edits: the company tree generated from solid reporting lines, the job title (employees.role)
// HR fills in per person, and name, email and office corrections. The job title is display only; access comes from
// access_role, never from role. Mounted from index.ts after `authenticate`.

type Sql = ReturnType<typeof postgres>;

const isHr = (role: string) => role === "hr_admin" || role === "hr_director";
const parseId = (raw: string): number | null => {
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

const JobTitleBody = z.object({ jobTitle: z.string().trim().min(2).max(100) });
const EmployeeEditBody = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  office: z.enum(["London", "Accra", "Windhoek"]).nullable(),
});

export function createOrgRoutes(getSql: (env: Env) => Sql) {
  const routes = new Hono<{ Bindings: Env; Variables: { tenant: TenantContext } }>();

  // Every active employee with contact details, job title, department, office and solid manager. The client builds the tree.
  routes.get("/api/v1/org-chart", async (c) => {
    const { companyId, role } = c.get("tenant");
    if (!isHr(role)) return c.json({ error: "Forbidden" }, 403);
    const rows = await getSql(c.env)`
      SELECT e.id, e.first_name, e.last_name, e.email, e.role AS job_title, e.office,
        d.name AS department_name,
        m.id AS manager_id, m.first_name AS m_first, m.last_name AS m_last
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN reporting_lines rl ON rl.employee_id = e.id AND rl.kind = 'solid'
      LEFT JOIN employees m ON m.id = rl.manager_id
      WHERE e.company_id = ${companyId} AND e.is_active = true
      ORDER BY e.last_name, e.first_name
    `;
    return c.json({
      results: rows.map((r) => ({
        id: Number(r.id),
        name: `${r.first_name} ${r.last_name}`,
        firstName: String(r.first_name),
        lastName: String(r.last_name),
        email: String(r.email),
        jobTitle: String(r.job_title),
        department: r.department_name === null ? null : String(r.department_name),
        office: r.office === null ? null : String(r.office),
        managerId: r.manager_id === null ? null : Number(r.manager_id),
        managerName: r.manager_id === null ? null : `${r.m_first} ${r.m_last}`,
      })),
    });
  });

  // HR fills in or changes a person's job title.
  routes.post("/api/v1/employees/:id/role", zValidator("json", JobTitleBody), async (c) => {
    const { companyId, role } = c.get("tenant");
    if (!isHr(role)) return c.json({ error: "Forbidden" }, 403);
    const id = parseId(c.req.param("id"));
    if (id === null) return c.json({ error: "Not found" }, 404);
    const { jobTitle } = c.req.valid("json");
    const [row] = await getSql(c.env)`
      UPDATE employees SET role = ${jobTitle}, updated_at = NOW()
      WHERE id = ${id} AND company_id = ${companyId}
      RETURNING id, role
    `;
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json({ id: Number(row.id), jobTitle: String(row.role) });
  });

  // HR corrects a person's name, email and office. Email must stay unique within the company.
  routes.post("/api/v1/employees/:id/update", zValidator("json", EmployeeEditBody), async (c) => {
    const { companyId, role } = c.get("tenant");
    if (!isHr(role)) return c.json({ error: "Forbidden" }, 403);
    const id = parseId(c.req.param("id"));
    if (id === null) return c.json({ error: "Not found" }, 404);
    const body = c.req.valid("json");
    try {
      const [row] = await getSql(c.env)`
        UPDATE employees SET first_name = ${body.firstName}, last_name = ${body.lastName},
          email = ${body.email.toLowerCase()}, office = ${body.office}, updated_at = NOW()
        WHERE id = ${id} AND company_id = ${companyId}
        RETURNING id
      `;
      if (!row) return c.json({ error: "Not found" }, 404);
      return c.json({ id: Number(row.id) });
    } catch (err) {
      if (typeof err === "object" && err !== null && (err as { code?: string }).code === "23505") {
        return c.json({ error: "Another employee already uses this email." }, 409);
      }
      throw err;
    }
  });

  return routes;
}

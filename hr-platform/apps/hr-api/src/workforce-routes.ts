import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { TenantContext } from "./auth";
import type { Env } from "./index";

// Squads, redeployments and custom rating scales (to-do P1). Each write records who, when, what changed and
// from where in workforce_audit_events (append-only, see migration 0039).

const isHr = (role: string) => role === "hr_admin" || role === "hr_director";

export async function writeWorkforceAudit(
  sql: any,
  e: {
    companyId: number;
    actorId: number;
    actorRole: string;
    entityType: "squad" | "squad_member" | "redeployment" | "employee" | "rating_scale";
    entityId: string | number;
    action: string;
    before?: unknown;
    after?: unknown;
    source?: string;
  },
) {
  await sql`
    INSERT INTO workforce_audit_events (company_id, actor_employee_id, actor_role, entity_type, entity_id, action, before_json, after_json, source)
    VALUES (${e.companyId}, ${e.actorId}, ${e.actorRole}, ${e.entityType}, ${String(e.entityId)}, ${e.action},
            ${e.before === undefined ? null : JSON.stringify(e.before)}::jsonb,
            ${e.after === undefined ? null : JSON.stringify(e.after)}::jsonb,
            ${e.source ?? "UI"})
  `;
}

// ---------- pure rules (unit tested) ----------

export interface ScaleLevel {
  score: number;
  label: string;
  description: string;
}

export function validateScaleLevels(levels: ScaleLevel[]): string[] {
  const errors: string[] = [];
  if (levels.length < 2 || levels.length > 10) errors.push("A scale needs between 2 and 10 levels.");
  const scores = levels.map((l) => l.score);
  if (new Set(scores).size !== scores.length) errors.push("Each level needs a different score.");
  if (levels.some((l) => !Number.isFinite(l.score) || l.score < 0 || l.score > 100)) errors.push("Scores must be between 0 and 100.");
  if (levels.some((l) => !l.label.trim())) errors.push("Every level needs a label.");
  const labels = levels.map((l) => l.label.trim().toLowerCase());
  if (new Set(labels).size !== labels.length) errors.push("Each level needs a different label.");
  return errors;
}

/** Who may see a squad's member list: HR, and the squad's own lead and members. */
export function canSeeSquad(role: string, actorId: number, leadId: number | null, memberIds: number[]): boolean {
  return isHr(role) || leadId === actorId || memberIds.includes(actorId);
}

/** Who may change a squad's members: HR and the squad lead. */
export function canManageSquad(role: string, actorId: number, leadId: number | null): boolean {
  return isHr(role) || (leadId !== null && leadId === actorId);
}

/** Maker-checker: HR approves, and never their own request. */
export function canDecideRedeployment(role: string, actorId: number, requestedBy: number | null): { ok: true } | { ok: false; message: string } {
  if (!isHr(role)) return { ok: false, message: "Only HR can approve or reject a redeployment." };
  if (requestedBy !== null && requestedBy === actorId) return { ok: false, message: "You cannot approve a redeployment you requested." };
  return { ok: true };
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------- routes ----------

const SquadBody = z.object({
  name: z.string().trim().min(2).max(120),
  leadEmployeeId: z.number().int().positive().nullable().optional(),
  mission: z.string().trim().max(1000).default(""),
  activeFocus: z.string().trim().max(120).default(""),
  memberIds: z.array(z.number().int().positive()).max(200).default([]),
});

const MembersBody = z.object({
  add: z.array(z.number().int().positive()).max(200).default([]),
  remove: z.array(z.number().int().positive()).max(200).default([]),
});

const RedeploymentBody = z.object({
  employeeId: z.number().int().positive(),
  toDepartmentId: z.number().int().positive(),
  toJobTitle: z.string().trim().min(2).max(120),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().min(5).max(2000),
});

const DecisionBody = z.object({
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(1000).optional(),
});

const ScaleBody = z.object({
  name: z.string().trim().min(2).max(120),
  scope: z.string().trim().max(200).default(""),
  levels: z
    .array(z.object({ score: z.number(), label: z.string().max(60), description: z.string().max(300).default("") }))
    .min(1)
    .max(20),
});

type AppEnv = { Bindings: Env; Variables: { tenant: TenantContext } };

export function createWorkforceRoutes(getSql: (env: Env) => any) {
  const app = new Hono<AppEnv>();

  async function activeEmployeeIds(sql: any, companyId: number, ids: number[]): Promise<Set<number>> {
    if (ids.length === 0) return new Set();
    const rows = await sql`SELECT id FROM employees WHERE company_id = ${companyId} AND is_active AND id = ANY(${ids})`;
    return new Set(rows.map((r: any) => Number(r.id)));
  }

  async function loadSquads(sql: any, companyId: number, onlyForEmployee: number | null) {
    const squads = onlyForEmployee === null
      ? await sql`
          SELECT s.id, s.name, s.lead_employee_id, s.mission, s.active_focus, s.created_at,
                 le.first_name AS lead_first, le.last_name AS lead_last
          FROM workforce_squads s
          LEFT JOIN employees le ON le.id = s.lead_employee_id AND le.company_id = s.company_id
          WHERE s.company_id = ${companyId} AND s.archived_at IS NULL
          ORDER BY s.name`
      : await sql`
          SELECT s.id, s.name, s.lead_employee_id, s.mission, s.active_focus, s.created_at,
                 le.first_name AS lead_first, le.last_name AS lead_last
          FROM workforce_squads s
          LEFT JOIN employees le ON le.id = s.lead_employee_id AND le.company_id = s.company_id
          WHERE s.company_id = ${companyId} AND s.archived_at IS NULL
            AND (s.lead_employee_id = ${onlyForEmployee}
                 OR EXISTS (SELECT 1 FROM workforce_squad_members m
                            WHERE m.squad_id = s.id AND m.employee_id = ${onlyForEmployee}))
          ORDER BY s.name`;
    const ids = squads.map((s: any) => Number(s.id));
    const members = ids.length
      ? await sql`
          SELECT m.squad_id, e.id, e.first_name, e.last_name, e.role AS job_title, d.name AS department
          FROM workforce_squad_members m
          JOIN employees e ON e.id = m.employee_id AND e.company_id = m.company_id AND e.is_active
          LEFT JOIN departments d ON d.id = e.department_id
          WHERE m.company_id = ${companyId} AND m.squad_id = ANY(${ids})
          ORDER BY e.last_name, e.first_name`
      : [];
    return squads.map((s: any) => ({
      id: Number(s.id),
      name: s.name,
      leadEmployeeId: s.lead_employee_id === null ? null : Number(s.lead_employee_id),
      leadName: [s.lead_first, s.lead_last].filter(Boolean).join(" ") || null,
      mission: s.mission,
      activeFocus: s.active_focus,
      // Colleagues see name, job title and department only.
      members: members
        .filter((m: any) => Number(m.squad_id) === Number(s.id))
        .map((m: any) => ({ id: Number(m.id), name: `${m.first_name} ${m.last_name}`, jobTitle: m.job_title, department: m.department })),
    }));
  }

  // HR sees every squad. Everyone else sees the squads they lead or belong to, with fellow members.
  app.get("/api/v1/squads", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const sql = getSql(c.env);
    return c.json({ results: await loadSquads(sql, companyId, isHr(role) ? null : userId) });
  });

  app.get("/api/v1/squads/me", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const sql = getSql(c.env);
    return c.json({ results: await loadSquads(sql, companyId, userId) });
  });

  app.post("/api/v1/squads", zValidator("json", SquadBody), async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (!isHr(role) && role !== "line_manager") return c.json({ error: "Only HR and managers can form a squad." }, 403);
    const body = c.req.valid("json");
    const sql = getSql(c.env);
    // A manager who forms a squad leads it unless HR names someone else.
    const leadId = body.leadEmployeeId ?? (isHr(role) ? null : userId);
    if (!isHr(role) && leadId !== userId) return c.json({ error: "Managers can only form squads they lead." }, 403);
    const wanted = [...new Set([...body.memberIds, ...(leadId ? [leadId] : [])])];
    const valid = await activeEmployeeIds(sql, companyId, wanted);
    const unknown = wanted.filter((id) => !valid.has(id));
    if (unknown.length) return c.json({ error: "Some people are not active employees of this company.", unknown }, 422);

    const dup = await sql`SELECT id FROM workforce_squads WHERE company_id = ${companyId} AND archived_at IS NULL AND lower(name) = lower(${body.name})`;
    if (dup.length) return c.json({ error: `A squad called "${body.name}" already exists.` }, 409);

    const created = await sql.begin(async (tx: any) => {
      const [s] = await tx`
        INSERT INTO workforce_squads (company_id, name, lead_employee_id, mission, active_focus, created_by)
        VALUES (${companyId}, ${body.name}, ${leadId}, ${body.mission}, ${body.activeFocus}, ${userId})
        RETURNING id`;
      for (const id of wanted) {
        await tx`INSERT INTO workforce_squad_members (squad_id, employee_id, company_id, added_by) VALUES (${s.id}, ${id}, ${companyId}, ${userId}) ON CONFLICT DO NOTHING`;
      }
      await writeWorkforceAudit(tx, {
        companyId, actorId: userId, actorRole: role, entityType: "squad", entityId: s.id, action: "CREATE",
        after: { name: body.name, leadEmployeeId: leadId, mission: body.mission, activeFocus: body.activeFocus, memberIds: wanted },
      });
      return Number(s.id);
    });
    const [squad] = (await loadSquads(sql, companyId, null)).filter((s: any) => s.id === created);
    return c.json({ squad }, 201);
  });

  app.post("/api/v1/squads/:id/members", zValidator("json", MembersBody), async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const squadId = Number(c.req.param("id"));
    const body = c.req.valid("json");
    const sql = getSql(c.env);
    const [s] = await sql`SELECT id, lead_employee_id FROM workforce_squads WHERE id = ${squadId} AND company_id = ${companyId} AND archived_at IS NULL`;
    if (!s) return c.json({ error: "Squad not found." }, 404);
    const leadId = s.lead_employee_id === null ? null : Number(s.lead_employee_id);
    if (!canManageSquad(role, userId, leadId)) return c.json({ error: "Only HR or the squad lead can change members." }, 403);
    const valid = await activeEmployeeIds(sql, companyId, body.add);
    const unknown = body.add.filter((id) => !valid.has(id));
    if (unknown.length) return c.json({ error: "Some people are not active employees of this company.", unknown }, 422);
    await sql.begin(async (tx: any) => {
      for (const id of body.add) {
        await tx`INSERT INTO workforce_squad_members (squad_id, employee_id, company_id, added_by) VALUES (${squadId}, ${id}, ${companyId}, ${userId}) ON CONFLICT DO NOTHING`;
      }
      for (const id of body.remove) {
        await tx`DELETE FROM workforce_squad_members WHERE squad_id = ${squadId} AND employee_id = ${id} AND company_id = ${companyId}`;
      }
      await writeWorkforceAudit(tx, {
        companyId, actorId: userId, actorRole: role, entityType: "squad_member", entityId: squadId, action: "CHANGE_MEMBERS",
        after: { added: body.add, removed: body.remove },
      });
    });
    const [squad] = (await loadSquads(sql, companyId, null)).filter((x: any) => x.id === squadId);
    return c.json({ squad });
  });

  // Redeployments. HR sees all; a manager sees the ones they requested; an employee sees their own.
  app.get("/api/v1/redeployments", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const sql = getSql(c.env);
    const rows = await sql`
      SELECT r.*, e.first_name, e.last_name, fd.name AS from_department, td.name AS to_department,
             rq.first_name AS req_first, rq.last_name AS req_last
      FROM workforce_redeployments r
      JOIN employees e ON e.id = r.employee_id AND e.company_id = r.company_id
      LEFT JOIN departments fd ON fd.id = r.from_department_id
      LEFT JOIN departments td ON td.id = r.to_department_id
      LEFT JOIN employees rq ON rq.id = r.requested_by
      WHERE r.company_id = ${companyId}
        AND (${isHr(role)}::boolean OR r.requested_by = ${userId} OR r.employee_id = ${userId})
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT 200`;
    return c.json({
      results: rows.map((r: any) => ({
        id: Number(r.id),
        employeeId: Number(r.employee_id),
        employeeName: `${r.first_name} ${r.last_name}`,
        fromDepartment: r.from_department,
        toDepartment: r.to_department,
        fromJobTitle: r.from_job_title,
        toJobTitle: r.to_job_title,
        effectiveDate: String(r.effective_date).slice(0, 10),
        reason: r.reason,
        status: r.status,
        requestedBy: [r.req_first, r.req_last].filter(Boolean).join(" ") || null,
        decidedAt: r.decided_at ? new Date(String(r.decided_at)).toISOString() : null,
        appliedAt: r.applied_at ? new Date(String(r.applied_at)).toISOString() : null,
      })),
    });
  });

  app.post("/api/v1/redeployments", zValidator("json", RedeploymentBody), async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const body = c.req.valid("json");
    const sql = getSql(c.env);
    if (!isHr(role)) {
      if (role !== "line_manager") return c.json({ error: "Only HR and managers can request a redeployment." }, 403);
      const line = await sql`SELECT 1 FROM reporting_lines WHERE company_id = ${companyId} AND employee_id = ${body.employeeId} AND manager_id = ${userId} AND kind = 'solid'`;
      if (!line.length) return c.json({ error: "Managers can only request redeployments for their direct reports." }, 403);
    }
    if (body.effectiveDate < todayIso()) return c.json({ error: "The effective date cannot be in the past." }, 422);
    const [emp] = await sql`SELECT id, department_id, role FROM employees WHERE id = ${body.employeeId} AND company_id = ${companyId} AND is_active`;
    if (!emp) return c.json({ error: "Employee not found." }, 404);
    const [dept] = await sql`SELECT id FROM departments WHERE id = ${body.toDepartmentId} AND company_id = ${companyId}`;
    if (!dept) return c.json({ error: "Department not found." }, 404);
    const open = await sql`SELECT id FROM workforce_redeployments WHERE company_id = ${companyId} AND employee_id = ${body.employeeId} AND status IN ('pending', 'approved')`;
    if (open.length) return c.json({ error: "This employee already has an open redeployment." }, 409);

    const id = await sql.begin(async (tx: any) => {
      const [r] = await tx`
        INSERT INTO workforce_redeployments (company_id, employee_id, from_department_id, to_department_id, from_job_title, to_job_title, effective_date, reason, requested_by)
        VALUES (${companyId}, ${body.employeeId}, ${emp.department_id}, ${body.toDepartmentId}, ${emp.role}, ${body.toJobTitle}, ${body.effectiveDate}, ${body.reason}, ${userId})
        RETURNING id`;
      await writeWorkforceAudit(tx, {
        companyId, actorId: userId, actorRole: role, entityType: "redeployment", entityId: r.id, action: "REQUEST",
        before: { departmentId: emp.department_id, jobTitle: emp.role },
        after: { departmentId: body.toDepartmentId, jobTitle: body.toJobTitle, effectiveDate: body.effectiveDate, reason: body.reason },
      });
      return Number(r.id);
    });
    return c.json({ id, status: "pending" }, 201);
  });

  app.post("/api/v1/redeployments/:id/decision", zValidator("json", DecisionBody), async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const id = Number(c.req.param("id"));
    const { decision, note } = c.req.valid("json");
    const sql = getSql(c.env);
    const [r] = await sql`SELECT * FROM workforce_redeployments WHERE id = ${id} AND company_id = ${companyId}`;
    if (!r) return c.json({ error: "Redeployment not found." }, 404);
    if (r.status !== "pending") return c.json({ error: `This redeployment is already ${r.status}.` }, 409);
    const allowed = canDecideRedeployment(role, userId, r.requested_by === null ? null : Number(r.requested_by));
    if (!allowed.ok) return c.json({ error: allowed.message }, 403);

    const effective = String(r.effective_date).slice(0, 10);
    const applyNow = decision === "approve" && effective <= todayIso();
    const status = decision === "reject" ? "rejected" : applyNow ? "applied" : "approved";
    await sql.begin(async (tx: any) => {
      await tx`
        UPDATE workforce_redeployments
        SET status = ${status}, decided_by = ${userId}, decided_at = NOW(), decision_note = ${note ?? null},
            applied_at = ${applyNow ? new Date().toISOString() : null}
        WHERE id = ${id} AND company_id = ${companyId}`;
      await writeWorkforceAudit(tx, {
        companyId, actorId: userId, actorRole: role, entityType: "redeployment", entityId: id,
        action: decision === "approve" ? "APPROVE" : "REJECT", after: { status, note: note ?? null },
      });
      if (applyNow) {
        await applyRedeployment(tx, companyId, userId, role, r);
      }
    });
    return c.json({ id, status });
  });

  // Applies approved redeployments whose date has arrived. Safe to run repeatedly (HR action or a scheduled job).
  app.post("/api/v1/redeployments/apply-due", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (!isHr(role)) return c.json({ error: "Only HR can apply redeployments." }, 403);
    const sql = getSql(c.env);
    const due = await sql`SELECT * FROM workforce_redeployments WHERE company_id = ${companyId} AND status = 'approved' AND effective_date <= CURRENT_DATE`;
    for (const r of due) {
      await sql.begin(async (tx: any) => {
        await tx`UPDATE workforce_redeployments SET status = 'applied', applied_at = NOW() WHERE id = ${r.id} AND status = 'approved'`;
        await applyRedeployment(tx, companyId, userId, role, r);
      });
    }
    return c.json({ applied: due.length });
  });

  // Department list for pickers (redeployment target).
  app.get("/api/v1/departments", async (c) => {
    const { companyId } = c.get("tenant");
    const sql = getSql(c.env);
    const rows = await sql`SELECT id, name FROM departments WHERE company_id = ${companyId} ORDER BY name`;
    return c.json({ results: rows.map((r: any) => ({ id: Number(r.id), name: r.name })) });
  });

  // Custom rating scales.
  app.get("/api/v1/performance/rating-scales", async (c) => {
    const { companyId } = c.get("tenant");
    const sql = getSql(c.env);
    const rows = await sql`SELECT id, name, scope, levels, created_at FROM performance_rating_scales WHERE company_id = ${companyId} AND archived_at IS NULL ORDER BY created_at, id`;
    return c.json({ results: rows.map((r: any) => ({ id: Number(r.id), name: r.name, scope: r.scope, levels: r.levels })) });
  });

  app.post("/api/v1/performance/rating-scales", zValidator("json", ScaleBody), async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (!isHr(role)) return c.json({ error: "Only HR can add rating scales." }, 403);
    const body = c.req.valid("json");
    const levels = body.levels.map((l) => ({ score: l.score, label: l.label.trim(), description: l.description.trim() }))
      .sort((a, b) => b.score - a.score);
    const errors = validateScaleLevels(levels);
    if (errors.length) return c.json({ error: "The scale is not valid.", errors }, 422);
    const sql = getSql(c.env);
    const dup = await sql`SELECT id FROM performance_rating_scales WHERE company_id = ${companyId} AND archived_at IS NULL AND lower(name) = lower(${body.name})`;
    if (dup.length) return c.json({ error: `A scale called "${body.name}" already exists.` }, 409);
    const id = await sql.begin(async (tx: any) => {
      const [r] = await tx`
        INSERT INTO performance_rating_scales (company_id, name, scope, levels, created_by)
        VALUES (${companyId}, ${body.name}, ${body.scope}, ${JSON.stringify(levels)}::jsonb, ${userId}) RETURNING id`;
      await writeWorkforceAudit(tx, {
        companyId, actorId: userId, actorRole: role, entityType: "rating_scale", entityId: r.id, action: "CREATE",
        after: { name: body.name, scope: body.scope, levels },
      });
      return Number(r.id);
    });
    return c.json({ scale: { id, name: body.name, scope: body.scope, levels } }, 201);
  });

  app.post("/api/v1/performance/rating-scales/:id/archive", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (!isHr(role)) return c.json({ error: "Only HR can archive rating scales." }, 403);
    const id = Number(c.req.param("id"));
    const sql = getSql(c.env);
    const rows = await sql`UPDATE performance_rating_scales SET archived_at = NOW() WHERE id = ${id} AND company_id = ${companyId} AND archived_at IS NULL RETURNING id, name`;
    if (!rows.length) return c.json({ error: "Scale not found." }, 404);
    await writeWorkforceAudit(sql, { companyId, actorId: userId, actorRole: role, entityType: "rating_scale", entityId: id, action: "ARCHIVE", before: { name: rows[0].name } });
    return c.json({ archived: true });
  });

  // Audit trail for these records (HR only).
  app.get("/api/v1/workforce/audit", async (c) => {
    const { companyId, role } = c.get("tenant");
    if (!isHr(role)) return c.json({ error: "Only HR can view the audit trail." }, 403);
    const sql = getSql(c.env);
    const rows = await sql`
      SELECT a.*, e.first_name, e.last_name FROM workforce_audit_events a
      LEFT JOIN employees e ON e.id = a.actor_employee_id
      WHERE a.company_id = ${companyId} ORDER BY a.created_at DESC, a.id DESC LIMIT 200`;
    return c.json({
      results: rows.map((r: any) => ({
        id: Number(r.id),
        actor: [r.first_name, r.last_name].filter(Boolean).join(" ") || null,
        actorRole: r.actor_role,
        entityType: r.entity_type,
        entityId: r.entity_id,
        action: r.action,
        before: r.before_json,
        after: r.after_json,
        source: r.source,
        at: new Date(String(r.created_at)).toISOString(),
      })),
    });
  });

  return app;
}

async function applyRedeployment(tx: any, companyId: number, actorId: number, actorRole: string, r: any) {
  const [before] = await tx`SELECT department_id, role FROM employees WHERE id = ${r.employee_id} AND company_id = ${companyId}`;
  await tx`
    UPDATE employees SET department_id = ${r.to_department_id}, role = ${r.to_job_title}, updated_at = NOW()
    WHERE id = ${r.employee_id} AND company_id = ${companyId}`;
  await writeWorkforceAudit(tx, {
    companyId, actorId, actorRole, entityType: "employee", entityId: r.employee_id, action: "REDEPLOY",
    before: { departmentId: before?.department_id ?? null, jobTitle: before?.role ?? null },
    after: { departmentId: r.to_department_id, jobTitle: r.to_job_title, redeploymentId: Number(r.id) },
  });
}

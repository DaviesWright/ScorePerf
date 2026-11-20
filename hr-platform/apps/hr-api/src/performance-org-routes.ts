import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { TenantContext } from "./auth";
import type { Env } from "./index";

export type OrgUnitType = "ENTERPRISE" | "BUSINESS_UNIT" | "DEPARTMENT" | "TEAM" | "COST_CENTER";
export type OrgEdgeType = "PRIMARY_MANAGER" | "MATRIX_MANAGER" | "DOTTED_LINE" | "DELEGATE";
export type OrgEdgeScope = "APPRAISAL" | "GOALS" | "ALL";

export interface OrgEdgeRecord {
  id: string;
  subject_employee_id: string;
  object_employee_id: string;
  type: OrgEdgeType;
  scope: OrgEdgeScope;
  effective_from: string;
  effective_to: string | null;
  source: "HRIS" | "MANUAL";
  status: string;
  reason?: string;
}

export interface OrgUnitRecord {
  id: string;
  parent_unit_id: string | null;
  type: OrgUnitType;
  name: string;
  code: string | null;
  effective_from: string;
  effective_to: string | null;
  external_ref: string | null;
}

export function filterActiveAtDate<T extends { effective_from: string; effective_to?: string | null; status?: string }>(
  rows: T[],
  asOf: string
): T[] {
  const target = asOf.slice(0, 10);
  return rows.filter((r) => {
    if (r.status && r.status === "CLOSED") return false;
    const from = String(r.effective_from).slice(0, 10);
    const to = r.effective_to ? String(r.effective_to).slice(0, 10) : null;
    return from <= target && (to === null || to >= target);
  });
}

export function detectOrgCycle(
  edges: Array<{ subject_employee_id: string; object_employee_id: string }>,
  newSubjectId: string,
  newObjectId: string
): boolean {
  if (String(newSubjectId) === String(newObjectId)) return true;

  const managerMap = new Map<string, string[]>();
  for (const e of edges) {
    const s = String(e.subject_employee_id);
    const o = String(e.object_employee_id);
    const list = managerMap.get(s) ?? [];
    list.push(o);
    managerMap.set(s, list);
  }
  const existing = managerMap.get(String(newSubjectId)) ?? [];
  managerMap.set(String(newSubjectId), [...existing, String(newObjectId)]);

  // Walk upward from newObjectId; if we reach newSubjectId, adding edge creates a cycle
  const visited = new Set<string>();
  const stack = [String(newObjectId)];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (cur === String(newSubjectId)) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    for (const nextMgr of managerMap.get(cur) ?? []) {
      stack.push(nextMgr);
    }
  }
  return false;
}

export function hasDateOverlap(
  edges: OrgEdgeRecord[],
  subjectId: string,
  objectId: string,
  type: OrgEdgeType,
  effectiveFrom: string,
  effectiveTo: string | null,
  ignoreEdgeId?: string
): boolean {
  const newStart = effectiveFrom.slice(0, 10);
  const newEnd = effectiveTo ? effectiveTo.slice(0, 10) : "9999-12-31";
  return edges.some((e) => {
    if (ignoreEdgeId && e.id === ignoreEdgeId) return false;
    if (e.status === "CLOSED") return false;
    if (String(e.subject_employee_id) !== String(subjectId)) return false;
    if (type !== "PRIMARY_MANAGER" && String(e.object_employee_id) !== String(objectId)) return false;
    if (e.type !== type) return false;
    const eStart = String(e.effective_from).slice(0, 10);
    const eEnd = e.effective_to ? String(e.effective_to).slice(0, 10) : "9999-12-31";
    return newStart <= eEnd && eStart <= newEnd;
  });
}

export function buildReportingChain(
  employeeId: string,
  activeEdges: OrgEdgeRecord[],
  empMap: Map<string, { id: string; name: string; role: string }>
) {
  const primaryBySubject = new Map<string, OrgEdgeRecord>();
  for (const e of activeEdges) {
    if (e.type === "PRIMARY_MANAGER") {
      primaryBySubject.set(String(e.subject_employee_id), e);
    }
  }

  const chain: Array<{ employeeId: string; name: string; role: string; relationship: string }> = [];
  const visited = new Set<string>();
  let cur: string | undefined = String(employeeId);

  while (cur && !visited.has(cur)) {
    visited.add(cur);
    const emp = empMap.get(cur);
    const edge = primaryBySubject.get(cur);
    chain.push({
      employeeId: cur,
      name: emp?.name ?? `Employee ${cur}`,
      role: emp?.role ?? "Staff",
      relationship: cur === String(employeeId) ? "FOCUS" : "PRIMARY_MANAGER",
    });
    cur = edge ? String(edge.object_employee_id) : undefined;
  }

  const matrixLinks = activeEdges
    .filter(
      (e) =>
        String(e.subject_employee_id) === String(employeeId) &&
        (e.type === "MATRIX_MANAGER" || e.type === "DOTTED_LINE")
    )
    .map((e) => {
      const mgr = empMap.get(String(e.object_employee_id));
      return {
        edgeId: e.id,
        managerId: String(e.object_employee_id),
        managerName: mgr?.name ?? `Employee ${e.object_employee_id}`,
        type: e.type,
        scope: e.scope,
      };
    });

  return { chain, matrixLinks };
}

const createUnitSchema = z.object({
  parentUnitId: z.string().nullable().optional(),
  type: z.enum(["ENTERPRISE", "BUSINESS_UNIT", "DEPARTMENT", "TEAM", "COST_CENTER"]),
  name: z.string().trim().min(1).max(200),
  code: z.string().trim().max(40).nullable().optional(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  reason: z.string().max(500).optional(),
});

const patchUnitSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  parentUnitId: z.string().nullable().optional(),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  reason: z.string().trim().min(1).max(500),
});

const createEdgeSchema = z.object({
  subjectEmployeeId: z.string().min(1),
  objectEmployeeId: z.string().min(1),
  type: z.enum(["PRIMARY_MANAGER", "MATRIX_MANAGER", "DOTTED_LINE", "DELEGATE"]).default("PRIMARY_MANAGER"),
  scope: z.enum(["APPRAISAL", "GOALS", "ALL"]).default("ALL"),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  source: z.enum(["HRIS", "MANUAL"]).default("MANUAL"),
  reason: z.string().max(500).optional(),
});

const patchEdgeSchema = z.object({
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: z.enum(["PROPOSED", "ACTIVE", "CLOSED"]).optional(),
  scope: z.enum(["APPRAISAL", "GOALS", "ALL"]).optional(),
  reason: z.string().trim().min(1).max(500),
});

const createDelegationSchema = z.object({
  delegatorId: z.string().min(1).optional(),
  delegateId: z.string().min(1),
  scope: z.enum(["APPRAISAL", "GOALS", "ALL"]).default("APPRAISAL"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().min(3).max(500),
});

function isHrOrAdmin(role?: string) {
  const r = (role || "").toLowerCase();
  return ["admin", "hr", "hr_admin", "super_admin", "hr_manager", "hr_officer"].includes(r);
}

export function createPerformanceOrgRoutes(getSql: (env: Env) => any) {
  const app = new Hono<{ Bindings: Env; Variables: { tenant: TenantContext } }>();

  async function loadEmployeesMap(sql: any, companyId: number) {
    const rows = await sql`
      SELECT id, first_name, last_name, role, department_id
      FROM employees
      WHERE company_id = ${companyId} AND is_active = TRUE
    `;
    const map = new Map<string, { id: string; name: string; role: string; departmentId: string | null }>();
    for (const r of rows) {
      map.set(String(r.id), {
        id: String(r.id),
        name: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || `Employee ${r.id}`,
        role: r.role ?? "Staff",
        departmentId: r.department_id != null ? String(r.department_id) : null,
      });
    }
    return map;
  }

  async function loadEffectiveEdges(sql: any, companyId: number, tenantId: string, asOf: string): Promise<OrgEdgeRecord[]> {
    const orgEdges: OrgEdgeRecord[] = await sql`
      SELECT
        id, subject_employee_id, object_employee_id, type, scope,
        effective_from::text AS effective_from,
        effective_to::text AS effective_to,
        source, status, reason
      FROM performance_org_edges
      WHERE (tenant_id = ${tenantId} OR tenant_id = 'default')
    `;
    const activeOrg = filterActiveAtDate(orgEdges, asOf);

    // Fallback/projection from HRIS reporting_lines for employees without an explicit PRIMARY_MANAGER edge
    const hasPrimary = new Set(
      activeOrg.filter((e) => e.type === "PRIMARY_MANAGER").map((e) => String(e.subject_employee_id))
    );
    const rlRows = await sql`
      SELECT employee_id, manager_id, created_at::date::text AS created_date
      FROM reporting_lines
      WHERE company_id = ${companyId}
    `;
    for (const rl of rlRows) {
      const sub = String(rl.employee_id);
      if (!hasPrimary.has(sub)) {
        activeOrg.push({
          id: `hris-rl-${sub}-${rl.manager_id}`,
          subject_employee_id: sub,
          object_employee_id: String(rl.manager_id),
          type: "PRIMARY_MANAGER",
          scope: "ALL",
          effective_from: rl.created_date || "2026-01-01",
          effective_to: null,
          source: "HRIS",
          status: "ACTIVE",
          reason: "HRIS reporting_lines projection",
        });
      }
    }
    return activeOrg;
  }

  // ============================================================================
  // Units CRUD (effective-dated + audited)
  // ============================================================================
  app.get("/api/v1/performance/org/units", async (c) => {
    const { companyId } = c.get("tenant");
    const tenantId = String(companyId);
    const asOf = c.req.query("asOf") || new Date().toISOString().slice(0, 10);
    const sql = getSql(c.env);

    const rows: OrgUnitRecord[] = await sql`
      SELECT id, parent_unit_id, type, name, code, effective_from::text AS effective_from, effective_to::text AS effective_to, external_ref
      FROM performance_org_units
      WHERE tenant_id = ${tenantId} OR tenant_id = 'default'
      ORDER BY type, name
    `;
    const active = filterActiveAtDate(rows, asOf);

    if (active.length === 0) {
      const depts = await sql`SELECT id, name FROM departments WHERE company_id = ${companyId} ORDER BY name`;
      const projected: OrgUnitRecord[] = [
        {
          id: `unit-ent-${companyId}`,
          parent_unit_id: null,
          type: "ENTERPRISE",
          name: "Enterprise Root",
          code: "ENT",
          effective_from: "2026-01-01",
          effective_to: null,
          external_ref: null,
        },
        ...depts.map((d: any) => ({
          id: `unit-dept-${d.id}`,
          parent_unit_id: `unit-ent-${companyId}`,
          type: "DEPARTMENT" as const,
          name: d.name,
          code: null,
          effective_from: "2026-01-01",
          effective_to: null,
          external_ref: String(d.id),
        })),
      ];
      return c.json({ units: projected, asOf, projectedFromHris: true });
    }

    return c.json({ units: active, asOf, projectedFromHris: false });
  });

  app.post("/api/v1/performance/org/units", zValidator("json", createUnitSchema), async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (!isHrOrAdmin(role)) {
      return c.json({ error: "Only HR can edit org units.", code: "PERF_FORBIDDEN" }, 403);
    }
    const tenantId = String(companyId);
    const body = c.req.valid("json");
    const id = `unit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const effFrom = body.effectiveFrom || new Date().toISOString().slice(0, 10);
    const sql = getSql(c.env);

    await sql`
      INSERT INTO performance_org_units (id, tenant_id, parent_unit_id, type, name, code, effective_from, effective_to, created_by)
      VALUES (${id}, ${tenantId}, ${body.parentUnitId ?? null}, ${body.type}, ${body.name}, ${body.code ?? null}, ${effFrom}::date, ${body.effectiveTo ?? null}::date, ${String(userId)})
    `;
    await sql`
      INSERT INTO performance_org_unit_history (id, tenant_id, unit_id, actor_employee_id, action, after_json, reason)
      VALUES (${`uh-${Date.now()}`}, ${tenantId}, ${id}, ${String(userId)}, 'CREATE_UNIT', ${JSON.stringify(body)}::jsonb, ${body.reason ?? "Created org unit"})
    `;
    return c.json({ id, ...body, effectiveFrom: effFrom }, 201);
  });

  app.patch("/api/v1/performance/org/units/:id", zValidator("json", patchUnitSchema), async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (!isHrOrAdmin(role)) {
      return c.json({ error: "Only HR can update org units.", code: "PERF_FORBIDDEN" }, 403);
    }
    const tenantId = String(companyId);
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const sql = getSql(c.env);

    const existing = await sql`SELECT * FROM performance_org_units WHERE id = ${id} LIMIT 1`;
    if (!existing[0]) {
      return c.json({ error: "Org unit not found.", code: "ORG_UNIT_NOT_FOUND" }, 404);
    }

    await sql`
      UPDATE performance_org_units
      SET
        name = COALESCE(${body.name ?? null}, name),
        parent_unit_id = COALESCE(${body.parentUnitId === undefined ? existing[0].parent_unit_id : body.parentUnitId}, parent_unit_id),
        effective_to = COALESCE(${body.effectiveTo ?? null}::date, effective_to)
      WHERE id = ${id}
    `;
    await sql`
      INSERT INTO performance_org_unit_history (id, tenant_id, unit_id, actor_employee_id, action, before_json, after_json, reason)
      VALUES (${`uh-${Date.now()}`}, ${tenantId}, ${id}, ${String(userId)}, 'UPDATE_UNIT', ${JSON.stringify(existing[0])}::jsonb, ${JSON.stringify(body)}::jsonb, ${body.reason})
    `;
    return c.json({ updated: true, id });
  });

  // ============================================================================
  // Edges CRUD (multi-manager, acyclic, effective-dated, audited)
  // ============================================================================
  app.get("/api/v1/performance/org/edges", async (c) => {
    const { companyId } = c.get("tenant");
    const tenantId = String(companyId);
    const asOf = c.req.query("asOf") || new Date().toISOString().slice(0, 10);
    const sql = getSql(c.env);
    const edges = await loadEffectiveEdges(sql, companyId, tenantId, asOf);
    return c.json({ edges, asOf });
  });

  app.post("/api/v1/performance/org/edges", zValidator("json", createEdgeSchema), async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (!isHrOrAdmin(role)) {
      return c.json({ error: "Only HR can edit org edges.", code: "PERF_FORBIDDEN" }, 403);
    }
    const tenantId = String(companyId);
    const body = c.req.valid("json");
    const effFrom = body.effectiveFrom || new Date().toISOString().slice(0, 10);
    const sql = getSql(c.env);

    const existingEdges: OrgEdgeRecord[] = await sql`
      SELECT id, subject_employee_id, object_employee_id, type, scope, effective_from::text AS effective_from, effective_to::text AS effective_to, source, status
      FROM performance_org_edges
      WHERE tenant_id = ${tenantId} OR tenant_id = 'default'
    `;

    // Acyclicity check on active/overlapping edges
    const activeEdges = filterActiveAtDate(existingEdges, effFrom);
    if (detectOrgCycle(activeEdges, body.subjectEmployeeId, body.objectEmployeeId)) {
      return c.json(
        { error: "Adding this reporting edge would create a cycle in the org graph.", code: "ORG_GRAPH_CYCLE" },
        400
      );
    }

    // Overlap / primary manager conflict check
    if (hasDateOverlap(existingEdges, body.subjectEmployeeId, body.objectEmployeeId, body.type, effFrom, body.effectiveTo ?? null)) {
      return c.json(
        {
          error:
            body.type === "PRIMARY_MANAGER"
              ? "Employee already has a primary manager for overlapping effective dates."
              : "Overlapping effective dates for this reporting edge.",
          code: body.type === "PRIMARY_MANAGER" ? "ORG_PRIMARY_MANAGER_CONFLICT" : "ORG_EDGE_OVERLAP",
        },
        400
      );
    }

    const id = `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await sql`
      INSERT INTO performance_org_edges (
        id, tenant_id, subject_employee_id, object_employee_id, type, scope,
        effective_from, effective_to, source, status, reason, created_by
      ) VALUES (
        ${id}, ${tenantId}, ${body.subjectEmployeeId}, ${body.objectEmployeeId}, ${body.type}, ${body.scope},
        ${effFrom}::date, ${body.effectiveTo ?? null}::date, ${body.source}, 'ACTIVE', ${body.reason ?? ""}, ${String(userId)}
      )
    `;

    await sql`
      INSERT INTO performance_org_edge_history (id, tenant_id, edge_id, actor_employee_id, action, after_json, reason)
      VALUES (${`eh-${Date.now()}`}, ${tenantId}, ${id}, ${String(userId)}, 'CREATE_EDGE', ${JSON.stringify(body)}::jsonb, ${body.reason ?? "Created org edge"})
    `;

    return c.json({ id, ...body, effectiveFrom: effFrom }, 201);
  });

  app.patch("/api/v1/performance/org/edges/:id", zValidator("json", patchEdgeSchema), async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (!isHrOrAdmin(role)) {
      return c.json({ error: "Only HR can update org edges.", code: "PERF_FORBIDDEN" }, 403);
    }
    const tenantId = String(companyId);
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const sql = getSql(c.env);

    const existing = await sql`SELECT * FROM performance_org_edges WHERE id = ${id} LIMIT 1`;
    if (!existing[0]) {
      return c.json({ error: "Org edge not found.", code: "ORG_UNIT_NOT_FOUND" }, 404);
    }

    await sql`
      UPDATE performance_org_edges
      SET
        effective_to = COALESCE(${body.effectiveTo ?? null}::date, effective_to),
        status = COALESCE(${body.status ?? null}, status),
        scope = COALESCE(${body.scope ?? null}, scope)
      WHERE id = ${id}
    `;
    await sql`
      INSERT INTO performance_org_edge_history (id, tenant_id, edge_id, actor_employee_id, action, before_json, after_json, reason)
      VALUES (${`eh-${Date.now()}`}, ${tenantId}, ${id}, ${String(userId)}, 'UPDATE_EDGE', ${JSON.stringify(existing[0])}::jsonb, ${JSON.stringify(body)}::jsonb, ${body.reason})
    `;
    return c.json({ updated: true, id });
  });

  // ============================================================================
  // Contextual Drawer, Reporting Chain, Graph & Executive Overlay
  // ============================================================================
  app.get("/api/v1/performance/org/reporting-chain", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const tenantId = String(companyId);
    const employeeId = c.req.query("employeeId") || String(userId);
    const asOf = c.req.query("asOf") || new Date().toISOString().slice(0, 10);
    const sql = getSql(c.env);

    const [empMap, activeEdges] = await Promise.all([
      loadEmployeesMap(sql, companyId),
      loadEffectiveEdges(sql, companyId, tenantId, asOf),
    ]);

    return c.json({
      asOf,
      employeeId,
      ...buildReportingChain(employeeId, activeEdges, empMap),
    });
  });

  app.get("/api/v1/performance/org/contextual", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const tenantId = String(companyId);
    const focusId = c.req.query("focusId") || c.req.query("ownerId") || c.req.query("employeeId") || String(userId);
    const asOf = c.req.query("asOf") || new Date().toISOString().slice(0, 10);
    const depth = Math.min(4, Math.max(1, Number(c.req.query("depth") || 2)));
    const overlay = c.req.query("overlay") || "objectives";
    const sql = getSql(c.env);

    const [empMap, activeEdges, goalCounts, delegations] = await Promise.all([
      loadEmployeesMap(sql, companyId),
      loadEffectiveEdges(sql, companyId, tenantId, asOf),
      sql`
        SELECT owner_employee_id, COUNT(*)::int AS cnt
        FROM performance_goals
        WHERE (tenant_id = ${tenantId} OR tenant_id = 'default')
          AND COALESCE(is_demo, FALSE) = FALSE
          AND status NOT IN ('CANCELLED', 'DEFERRED')
        GROUP BY owner_employee_id
      `,
      sql`
        SELECT id, delegator_id, delegate_id, scope, start_date::text AS start_date, end_date::text AS end_date, status
        FROM performance_delegations
        WHERE (tenant_id = ${tenantId} OR tenant_id = 'default')
          AND status IN ('ACTIVE', 'APPROVED')
          AND start_date <= ${asOf}::date AND end_date >= ${asOf}::date
      `,
    ]);

    const countMap = new Map<string, number>();
    for (const g of goalCounts) countMap.set(String(g.owner_employee_id), Number(g.cnt));

    const { chain, matrixLinks } = buildReportingChain(focusId, activeEdges, empMap);

    // BFS descendants up to `depth`
    const childrenMap = new Map<string, OrgEdgeRecord[]>();
    for (const e of activeEdges) {
      const list = childrenMap.get(String(e.object_employee_id)) ?? [];
      list.push(e);
      childrenMap.set(String(e.object_employee_id), list);
    }

    const descendants: Array<{
      employeeId: string;
      name: string;
      role: string;
      level: number;
      relationship: OrgEdgeType;
      parentEmployeeId: string;
      objectiveCount: number;
      objectivePolicyValid: boolean;
    }> = [];
    const queue: Array<{ id: string; level: number }> = [{ id: focusId, level: 0 }];
    const seen = new Set<string>([focusId]);

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur.level >= depth) continue;
      for (const edge of childrenMap.get(cur.id) ?? []) {
        const sub = String(edge.subject_employee_id);
        const emp = empMap.get(sub);
        const cnt = countMap.get(sub) ?? 0;
        descendants.push({
          employeeId: sub,
          name: emp?.name ?? `Employee ${sub}`,
          role: emp?.role ?? "Staff",
          level: cur.level + 1,
          relationship: edge.type,
          parentEmployeeId: cur.id,
          objectiveCount: cnt,
          objectivePolicyValid: cnt >= 8 && cnt <= 10,
        });
        if (!seen.has(sub)) {
          seen.add(sub);
          queue.push({ id: sub, level: cur.level + 1 });
        }
      }
    }

    const focusEmp = empMap.get(focusId);
    const focusObjCount = countMap.get(focusId) ?? 0;
    const activeDelegations = delegations.filter(
      (d: any) => String(d.delegator_id) === focusId || String(d.delegate_id) === focusId
    );

    return c.json({
      asOf,
      overlay,
      focus: {
        employeeId: focusId,
        name: focusEmp?.name ?? `Employee ${focusId}`,
        role: focusEmp?.role ?? "Staff",
        objectiveCount: focusObjCount,
        objectivePolicyValid: focusObjCount >= 8 && focusObjCount <= 10,
      },
      reportingChain: chain,
      matrixLinks,
      descendants,
      delegations: activeDelegations,
    });
  });

  app.get("/api/v1/performance/org/graph", async (c) => {
    const { companyId } = c.get("tenant");
    const tenantId = String(companyId);
    const asOf = c.req.query("asOf") || new Date().toISOString().slice(0, 10);
    const sql = getSql(c.env);

    const [empMap, activeEdges] = await Promise.all([
      loadEmployeesMap(sql, companyId),
      loadEffectiveEdges(sql, companyId, tenantId, asOf),
    ]);

    const nodes = Array.from(empMap.values());
    return c.json({ asOf, nodes, edges: activeEdges });
  });

  app.get("/api/v1/performance/org/overlay", async (c) => {
    const { companyId } = c.get("tenant");
    const tenantId = String(companyId);
    const asOf = c.req.query("asOf") || new Date().toISOString().slice(0, 10);
    const sql = getSql(c.env);

    const [depts, empMap, goalRows] = await Promise.all([
      sql`SELECT id, name FROM departments WHERE company_id = ${companyId} ORDER BY name`,
      loadEmployeesMap(sql, companyId),
      sql`
        SELECT owner_employee_id, COUNT(*)::int AS cnt, AVG(COALESCE(progress_pct, 0))::numeric(5,1) AS avg_progress
        FROM performance_goals
        WHERE (tenant_id = ${tenantId} OR tenant_id = 'default')
          AND COALESCE(is_demo, FALSE) = FALSE
          AND status NOT IN ('CANCELLED', 'DEFERRED')
        GROUP BY owner_employee_id
      `,
    ]);

    const goalByEmp = new Map<string, { cnt: number; avgProgress: number }>();
    for (const g of goalRows) {
      goalByEmp.set(String(g.owner_employee_id), { cnt: Number(g.cnt), avgProgress: Number(g.avg_progress ?? 0) });
    }

    const unitStats = depts.map((d: any) => {
      const members = Array.from(empMap.values()).filter((e) => e.departmentId === String(d.id));
      const compliant = members.filter((m) => {
        const cnt = goalByEmp.get(m.id)?.cnt ?? 0;
        return cnt >= 8 && cnt <= 10;
      }).length;
      const avgProgress =
        members.length > 0
          ? Number(
              (
                members.reduce((acc, m) => acc + (goalByEmp.get(m.id)?.avgProgress ?? 0), 0) / members.length
              ).toFixed(1)
            )
          : 0;
      return {
        unitId: String(d.id),
        unitName: d.name,
        headcount: members.length,
        compliant8to10: compliant,
        coveragePct: members.length > 0 ? Math.round((compliant / members.length) * 100) : 0,
        avgProgressPct: avgProgress,
      };
    });

    return c.json({ asOf, units: unitStats });
  });

  app.get("/api/v1/performance/org/cascade", async (c) => {
    const { companyId } = c.get("tenant");
    const tenantId = String(companyId);
    const asOf = c.req.query("asOf") || new Date().toISOString().slice(0, 10);
    const sql = getSql(c.env);

    const [activeEdges, goals] = await Promise.all([
      loadEffectiveEdges(sql, companyId, tenantId, asOf),
      sql`
        SELECT id, title, framework, owner_employee_id, perspective_code, progress_pct, status
        FROM performance_goals
        WHERE (tenant_id = ${tenantId} OR tenant_id = 'default')
          AND COALESCE(is_demo, FALSE) = FALSE
          AND status NOT IN ('CANCELLED', 'DEFERRED')
        LIMIT 200
      `,
    ]);
    return c.json({ asOf, edges: activeEdges, goals });
  });

  // ============================================================================
  // Validation, Coverage, Reports, HRIS Sync & Audit
  // ============================================================================
  app.get("/api/v1/performance/org/validation", async (c) => {
    const { companyId } = c.get("tenant");
    const tenantId = String(companyId);
    const asOf = c.req.query("asOf") || new Date().toISOString().slice(0, 10);
    const sql = getSql(c.env);

    const [empMap, activeEdges, conflicts] = await Promise.all([
      loadEmployeesMap(sql, companyId),
      loadEffectiveEdges(sql, companyId, tenantId, asOf),
      sql`SELECT * FROM performance_org_sync_conflicts WHERE (tenant_id = ${tenantId} OR tenant_id = 'default') AND status = 'OPEN'`,
    ]);

    const withPrimary = new Set(
      activeEdges.filter((e) => e.type === "PRIMARY_MANAGER").map((e) => String(e.subject_employee_id))
    );
    const missingPrimaryManager = Array.from(empMap.values())
      .filter((e) => !withPrimary.has(e.id))
      .map((e) => ({ employeeId: e.id, name: e.name, role: e.role }));

    return c.json({
      asOf,
      valid: conflicts.length === 0,
      missingPrimaryManagerCount: missingPrimaryManager.length,
      missingPrimaryManager,
      openSyncConflictsCount: conflicts.length,
      openSyncConflicts: conflicts,
    });
  });

  app.get("/api/v1/performance/org/coverage", async (c) => {
    const { companyId } = c.get("tenant");
    const tenantId = String(companyId);
    const asOf = c.req.query("asOf") || new Date().toISOString().slice(0, 10);
    const sql = getSql(c.env);

    const [empMap, goalRows] = await Promise.all([
      loadEmployeesMap(sql, companyId),
      sql`
        SELECT owner_employee_id, COUNT(*)::int AS cnt
        FROM performance_goals
        WHERE (tenant_id = ${tenantId} OR tenant_id = 'default')
          AND COALESCE(is_demo, FALSE) = FALSE
          AND status NOT IN ('CANCELLED', 'DEFERRED')
        GROUP BY owner_employee_id
      `,
    ]);

    const countMap = new Map<string, number>();
    for (const g of goalRows) countMap.set(String(g.owner_employee_id), Number(g.cnt));

    const belowMin = Array.from(empMap.values())
      .map((e) => ({ employeeId: e.id, name: e.name, role: e.role, objectiveCount: countMap.get(e.id) ?? 0 }))
      .filter((e) => e.objectiveCount < 8);

    return c.json({
      asOf,
      totalEmployees: empMap.size,
      belowMinCount: belowMin.length,
      compliantCount: empMap.size - belowMin.length,
      belowMinEmployees: belowMin,
    });
  });

  app.get("/api/v1/performance/reports/org-coverage", async (c) => {
    const { companyId } = c.get("tenant");
    const tenantId = String(companyId);
    const asOf = c.req.query("asOf") || new Date().toISOString().slice(0, 10);
    const sql = getSql(c.env);
    const empMap = await loadEmployeesMap(sql, companyId);
    const goalRows = await sql`
      SELECT owner_employee_id, COUNT(*)::int AS cnt
      FROM performance_goals
      WHERE (tenant_id = ${tenantId} OR tenant_id = 'default')
        AND COALESCE(is_demo, FALSE) = FALSE
        AND status NOT IN ('CANCELLED', 'DEFERRED')
      GROUP BY owner_employee_id
    `;
    const countMap = new Map<string, number>();
    for (const g of goalRows) countMap.set(String(g.owner_employee_id), Number(g.cnt));
    const compliant = Array.from(empMap.keys()).filter((id) => {
      const n = countMap.get(id) ?? 0;
      return n >= 8 && n <= 10;
    }).length;
    return c.json({
      asOf,
      totalEmployees: empMap.size,
      compliant8to10: compliant,
      coveragePct: empMap.size > 0 ? Math.round((compliant / empMap.size) * 100) : 0,
    });
  });

  app.get("/api/v1/performance/reports/reorg-impact", async (c) => {
    const { companyId } = c.get("tenant");
    const tenantId = String(companyId);
    const days = Math.min(90, Math.max(1, Number(c.req.query("days") || 30)));
    const sql = getSql(c.env);

    const recentEdgeChanges = await sql`
      SELECT id, edge_id, actor_employee_id, action, reason, created_at
      FROM performance_org_edge_history
      WHERE (tenant_id = ${tenantId} OR tenant_id = 'default')
        AND created_at >= NOW() - (${days} || ' days')::interval
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return c.json({
      days,
      recentChangesCount: recentEdgeChanges.length,
      recentChanges: recentEdgeChanges,
    });
  });

  app.post("/api/v1/performance/org/import", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (!isHrOrAdmin(role)) {
      return c.json({ error: "Only HR can run HRIS org import.", code: "PERF_FORBIDDEN" }, 403);
    }
    const tenantId = String(companyId);
    const sql = getSql(c.env);
    const runId = `sync-${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);

    const rlRows = await sql`
      SELECT employee_id, manager_id
      FROM reporting_lines
      WHERE company_id = ${companyId}
    `;
    const existingPrimary = await sql`
      SELECT id, subject_employee_id, object_employee_id, source
      FROM performance_org_edges
      WHERE (tenant_id = ${tenantId} OR tenant_id = 'default')
        AND type = 'PRIMARY_MANAGER'
        AND status = 'ACTIVE'
    `;
    const existingMap = new Map<string, any>();
    for (const e of existingPrimary) existingMap.set(String(e.subject_employee_id), e);

    let edgesSynced = 0;
    let conflictsDetected = 0;

    await sql`
      INSERT INTO performance_org_sync_runs (id, tenant_id, status, triggered_by)
      VALUES (${runId}, ${tenantId}, 'RUNNING', ${String(userId)})
    `;

    for (const rl of rlRows) {
      const sub = String(rl.employee_id);
      const mgr = String(rl.manager_id);
      if (sub === mgr) continue;
      const cur = existingMap.get(sub);
      if (!cur) {
        await sql`
          INSERT INTO performance_org_edges (
            id, tenant_id, subject_employee_id, object_employee_id, type, scope,
            effective_from, source, status, reason, created_by
          ) VALUES (
            ${`edge-hris-${sub}-${Date.now()}`}, ${tenantId}, ${sub}, ${mgr}, 'PRIMARY_MANAGER', 'ALL',
            ${today}::date, 'HRIS', 'ACTIVE', 'HRIS sync import', ${String(userId)}
          )
        `;
        edgesSynced++;
      } else if (String(cur.object_employee_id) !== mgr) {
        await sql`
          INSERT INTO performance_org_sync_conflicts (
            id, tenant_id, sync_run_id, subject_employee_id, hris_manager_id, local_manager_id, status
          ) VALUES (
            ${`conf-${Date.now()}-${sub}`}, ${tenantId}, ${runId}, ${sub}, ${mgr}, ${String(cur.object_employee_id)}, 'OPEN'
          )
        `;
        conflictsDetected++;
      }
    }

    await sql`
      UPDATE performance_org_sync_runs
      SET status = 'COMPLETED', edges_synced = ${edgesSynced}, conflicts_detected = ${conflictsDetected}, completed_at = NOW()
      WHERE id = ${runId}
    `;

    return c.json({ runId, edgesSynced, conflictsDetected, status: "COMPLETED" });
  });

  app.get("/api/v1/performance/org/export", async (c) => {
    const { companyId } = c.get("tenant");
    const tenantId = String(companyId);
    const asOf = c.req.query("asOf") || new Date().toISOString().slice(0, 10);
    const sql = getSql(c.env);
    const edges = await loadEffectiveEdges(sql, companyId, tenantId, asOf);
    return c.json({ asOf, exportedAt: new Date().toISOString(), edges });
  });

  app.get("/api/v1/performance/org/audit", async (c) => {
    const { companyId } = c.get("tenant");
    const tenantId = String(companyId);
    const sql = getSql(c.env);
    const [edgeHistory, unitHistory] = await Promise.all([
      sql`SELECT * FROM performance_org_edge_history WHERE tenant_id = ${tenantId} OR tenant_id = 'default' ORDER BY created_at DESC LIMIT 50`,
      sql`SELECT * FROM performance_org_unit_history WHERE tenant_id = ${tenantId} OR tenant_id = 'default' ORDER BY created_at DESC LIMIT 50`,
    ]);
    return c.json({ edgeHistory, unitHistory });
  });

  app.get("/api/v1/performance/org/sync-status", async (c) => {
    const { companyId } = c.get("tenant");
    const tenantId = String(companyId);
    const sql = getSql(c.env);
    const runs = await sql`
      SELECT * FROM performance_org_sync_runs
      WHERE tenant_id = ${tenantId} OR tenant_id = 'default'
      ORDER BY started_at DESC
      LIMIT 10
    `;
    const openConflicts = await sql`
      SELECT COUNT(*)::int AS cnt
      FROM performance_org_sync_conflicts
      WHERE (tenant_id = ${tenantId} OR tenant_id = 'default') AND status = 'OPEN'
    `;
    return c.json({
      latestRun: runs[0] ?? null,
      runs,
      openConflictsCount: Number(openConflicts[0]?.cnt ?? 0),
    });
  });

  // ============================================================================
  // Org Delegations (PROPOSED -> APPROVED -> ACTIVE -> REVOKED)
  // ============================================================================
  app.get("/api/v1/performance/org/delegations", async (c) => {
    const { companyId } = c.get("tenant");
    const tenantId = String(companyId);
    const sql = getSql(c.env);
    const rows = await sql`
      SELECT id, delegator_id, delegate_id, scope, start_date::text AS start_date, end_date::text AS end_date, reason, status, approved_by, created_at
      FROM performance_delegations
      WHERE tenant_id = ${tenantId} OR tenant_id = 'default'
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return c.json({ delegations: rows });
  });

  app.post("/api/v1/performance/org/delegations", zValidator("json", createDelegationSchema), async (c) => {
    const { companyId, userId } = c.get("tenant");
    const tenantId = String(companyId);
    const body = c.req.valid("json");
    const delegatorId = body.delegatorId ?? String(userId);
    if (delegatorId === body.delegateId || body.startDate > body.endDate) {
      return c.json({ error: "Invalid delegation parameters.", code: "ORG_DELEGATION_INVALID" }, 400);
    }
    const id = `del-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const sql = getSql(c.env);

    await sql`
      INSERT INTO performance_delegations (id, tenant_id, delegator_id, delegate_id, start_date, end_date, scope, reason, status, created_by)
      VALUES (${id}, ${tenantId}, ${delegatorId}, ${body.delegateId}, ${body.startDate}::date, ${body.endDate}::date, ${body.scope}, ${body.reason}, 'PROPOSED', ${String(userId)})
    `;
    await sql`
      INSERT INTO performance_delegation_history (id, tenant_id, delegation_id, actor_employee_id, action, after_json, reason)
      VALUES (${`dh-${Date.now()}`}, ${tenantId}, ${id}, ${String(userId)}, 'PROPOSE', ${JSON.stringify(body)}::jsonb, ${body.reason})
    `;
    return c.json({ id, delegatorId, ...body, status: "PROPOSED" }, 201);
  });

  app.post("/api/v1/performance/org/delegations/:id/approve", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (!isHrOrAdmin(role)) {
      return c.json({ error: "Only HR Manager can approve delegations.", code: "PERF_FORBIDDEN" }, 403);
    }
    const tenantId = String(companyId);
    const id = c.req.param("id");
    const sql = getSql(c.env);

    await sql`
      UPDATE performance_delegations
      SET status = 'ACTIVE', approved_by = ${String(userId)}, approved_at = NOW()
      WHERE id = ${id}
    `;
    await sql`
      INSERT INTO performance_delegation_history (id, tenant_id, delegation_id, actor_employee_id, action, reason)
      VALUES (${`dh-${Date.now()}`}, ${tenantId}, ${id}, ${String(userId)}, 'APPROVE', 'Approved by HR')
    `;
    return c.json({ id, status: "ACTIVE" });
  });

  app.post("/api/v1/performance/org/delegations/:id/revoke", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const tenantId = String(companyId);
    const id = c.req.param("id");
    const sql = getSql(c.env);

    await sql`
      UPDATE performance_delegations
      SET status = 'REVOKED'
      WHERE id = ${id}
    `;
    await sql`
      INSERT INTO performance_delegation_history (id, tenant_id, delegation_id, actor_employee_id, action, reason)
      VALUES (${`dh-${Date.now()}`}, ${tenantId}, ${id}, ${String(userId)}, 'REVOKE', 'Revoked')
    `;
    return c.json({ id, status: "REVOKED" });
  });

  app.post(
    "/api/v1/performance/org/conflicts/:id/resolve",
    zValidator("json", z.object({ resolution: z.enum(["RESOLVED_HRIS", "RESOLVED_LOCAL", "DISMISSED"]) })),
    async (c) => {
      const { companyId, userId, role } = c.get("tenant");
      if (!isHrOrAdmin(role)) {
        return c.json({ error: "Only HR Manager can resolve sync conflicts.", code: "PERF_FORBIDDEN" }, 403);
      }
      const tenantId = String(companyId);
      const id = c.req.param("id");
      const { resolution } = c.req.valid("json");
      const sql = getSql(c.env);

      const rows = await sql`
        SELECT * FROM performance_org_sync_conflicts
        WHERE id = ${id} AND (tenant_id = ${tenantId} OR tenant_id = 'default')
        LIMIT 1
      `;
      if (!rows[0]) {
        return c.json({ error: "Conflict not found.", code: "ORG_SYNC_CONFLICT" }, 404);
      }
      const conflict = rows[0];
      const today = new Date().toISOString().slice(0, 10);

      if (resolution === "RESOLVED_HRIS") {
        await sql`
          UPDATE performance_org_edges
          SET effective_to = ${today}::date, status = 'CLOSED'
          WHERE (tenant_id = ${tenantId} OR tenant_id = 'default')
            AND subject_employee_id = ${conflict.subject_employee_id}
            AND type = 'PRIMARY_MANAGER'
            AND status = 'ACTIVE'
        `;
        const newEdgeId = `edge-sync-res-${Date.now()}`;
        await sql`
          INSERT INTO performance_org_edges (
            id, tenant_id, subject_employee_id, object_employee_id, type, scope,
            effective_from, source, status, reason, created_by
          ) VALUES (
            ${newEdgeId}, ${tenantId}, ${conflict.subject_employee_id}, ${conflict.hris_manager_id},
            'PRIMARY_MANAGER', 'ALL', ${today}::date, 'HRIS', 'ACTIVE', 'Resolved HRIS sync conflict', ${String(userId)}
          )
        `;
      }

      await sql`
        UPDATE performance_org_sync_conflicts
        SET status = ${resolution}, resolved_by = ${String(userId)}, resolved_at = NOW()
        WHERE id = ${id}
      `;

      return c.json({ id, status: resolution });
    }
  );

  return app;
}

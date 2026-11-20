import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { TenantContext } from "./auth";
import type { Env } from "./index";

export const DEMO_DISCLAIMER = "DEMO — NOT A LIVE APPRAISAL";

export interface ObjectiveVolumePolicy {
  minObjectives: number;
  maxObjectives: number;
  perFocusFloor: number;
  enforcement: "warn" | "block";
}

export interface ObjectiveVolumeValidation {
  valid: boolean;
  count: number;
  minObjectives: number;
  maxObjectives: number;
  remainingToMin: number;
  remainingToMax: number;
  code: "OK" | "PERF_OBJECTIVES_BELOW_MIN" | "PERF_OBJECTIVES_ABOVE_MAX";
  message: string;
  focusWarnings: Array<{ focusAreaId: string; count: number; floor: number; code: "PERF_FOCUS_AREA_UNDERREPRESENTED" }>;
}

export function validateObjectiveVolume(
  count: number,
  policy: Partial<ObjectiveVolumePolicy> = {},
  focusAreaCounts: Record<string, number> = {}
): ObjectiveVolumeValidation {
  const minObjectives = Math.max(8, policy.minObjectives ?? 8);
  const maxObjectives = Math.min(10, policy.maxObjectives ?? 10);
  const perFocusFloor = Math.max(0, policy.perFocusFloor ?? 2);

  const focusWarnings: ObjectiveVolumeValidation["focusWarnings"] = [];
  for (const [focusAreaId, areaCount] of Object.entries(focusAreaCounts)) {
    if (areaCount < perFocusFloor) {
      focusWarnings.push({
        focusAreaId,
        count: areaCount,
        floor: perFocusFloor,
        code: "PERF_FOCUS_AREA_UNDERREPRESENTED",
      });
    }
  }

  if (count < minObjectives) {
    return {
      valid: false,
      count,
      minObjectives,
      maxObjectives,
      remainingToMin: minObjectives - count,
      remainingToMax: maxObjectives - count,
      code: "PERF_OBJECTIVES_BELOW_MIN",
      message: `Employee has ${count} approved/active objectives; minimum required is ${minObjectives}.`,
      focusWarnings,
    };
  }

  if (count > maxObjectives) {
    return {
      valid: false,
      count,
      minObjectives,
      maxObjectives,
      remainingToMin: 0,
      remainingToMax: 0,
      code: "PERF_OBJECTIVES_ABOVE_MAX",
      message: `Employee has ${count} objectives; maximum allowed is ${maxObjectives}.`,
      focusWarnings,
    };
  }

  return {
    valid: true,
    count,
    minObjectives,
    maxObjectives,
    remainingToMin: 0,
    remainingToMax: maxObjectives - count,
    code: "OK",
    message: `Objective volume (${count}) is within ${minObjectives}–${maxObjectives}.`,
    focusWarnings,
  };
}

export interface ReportingLineRow {
  employee_id: string | number;
  manager_id: string | number;
}

export interface DelegationRow {
  id: string;
  delegator_id: string;
  delegate_id: string;
  start_date: string;
  end_date: string;
  status: string;
}

export function resolveManagerScope(
  actorUserId: string | number,
  reportingRows: ReportingLineRow[],
  delegationRows: DelegationRow[],
  todayIso: string = new Date().toISOString().slice(0, 10)
): {
  directEmployeeIds: Set<string>;
  delegatedMap: Map<string, { onBehalfOf: string; delegationId: string }>;
  allScopeIds: Set<string>;
} {
  const actor = String(actorUserId);
  const directEmployeeIds = new Set<string>();
  const delegatedMap = new Map<string, { onBehalfOf: string; delegationId: string }>();
  const allScopeIds = new Set<string>();

  for (const row of reportingRows) {
    if (String(row.manager_id) === actor) {
      const empId = String(row.employee_id);
      directEmployeeIds.add(empId);
      allScopeIds.add(empId);
    }
  }

  const activeDelegations = delegationRows.filter(
    (d) =>
      String(d.delegate_id) === actor &&
      d.status === "ACTIVE" &&
      String(d.start_date).slice(0, 10) <= todayIso &&
      String(d.end_date).slice(0, 10) >= todayIso
  );

  for (const del of activeDelegations) {
    const delegator = String(del.delegator_id);
    for (const row of reportingRows) {
      if (String(row.manager_id) === delegator) {
        const empId = String(row.employee_id);
        if (!directEmployeeIds.has(empId)) {
          delegatedMap.set(empId, { onBehalfOf: delegator, delegationId: del.id });
        }
        allScopeIds.add(empId);
      }
    }
  }

  return { directEmployeeIds, delegatedMap, allScopeIds };
}

export function canManagerAssess(
  actorId: string | number,
  targetEmployeeId: string | number,
  scopeIds: Set<string>
): { allowed: true } | { allowed: false; status: 403; code: "PERF_SELF_ASSESSMENT_PROHIBITED" | "PERF_OUT_OF_SCOPE"; message: string } {
  if (String(actorId) === String(targetEmployeeId)) {
    return {
      allowed: false,
      status: 403,
      code: "PERF_SELF_ASSESSMENT_PROHIBITED",
      message: "Segregation of duties: a manager cannot assess their own appraisal.",
    };
  }
  if (!scopeIds.has(String(targetEmployeeId))) {
    return {
      allowed: false,
      status: 403,
      code: "PERF_OUT_OF_SCOPE",
      message: "Target employee is outside your direct or delegated reporting scope.",
    };
  }
  return { allowed: true };
}

export function buildDemoReportCsv(appraisal: {
  assessmentId: string;
  employeeName: string;
  cycleId: string;
  framework: string;
  overallRating: number | null;
  selfSummary: string;
  managerSummary: string;
  strengths: string;
  developmentAreas: string;
  objectives: Array<{ title: string; perspective?: string; weightPct?: number; progressPct?: number; rating?: number }>;
}): string {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines: string[] = [
    esc(DEMO_DISCLAIMER),
    `Assessment ID,${esc(appraisal.assessmentId)}`,
    `Employee,${esc(appraisal.employeeName)}`,
    `Cycle,${esc(appraisal.cycleId)}`,
    `Framework,${esc(appraisal.framework)}`,
    `Overall Rating,${esc(appraisal.overallRating ?? "")}`,
    `Self Summary,${esc(appraisal.selfSummary)}`,
    `Manager Summary,${esc(appraisal.managerSummary)}`,
    `Strengths,${esc(appraisal.strengths)}`,
    `Development Areas,${esc(appraisal.developmentAreas)}`,
    "",
    "Objective #,Title,Perspective / Area,Weight %,Progress %,Rating",
  ];
  appraisal.objectives.forEach((obj, idx) => {
    lines.push(
      [
        idx + 1,
        esc(obj.title),
        esc(obj.perspective ?? "General"),
        obj.weightPct ?? 10,
        obj.progressPct ?? 0,
        obj.rating ?? "",
      ].join(",")
    );
  });
  lines.push("");
  lines.push(esc(DEMO_DISCLAIMER));
  return lines.join("\n");
}

function buildSeedObjectives(framework: string) {
  const fw = framework.toUpperCase();
  if (fw === "OKR") {
    return [
      { id: "demo-obj-1", title: "Increase enterprise retention rate to 94%", perspective: "Customer", weightPct: 15, progressPct: 85, rating: 4.2 },
      { id: "demo-obj-2", title: "Reduce p95 API latency below 180ms", perspective: "Internal Process", weightPct: 15, progressPct: 90, rating: 4.5 },
      { id: "demo-obj-3", title: "Launch self-serve onboarding flow for SMBs", perspective: "Customer", weightPct: 12, progressPct: 75, rating: 3.8 },
      { id: "demo-obj-4", title: "Grow recurring ARR by 22% YoY", perspective: "Financial", weightPct: 15, progressPct: 80, rating: 4.0 },
      { id: "demo-obj-5", title: "Achieve 90% automated test coverage on core billing", perspective: "Internal Process", weightPct: 12, progressPct: 88, rating: 4.3 },
      { id: "demo-obj-6", title: "Complete cloud security architecture certification", perspective: "Learning & Growth", weightPct: 10, progressPct: 100, rating: 4.8 },
      { id: "demo-obj-7", title: "Cut cloud infrastructure unit cost by 14%", perspective: "Financial", weightPct: 11, progressPct: 72, rating: 3.7 },
      { id: "demo-obj-8", title: "Mentor 2 junior engineers to mid-level readiness", perspective: "Learning & Growth", weightPct: 10, progressPct: 85, rating: 4.1 },
    ];
  }
  return [
    { id: "demo-obj-1", title: "Deliver Q4 revenue target within +/-3% variance", perspective: "Financial", weightPct: 15, progressPct: 92, rating: 4.4 },
    { id: "demo-obj-2", title: "Maintain operating expense ratio below budget ceiling", perspective: "Financial", weightPct: 10, progressPct: 88, rating: 4.1 },
    { id: "demo-obj-3", title: "Achieve CSAT >= 4.6 across key accounts", perspective: "Customer", weightPct: 15, progressPct: 90, rating: 4.3 },
    { id: "demo-obj-4", title: "Resolve 95% of Tier-1 escalations within SLA", perspective: "Customer", weightPct: 10, progressPct: 84, rating: 3.9 },
    { id: "demo-obj-5", title: "Automate monthly close reconciliation workflow", perspective: "Internal Process", weightPct: 15, progressPct: 80, rating: 4.0 },
    { id: "demo-obj-6", title: "Eliminate critical audit findings in Q1–Q4 reviews", perspective: "Internal Process", weightPct: 15, progressPct: 95, rating: 4.6 },
    { id: "demo-obj-7", title: "Complete leadership & coaching accreditation", perspective: "Learning & Growth", weightPct: 10, progressPct: 100, rating: 4.7 },
    { id: "demo-obj-8", title: "Establish cross-functional knowledge-sharing sessions", perspective: "Learning & Growth", weightPct: 10, progressPct: 85, rating: 4.2 },
  ];
}

const policyPatchSchema = z.object({
  minObjectives: z.number().int(),
  maxObjectives: z.number().int(),
  perFocusFloor: z.number().int().min(0).max(5).optional(),
  enforcement: z.enum(["warn", "block"]).optional(),
});

const delegationCreateSchema = z.object({
  delegatorId: z.string().min(1).optional(),
  delegateId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scope: z.string().min(1).optional(),
  reason: z.string().max(500).optional(),
});

const managerAssessmentPayloadSchema = z.object({
  overallRating: z.number().min(1).max(5).nullable().optional(),
  strengths: z.string().max(4000).optional(),
  developmentAreas: z.string().max(4000).optional(),
  recommendedActions: z.string().max(4000).optional(),
  items: z
    .array(
      z.object({
        goalId: z.string(),
        title: z.string().optional(),
        rating: z.number().min(1).max(5).nullable().optional(),
        comment: z.string().max(2000).optional(),
      })
    )
    .optional(),
});

const revisionRequestSchema = z.object({
  reason: z.string().trim().min(3, "Revision reason is required."),
});

const demoSaveSchema = z.object({
  employeeId: z.string().optional(),
  employeeName: z.string().optional(),
  cycleId: z.string().optional(),
  framework: z.string().optional(),
  overallRating: z.number().min(1).max(5).nullable().optional(),
  selfSummary: z.string().max(4000).optional(),
  managerSummary: z.string().max(4000).optional(),
  strengths: z.string().max(4000).optional(),
  developmentAreas: z.string().max(4000).optional(),
  objectives: z.array(z.any()).optional(),
  sections: z.array(z.any()).optional(),
});

const demoReportSchema = z.object({
  format: z.enum(["PDF", "DOCX", "CSV", "JSON"]).default("CSV"),
});

export function createPerformanceV12Routes(getSql: (env: Env) => any) {
  const app = new Hono<{ Bindings: Env; Variables: { tenant: TenantContext } }>();

  async function getPolicy(sql: any, tenantId: string): Promise<ObjectiveVolumePolicy> {
    const rows = await sql`
      SELECT min_objectives, max_objectives, per_focus_floor, enforcement
      FROM performance_objective_volume_policies
      WHERE tenant_id = ${tenantId} OR tenant_id = 'default'
      ORDER BY CASE WHEN tenant_id = ${tenantId} THEN 0 ELSE 1 END
      LIMIT 1
    `;
    const r = rows[0];
    if (!r) {
      return { minObjectives: 8, maxObjectives: 10, perFocusFloor: 2, enforcement: "warn" };
    }
    return {
      minObjectives: Number(r.min_objectives ?? 8),
      maxObjectives: Number(r.max_objectives ?? 10),
      perFocusFloor: Number(r.per_focus_floor ?? 2),
      enforcement: r.enforcement === "block" ? "block" : "warn",
    };
  }

  async function getObjectiveCountForEmployee(sql: any, tenantId: string, employeeId: string, cycleId?: string) {
    const rows = cycleId
      ? await sql`
          SELECT id, COALESCE(focus_area_id, perspective_code, 'GENERAL') AS focus_area
          FROM performance_goals
          WHERE (tenant_id = ${tenantId} OR tenant_id = 'default')
            AND owner_employee_id = ${employeeId}
            AND cycle_id = ${cycleId}
            AND COALESCE(is_demo, FALSE) = FALSE
            AND status NOT IN ('CANCELLED', 'DEFERRED')
        `
      : await sql`
          SELECT id, COALESCE(focus_area_id, perspective_code, 'GENERAL') AS focus_area
          FROM performance_goals
          WHERE (tenant_id = ${tenantId} OR tenant_id = 'default')
            AND owner_employee_id = ${employeeId}
            AND COALESCE(is_demo, FALSE) = FALSE
            AND status NOT IN ('CANCELLED', 'DEFERRED')
        `;
    const focusAreaCounts: Record<string, number> = {};
    for (const row of rows) {
      const k = String(row.focus_area || "GENERAL");
      focusAreaCounts[k] = (focusAreaCounts[k] ?? 0) + 1;
    }
    return { count: rows.length, focusAreaCounts };
  }

  async function loadManagerScope(sql: any, companyId: number, tenantId: string, actorUserId: number) {
    const today = new Date().toISOString().slice(0, 10);
    const reportingRows: ReportingLineRow[] = await sql`
      SELECT employee_id, manager_id
      FROM reporting_lines
      WHERE company_id = ${companyId}
    `;
    const orgEdgeRows = await sql`
      SELECT subject_employee_id AS employee_id, object_employee_id AS manager_id
      FROM performance_org_edges
      WHERE (tenant_id = ${tenantId} OR tenant_id = 'default')
        AND status = 'ACTIVE'
        AND type IN ('PRIMARY_MANAGER', 'MATRIX_MANAGER', 'DOTTED_LINE')
        AND scope IN ('APPRAISAL', 'ALL')
        AND effective_from <= ${today}::date
        AND (effective_to IS NULL OR effective_to >= ${today}::date)
    `;
    const combinedReporting: ReportingLineRow[] = [...reportingRows, ...orgEdgeRows];
    const delegationRows: DelegationRow[] = await sql`
      SELECT id, delegator_id, delegate_id, start_date::text AS start_date, end_date::text AS end_date, status
      FROM performance_delegations
      WHERE (tenant_id = ${tenantId} OR tenant_id = 'default')
        AND status = 'ACTIVE'
    `;
    return resolveManagerScope(actorUserId, combinedReporting, delegationRows, today);
  }

  // ============================================================================
  // v1.1 Objective Volume Policy (8 min - 10 max)
  // ============================================================================
  app.get("/api/v1/performance/objectives/count", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const tenantId = String(companyId);
    const employeeId = c.req.query("employeeId") || String(userId);
    const cycleId = c.req.query("cycleId") || undefined;
    const sql = getSql(c.env);

    const policy = await getPolicy(sql, tenantId);
    const { count, focusAreaCounts } = await getObjectiveCountForEmployee(sql, tenantId, employeeId, cycleId);
    const validation = validateObjectiveVolume(count, policy, focusAreaCounts);

    return c.json({
      employeeId,
      cycleId: cycleId ?? null,
      count,
      policy,
      validation,
    });
  });

  app.get("/api/v1/performance/settings/objective-volume-policy", async (c) => {
    const { companyId } = c.get("tenant");
    const sql = getSql(c.env);
    const policy = await getPolicy(sql, String(companyId));
    return c.json({ policy });
  });

  app.patch(
    "/api/v1/performance/settings/objective-volume-policy",
    zValidator("json", policyPatchSchema),
    async (c) => {
      const { companyId, userId, role } = c.get("tenant");
      const r = (role || "").toLowerCase();
      if (!["admin", "hr", "hr_admin", "super_admin", "hr_manager"].includes(r)) {
        return c.json({ error: "Only HR Admin can modify objective volume policy.", code: "PERF_FORBIDDEN" }, 403);
      }

      const body = c.req.valid("json");
      if (body.minObjectives < 8 || body.maxObjectives > 10 || body.minObjectives > body.maxObjectives) {
        return c.json(
          {
            error: "Objective volume policy must stay within 8 minimum and 10 maximum.",
            code: "PERF_POLICY_BOUNDS_INVALID",
          },
          400
        );
      }

      const sql = getSql(c.env);
      const tenantId = String(companyId);
      const perFocusFloor = body.perFocusFloor ?? 2;
      const enforcement = body.enforcement ?? "warn";

      await sql`
        INSERT INTO performance_objective_volume_policies (tenant_id, min_objectives, max_objectives, per_focus_floor, enforcement, updated_by, updated_at)
        VALUES (${tenantId}, ${body.minObjectives}, ${body.maxObjectives}, ${perFocusFloor}, ${enforcement}, ${String(userId)}, NOW())
        ON CONFLICT (tenant_id) DO UPDATE SET
          min_objectives = EXCLUDED.min_objectives,
          max_objectives = EXCLUDED.max_objectives,
          per_focus_floor = EXCLUDED.per_focus_floor,
          enforcement = EXCLUDED.enforcement,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
      `;

      return c.json({
        policy: {
          minObjectives: body.minObjectives,
          maxObjectives: body.maxObjectives,
          perFocusFloor,
          enforcement,
        },
      });
    }
  );

  // ============================================================================
  // v1.2 Manager Assessment Queue, Assessment View, Draft, Submit, Revision
  // ============================================================================
  app.get("/api/v1/performance/reviews/team", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const tenantId = String(companyId);
    const sql = getSql(c.env);
    const scope = await loadManagerScope(sql, companyId, tenantId, userId);

    const empIds = Array.from(scope.allScopeIds);
    if (empIds.length === 0) {
      return c.json({ items: [], total: 0 });
    }

    const employees = await sql`
      SELECT id, first_name, last_name, role, department_id
      FROM employees
      WHERE company_id = ${companyId} AND is_active = TRUE
    `;
    const empMap = new Map<string, any>();
    for (const e of employees) {
      empMap.set(String(e.id), e);
    }

    const assessments = await sql`
      SELECT
        pa.id, pa.cycle_id, pa.employee_id, pa.stage, pa.manager_sub_status,
        pa.self_rating, pa.manager_rating, pa.revision_round, pa.max_revision_rounds,
        pa.self_submitted_at, pa.manager_submitted_at, pa.updated_at
      FROM performance_assessments pa
      WHERE (pa.tenant_id = ${tenantId} OR pa.tenant_id = 'default')
    `;
    const assessByEmp = new Map<string, any>();
    for (const a of assessments) {
      assessByEmp.set(String(a.employee_id), a);
    }

    const policy = await getPolicy(sql, tenantId);
    const items = [];
    for (const empId of empIds) {
      if (empId === String(userId)) continue;
      const emp = empMap.get(empId);
      if (!emp) continue;
      const a = assessByEmp.get(empId);
      const del = scope.delegatedMap.get(empId);
      const { count } = await getObjectiveCountForEmployee(sql, tenantId, empId, a?.cycle_id);
      items.push({
        assessmentId: a?.id ?? `assess-${empId}`,
        employeeId: empId,
        employeeName: `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim() || `Employee ${empId}`,
        role: emp.role ?? "Staff",
        cycleId: a?.cycle_id ?? "active",
        stage: a?.stage ?? "SELF_PENDING",
        managerSubStatus: a?.manager_sub_status ?? "MANAGER_NOT_STARTED",
        selfRating: a?.self_rating != null ? Number(a.self_rating) : null,
        managerRating: a?.manager_rating != null ? Number(a.manager_rating) : null,
        revisionRound: Number(a?.revision_round ?? 0),
        maxRevisionRounds: Number(a?.max_revision_rounds ?? 2),
        objectiveCount: count,
        objectivePolicyValid: count >= policy.minObjectives && count <= policy.maxObjectives,
        delegated: Boolean(del),
        onBehalfOfManagerId: del?.onBehalfOf ?? null,
        updatedAt: a?.updated_at ?? null,
      });
    }

    return c.json({ items, total: items.length });
  });

  app.get("/api/v1/performance/reviews/team/summary", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const tenantId = String(companyId);
    const sql = getSql(c.env);
    const scope = await loadManagerScope(sql, companyId, tenantId, userId);
    const empIds = Array.from(scope.allScopeIds).filter((id) => id !== String(userId));

    const assessments = await sql`
      SELECT employee_id, stage, manager_sub_status
      FROM performance_assessments
      WHERE (tenant_id = ${tenantId} OR tenant_id = 'default')
    `;
    const assessByEmp = new Map<string, any>();
    for (const a of assessments) assessByEmp.set(String(a.employee_id), a);

    let notStarted = 0;
    let draft = 0;
    let submitted = 0;
    let revisionRequested = 0;
    let awaitingSelf = 0;

    for (const empId of empIds) {
      const a = assessByEmp.get(empId);
      const stage = a?.stage ?? "SELF_PENDING";
      const sub = a?.manager_sub_status ?? "MANAGER_NOT_STARTED";
      if (sub === "MANAGER_COMPLETE") submitted++;
      else if (sub === "MANAGER_REVISION_REQUESTED") revisionRequested++;
      else if (sub === "MANAGER_DRAFT") draft++;
      else if (stage === "SELF_PENDING") awaitingSelf++;
      else notStarted++;
    }

    return c.json({
      total: empIds.length,
      notStarted,
      draft,
      submitted,
      revisionRequested,
      awaitingSelf,
    });
  });

  async function resolveAssessmentTarget(sql: any, tenantId: string, assessmentId: string) {
    const rows = await sql`
      SELECT *
      FROM performance_assessments
      WHERE id = ${assessmentId} AND (tenant_id = ${tenantId} OR tenant_id = 'default')
      LIMIT 1
    `;
    if (rows[0]) return rows[0];

    if (assessmentId.startsWith("assess-")) {
      const empId = assessmentId.replace("assess-", "");
      return {
        id: assessmentId,
        tenant_id: tenantId,
        cycle_id: "active",
        employee_id: empId,
        stage: "SELF_COMPLETE",
        manager_sub_status: "MANAGER_NOT_STARTED",
        self_rating: null,
        manager_rating: null,
        revision_round: 0,
        max_revision_rounds: 2,
        self_summary: "",
        self_items_json: [],
        _synthetic: true,
      };
    }
    return null;
  }

  app.get("/api/v1/performance/assessments/:id/manager-view", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const tenantId = String(companyId);
    const assessmentId = c.req.param("id");
    const sql = getSql(c.env);

    const assessment = await resolveAssessmentTarget(sql, tenantId, assessmentId);
    if (!assessment) {
      return c.json({ error: "Assessment not found.", code: "PERF_ASSESSMENT_NOT_FOUND" }, 404);
    }

    const scope = await loadManagerScope(sql, companyId, tenantId, userId);
    const check = canManagerAssess(userId, assessment.employee_id, scope.allScopeIds);
    if (!check.allowed) {
      return c.json({ error: check.message, code: check.code }, check.status);
    }

    const mgrRows = await sql`
      SELECT * FROM performance_manager_assessments
      WHERE assessment_id = ${assessmentId}
      LIMIT 1
    `;
    const revisions = await sql`
      SELECT id, manager_id, acted_by_id, reason, round_number, created_at
      FROM performance_manager_revision_requests
      WHERE assessment_id = ${assessmentId}
      ORDER BY round_number DESC, created_at DESC
    `;
    const policy = await getPolicy(sql, tenantId);
    const { count, focusAreaCounts } = await getObjectiveCountForEmployee(
      sql,
      tenantId,
      String(assessment.employee_id),
      assessment.cycle_id
    );
    const delegation = scope.delegatedMap.get(String(assessment.employee_id)) ?? null;

    return c.json({
      assessment: {
        id: assessment.id,
        employeeId: String(assessment.employee_id),
        cycleId: assessment.cycle_id,
        stage: assessment.stage,
        managerSubStatus: assessment.manager_sub_status ?? "MANAGER_NOT_STARTED",
        revisionRound: Number(assessment.revision_round ?? 0),
        maxRevisionRounds: Number(assessment.max_revision_rounds ?? 2),
      },
      selfAssessment: {
        readOnly: true,
        selfRating: assessment.self_rating != null ? Number(assessment.self_rating) : null,
        selfSummary: assessment.self_summary ?? "",
        selfItems: Array.isArray(assessment.self_items_json) ? assessment.self_items_json : [],
        submittedAt: assessment.self_submitted_at ?? null,
      },
      managerAssessment: mgrRows[0]
        ? {
            status: mgrRows[0].status,
            overallRating: mgrRows[0].overall_rating != null ? Number(mgrRows[0].overall_rating) : null,
            strengths: mgrRows[0].strengths ?? "",
            developmentAreas: mgrRows[0].development_areas ?? "",
            recommendedActions: mgrRows[0].recommended_actions ?? "",
            items: Array.isArray(mgrRows[0].items_json) ? mgrRows[0].items_json : [],
            submittedAt: mgrRows[0].submitted_at ?? null,
          }
        : {
            status: "MANAGER_NOT_STARTED",
            overallRating: null,
            strengths: "",
            developmentAreas: "",
            recommendedActions: "",
            items: [],
            submittedAt: null,
          },
      revisions,
      delegation,
      objectiveVolume: validateObjectiveVolume(count, policy, focusAreaCounts),
    });
  });

  app.post(
    "/api/v1/performance/assessments/:id/manager/draft",
    zValidator("json", managerAssessmentPayloadSchema),
    async (c) => {
      const { companyId, userId } = c.get("tenant");
      const tenantId = String(companyId);
      const assessmentId = c.req.param("id");
      const sql = getSql(c.env);

      const assessment = await resolveAssessmentTarget(sql, tenantId, assessmentId);
      if (!assessment) {
        return c.json({ error: "Assessment not found.", code: "PERF_ASSESSMENT_NOT_FOUND" }, 404);
      }

      const scope = await loadManagerScope(sql, companyId, tenantId, userId);
      const check = canManagerAssess(userId, assessment.employee_id, scope.allScopeIds);
      if (!check.allowed) {
        return c.json({ error: check.message, code: check.code }, check.status);
      }

      const body = c.req.valid("json");
      const del = scope.delegatedMap.get(String(assessment.employee_id));
      const managerOwnerId = del ? del.onBehalfOf : String(userId);
      const recId = `mgr-${assessmentId}`;

      await sql`
        INSERT INTO performance_manager_assessments (
          id, tenant_id, assessment_id, manager_id, acted_by_id, status,
          overall_rating, strengths, development_areas, recommended_actions, items_json, updated_at
        ) VALUES (
          ${recId}, ${tenantId}, ${assessmentId}, ${managerOwnerId}, ${String(userId)}, 'MANAGER_DRAFT',
          ${body.overallRating ?? null}, ${body.strengths ?? ""}, ${body.developmentAreas ?? ""},
          ${body.recommendedActions ?? ""}, ${JSON.stringify(body.items ?? [])}::jsonb, NOW()
        )
        ON CONFLICT (assessment_id) DO UPDATE SET
          acted_by_id = EXCLUDED.acted_by_id,
          status = 'MANAGER_DRAFT',
          overall_rating = EXCLUDED.overall_rating,
          strengths = EXCLUDED.strengths,
          development_areas = EXCLUDED.development_areas,
          recommended_actions = EXCLUDED.recommended_actions,
          items_json = EXCLUDED.items_json,
          updated_at = NOW()
      `;

      if (!assessment._synthetic) {
        await sql`
          UPDATE performance_assessments
          SET manager_sub_status = 'MANAGER_DRAFT', updated_at = NOW()
          WHERE id = ${assessmentId}
        `;
      }

      return c.json({
        status: "MANAGER_DRAFT",
        assessmentId,
        actedBy: String(userId),
        onBehalfOf: del?.onBehalfOf ?? null,
      });
    }
  );

  app.post(
    "/api/v1/performance/assessments/:id/manager",
    zValidator("json", managerAssessmentPayloadSchema),
    async (c) => {
      const { companyId, userId } = c.get("tenant");
      const tenantId = String(companyId);
      const assessmentId = c.req.param("id");
      const sql = getSql(c.env);

      const assessment = await resolveAssessmentTarget(sql, tenantId, assessmentId);
      if (!assessment) {
        return c.json({ error: "Assessment not found.", code: "PERF_ASSESSMENT_NOT_FOUND" }, 404);
      }

      const scope = await loadManagerScope(sql, companyId, tenantId, userId);
      const check = canManagerAssess(userId, assessment.employee_id, scope.allScopeIds);
      if (!check.allowed) {
        return c.json({ error: check.message, code: check.code }, check.status);
      }

      if (assessment.stage === "SELF_PENDING") {
        return c.json(
          { error: "Employee self-assessment is still pending.", code: "PERF_SELF_PENDING" },
          400
        );
      }

      const policy = await getPolicy(sql, tenantId);
      const { count, focusAreaCounts } = await getObjectiveCountForEmployee(
        sql,
        tenantId,
        String(assessment.employee_id),
        assessment.cycle_id
      );
      const vol = validateObjectiveVolume(count, policy, focusAreaCounts);
      if (policy.enforcement === "block" && !vol.valid) {
        return c.json({ error: vol.message, code: vol.code, objectiveVolume: vol }, 400);
      }

      const body = c.req.valid("json");
      const del = scope.delegatedMap.get(String(assessment.employee_id));
      const managerOwnerId = del ? del.onBehalfOf : String(userId);
      const recId = `mgr-${assessmentId}`;

      await sql`
        INSERT INTO performance_manager_assessments (
          id, tenant_id, assessment_id, manager_id, acted_by_id, status,
          overall_rating, strengths, development_areas, recommended_actions, items_json, submitted_at, updated_at
        ) VALUES (
          ${recId}, ${tenantId}, ${assessmentId}, ${managerOwnerId}, ${String(userId)}, 'MANAGER_COMPLETE',
          ${body.overallRating ?? null}, ${body.strengths ?? ""}, ${body.developmentAreas ?? ""},
          ${body.recommendedActions ?? ""}, ${JSON.stringify(body.items ?? [])}::jsonb, NOW(), NOW()
        )
        ON CONFLICT (assessment_id) DO UPDATE SET
          acted_by_id = EXCLUDED.acted_by_id,
          status = 'MANAGER_COMPLETE',
          overall_rating = EXCLUDED.overall_rating,
          strengths = EXCLUDED.strengths,
          development_areas = EXCLUDED.development_areas,
          recommended_actions = EXCLUDED.recommended_actions,
          items_json = EXCLUDED.items_json,
          submitted_at = COALESCE(performance_manager_assessments.submitted_at, NOW()),
          updated_at = NOW()
      `;

      if (!assessment._synthetic) {
        await sql`
          UPDATE performance_assessments
          SET
            stage = 'MANAGER_COMPLETE',
            manager_sub_status = 'MANAGER_COMPLETE',
            manager_rating = ${body.overallRating ?? null},
            manager_employee_id = ${managerOwnerId},
            manager_submitted_at = COALESCE(manager_submitted_at, NOW()),
            updated_at = NOW()
          WHERE id = ${assessmentId}
        `;
      }

      await sql`
        INSERT INTO performance_audit_events (id, tenant_id, actor_employee_id, context, entity_type, entity_id, action, after_json, reason)
        VALUES (
          ${`audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`},
          ${tenantId},
          ${String(userId)},
          'MSS',
          'MANAGER_ASSESSMENT',
          ${assessmentId},
          'SUBMIT_MANAGER_ASSESSMENT',
          ${JSON.stringify({ overallRating: body.overallRating ?? null, onBehalfOf: del?.onBehalfOf ?? null })}::jsonb,
          ${del ? `Delegated assessment on behalf of manager ${del.onBehalfOf}` : "Manager assessment submitted"}
        )
      `;

      return c.json({
        status: "MANAGER_COMPLETE",
        assessmentId,
        actedBy: String(userId),
        onBehalfOf: del?.onBehalfOf ?? null,
        objectiveVolume: vol,
      });
    }
  );

  app.post(
    "/api/v1/performance/assessments/:id/manager/request-revision",
    zValidator("json", revisionRequestSchema),
    async (c) => {
      const { companyId, userId } = c.get("tenant");
      const tenantId = String(companyId);
      const assessmentId = c.req.param("id");
      const sql = getSql(c.env);

      const assessment = await resolveAssessmentTarget(sql, tenantId, assessmentId);
      if (!assessment) {
        return c.json({ error: "Assessment not found.", code: "PERF_ASSESSMENT_NOT_FOUND" }, 404);
      }

      const scope = await loadManagerScope(sql, companyId, tenantId, userId);
      const check = canManagerAssess(userId, assessment.employee_id, scope.allScopeIds);
      if (!check.allowed) {
        return c.json({ error: check.message, code: check.code }, check.status);
      }

      const currentRound = Number(assessment.revision_round ?? 0);
      const maxRounds = Number(assessment.max_revision_rounds ?? 2);
      if (currentRound >= maxRounds) {
        return c.json(
          {
            error: `Maximum revision rounds (${maxRounds}) reached for this assessment.`,
            code: "PERF_REVISION_LIMIT_REACHED",
          },
          400
        );
      }

      const { reason } = c.req.valid("json");
      const nextRound = currentRound + 1;
      const del = scope.delegatedMap.get(String(assessment.employee_id));
      const managerOwnerId = del ? del.onBehalfOf : String(userId);
      const revId = `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      await sql`
        INSERT INTO performance_manager_revision_requests (id, tenant_id, assessment_id, manager_id, acted_by_id, reason, round_number)
        VALUES (${revId}, ${tenantId}, ${assessmentId}, ${managerOwnerId}, ${String(userId)}, ${reason}, ${nextRound})
      `;

      if (!assessment._synthetic) {
        await sql`
          UPDATE performance_assessments
          SET
            stage = 'SELF_PENDING',
            manager_sub_status = 'MANAGER_REVISION_REQUESTED',
            revision_round = ${nextRound},
            updated_at = NOW()
          WHERE id = ${assessmentId}
        `;
      }

      return c.json({
        status: "MANAGER_REVISION_REQUESTED",
        assessmentId,
        revisionRound: nextRound,
        maxRevisionRounds: maxRounds,
        reason,
      });
    }
  );

  // ============================================================================
  // v1.2 Delegations
  // ============================================================================
  app.get("/api/v1/performance/settings/delegations", async (c) => {
    const { companyId } = c.get("tenant");
    const tenantId = String(companyId);
    const sql = getSql(c.env);
    const rows = await sql`
      SELECT id, delegator_id, delegate_id, start_date::text AS start_date, end_date::text AS end_date, scope, reason, status, created_at
      FROM performance_delegations
      WHERE tenant_id = ${tenantId} OR tenant_id = 'default'
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return c.json({ delegations: rows });
  });

  app.post(
    "/api/v1/performance/settings/delegations",
    zValidator("json", delegationCreateSchema),
    async (c) => {
      const { companyId, userId } = c.get("tenant");
      const tenantId = String(companyId);
      const body = c.req.valid("json");
      const delegatorId = body.delegatorId ?? String(userId);

      if (delegatorId === body.delegateId || body.startDate > body.endDate) {
        return c.json(
          { error: "Delegation requires distinct delegate and startDate <= endDate.", code: "PERF_DELEGATION_INVALID" },
          400
        );
      }

      const sql = getSql(c.env);
      const id = `del-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await sql`
        INSERT INTO performance_delegations (id, tenant_id, delegator_id, delegate_id, start_date, end_date, scope, reason, status, created_by)
        VALUES (${id}, ${tenantId}, ${delegatorId}, ${body.delegateId}, ${body.startDate}::date, ${body.endDate}::date, ${body.scope ?? "ALL_DIRECT_REPORTS"}, ${body.reason ?? ""}, 'ACTIVE', ${String(userId)})
      `;

      return c.json(
        {
          delegation: {
            id,
            delegator_id: delegatorId,
            delegate_id: body.delegateId,
            start_date: body.startDate,
            end_date: body.endDate,
            scope: body.scope ?? "ALL_DIRECT_REPORTS",
            reason: body.reason ?? "",
            status: "ACTIVE",
          },
        },
        201
      );
    }
  );

  // ============================================================================
  // v1.1 Isolated Demo Appraisal Workspace & Reports
  // ============================================================================
  app.get("/api/v1/performance/demo/appraisals", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const tenantId = String(companyId);
    const sql = getSql(c.env);

    const openRows = await sql`
      SELECT
        pa.id AS assessment_id,
        pa.employee_id,
        COALESCE(e.first_name || ' ' || e.last_name, 'Employee ' || pa.employee_id) AS employee_name,
        pa.cycle_id,
        pa.stage
      FROM performance_assessments pa
      LEFT JOIN employees e ON e.id::text = pa.employee_id
      WHERE (pa.tenant_id = ${tenantId} OR pa.tenant_id = 'default')
        AND pa.stage NOT IN ('CLOSED', 'ARCHIVED')
      ORDER BY pa.updated_at DESC
      LIMIT 25
    `;

    const demoRows = await sql`
      SELECT *
      FROM performance_demo_appraisals
      WHERE tenant_id = ${tenantId} OR tenant_id = 'default'
      ORDER BY updated_at DESC
    `;

    const demoMap = new Map<string, any>();
    for (const d of demoRows) demoMap.set(String(d.assessment_id), d);

    const items = openRows.map((r: any) => {
      const d = demoMap.get(String(r.assessment_id));
      return {
        assessmentId: r.assessment_id,
        employeeId: String(r.employee_id),
        employeeName: r.employee_name,
        cycleId: r.cycle_id,
        stage: r.stage,
        isDemo: true,
        disclaimer: DEMO_DISCLAIMER,
        hasSavedDemo: Boolean(d),
        demo: d ?? null,
      };
    });

    if (items.length === 0) {
      const fallbackId = `demo-assess-${userId}`;
      const d = demoMap.get(fallbackId);
      items.push({
        assessmentId: fallbackId,
        employeeId: String(userId),
        employeeName: "Demo Appraisal Subject",
        cycleId: "active",
        stage: "SELF_COMPLETE",
        isDemo: true,
        disclaimer: DEMO_DISCLAIMER,
        hasSavedDemo: Boolean(d),
        demo: d ?? null,
      });
    }

    return c.json({ items, disclaimer: DEMO_DISCLAIMER });
  });

  app.post("/api/v1/performance/demo/appraisals/:assessmentId/seed-objectives", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const tenantId = String(companyId);
    const assessmentId = c.req.param("assessmentId");
    const body = await c.req.json().catch(() => ({}));
    const framework = String(body.framework || "BSC").toUpperCase();
    const objectives = buildSeedObjectives(framework);
    const sql = getSql(c.env);
    const id = `demo-${tenantId}-${assessmentId}`;

    await sql`
      INSERT INTO performance_demo_appraisals (
        id, tenant_id, assessment_id, employee_id, employee_name, cycle_id, framework, is_demo, objectives_json, updated_by, updated_at
      ) VALUES (
        ${id}, ${tenantId}, ${assessmentId}, ${String(body.employeeId ?? userId)}, ${String(body.employeeName ?? "Demo Employee")},
        ${String(body.cycleId ?? "active")}, ${framework}, TRUE, ${JSON.stringify(objectives)}::jsonb, ${String(userId)}, NOW()
      )
      ON CONFLICT (tenant_id, assessment_id) DO UPDATE SET
        framework = EXCLUDED.framework,
        objectives_json = EXCLUDED.objectives_json,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
    `;

    return c.json({
      isDemo: true,
      disclaimer: DEMO_DISCLAIMER,
      assessmentId,
      framework,
      objectives,
      count: objectives.length,
    });
  });

  app.post(
    "/api/v1/performance/demo/appraisals/:assessmentId/save",
    zValidator("json", demoSaveSchema),
    async (c) => {
      const { companyId, userId } = c.get("tenant");
      const tenantId = String(companyId);
      const assessmentId = c.req.param("assessmentId");
      const body = c.req.valid("json");
      const sql = getSql(c.env);
      const id = `demo-${tenantId}-${assessmentId}`;

      await sql`
        INSERT INTO performance_demo_appraisals (
          id, tenant_id, assessment_id, employee_id, employee_name, cycle_id, framework, is_demo,
          overall_rating, self_summary, manager_summary, strengths, development_areas, objectives_json, sections_json,
          updated_by, updated_at
        ) VALUES (
          ${id}, ${tenantId}, ${assessmentId}, ${body.employeeId ?? String(userId)}, ${body.employeeName ?? "Demo Employee"},
          ${body.cycleId ?? "active"}, ${(body.framework ?? "BSC").toUpperCase()}, TRUE,
          ${body.overallRating ?? null}, ${body.selfSummary ?? ""}, ${body.managerSummary ?? ""},
          ${body.strengths ?? ""}, ${body.developmentAreas ?? ""},
          ${JSON.stringify(body.objectives ?? [])}::jsonb, ${JSON.stringify(body.sections ?? [])}::jsonb,
          ${String(userId)}, NOW()
        )
        ON CONFLICT (tenant_id, assessment_id) DO UPDATE SET
          framework = EXCLUDED.framework,
          overall_rating = EXCLUDED.overall_rating,
          self_summary = EXCLUDED.self_summary,
          manager_summary = EXCLUDED.manager_summary,
          strengths = EXCLUDED.strengths,
          development_areas = EXCLUDED.development_areas,
          objectives_json = EXCLUDED.objectives_json,
          sections_json = EXCLUDED.sections_json,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
      `;

      return c.json({
        saved: true,
        isDemo: true,
        disclaimer: DEMO_DISCLAIMER,
        assessmentId,
      });
    }
  );

  app.post(
    "/api/v1/performance/demo/appraisals/:assessmentId/report",
    zValidator("json", demoReportSchema),
    async (c) => {
      const { companyId, userId } = c.get("tenant");
      const tenantId = String(companyId);
      const assessmentId = c.req.param("assessmentId");
      const { format } = c.req.valid("json");
      const sql = getSql(c.env);

      const rows = await sql`
        SELECT * FROM performance_demo_appraisals
        WHERE tenant_id = ${tenantId} AND assessment_id = ${assessmentId}
        LIMIT 1
      `;
      const demo = rows[0] ?? {
        id: `demo-${tenantId}-${assessmentId}`,
        assessment_id: assessmentId,
        employee_name: "Demo Employee",
        cycle_id: "active",
        framework: "BSC",
        overall_rating: 4.2,
        self_summary: "",
        manager_summary: "",
        strengths: "",
        development_areas: "",
        objectives_json: buildSeedObjectives("BSC"),
      };

      if (rows[0]) {
        await sql`
          INSERT INTO performance_demo_reports (id, tenant_id, demo_appraisal_id, assessment_id, format, disclaimer, generated_by)
          VALUES (${`rep-${Date.now()}`}, ${tenantId}, ${rows[0].id}, ${assessmentId}, ${format}, ${DEMO_DISCLAIMER}, ${String(userId)})
        `;
      }

      const objectives = Array.isArray(demo.objectives_json) ? demo.objectives_json : [];
      const payload = {
        assessmentId,
        employeeName: demo.employee_name || "Demo Employee",
        cycleId: demo.cycle_id || "active",
        framework: demo.framework || "BSC",
        overallRating: demo.overall_rating != null ? Number(demo.overall_rating) : null,
        selfSummary: demo.self_summary || "",
        managerSummary: demo.manager_summary || "",
        strengths: demo.strengths || "",
        developmentAreas: demo.development_areas || "",
        objectives,
      };

      if (format === "CSV") {
        const csv = buildDemoReportCsv(payload);
        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="demo-appraisal-${assessmentId}.csv"`,
          },
        });
      }

      return c.json({
        isDemo: true,
        disclaimer: DEMO_DISCLAIMER,
        format,
        generatedAt: new Date().toISOString(),
        report: payload,
      });
    }
  );

  app.delete("/api/v1/performance/demo/appraisals/:assessmentId", async (c) => {
    const { companyId } = c.get("tenant");
    const tenantId = String(companyId);
    const assessmentId = c.req.param("assessmentId");
    const sql = getSql(c.env);

    await sql`
      DELETE FROM performance_demo_appraisals
      WHERE tenant_id = ${tenantId} AND assessment_id = ${assessmentId}
    `;

    return c.json({ reset: true, isDemo: true, assessmentId });
  });

  return app;
}

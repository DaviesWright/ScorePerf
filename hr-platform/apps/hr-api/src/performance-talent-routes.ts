import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type postgres from "postgres";
import type { TenantContext } from "./auth";
import type { Env } from "./index";

type Sql = ReturnType<typeof postgres>;

const isHr = (role: string) => role === "hr_admin" || role === "hr_director";

/** Assessment stages that carry a certified result. */
export const CERTIFIED_STAGES = ["FINALIZED", "ACKNOWLEDGED", "APPEAL_RESOLVED"];

/** Certified ratings at or below this open a PIP candidacy (HR must still confirm). */
export const PIP_TRIGGER_MAX_RATING = 2;

export type PerformanceBand = "LOW" | "MODERATE" | "HIGH";
export type PotentialLevel = "LOW" | "MEDIUM" | "HIGH";

/** 1–2 low, 3 moderate, 4–5 high on the certified 1–5 scale. Pure, exported for tests. */
export function performanceBand(finalRating: number): PerformanceBand {
  if (finalRating < 2.5) return "LOW";
  if (finalRating < 3.5) return "MODERATE";
  return "HIGH";
}

/** Same cell ids as the existing Talent Matrix UI. */
export const NINE_BOX_CELLS: Record<PotentialLevel, Record<PerformanceBand, string>> = {
  HIGH: { LOW: "rough_diamond", MODERATE: "future_star", HIGH: "consistent_star" },
  MEDIUM: { LOW: "inconsistent", MODERATE: "core_contributor", HIGH: "high_performer" },
  LOW: { LOW: "talent_action", MODERATE: "solid_pro", HIGH: "trusted_master" },
};

export interface NineBoxRow {
  assessment_id: unknown;
  employee_id: unknown;
  final_rating: unknown;
  potential_confirmed: unknown;
  stage: unknown;
}

/**
 * Place certified results on the 9-box. Results without a committee-confirmed
 * potential, or with an appeal still open, are listed as excluded rather than
 * guessed. Pure, exported for tests.
 */
export function buildNineBox(rows: NineBoxRow[]) {
  const cells: Record<string, { cellId: string; potential: PotentialLevel; performance: PerformanceBand; employees: { assessmentId: string; employeeId: string; finalRating: number }[] }> = {};
  for (const p of ["HIGH", "MEDIUM", "LOW"] as PotentialLevel[]) {
    for (const b of ["LOW", "MODERATE", "HIGH"] as PerformanceBand[]) {
      const id = NINE_BOX_CELLS[p][b];
      cells[id] = { cellId: id, potential: p, performance: b, employees: [] };
    }
  }
  const excluded: { assessmentId: string; employeeId: string; reason: string }[] = [];
  for (const r of rows) {
    const ids = { assessmentId: String(r.assessment_id), employeeId: String(r.employee_id) };
    if (!CERTIFIED_STAGES.includes(String(r.stage))) {
      excluded.push({ ...ids, reason: r.stage === "APPEAL_OPEN" ? "APPEAL_OPEN" : "NOT_CERTIFIED" });
      continue;
    }
    if (r.final_rating == null) {
      excluded.push({ ...ids, reason: "NOT_CERTIFIED" });
      continue;
    }
    const potential = r.potential_confirmed as PotentialLevel | null;
    if (!potential) {
      excluded.push({ ...ids, reason: "POTENTIAL_NOT_CONFIRMED" });
      continue;
    }
    const finalRating = Number(r.final_rating);
    cells[NINE_BOX_CELLS[potential][performanceBand(finalRating)]].employees.push({ ...ids, finalRating });
  }
  return { cells: Object.values(cells), excluded };
}

const PotentialBody = z.object({
  level: z.enum(["LOW", "MEDIUM", "HIGH"]),
  rationale: z.string().trim().min(20).max(2000),
});

const CreatePipBody = z.object({
  assessmentId: z.string().min(1),
  improvementAreas: z
    .array(
      z.object({
        area: z.string().trim().min(3).max(300),
        expectedStandard: z.string().trim().min(3).max(1000),
        measure: z.string().trim().min(3).max(500),
      }),
    )
    .min(1)
    .max(10),
  supportPlan: z.string().trim().min(20).max(4000),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const AcceptBody = z.object({ comment: z.string().trim().max(4000).optional() });
const CheckinBody = z.object({
  status: z.enum(["ON_TRACK", "AT_RISK", "OFF_TRACK"]),
  notes: z.string().trim().min(10).max(4000),
  evidence: z.string().trim().max(2000).optional(),
});
const CloseBody = z.object({
  outcome: z.enum(["MET", "PARTIALLY_MET", "NOT_MET", "WITHDRAWN"]),
  reason: z.string().trim().min(20).max(4000),
});

/** Minimum and maximum PIP length in days (plan default). */
export const PIP_MIN_DAYS = 30;
export const PIP_MAX_DAYS = 180;

async function audit(
  sql: Sql,
  tenantId: string,
  actor: string,
  context: "ESS" | "MSS" | "HRMS",
  entityType: string,
  entityId: string,
  action: string,
  after: unknown,
  reason: string | null = null,
) {
  await sql`
    INSERT INTO performance_audit_events (
      id, tenant_id, actor_employee_id, context, entity_type, entity_id, action, after_json, reason
    ) VALUES (
      ${`AUD-${crypto.randomUUID()}`}, ${tenantId}, ${actor}, ${context}, ${entityType}, ${entityId}, ${action},
      ${JSON.stringify(after)}::jsonb, ${reason}
    )
  `;
}

export function createPerformanceTalentRoutes(getSql: (env: Env) => Sql) {
  const routes = new Hono<{ Bindings: Env; Variables: { tenant: TenantContext } }>();

  // POST /api/v1/performance/assessments/:id/potential — the assessing manager proposes potential.
  routes.post("/api/v1/performance/assessments/:id/potential", zValidator("json", PotentialBody), async (c) => {
    const { companyId, userId } = c.get("tenant");
    const tenantId = String(companyId);
    const actor = String(userId);
    const body = c.req.valid("json");
    const sql = getSql(c.env);
    const [a] = await sql`
      SELECT * FROM performance_assessments WHERE id = ${c.req.param("id")} AND tenant_id = ${tenantId}
    `;
    if (!a) return c.json({ error: "Assessment not found", code: "PERF_ASSESSMENT_NOT_FOUND" }, 404);
    if (String(a.manager_employee_id ?? "") !== actor) {
      return c.json({ error: "Only the assessing manager proposes potential", code: "PERF_FORBIDDEN" }, 403);
    }
    if (a.is_locked || !["MANAGER_COMPLETE", "CALIBRATION_PENDING"].includes(String(a.stage))) {
      return c.json({ error: "Potential can be proposed after the manager assessment and before calibration", code: "PERF_STAGE_NOT_READY" }, 409);
    }
    await sql.begin(async (tx) => {
      const t = tx as unknown as Sql;
      await t`
        UPDATE performance_assessments
        SET potential_proposed = ${body.level}, potential_rationale = ${body.rationale},
            potential_proposed_by = ${actor}, updated_at = NOW()
        WHERE id = ${a.id} AND tenant_id = ${tenantId}
      `;
      await audit(t, tenantId, actor, "MSS", "performance_assessment", String(a.id), "PROPOSE_POTENTIAL", { level: body.level }, body.rationale);
    });
    return c.json({ id: a.id, potentialProposed: body.level });
  });

  // GET /api/v1/performance/talent-matrix?cycleId= — HR only; certified results × confirmed potential.
  routes.get("/api/v1/performance/talent-matrix", async (c) => {
    const { companyId, role } = c.get("tenant");
    if (!isHr(role)) return c.json({ error: "HR permission required", code: "PERF_FORBIDDEN" }, 403);
    const cycleId = c.req.query("cycleId");
    if (!cycleId) return c.json({ error: "cycleId is required", code: "PERF_CYCLE_REQUIRED" }, 400);
    const sql = getSql(c.env);
    const rows = await sql`
      SELECT id AS assessment_id, employee_id, final_rating, potential_confirmed, stage
      FROM performance_assessments
      WHERE tenant_id = ${String(companyId)} AND cycle_id = ${cycleId} AND final_rating IS NOT NULL
    `;
    return c.json({ cycleId, ...buildNineBox(rows as unknown as NineBoxRow[]) });
  });

  // GET /api/v1/performance/pips/candidates?cycleId= — HR only; certified ≤ 2, no appeal open, no live PIP.
  routes.get("/api/v1/performance/pips/candidates", async (c) => {
    const { companyId, role } = c.get("tenant");
    if (!isHr(role)) return c.json({ error: "HR permission required", code: "PERF_FORBIDDEN" }, 403);
    const cycleId = c.req.query("cycleId");
    if (!cycleId) return c.json({ error: "cycleId is required", code: "PERF_CYCLE_REQUIRED" }, 400);
    const tenantId = String(companyId);
    const sql = getSql(c.env);
    const rows = await sql`
      SELECT a.id AS assessment_id, a.employee_id, a.manager_employee_id, a.final_rating, a.certified_version
      FROM performance_assessments a
      WHERE a.tenant_id = ${tenantId} AND a.cycle_id = ${cycleId}
        AND a.stage IN ${sql(CERTIFIED_STAGES)}
        AND a.final_rating <= ${PIP_TRIGGER_MAX_RATING}
        AND NOT EXISTS (
          SELECT 1 FROM performance_pips p
          WHERE p.tenant_id = a.tenant_id AND p.employee_id = a.employee_id AND p.cycle_id = a.cycle_id AND p.stage <> 'CLOSURE'
        )
      ORDER BY a.final_rating, a.employee_id
    `;
    return c.json({ cycleId, triggerMaxRating: PIP_TRIGGER_MAX_RATING, results: rows });
  });

  // POST /api/v1/performance/pips — HR initiates a PIP from a certified low result. Never automatic.
  routes.post("/api/v1/performance/pips", zValidator("json", CreatePipBody), async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (!isHr(role)) return c.json({ error: "HR permission required", code: "PERF_FORBIDDEN" }, 403);
    const tenantId = String(companyId);
    const actor = String(userId);
    const body = c.req.valid("json");
    const sql = getSql(c.env);

    const days = (Date.parse(body.endDate) - Date.parse(body.startDate)) / 86_400_000;
    if (!(days >= PIP_MIN_DAYS && days <= PIP_MAX_DAYS)) {
      return c.json({ error: `A PIP must run between ${PIP_MIN_DAYS} and ${PIP_MAX_DAYS} days`, code: "PERF_PIP_DURATION" }, 400);
    }

    const [a] = await sql`
      SELECT * FROM performance_assessments WHERE id = ${body.assessmentId} AND tenant_id = ${tenantId}
    `;
    if (!a) return c.json({ error: "Assessment not found", code: "PERF_ASSESSMENT_NOT_FOUND" }, 404);
    if (String(a.employee_id) === actor) return c.json({ error: "You cannot open a PIP on yourself", code: "PERF_SOD_OWN_PIP" }, 403);
    if (a.stage === "APPEAL_OPEN") {
      return c.json({ error: "Wait for the appeal to be resolved", code: "PERF_APPEAL_OPEN" }, 409);
    }
    if (!CERTIFIED_STAGES.includes(String(a.stage)) || a.final_rating == null) {
      return c.json({ error: "A PIP needs a certified result", code: "PERF_NOT_CERTIFIED" }, 409);
    }
    if (Number(a.final_rating) > PIP_TRIGGER_MAX_RATING) {
      return c.json({ error: `A PIP needs a certified rating of ${PIP_TRIGGER_MAX_RATING} or below`, code: "PERF_PIP_NOT_ELIGIBLE" }, 409);
    }
    const live = await sql`
      SELECT id FROM performance_pips
      WHERE tenant_id = ${tenantId} AND employee_id = ${String(a.employee_id)} AND cycle_id = ${a.cycle_id} AND stage <> 'CLOSURE'
    `;
    if (live.length > 0) return c.json({ error: "A PIP is already open for this cycle", code: "PERF_PIP_OPEN" }, 409);

    const id = `PIP-${crypto.randomUUID()}`;
    await sql.begin(async (tx) => {
      const t = tx as unknown as Sql;
      await t`
        INSERT INTO performance_pips (
          id, tenant_id, assessment_id, employee_id, manager_id, cycle_id, trigger_rating, certified_version,
          stage, improvement_areas_json, support_plan, start_date, end_date, created_by
        ) VALUES (
          ${id}, ${tenantId}, ${a.id}, ${String(a.employee_id)}, ${a.manager_employee_id ?? null}, ${a.cycle_id},
          ${a.final_rating}, ${a.certified_version ?? 1}, 'ACCEPTANCE', ${JSON.stringify(body.improvementAreas)}::jsonb,
          ${body.supportPlan}, ${body.startDate}, ${body.endDate}, ${actor}
        )
      `;
      await audit(t, tenantId, actor, "HRMS", "performance_pip", id, "INITIATE_PIP", {
        assessmentId: a.id,
        triggerRating: Number(a.final_rating),
        startDate: body.startDate,
        endDate: body.endDate,
      });
    });
    return c.json({ id, stage: "ACCEPTANCE" }, 201);
  });

  // GET /api/v1/performance/pips — HR all; managers their reports' PIPs; employees their own.
  routes.get("/api/v1/performance/pips", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const tenantId = String(companyId);
    const actor = String(userId);
    const sql = getSql(c.env);
    const rows = isHr(role)
      ? await sql`SELECT * FROM performance_pips WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 200`
      : await sql`
          SELECT * FROM performance_pips
          WHERE tenant_id = ${tenantId} AND (employee_id = ${actor} OR manager_id = ${actor})
          ORDER BY created_at DESC LIMIT 200`;
    return c.json({ results: rows });
  });

  async function loadPip(sql: Sql, tenantId: string, id: string) {
    const [p] = await sql`SELECT * FROM performance_pips WHERE id = ${id} AND tenant_id = ${tenantId}`;
    return p ?? null;
  }

  // POST /api/v1/performance/pips/:id/accept — employee acknowledges the plan (comment may record disagreement).
  routes.post("/api/v1/performance/pips/:id/accept", zValidator("json", AcceptBody), async (c) => {
    const { companyId, userId } = c.get("tenant");
    const tenantId = String(companyId);
    const actor = String(userId);
    const sql = getSql(c.env);
    const p = await loadPip(sql, tenantId, c.req.param("id"));
    if (!p) return c.json({ error: "PIP not found", code: "PERF_PIP_NOT_FOUND" }, 404);
    if (String(p.employee_id) !== actor) return c.json({ error: "Only the employee can accept", code: "PERF_FORBIDDEN" }, 403);
    if (p.stage !== "ACCEPTANCE") return c.json({ error: "PIP is not awaiting acceptance", code: "PERF_PIP_STAGE" }, 409);
    const comment = c.req.valid("json").comment ?? null;
    await sql.begin(async (tx) => {
      const t = tx as unknown as Sql;
      await t`
        UPDATE performance_pips SET stage = 'SIGN_OFF', employee_comment = ${comment}, accepted_at = NOW()
        WHERE id = ${p.id} AND tenant_id = ${tenantId}
      `;
      await audit(t, tenantId, actor, "ESS", "performance_pip", String(p.id), "ACCEPT_PIP", { hasComment: Boolean(comment) }, comment);
    });
    return c.json({ id: p.id, stage: "SIGN_OFF" });
  });

  // POST /api/v1/performance/pips/:id/sign-off — HR director signs off; someone other than the initiator.
  routes.post("/api/v1/performance/pips/:id/sign-off", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (role !== "hr_director") return c.json({ error: "Only an HR director signs off a PIP", code: "PERF_FORBIDDEN" }, 403);
    const tenantId = String(companyId);
    const actor = String(userId);
    const sql = getSql(c.env);
    const p = await loadPip(sql, tenantId, c.req.param("id"));
    if (!p) return c.json({ error: "PIP not found", code: "PERF_PIP_NOT_FOUND" }, 404);
    if (p.stage !== "SIGN_OFF") return c.json({ error: "PIP is not awaiting sign-off", code: "PERF_PIP_STAGE" }, 409);
    if (String(p.created_by) === actor) {
      return c.json({ error: "The person who initiated the PIP cannot also sign it off", code: "PERF_SOD_PIP_SIGNOFF" }, 403);
    }
    await sql.begin(async (tx) => {
      const t = tx as unknown as Sql;
      await t`
        UPDATE performance_pips SET stage = 'EXECUTION', signed_off_by = ${actor}, signed_off_at = NOW()
        WHERE id = ${p.id} AND tenant_id = ${tenantId}
      `;
      await audit(t, tenantId, actor, "HRMS", "performance_pip", String(p.id), "SIGN_OFF_PIP", { stage: "EXECUTION" });
    });
    return c.json({ id: p.id, stage: "EXECUTION" });
  });

  // POST /api/v1/performance/pips/:id/check-ins — manager or HR records progress during execution.
  routes.post("/api/v1/performance/pips/:id/check-ins", zValidator("json", CheckinBody), async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const tenantId = String(companyId);
    const actor = String(userId);
    const body = c.req.valid("json");
    const sql = getSql(c.env);
    const p = await loadPip(sql, tenantId, c.req.param("id"));
    if (!p) return c.json({ error: "PIP not found", code: "PERF_PIP_NOT_FOUND" }, 404);
    if (!isHr(role) && String(p.manager_id ?? "") !== actor) {
      return c.json({ error: "Only the manager or HR can record check-ins", code: "PERF_FORBIDDEN" }, 403);
    }
    if (p.stage !== "EXECUTION") return c.json({ error: "PIP is not in execution", code: "PERF_PIP_STAGE" }, 409);
    const id = `PIPC-${crypto.randomUUID()}`;
    await sql.begin(async (tx) => {
      const t = tx as unknown as Sql;
      await t`
        INSERT INTO performance_pip_checkins (id, pip_id, author_id, status, notes, evidence)
        VALUES (${id}, ${p.id}, ${actor}, ${body.status}, ${body.notes}, ${body.evidence ?? null})
      `;
      await audit(t, tenantId, actor, isHr(role) ? "HRMS" : "MSS", "performance_pip", String(p.id), "PIP_CHECKIN", { status: body.status });
    });
    return c.json({ id, status: body.status }, 201);
  });

  // POST /api/v1/performance/pips/:id/close — HR records the outcome.
  routes.post("/api/v1/performance/pips/:id/close", zValidator("json", CloseBody), async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (!isHr(role)) return c.json({ error: "HR permission required", code: "PERF_FORBIDDEN" }, 403);
    const tenantId = String(companyId);
    const actor = String(userId);
    const body = c.req.valid("json");
    const sql = getSql(c.env);
    const p = await loadPip(sql, tenantId, c.req.param("id"));
    if (!p) return c.json({ error: "PIP not found", code: "PERF_PIP_NOT_FOUND" }, 404);
    if (p.stage === "CLOSURE") return c.json({ error: "PIP already closed", code: "PERF_PIP_STAGE" }, 409);
    if (body.outcome !== "WITHDRAWN" && p.stage !== "EXECUTION") {
      return c.json({ error: "Only a PIP in execution can close with a result; otherwise withdraw it", code: "PERF_PIP_STAGE" }, 409);
    }
    await sql.begin(async (tx) => {
      const t = tx as unknown as Sql;
      await t`
        UPDATE performance_pips
        SET stage = 'CLOSURE', outcome = ${body.outcome}, outcome_reason = ${body.reason}, closed_by = ${actor}, closed_at = NOW()
        WHERE id = ${p.id} AND tenant_id = ${tenantId}
      `;
      await audit(t, tenantId, actor, "HRMS", "performance_pip", String(p.id), "CLOSE_PIP", { outcome: body.outcome }, body.reason);
    });
    return c.json({ id: p.id, stage: "CLOSURE", outcome: body.outcome });
  });

  return routes;
}

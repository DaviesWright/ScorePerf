import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type postgres from "postgres";
import type { TenantContext } from "./auth";
import type { Env } from "./index";

type Sql = ReturnType<typeof postgres>;

const isHr = (role: string) => role === "hr_admin" || role === "hr_director";

/** Default appeal window, in working days after certification (plan default; confirm per client policy). */
export const APPEAL_WINDOW_WORKING_DAYS = 10;

/**
 * Add Monday–Friday working days to a date (UTC). Public holidays are not
 * excluded yet. Pure, exported for tests. Returns YYYY-MM-DD.
 */
export function addWorkingDays(from: Date, days: number): string {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d.toISOString().slice(0, 10);
}

/**
 * An appeal reviewer must be independent of the result (BUILD.md §9.6):
 * not the employee, their assessing manager, any calibrator who decided
 * on it, or whoever certified it. Pure, exported for tests.
 */
export function canReviewAppeal(p: {
  reviewerId: string;
  employeeId: string;
  managerId: string | null;
  calibratorIds: string[];
  certifierId: string | null;
}): { allowed: boolean; code: string } {
  if (p.reviewerId === p.employeeId) return { allowed: false, code: "PERF_SOD_OWN_APPEAL" };
  if (p.managerId && p.reviewerId === p.managerId) return { allowed: false, code: "PERF_SOD_MANAGER_REVIEWER" };
  if (p.calibratorIds.includes(p.reviewerId)) return { allowed: false, code: "PERF_SOD_CALIBRATOR_REVIEWER" };
  if (p.certifierId && p.reviewerId === p.certifierId) return { allowed: false, code: "PERF_SOD_CERTIFIER_REVIEWER" };
  return { allowed: true, code: "OK" };
}

const FileAppealBody = z.object({
  assessmentId: z.string().min(1),
  reason: z.string().trim().min(20).max(4000),
});

const AssignBody = z.object({ reviewerId: z.string().min(1) });

const ResolveBody = z
  .object({
    outcome: z.enum(["UPHELD", "AMENDED"]),
    amendedRating: z.number().min(1).max(5).optional(),
    resolutionNotes: z.string().trim().min(20).max(4000),
  })
  .refine((b) => b.outcome === "UPHELD" || b.amendedRating !== undefined, {
    message: "amendedRating is required when the outcome is AMENDED",
    path: ["amendedRating"],
  });

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

export function createPerformanceCertificationRoutes(getSql: (env: Env) => Sql, now: () => Date = () => new Date()) {
  const routes = new Hono<{ Bindings: Env; Variables: { tenant: TenantContext } }>();

  // POST /api/v1/performance/calibration/sessions/:id/certify
  // HR director certifies a closed session: final rating = calibrated rating, record locks, version 1.
  routes.post("/api/v1/performance/calibration/sessions/:id/certify", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (role !== "hr_director") {
      return c.json({ error: "Only an HR director can certify results", code: "PERF_FORBIDDEN" }, 403);
    }
    const tenantId = String(companyId);
    const actor = String(userId);
    const sql = getSql(c.env);

    const [session] = await sql`
      SELECT * FROM performance_calibration_sessions WHERE id = ${c.req.param("id")} AND tenant_id = ${tenantId}
    `;
    if (!session) return c.json({ error: "Session not found", code: "PERF_SESSION_NOT_FOUND" }, 404);
    if (session.status !== "COMPLETED") {
      return c.json({ error: "Close the calibration session before certifying", code: "PERF_SESSION_NOT_CLOSED" }, 409);
    }
    if (session.certified_at) {
      return c.json({ error: "Session already certified", code: "PERF_ALREADY_CERTIFIED" }, 409);
    }

    const items = await sql`
      SELECT a.* FROM performance_calibration_items i
      JOIN performance_assessments a ON a.id = i.assessment_id
      WHERE i.session_id = ${session.id}
    `;
    if (items.some((a) => String(a.employee_id) === actor)) {
      return c.json({ error: "You cannot certify a session that includes your own result", code: "PERF_SOD_OWN_CERTIFICATION" }, 403);
    }
    const missing = items.filter((a) => a.calibrated_rating == null || a.stage !== "CALIBRATION_COMPLETE");
    if (missing.length > 0) {
      return c.json(
        { error: "Some assessments have no calibrated rating", code: "PERF_NOT_CALIBRATED", assessmentIds: missing.map((a) => a.id) },
        409,
      );
    }

    const deadline = addWorkingDays(now(), APPEAL_WINDOW_WORKING_DAYS);
    await sql.begin(async (tx) => {
      const t = tx as unknown as Sql;
      for (const a of items) {
        await t`
          INSERT INTO performance_certified_results (
            id, tenant_id, assessment_id, version, final_rating, computed_rating, manager_rating,
            calibrated_rating, source, source_id, certified_by
          ) VALUES (
            ${`CERT-${crypto.randomUUID()}`}, ${tenantId}, ${a.id}, 1, ${a.calibrated_rating},
            ${a.computed_rating ?? null}, ${a.manager_rating ?? null}, ${a.calibrated_rating},
            'CALIBRATION', ${session.id}, ${actor}
          )
        `;
        await t`
          UPDATE performance_assessments
          SET final_rating = calibrated_rating, stage = 'FINALIZED', is_locked = TRUE,
              certified_version = 1, certified_at = NOW(), appeal_deadline = ${deadline}, updated_at = NOW()
          WHERE id = ${a.id} AND tenant_id = ${tenantId}
        `;
      }
      await t`
        UPDATE performance_calibration_sessions SET certified_by = ${actor}, certified_at = NOW()
        WHERE id = ${session.id} AND tenant_id = ${tenantId}
      `;
      await audit(t, tenantId, actor, "HRMS", "calibration_session", String(session.id), "CERTIFY_RESULTS", {
        assessmentIds: items.map((a) => a.id),
        appealDeadline: deadline,
      });
    });

    return c.json({ sessionId: session.id, certified: items.length, appealDeadline: deadline });
  });

  // POST /api/v1/performance/assessments/:id/acknowledge — employee confirms they have seen the result.
  // Acknowledging does not waive the right to appeal within the window.
  routes.post("/api/v1/performance/assessments/:id/acknowledge", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const tenantId = String(companyId);
    const actor = String(userId);
    const sql = getSql(c.env);
    const [a] = await sql`
      SELECT * FROM performance_assessments WHERE id = ${c.req.param("id")} AND tenant_id = ${tenantId}
    `;
    if (!a) return c.json({ error: "Assessment not found", code: "PERF_ASSESSMENT_NOT_FOUND" }, 404);
    if (String(a.employee_id) !== actor) return c.json({ error: "Only the employee can acknowledge", code: "PERF_FORBIDDEN" }, 403);
    if (a.stage !== "FINALIZED" && a.stage !== "APPEAL_RESOLVED") {
      return c.json({ error: "Nothing certified to acknowledge", code: "PERF_STAGE_NOT_READY" }, 409);
    }
    await sql.begin(async (tx) => {
      const t = tx as unknown as Sql;
      await t`
        UPDATE performance_assessments SET stage = 'ACKNOWLEDGED', acknowledged_at = NOW(), updated_at = NOW()
        WHERE id = ${a.id} AND tenant_id = ${tenantId}
      `;
      await audit(t, tenantId, actor, "ESS", "performance_assessment", String(a.id), "ACKNOWLEDGE_RESULT", {
        finalRating: a.final_rating,
        version: a.certified_version,
      });
    });
    return c.json({ id: a.id, stage: "ACKNOWLEDGED" });
  });

  // POST /api/v1/performance/appeals — the employee files an appeal within the window.
  routes.post("/api/v1/performance/appeals", zValidator("json", FileAppealBody), async (c) => {
    const { companyId, userId } = c.get("tenant");
    const tenantId = String(companyId);
    const actor = String(userId);
    const body = c.req.valid("json");
    const sql = getSql(c.env);

    const [a] = await sql`
      SELECT * FROM performance_assessments WHERE id = ${body.assessmentId} AND tenant_id = ${tenantId}
    `;
    if (!a) return c.json({ error: "Assessment not found", code: "PERF_ASSESSMENT_NOT_FOUND" }, 404);
    if (String(a.employee_id) !== actor) {
      return c.json({ error: "Only the employee can appeal their result", code: "PERF_FORBIDDEN" }, 403);
    }
    if (a.stage !== "FINALIZED" && a.stage !== "ACKNOWLEDGED") {
      return c.json({ error: "Only a certified result can be appealed", code: "PERF_STAGE_NOT_READY" }, 409);
    }
    const today = now().toISOString().slice(0, 10);
    const deadline = a.appeal_deadline ? String(a.appeal_deadline instanceof Date ? a.appeal_deadline.toISOString() : a.appeal_deadline).slice(0, 10) : null;
    if (!deadline || today > deadline) {
      return c.json({ error: "The appeal window has closed", code: "PERF_APPEAL_WINDOW_CLOSED", appealDeadline: deadline }, 409);
    }
    const open = await sql`
      SELECT id FROM performance_appeals
      WHERE assessment_id = ${a.id} AND status IN ('FILED', 'UNDER_REVIEW', 'ESCALATED')
    `;
    if (open.length > 0) return c.json({ error: "An appeal is already open", code: "PERF_APPEAL_OPEN" }, 409);

    const id = `APL-${crypto.randomUUID()}`;
    await sql.begin(async (tx) => {
      const t = tx as unknown as Sql;
      await t`
        INSERT INTO performance_appeals (id, tenant_id, assessment_id, employee_id, reason, status, original_rating)
        VALUES (${id}, ${tenantId}, ${a.id}, ${actor}, ${body.reason}, 'FILED', ${a.final_rating})
      `;
      await t`
        UPDATE performance_assessments SET stage = 'APPEAL_OPEN', updated_at = NOW()
        WHERE id = ${a.id} AND tenant_id = ${tenantId}
      `;
      await audit(t, tenantId, actor, "ESS", "performance_appeal", id, "FILE_APPEAL", { assessmentId: a.id }, body.reason);
    });
    return c.json({ id, status: "FILED", appealDeadline: deadline }, 201);
  });

  // GET /api/v1/performance/appeals — HR sees all; reviewers see assigned; employees see their own.
  routes.get("/api/v1/performance/appeals", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const tenantId = String(companyId);
    const actor = String(userId);
    const sql = getSql(c.env);
    const rows = isHr(role)
      ? await sql`SELECT * FROM performance_appeals WHERE tenant_id = ${tenantId} ORDER BY filed_at DESC LIMIT 200`
      : await sql`
          SELECT * FROM performance_appeals
          WHERE tenant_id = ${tenantId} AND (employee_id = ${actor} OR reviewer_id = ${actor})
          ORDER BY filed_at DESC LIMIT 200`;
    return c.json({ results: rows });
  });

  async function loadAppealContext(sql: Sql, tenantId: string, appealId: string) {
    const [appeal] = await sql`
      SELECT * FROM performance_appeals WHERE id = ${appealId} AND tenant_id = ${tenantId}
    `;
    if (!appeal) return null;
    const [assessment] = await sql`
      SELECT * FROM performance_assessments WHERE id = ${appeal.assessment_id} AND tenant_id = ${tenantId}
    `;
    const calibrators = await sql`
      SELECT DISTINCT approver_employee_id FROM performance_calibration_decisions WHERE assessment_id = ${appeal.assessment_id}
    `;
    const [cert] = await sql`
      SELECT certified_by FROM performance_certified_results
      WHERE assessment_id = ${appeal.assessment_id} ORDER BY version DESC LIMIT 1
    `;
    return {
      appeal,
      assessment,
      calibratorIds: calibrators.map((r) => String(r.approver_employee_id)),
      certifierId: cert ? String(cert.certified_by) : null,
    };
  }

  // POST /api/v1/performance/appeals/:id/assign — HR assigns an independent reviewer.
  routes.post("/api/v1/performance/appeals/:id/assign", zValidator("json", AssignBody), async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (!isHr(role)) return c.json({ error: "HR permission required", code: "PERF_FORBIDDEN" }, 403);
    const tenantId = String(companyId);
    const actor = String(userId);
    const { reviewerId } = c.req.valid("json");
    const sql = getSql(c.env);

    const ctx = await loadAppealContext(sql, tenantId, c.req.param("id"));
    if (!ctx || !ctx.assessment) return c.json({ error: "Appeal not found", code: "PERF_APPEAL_NOT_FOUND" }, 404);
    if (ctx.appeal.status !== "FILED" && ctx.appeal.status !== "UNDER_REVIEW") {
      return c.json({ error: "Appeal is not open", code: "PERF_APPEAL_NOT_OPEN" }, 409);
    }
    const check = canReviewAppeal({
      reviewerId,
      employeeId: String(ctx.assessment.employee_id),
      managerId: ctx.assessment.manager_employee_id == null ? null : String(ctx.assessment.manager_employee_id),
      calibratorIds: ctx.calibratorIds,
      certifierId: ctx.certifierId,
    });
    if (!check.allowed) return c.json({ error: "Reviewer is not independent of this result", code: check.code }, 403);

    await sql.begin(async (tx) => {
      const t = tx as unknown as Sql;
      await t`
        UPDATE performance_appeals SET reviewer_id = ${reviewerId}, assigned_by = ${actor}, status = 'UNDER_REVIEW'
        WHERE id = ${ctx.appeal.id} AND tenant_id = ${tenantId}
      `;
      await audit(t, tenantId, actor, "HRMS", "performance_appeal", String(ctx.appeal.id), "ASSIGN_APPEAL_REVIEWER", { reviewerId });
    });
    return c.json({ id: ctx.appeal.id, status: "UNDER_REVIEW", reviewerId });
  });

  // POST /api/v1/performance/appeals/:id/resolve — the assigned reviewer upholds or amends.
  // An amendment creates a new certified version; earlier versions are kept.
  routes.post("/api/v1/performance/appeals/:id/resolve", zValidator("json", ResolveBody), async (c) => {
    const { companyId, userId } = c.get("tenant");
    const tenantId = String(companyId);
    const actor = String(userId);
    const body = c.req.valid("json");
    const sql = getSql(c.env);

    const ctx = await loadAppealContext(sql, tenantId, c.req.param("id"));
    if (!ctx || !ctx.assessment) return c.json({ error: "Appeal not found", code: "PERF_APPEAL_NOT_FOUND" }, 404);
    if (ctx.appeal.status !== "UNDER_REVIEW") {
      return c.json({ error: "Appeal has no reviewer assigned or is closed", code: "PERF_APPEAL_NOT_UNDER_REVIEW" }, 409);
    }
    if (String(ctx.appeal.reviewer_id) !== actor) {
      return c.json({ error: "Only the assigned reviewer can resolve this appeal", code: "PERF_FORBIDDEN" }, 403);
    }

    const a = ctx.assessment;
    const amended = body.outcome === "AMENDED" ? body.amendedRating! : null;
    const nextVersion = Number(a.certified_version ?? 1) + 1;

    await sql.begin(async (tx) => {
      const t = tx as unknown as Sql;
      await t`
        UPDATE performance_appeals
        SET status = 'RESOLVED', outcome = ${body.outcome}, amended_rating = ${amended},
            resolution_notes = ${body.resolutionNotes}, decided_by = ${actor}, resolved_at = NOW()
        WHERE id = ${ctx.appeal.id} AND tenant_id = ${tenantId}
      `;
      if (amended !== null) {
        await t`
          INSERT INTO performance_certified_results (
            id, tenant_id, assessment_id, version, final_rating, computed_rating, manager_rating,
            calibrated_rating, source, source_id, certified_by
          ) VALUES (
            ${`CERT-${crypto.randomUUID()}`}, ${tenantId}, ${a.id}, ${nextVersion}, ${amended},
            ${a.computed_rating ?? null}, ${a.manager_rating ?? null}, ${a.calibrated_rating ?? null},
            'APPEAL', ${ctx.appeal.id}, ${actor}
          )
        `;
        await t`
          UPDATE performance_assessments
          SET final_rating = ${amended}, certified_version = ${nextVersion}, stage = 'APPEAL_RESOLVED', updated_at = NOW()
          WHERE id = ${a.id} AND tenant_id = ${tenantId}
        `;
      } else {
        await t`
          UPDATE performance_assessments SET stage = 'APPEAL_RESOLVED', updated_at = NOW()
          WHERE id = ${a.id} AND tenant_id = ${tenantId}
        `;
      }
      await audit(
        t,
        tenantId,
        actor,
        "HRMS",
        "performance_appeal",
        String(ctx.appeal.id),
        "RESOLVE_APPEAL",
        { outcome: body.outcome, originalRating: a.final_rating, amendedRating: amended, version: amended !== null ? nextVersion : a.certified_version },
        body.resolutionNotes,
      );
    });

    return c.json({
      id: ctx.appeal.id,
      status: "RESOLVED",
      outcome: body.outcome,
      finalRating: amended ?? Number(a.final_rating),
      certifiedVersion: amended !== null ? nextVersion : Number(a.certified_version ?? 1),
    });
  });

  return routes;
}

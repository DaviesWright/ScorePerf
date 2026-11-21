import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type postgres from "postgres";
import type { TenantContext } from "./auth";
import type { Env } from "./index";

type Sql = ReturnType<typeof postgres>;

const isHr = (role: string) => role === "hr_admin" || role === "hr_director";

/** Stages from which an assessment may enter calibration. */
const CALIBRATABLE_STAGES = ["MANAGER_COMPLETE", "CALIBRATION_PENDING", "CALIBRATION_COMPLETE"];

/**
 * Separation of duties for a calibration decision (BUILD.md §9.6).
 * Pure, exported for tests.
 */
export function canCalibrate(p: {
  actorId: string;
  employeeId: string;
  managerId: string | null;
  isCommitteeMember: boolean;
}): { allowed: boolean; code: string; message: string } {
  if (!p.isCommitteeMember) {
    return { allowed: false, code: "PERF_NOT_COMMITTEE_MEMBER", message: "Only members of this calibration committee can decide." };
  }
  if (p.actorId === p.employeeId) {
    return { allowed: false, code: "PERF_SOD_OWN_RATING", message: "You cannot calibrate your own rating." };
  }
  if (p.managerId && p.actorId === p.managerId) {
    return {
      allowed: false,
      code: "PERF_SOD_MANAGER_CALIBRATOR",
      message: "The employee's assessing manager cannot also make the calibration decision.",
    };
  }
  return { allowed: true, code: "OK", message: "Permitted." };
}

const CreateSessionBody = z.object({
  cycleId: z.string().min(1),
  title: z.string().trim().min(3).max(200),
  policyNote: z.string().max(2000).default(""),
  chairId: z.string().min(1),
  memberIds: z.array(z.string().min(1)).min(1).max(30),
});

const AddItemsBody = z.object({
  assessmentIds: z.array(z.string().min(1)).min(1).max(500),
});

const DecisionBody = z.object({
  sessionId: z.string().min(1),
  assessmentId: z.string().min(1),
  postRating: z.number().min(1).max(5),
  rationale: z.string().trim().min(5).max(1000),
  dissentNotes: z.string().trim().max(2000).optional(),
});

async function audit(
  sql: Sql,
  tenantId: string,
  actor: string,
  entityType: string,
  entityId: string,
  action: string,
  after: unknown,
  reason: string | null = null,
  before: unknown = null,
) {
  await sql`
    INSERT INTO performance_audit_events (
      id, tenant_id, actor_employee_id, context, entity_type, entity_id, action, before_json, after_json, reason
    ) VALUES (
      ${`AUD-${crypto.randomUUID()}`}, ${tenantId}, ${actor}, 'HRMS', ${entityType}, ${entityId}, ${action},
      ${before === null ? null : JSON.stringify(before)}::jsonb, ${JSON.stringify(after)}::jsonb, ${reason}
    )
  `;
}

export function createPerformanceCalibrationRoutes(getSql: (env: Env) => Sql) {
  const routes = new Hono<{ Bindings: Env; Variables: { tenant: TenantContext } }>();

  async function loadSession(sql: Sql, tenantId: string, id: string) {
    const [s] = await sql`
      SELECT * FROM performance_calibration_sessions WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    return s ?? null;
  }

  async function isMember(sql: Sql, sessionId: string, actor: string) {
    const rows = await sql`
      SELECT 1 FROM performance_calibration_members WHERE session_id = ${sessionId} AND employee_id = ${actor}
    `;
    return rows.length > 0;
  }

  // POST /api/v1/performance/calibration/sessions — HR opens a session with a named committee.
  routes.post("/api/v1/performance/calibration/sessions", zValidator("json", CreateSessionBody), async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (!isHr(role)) return c.json({ error: "HR permission required", code: "PERF_FORBIDDEN" }, 403);
    const tenantId = String(companyId);
    const actor = String(userId);
    const body = c.req.valid("json");
    const sql = getSql(c.env);

    const members = [...new Set([body.chairId, ...body.memberIds])];
    const id = `CAL-${crypto.randomUUID()}`;
    await sql.begin(async (tx) => {
      const t = tx as unknown as Sql;
      await t`
        INSERT INTO performance_calibration_sessions (id, tenant_id, cycle_id, title, status, created_by, policy_note)
        VALUES (${id}, ${tenantId}, ${body.cycleId}, ${body.title}, 'OPEN', ${actor}, ${body.policyNote})
      `;
      for (const m of members) {
        await t`
          INSERT INTO performance_calibration_members (session_id, employee_id, member_role, added_by)
          VALUES (${id}, ${m}, ${m === body.chairId ? "CHAIR" : "MEMBER"}, ${actor})
        `;
      }
      await audit(t, tenantId, actor, "calibration_session", id, "OPEN_CALIBRATION_SESSION", {
        cycleId: body.cycleId,
        title: body.title,
        chairId: body.chairId,
        members,
      });
    });

    return c.json({ id, status: "OPEN", members }, 201);
  });

  // GET /api/v1/performance/calibration/sessions?cycleId= — HR sees all; others see sessions they sit on.
  routes.get("/api/v1/performance/calibration/sessions", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const tenantId = String(companyId);
    const cycleId = c.req.query("cycleId") ?? null;
    const sql = getSql(c.env);
    const rows = isHr(role)
      ? await sql`
          SELECT * FROM performance_calibration_sessions
          WHERE tenant_id = ${tenantId} AND (${cycleId}::text IS NULL OR cycle_id = ${cycleId})
          ORDER BY created_at DESC LIMIT 100`
      : await sql`
          SELECT s.* FROM performance_calibration_sessions s
          JOIN performance_calibration_members m ON m.session_id = s.id
          WHERE s.tenant_id = ${tenantId} AND m.employee_id = ${String(userId)}
            AND (${cycleId}::text IS NULL OR s.cycle_id = ${cycleId})
          ORDER BY s.created_at DESC LIMIT 100`;
    return c.json({ results: rows });
  });

  // GET /api/v1/performance/calibration/sessions/:id — session, committee, items with all ratings side by side.
  routes.get("/api/v1/performance/calibration/sessions/:id", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const tenantId = String(companyId);
    const sql = getSql(c.env);
    const session = await loadSession(sql, tenantId, c.req.param("id"));
    if (!session) return c.json({ error: "Session not found", code: "PERF_SESSION_NOT_FOUND" }, 404);
    if (!isHr(role) && !(await isMember(sql, String(session.id), String(userId)))) {
      return c.json({ error: "Forbidden", code: "PERF_FORBIDDEN" }, 403);
    }
    const members = await sql`
      SELECT employee_id, member_role FROM performance_calibration_members WHERE session_id = ${session.id}
    `;
    const items = await sql`
      SELECT a.id AS assessment_id, a.employee_id, a.manager_employee_id, a.stage,
             a.self_rating, a.computed_rating, a.computed_achievement_pct, a.manager_rating,
             a.manager_divergence_reason, a.calibrated_rating
      FROM performance_calibration_items i
      JOIN performance_assessments a ON a.id = i.assessment_id
      WHERE i.session_id = ${session.id}
      ORDER BY a.employee_id
    `;
    const distribution: Record<string, number> = {};
    for (const it of items) {
      const r = it.calibrated_rating ?? it.manager_rating;
      if (r != null) {
        const k = String(Math.round(Number(r)));
        distribution[k] = (distribution[k] ?? 0) + 1;
      }
    }
    return c.json({ session, members, items, distribution });
  });

  // POST /api/v1/performance/calibration/sessions/:id/assessments — HR adds manager-complete assessments.
  routes.post(
    "/api/v1/performance/calibration/sessions/:id/assessments",
    zValidator("json", AddItemsBody),
    async (c) => {
      const { companyId, userId, role } = c.get("tenant");
      if (!isHr(role)) return c.json({ error: "HR permission required", code: "PERF_FORBIDDEN" }, 403);
      const tenantId = String(companyId);
      const actor = String(userId);
      const sql = getSql(c.env);
      const session = await loadSession(sql, tenantId, c.req.param("id"));
      if (!session) return c.json({ error: "Session not found", code: "PERF_SESSION_NOT_FOUND" }, 404);
      if (session.status !== "OPEN") {
        return c.json({ error: "Session is not open", code: "PERF_SESSION_NOT_OPEN" }, 409);
      }

      const ids = [...new Set(c.req.valid("json").assessmentIds)];
      const assessments = await sql`
        SELECT id, cycle_id, stage, is_locked FROM performance_assessments
        WHERE tenant_id = ${tenantId} AND id IN ${sql(ids)}
      `;
      const inOtherOpen = await sql`
        SELECT i.assessment_id FROM performance_calibration_items i
        JOIN performance_calibration_sessions s ON s.id = i.session_id
        WHERE s.status = 'OPEN' AND s.id <> ${session.id} AND i.assessment_id IN ${sql(ids)}
      `;
      const busy = new Set(inOtherOpen.map((r) => String(r.assessment_id)));
      const byId = new Map(assessments.map((a) => [String(a.id), a]));

      const rejected: { assessmentId: string; code: string }[] = [];
      const accepted: string[] = [];
      for (const id of ids) {
        const a = byId.get(id);
        if (!a) rejected.push({ assessmentId: id, code: "PERF_ASSESSMENT_NOT_FOUND" });
        else if (String(a.cycle_id) !== String(session.cycle_id)) rejected.push({ assessmentId: id, code: "PERF_CYCLE_MISMATCH" });
        else if (a.is_locked) rejected.push({ assessmentId: id, code: "PM-010" });
        else if (!CALIBRATABLE_STAGES.includes(String(a.stage))) rejected.push({ assessmentId: id, code: "PERF_STAGE_NOT_READY" });
        else if (busy.has(id)) rejected.push({ assessmentId: id, code: "PERF_IN_OTHER_SESSION" });
        else accepted.push(id);
      }

      if (accepted.length > 0) {
        await sql.begin(async (tx) => {
          const t = tx as unknown as Sql;
          for (const id of accepted) {
            await t`
              INSERT INTO performance_calibration_items (session_id, assessment_id, added_by)
              VALUES (${session.id}, ${id}, ${actor})
              ON CONFLICT (session_id, assessment_id) DO NOTHING
            `;
          }
          await t`
            UPDATE performance_assessments
            SET stage = 'CALIBRATION_PENDING', updated_at = NOW()
            WHERE tenant_id = ${tenantId} AND id IN ${t(accepted)} AND stage = 'MANAGER_COMPLETE'
          `;
          await audit(t, tenantId, actor, "calibration_session", String(session.id), "ADD_CALIBRATION_ITEMS", {
            accepted,
            rejected,
          });
        });
      }

      return c.json({ accepted, rejected }, accepted.length > 0 ? 200 : 422);
    },
  );

  // POST /api/v1/performance/calibration/decide — committee decision with separation of duties.
  routes.post("/api/v1/performance/calibration/decide", zValidator("json", DecisionBody), async (c) => {
    const { companyId, userId } = c.get("tenant");
    const tenantId = String(companyId);
    const actor = String(userId);
    const body = c.req.valid("json");
    const sql = getSql(c.env);

    const session = await loadSession(sql, tenantId, body.sessionId);
    if (!session) return c.json({ error: "Session not found", code: "PERF_SESSION_NOT_FOUND" }, 404);
    if (session.status !== "OPEN") {
      return c.json({ error: "Session is not open", code: "PERF_SESSION_NOT_OPEN" }, 409);
    }

    const [item] = await sql`
      SELECT 1 FROM performance_calibration_items
      WHERE session_id = ${session.id} AND assessment_id = ${body.assessmentId}
    `;
    if (!item) {
      return c.json({ error: "Assessment is not in this session", code: "PERF_NOT_IN_SESSION" }, 409);
    }

    const [assessment] = await sql`
      SELECT * FROM performance_assessments WHERE id = ${body.assessmentId} AND tenant_id = ${tenantId}
    `;
    if (!assessment) return c.json({ error: "Assessment not found", code: "PERF_ASSESSMENT_NOT_FOUND" }, 404);
    if (assessment.is_locked) {
      return c.json({ error: { code: "PM-010", message: "Assessment is locked post-finalization." } }, 409);
    }

    const sod = canCalibrate({
      actorId: actor,
      employeeId: String(assessment.employee_id),
      managerId: assessment.manager_employee_id == null ? null : String(assessment.manager_employee_id),
      isCommitteeMember: await isMember(sql, String(session.id), actor),
    });
    if (!sod.allowed) return c.json({ error: sod.message, code: sod.code }, 403);

    const num = (v: unknown) => (v == null ? null : Number(v));
    const computedRating = num(assessment.computed_rating);
    const managerRating = num(assessment.manager_rating);
    const preRating = num(assessment.calibrated_rating) ?? managerRating ?? computedRating;
    if (preRating == null) {
      return c.json({ error: "No manager or computed rating to calibrate", code: "PERF_NOTHING_TO_CALIBRATE" }, 409);
    }

    const decisionId = `CALD-${crypto.randomUUID()}`;
    await sql.begin(async (tx) => {
      const t = tx as unknown as Sql;
      await t`
        INSERT INTO performance_calibration_decisions (
          id, session_id, assessment_id, pre_rating, post_rating, rationale, approver_employee_id,
          computed_rating, manager_rating, dissent_notes
        ) VALUES (
          ${decisionId}, ${session.id}, ${body.assessmentId}, ${preRating}, ${body.postRating}, ${body.rationale},
          ${actor}, ${computedRating}, ${managerRating}, ${body.dissentNotes ?? null}
        )
      `;
      // Manager and computed ratings stay untouched; the calibrated rating is its own field.
      await t`
        UPDATE performance_assessments
        SET calibrated_rating = ${body.postRating}, stage = 'CALIBRATION_COMPLETE', updated_at = NOW()
        WHERE id = ${body.assessmentId} AND tenant_id = ${tenantId}
      `;
      await audit(
        t,
        tenantId,
        actor,
        "performance_assessment",
        body.assessmentId,
        "CALIBRATE_RATING",
        { rating: body.postRating, sessionId: session.id, decisionId },
        body.rationale,
        { rating: preRating, computedRating, managerRating },
      );
    });

    return c.json({ decisionId, preRating, postRating: body.postRating, computedRating, managerRating });
  });

  // POST /api/v1/performance/calibration/sessions/:id/close — every item needs a decision first.
  routes.post("/api/v1/performance/calibration/sessions/:id/close", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (!isHr(role)) return c.json({ error: "HR permission required", code: "PERF_FORBIDDEN" }, 403);
    const tenantId = String(companyId);
    const actor = String(userId);
    const sql = getSql(c.env);
    const session = await loadSession(sql, tenantId, c.req.param("id"));
    if (!session) return c.json({ error: "Session not found", code: "PERF_SESSION_NOT_FOUND" }, 404);
    if (session.status !== "OPEN") {
      return c.json({ error: "Session is not open", code: "PERF_SESSION_NOT_OPEN" }, 409);
    }

    const undecided = await sql`
      SELECT i.assessment_id FROM performance_calibration_items i
      WHERE i.session_id = ${session.id}
        AND NOT EXISTS (
          SELECT 1 FROM performance_calibration_decisions d
          WHERE d.session_id = i.session_id AND d.assessment_id = i.assessment_id
        )
    `;
    if (undecided.length > 0) {
      return c.json(
        {
          error: "Every assessment in the session needs a decision, even if the rating is unchanged.",
          code: "PERF_UNDECIDED_ITEMS",
          assessmentIds: undecided.map((r) => r.assessment_id),
        },
        409,
      );
    }

    await sql.begin(async (tx) => {
      const t = tx as unknown as Sql;
      await t`
        UPDATE performance_calibration_sessions
        SET status = 'COMPLETED', closed_by = ${actor}, closed_at = NOW()
        WHERE id = ${session.id} AND tenant_id = ${tenantId}
      `;
      await audit(t, tenantId, actor, "calibration_session", String(session.id), "CLOSE_CALIBRATION_SESSION", {
        status: "COMPLETED",
      });
    });
    return c.json({ id: session.id, status: "COMPLETED" });
  });

  return routes;
}

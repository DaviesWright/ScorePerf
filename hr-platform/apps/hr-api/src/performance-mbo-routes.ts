import { Hono } from "hono";
import type postgres from "postgres";
import type { TenantContext } from "./auth";
import type { Env } from "./index";
import {
  DEFAULT_MBO_POLICY,
  scoreMboAssessment,
  type MboDirection,
  type MboObjectiveInput,
} from "@hr-platform/shared";

type Sql = ReturnType<typeof postgres>;
type Row = Record<string, unknown>;

const isHr = (role: string) => role === "hr_admin" || role === "hr_director";

/** Goal statuses that count toward an MBO assessment. */
const SCORABLE_GOAL_STATUSES = ["ACTIVE", "IN_PROGRESS", "AT_RISK", "OFF_TRACK", "COMPLETED", "CLOSED"];

const num = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);

/**
 * Build MBO adapter inputs from goal and measure rows. Pure, exported for tests.
 * A measure's actual counts as recorded only once a check-in has set
 * `actual_recorded_at`; the column default of 0 is never treated as data.
 */
export function buildMboObjectiveInputs(goals: Row[], measures: Row[]): MboObjectiveInput[] {
  return goals.map((g) => ({
    objectiveId: String(g.id),
    weightPct: Number(g.weight_pct),
    measures: measures
      .filter((m) => m.goal_id === g.id)
      .map((m) => {
        const recorded = m.actual_recorded_at !== null && m.actual_recorded_at !== undefined;
        return {
          measureId: String(m.id),
          direction: (m.direction ?? null) as MboDirection,
          weightPct: Number(m.weight_pct),
          unit: (m.unit as string | null) ?? undefined,
          target: num(m.target),
          actual: recorded ? num(m.actual) : null,
          rangeMin: num(m.range_min),
          rangeMax: num(m.range_max),
          tolerancePct: num(m.tolerance_pct),
          totalMilestones: num(m.total_milestones),
          completedMilestones: recorded ? num(m.completed_milestones) : null,
          qualitativeRating: recorded ? num(m.qualitative_rating) : null,
        };
      }),
  }));
}

export function createPerformanceMboRoutes(getSql: (env: Env) => Sql) {
  const routes = new Hono<{ Bindings: Env; Variables: { tenant: TenantContext } }>();

  // POST /api/v1/performance/assessments/:id/compute
  // Compute the system MBO rating from approved goals and recorded actuals.
  // Stored beside, never instead of, the manager / calibrated / final ratings.
  routes.post("/api/v1/performance/assessments/:id/compute", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const tenantId = String(companyId);
    const actor = String(userId);
    const assessmentId = c.req.param("id");
    const sql = getSql(c.env);

    const [assessment] = await sql`
      SELECT * FROM performance_assessments WHERE id = ${assessmentId} AND tenant_id = ${tenantId}
    `;
    if (!assessment) return c.json({ error: "Assessment not found", code: "PERF_ASSESSMENT_NOT_FOUND" }, 404);

    const allowed =
      isHr(role) ||
      String(assessment.employee_id) === actor ||
      String(assessment.manager_employee_id ?? "") === actor;
    if (!allowed) return c.json({ error: "Forbidden", code: "PERF_FORBIDDEN" }, 403);

    if (assessment.is_locked) {
      return c.json({ error: { code: "PM-010", message: "Assessment is locked post-finalization." } }, 409);
    }

    const goals = await sql`
      SELECT id, framework, weight_pct, status
      FROM performance_goals
      WHERE tenant_id = ${tenantId}
        AND cycle_id = ${assessment.cycle_id}
        AND owner_employee_id = ${String(assessment.employee_id)}
        AND is_demo = FALSE
        AND status IN ${sql(SCORABLE_GOAL_STATUSES)}
      ORDER BY created_at
    `;

    const frameworks = new Set(goals.map((g) => String(g.framework)));
    if (frameworks.size > 0 && (frameworks.size > 1 || !frameworks.has("MBO"))) {
      return c.json(
        {
          error: "This cycle is not an MBO cycle; only MBO assessments can be computed here.",
          code: "PERF_NOT_MBO_CYCLE",
          frameworks: [...frameworks],
        },
        422,
      );
    }

    const goalIds = goals.map((g) => String(g.id));
    const measures = goalIds.length
      ? await sql`SELECT * FROM performance_goal_measures WHERE goal_id IN ${sql(goalIds)} ORDER BY created_at`
      : [];

    const inputs = buildMboObjectiveInputs(goals as unknown as Row[], measures as unknown as Row[]);
    const result = scoreMboAssessment(inputs, DEFAULT_MBO_POLICY);

    const computationId = `CMP-${crypto.randomUUID()}`;
    await sql.begin(async (tx) => {
      const t = tx as unknown as Sql;
      await t`
        INSERT INTO performance_assessment_computations (
          id, tenant_id, assessment_id, framework, rule_version, completeness,
          achievement_pct, computed_rating, inputs_json, result_json, computed_by
        ) VALUES (
          ${computationId}, ${tenantId}, ${assessmentId}, 'MBO', ${result.ruleVersion}, ${result.completeness},
          ${result.achievementPct}, ${result.computedRating},
          ${JSON.stringify(inputs)}::jsonb, ${JSON.stringify(result)}::jsonb, ${actor}
        )
      `;
      // An incomplete run clears any earlier computed rating so a stale value is never shown.
      await t`
        UPDATE performance_assessments
        SET computed_rating = ${result.computedRating},
            computed_achievement_pct = ${result.achievementPct},
            computed_rule_version = ${result.ruleVersion},
            computed_at = NOW(),
            updated_at = NOW()
        WHERE id = ${assessmentId} AND tenant_id = ${tenantId}
      `;
      await t`
        INSERT INTO performance_audit_events (
          id, tenant_id, actor_employee_id, context, entity_type, entity_id, action, after_json
        ) VALUES (
          ${`AUD-${crypto.randomUUID()}`}, ${tenantId}, ${actor}, ${isHr(role) ? "HRMS" : "MSS"},
          'performance_assessment', ${assessmentId}, 'COMPUTE_MBO_RATING',
          ${JSON.stringify({
            computationId,
            completeness: result.completeness,
            achievementPct: result.achievementPct,
            computedRating: result.computedRating,
            ruleVersion: result.ruleVersion,
          })}::jsonb
        )
      `;
    });

    return c.json({ computationId, ...result }, result.completeness === "COMPLETE" ? 200 : 422);
  });

  return routes;
}

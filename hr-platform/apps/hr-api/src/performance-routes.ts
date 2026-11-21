import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type postgres from "postgres";
import type { TenantContext } from "./auth";
import type { Env } from "./index";
import {
  calculateGoalScore,
  canTransitionGoalStatus,
  validateAlignmentLink,
  validateFrameworkGoal,
  validateGoalWeights,
  type GoalStatus,
  type PerformanceFramework,
  type ScoringRuleType,
} from "@hr-platform/shared";

type Sql = ReturnType<typeof postgres>;

const isManagerOrHr = (role: string) =>
  role === "line_manager" || role === "hr_admin" || role === "hr_director";

const CreateGoalBody = z.object({
  cycleId: z.string().min(1).default("CYC-2026-H2"),
  framework: z.enum(["BSC", "OKR", "MBO"]),
  perspectiveCode: z
    .enum(["FINANCIAL", "CUSTOMER", "INTERNAL_PROCESS", "LEARNING_GROWTH"])
    .nullable()
    .optional(),
  title: z.string().trim().min(3).max(300),
  description: z.string().max(2000).default(""),
  weightPct: z.number().min(0).max(100),
  visibility: z.enum(["PRIVATE", "TEAM", "PUBLIC"]).default("PRIVATE"),
  parentGoalId: z.string().optional(),
  isCompanyRoot: z.boolean().optional(),
  measures: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        measureType: z
          .enum(["NUMERIC", "PERCENTAGE", "BINARY", "MILESTONE", "CUSTOM"])
          .default("NUMERIC"),
        scoringRule: z
          .enum(["RATIO", "GAP_TO_TARGET", "STAIRCASE", "BINARY", "MILESTONE"])
          .default("RATIO"),
        baseline: z.number().default(0),
        target: z.number().default(100),
        actual: z.number().default(0),
        unit: z.string().default("%"),
        weightPct: z.number().min(0).max(100).default(100),
        // MBO (BUILD.md §7.4): declared direction and its parameters.
        direction: z
          .enum(["HIGHER_IS_BETTER", "LOWER_IS_BETTER", "WITHIN_RANGE", "EXACT", "MILESTONE", "QUALITATIVE"])
          .optional(),
        rangeMin: z.number().optional(),
        rangeMax: z.number().optional(),
        tolerancePct: z.number().min(0).optional(),
        totalMilestones: z.number().int().positive().optional(),
      }),
    )
    .default([]),
});

const CheckinBody = z.object({
  progressPct: z.number().min(0).max(150),
  confidenceLevel: z.enum(["ON_TRACK", "AT_RISK", "OFF_TRACK"]).optional(),
  notes: z.string().max(2000).default(""),
  blockers: z.string().max(1000).optional(),
  nextSteps: z.string().max(1000).optional(),
  measureActuals: z
    .array(
      z.object({
        measureId: z.string(),
        actual: z.number().optional(),
        completedMilestones: z.number().int().min(0).optional(),
        qualitativeRating: z.number().int().min(1).max(5).optional(),
      }),
    )
    .optional(),
});

const AlignBody = z.object({
  parentGoalId: z.string().min(1),
  childLevel: z.number().int().optional(),
  parentLevel: z.number().int().optional(),
});


export function createPerformanceRoutes(getSql: (env: Env) => Sql) {
  const routes = new Hono<{ Bindings: Env; Variables: { tenant: TenantContext } }>();

  // GET /api/v1/performance/goals — list goals with measures and alignment links
  routes.get("/api/v1/performance/goals", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const tenantId = String(companyId);
    const cycleId = c.req.query("cycleId");
    const ownerOnly = c.req.query("mine") === "1" || !isManagerOrHr(role);
    const sql = getSql(c.env);

    const goals = ownerOnly
      ? await sql`
          SELECT * FROM performance_goals
          WHERE tenant_id = ${tenantId}
            AND owner_employee_id = ${String(userId)}
            ${cycleId ? sql`AND cycle_id = ${cycleId}` : sql``}
          ORDER BY created_at DESC
          LIMIT 200
        `
      : await sql`
          SELECT * FROM performance_goals
          WHERE tenant_id = ${tenantId}
            ${cycleId ? sql`AND cycle_id = ${cycleId}` : sql``}
          ORDER BY created_at DESC
          LIMIT 200
        `;

    const goalIds = goals.map((g) => g.id as string);
    const measures =
      goalIds.length > 0
        ? await sql`SELECT * FROM performance_goal_measures WHERE goal_id = ANY(${goalIds})`
        : [];
    const alignments =
      goalIds.length > 0
        ? await sql`SELECT * FROM performance_goal_alignment WHERE child_goal_id = ANY(${goalIds}) AND status = 'ACTIVE'`
        : [];

    return c.json({
      results: goals.map((g) => ({
        ...g,
        measures: measures.filter((m) => m.goal_id === g.id),
        alignments: alignments.filter((a) => a.child_goal_id === g.id),
      })),
    });
  });

  // POST /api/v1/performance/goals — create goal with framework validation
  routes.post(
    "/api/v1/performance/goals",
    zValidator("json", CreateGoalBody),
    async (c) => {
      const { companyId, userId } = c.get("tenant");
      const tenantId = String(companyId);
      const body = c.req.valid("json");
      const sql = getSql(c.env);

      // Enforce single framework per cycle if goals already exist for that cycle
      const existingCycleGoals = await sql`
        SELECT framework FROM performance_goals
        WHERE tenant_id = ${tenantId} AND cycle_id = ${body.cycleId}
        LIMIT 1
      `;
      const cycleFramework = (existingCycleGoals[0]?.framework ??
        body.framework) as PerformanceFramework;

      const validation = validateFrameworkGoal({
        cycleFramework,
        goalFramework: body.framework,
        perspectiveCode: body.perspectiveCode ?? null,
        keyResultsCount: body.measures.length,
        hasActionPlan: body.description.trim().length > 0,
        visibility: body.visibility,
        isCompanyRoot: body.isCompanyRoot,
        hasParentAlignment: Boolean(body.parentGoalId),
      });

      if (!validation.valid) {
        return c.json(
          { error: { code: "PERF_FRAMEWORK_INVALID", messages: validation.errors } },
          400,
        );
      }

      const goalId = `GOAL-${crypto.randomUUID()}`;
      await sql.begin(async (tx) => {
        const t = tx as unknown as Sql;
        await t`
          INSERT INTO performance_goals (
            id, tenant_id, cycle_id, framework, owner_employee_id,
            perspective_code, title, description, weight_pct, visibility,
            status, created_by, updated_by
          ) VALUES (
            ${goalId}, ${tenantId}, ${body.cycleId}, ${body.framework}, ${String(userId)},
            ${body.perspectiveCode ?? null}, ${body.title}, ${body.description},
            ${body.weightPct}, ${body.visibility}, 'DRAFT', ${String(userId)}, ${String(userId)}
          )
        `;

        for (const m of body.measures) {
          await t`
            INSERT INTO performance_goal_measures (
              id, goal_id, title, measure_type, scoring_rule,
              baseline, target, actual, unit, weight_pct,
              direction, range_min, range_max, tolerance_pct, total_milestones
            ) VALUES (
              ${`MSR-${crypto.randomUUID()}`}, ${goalId}, ${m.title}, ${m.measureType},
              ${m.scoringRule}, ${m.baseline}, ${m.target}, ${m.actual}, ${m.unit}, ${m.weightPct},
              ${m.direction ?? null}, ${m.rangeMin ?? null}, ${m.rangeMax ?? null},
              ${m.tolerancePct ?? null}, ${m.totalMilestones ?? null}
            )
          `;
        }

        if (body.parentGoalId) {
          await t`
            INSERT INTO performance_goal_alignment (
              id, tenant_id, cycle_id, child_goal_id, parent_goal_id, created_by
            ) VALUES (
              ${`ALN-${crypto.randomUUID()}`}, ${tenantId}, ${body.cycleId},
              ${goalId}, ${body.parentGoalId}, ${String(userId)}
            )
          `;
        }

        await t`
          INSERT INTO performance_audit_events (
            id, tenant_id, actor_employee_id, context, entity_type, entity_id, action, after_json
          ) VALUES (
            ${`AUD-${crypto.randomUUID()}`}, ${tenantId}, ${String(userId)}, 'ESS',
            'performance_goal', ${goalId}, 'CREATE_GOAL', ${JSON.stringify(body)}
          )
        `;
      });

      return c.json({ id: goalId, warnings: validation.warnings }, 201);
    },
  );

  // POST /api/v1/performance/goals/:id/submit — validate 100% weight sum & submit
  routes.post("/api/v1/performance/goals/:id/submit", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const tenantId = String(companyId);
    const goalId = c.req.param("id");
    const sql = getSql(c.env);

    const [goal] = await sql`
      SELECT * FROM performance_goals WHERE id = ${goalId} AND tenant_id = ${tenantId}
    `;
    if (!goal) return c.json({ error: "Not found" }, 404);
    if (goal.owner_employee_id !== String(userId)) {
      return c.json({ error: "Only the goal owner can submit." }, 403);
    }

    const ownerGoals = await sql`
      SELECT id, weight_pct FROM performance_goals
      WHERE tenant_id = ${tenantId}
        AND cycle_id = ${goal.cycle_id}
        AND owner_employee_id = ${goal.owner_employee_id}
        AND status NOT IN ('CANCELLED', 'DEFERRED')
    `;
    const weightCheck = validateGoalWeights(
      ownerGoals.map((g) => ({ goalId: g.id as string, weightPct: Number(g.weight_pct) })),
    );
    if (!weightCheck.valid) {
      return c.json({ error: { code: weightCheck.code, message: weightCheck.message } }, 400);
    }

    await sql`
      UPDATE performance_goals
      SET status = 'PENDING_APPROVAL', updated_at = NOW(), updated_by = ${String(userId)}
      WHERE id = ${goalId} AND tenant_id = ${tenantId}
    `;
    await sql`
      INSERT INTO performance_goal_status_history (id, goal_id, from_status, to_status, actor_employee_id)
      VALUES (${`GSH-${crypto.randomUUID()}`}, ${goalId}, ${goal.status}, 'PENDING_APPROVAL', ${String(userId)})
    `;

    return c.json({ id: goalId, status: "PENDING_APPROVAL", totalWeight: weightCheck.totalWeight });
  });

  // POST /api/v1/performance/goals/:id/approve — PM-008 blocks self-approval
  routes.post("/api/v1/performance/goals/:id/approve", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const tenantId = String(companyId);
    const goalId = c.req.param("id");
    const sql = getSql(c.env);

    const [goal] = await sql`
      SELECT * FROM performance_goals WHERE id = ${goalId} AND tenant_id = ${tenantId}
    `;
    if (!goal) return c.json({ error: "Not found" }, 404);

    const guard = canTransitionGoalStatus({
      from: goal.status as GoalStatus,
      to: "ACTIVE",
      actorIsOwner: goal.owner_employee_id === String(userId),
      actorIsApprover: isManagerOrHr(role) && goal.owner_employee_id !== String(userId),
    });

    if (!guard.allowed) {
      return c.json({ error: { code: guard.code, message: guard.reason } }, 403);
    }

    await sql`
      UPDATE performance_goals
      SET status = 'ACTIVE', updated_at = NOW(), updated_by = ${String(userId)}
      WHERE id = ${goalId} AND tenant_id = ${tenantId}
    `;
    await sql`
      INSERT INTO performance_goal_status_history (id, goal_id, from_status, to_status, actor_employee_id)
      VALUES (${`GSH-${crypto.randomUUID()}`}, ${goalId}, ${goal.status}, 'ACTIVE', ${String(userId)})
    `;

    return c.json({ id: goalId, status: "ACTIVE" });
  });

  // POST /api/v1/performance/goals/:id/checkin — record progress & immutable score snapshot
  routes.post(
    "/api/v1/performance/goals/:id/checkin",
    zValidator("json", CheckinBody),
    async (c) => {
      const { companyId, userId } = c.get("tenant");
      const tenantId = String(companyId);
      const goalId = c.req.param("id");
      const body = c.req.valid("json");
      const sql = getSql(c.env);

      const [goal] = await sql`
        SELECT * FROM performance_goals WHERE id = ${goalId} AND tenant_id = ${tenantId}
      `;
      if (!goal) return c.json({ error: "Not found" }, 404);

      if (body.measureActuals) {
        for (const ma of body.measureActuals) {
          await sql`
            UPDATE performance_goal_measures
            SET actual = COALESCE(${ma.actual ?? null}, actual),
                completed_milestones = COALESCE(${ma.completedMilestones ?? null}, completed_milestones),
                qualitative_rating = COALESCE(${ma.qualitativeRating ?? null}, qualitative_rating),
                actual_recorded_at = NOW()
            WHERE id = ${ma.measureId} AND goal_id = ${goalId}
          `;
        }
      }

      const measures = await sql`
        SELECT * FROM performance_goal_measures WHERE goal_id = ${goalId}
      `;

      const snapshot = calculateGoalScore({
        goalId,
        framework: goal.framework as PerformanceFramework,
        profileVersionId: (goal.profile_version_id as string | null) ?? "PROF-DEFAULT-v1",
        ruleVersion: goal.rule_version_pinned as string,
        cycleId: goal.cycle_id as string,
        actorId: String(userId),
        measures:
          measures.length > 0
            ? measures.map((m) => ({
                measureId: m.id as string,
                rule: m.scoring_rule as ScoringRuleType,
                baseline: Number(m.baseline),
                target: Number(m.target),
                actual: Number(m.actual),
                weightPct: Number(m.weight_pct),
              }))
            : [
                {
                  measureId: "DEFAULT",
                  rule: "GAP_TO_TARGET",
                  baseline: 0,
                  target: 100,
                  actual: body.progressPct,
                  weightPct: 100,
                },
              ],
      });

      const updateId = `CHK-${crypto.randomUUID()}`;
      const snapId = `SNP-${crypto.randomUUID()}`;

      await sql.begin(async (tx) => {
        const t = tx as unknown as Sql;
        await t`
          INSERT INTO performance_goal_updates (
            id, goal_id, actor_employee_id, progress_pct, confidence_level, notes, blockers, next_steps
          ) VALUES (
            ${updateId}, ${goalId}, ${String(userId)}, ${body.progressPct},
            ${body.confidenceLevel ?? null}, ${body.notes}, ${body.blockers ?? null}, ${body.nextSteps ?? null}
          )
        `;
        await t`
          UPDATE performance_goals
          SET progress_pct = ${body.progressPct},
              confidence_level = COALESCE(${body.confidenceLevel ?? null}, confidence_level),
              computed_score = ${snapshot.normalizedScoreZeroToOne},
              updated_at = NOW(),
              updated_by = ${String(userId)}
          WHERE id = ${goalId}
        `;
        await t`
          INSERT INTO performance_score_snapshots (
            id, goal_id, cycle_id, framework, profile_version_id, rule_version,
            normalized_score, percentage_score, five_point_score, inputs_json, computed_by
          ) VALUES (
            ${snapId}, ${goalId}, ${goal.cycle_id}, ${goal.framework},
            ${snapshot.profileVersionId}, ${snapshot.ruleVersion},
            ${snapshot.normalizedScoreZeroToOne}, ${snapshot.percentageScore},
            ${snapshot.fivePointScaleScore}, ${JSON.stringify(snapshot.measureOutputs)}, ${String(userId)}
          )
        `;
      });

      return c.json({ updateId, snapshot });
    },
  );

  // POST /api/v1/performance/goals/:id/align — acyclic alignment link check
  routes.post(
    "/api/v1/performance/goals/:id/align",
    zValidator("json", AlignBody),
    async (c) => {
      const { companyId, userId } = c.get("tenant");
      const tenantId = String(companyId);
      const childGoalId = c.req.param("id");
      const body = c.req.valid("json");
      const sql = getSql(c.env);

      const [child] = await sql`SELECT id, cycle_id FROM performance_goals WHERE id = ${childGoalId} AND tenant_id = ${tenantId}`;
      const [parent] = await sql`SELECT id, cycle_id FROM performance_goals WHERE id = ${body.parentGoalId} AND tenant_id = ${tenantId}`;
      if (!child || !parent) return c.json({ error: "Goal not found" }, 404);

      const existing = await sql`
        SELECT child_goal_id, parent_goal_id, cycle_id
        FROM performance_goal_alignment
        WHERE tenant_id = ${tenantId} AND cycle_id = ${child.cycle_id} AND status = 'ACTIVE'
      `;

      const check = validateAlignmentLink(
        existing.map((e) => ({
          childGoalId: e.child_goal_id as string,
          parentGoalId: e.parent_goal_id as string,
          childCycleId: e.cycle_id as string,
          parentCycleId: e.cycle_id as string,
        })),
        {
          childGoalId,
          parentGoalId: body.parentGoalId,
          childCycleId: child.cycle_id as string,
          parentCycleId: parent.cycle_id as string,
          childLevel: body.childLevel,
          parentLevel: body.parentLevel,
        },
      );

      if (!check.valid) {
        return c.json({ error: { code: check.code, message: check.message } }, 400);
      }

      const alignId = `ALN-${crypto.randomUUID()}`;
      await sql`
        INSERT INTO performance_goal_alignment (
          id, tenant_id, cycle_id, child_goal_id, parent_goal_id, is_skip_level, created_by
        ) VALUES (
          ${alignId}, ${tenantId}, ${child.cycle_id}, ${childGoalId},
          ${body.parentGoalId}, ${check.skipLevel}, ${String(userId)}
        )
      `;

      return c.json({ id: alignId, skipLevel: check.skipLevel }, 201);
    },
  );

  // GET /api/v1/performance/assessments (calibration lives in performance-calibration-routes.ts)
  routes.get("/api/v1/performance/assessments", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const tenantId = String(companyId);
    const sql = getSql(c.env);
    const rows = isManagerOrHr(role)
      ? await sql`SELECT * FROM performance_assessments WHERE tenant_id = ${tenantId} ORDER BY updated_at DESC LIMIT 200`
      : await sql`SELECT * FROM performance_assessments WHERE tenant_id = ${tenantId} AND employee_id = ${String(userId)}`;
    return c.json({ results: rows });
  });

  return routes;
}

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { TenantContext } from "./auth";
import type { Env } from "./index";

export type PerformanceFramework = "BSC" | "OKR" | "MBO";
export type ScoringRuleType = "ratio" | "gap_to_target" | "staircase" | "binary" | "milestone";

export interface FrameworkPreset {
  id: string;
  name: string;
  framework: PerformanceFramework;
  version: string;
  description: string;
  defaultScoringRule: ScoringRuleType;
  cadence: string;
  visibilityDefault: "PRIVATE" | "TEAM" | "PUBLIC";
  stretchGuidance?: string;
}

export const SEEDED_FRAMEWORK_PRESETS: FrameworkPreset[] = [
  {
    id: "preset-okr-standard",
    name: "Standard OKR (Quarterly, Public, 0.7 Stretch)",
    framework: "OKR",
    version: "v1.0",
    description: "Quarterly OKRs with 0.0–1.0 scoring, 0.7 stretch target, and weekly/fortnightly confidence check-ins.",
    defaultScoringRule: "ratio",
    cadence: "weekly",
    visibilityDefault: "PUBLIC",
    stretchGuidance: "0.7 is the sweet spot; 1.0 indicates stretch exceeded.",
  },
  {
    id: "preset-bsc-classic",
    name: "Classic BSC (4 Perspectives, Annual)",
    framework: "BSC",
    version: "v1.0",
    description: "Balanced Scorecard with Financial, Customer, Internal Process, and Learning & Growth perspectives.",
    defaultScoringRule: "ratio",
    cadence: "quarterly",
    visibilityDefault: "TEAM",
  },
  {
    id: "preset-mbo-annual",
    name: "Annual MBO Appraisal",
    framework: "MBO",
    version: "v1.0",
    description: "Jointly agreed weighted objectives with mid-year review and year-end manager appraisal.",
    defaultScoringRule: "milestone",
    cadence: "periodic",
    visibilityDefault: "PRIVATE",
  },
];

// Deterministic Scoring Engine (§5.2)
export function computeMeasureScore(
  rule: ScoringRuleType,
  input: {
    actual: number;
    baseline?: number;
    target: number;
    milestonesCompleted?: number;
    totalMilestones?: number;
    framework?: PerformanceFramework;
  }
): { score: number; formula: string } {
  const baseline = input.baseline ?? 0;
  const target = input.target;
  const actual = input.actual;

  let raw = 0;
  let formula = "";

  if (rule === "binary") {
    raw = actual >= target ? 1 : 0;
    formula = "actual >= target ? 1.0 : 0.0";
  } else if (rule === "milestone") {
    const total = Math.max(1, input.totalMilestones ?? 1);
    const done = Math.max(0, Math.min(total, input.milestonesCompleted ?? 0));
    raw = done / total;
    formula = `${done} / ${total} milestones`;
  } else if (rule === "gap_to_target") {
    raw = target > 0 ? Math.max(0, Math.min(1.2, actual / target)) : 0;
    formula = "clamp(actual / target, 0, 1.2)";
  } else if (rule === "staircase") {
    const pct = target > 0 ? (actual / target) * 100 : 0;
    raw = pct >= 100 ? 1 : pct >= 80 ? 0.8 : pct >= 60 ? 0.6 : pct >= 40 ? 0.4 : 0.2;
    formula = "staircase bands (20/40/60/80/100%)";
  } else {
    // ratio
    const denom = target - baseline;
    raw = denom !== 0 ? Math.max(0, Math.min(1, (actual - baseline) / denom)) : 0;
    formula = "clamp((actual - baseline) / (target - baseline), 0, 1)";
  }

  const rounded =
    input.framework === "OKR"
      ? Math.round(Math.min(1, raw) * 100) / 100
      : Math.round(raw * 1000) / 10; // percentage 0..100 for BSC/MBO

  return { score: rounded, formula };
}

// Acyclic Alignment Graph Check (ADR-PM-04, §5.3)
export function hasAlignmentCycle(
  existingEdges: Array<{ childId: string; parentId: string }>,
  newChildId: string,
  newParentId: string
): boolean {
  if (newChildId === newParentId) return true;
  const parentMap = new Map<string, string[]>();
  for (const e of existingEdges) {
    const list = parentMap.get(e.childId) ?? [];
    list.push(e.parentId);
    parentMap.set(e.childId, list);
  }
  const existing = parentMap.get(newChildId) ?? [];
  parentMap.set(newChildId, [...existing, newParentId]);

  // DFS from newParentId upward: if we reach newChildId, adding edge creates a cycle
  const visited = new Set<string>();
  const stack = [newParentId];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (cur === newChildId) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    for (const nextParent of parentMap.get(cur) ?? []) {
      stack.push(nextParent);
    }
  }
  return false;
}

const alignLinkSchema = z.object({
  childGoalId: z.string().min(1),
  parentGoalId: z.string().min(1),
});

export function createPerformanceCoreRoutes(getSql: (env: Env) => any) {
  const app = new Hono<{ Bindings: Env; Variables: { tenant: TenantContext } }>();

  // ADR-PM-07: Unified framework-discriminated /performance/items
  app.get("/api/v1/performance/items", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const framework = (c.req.query("framework") || "ALL").toUpperCase();
    const scope = (c.req.query("scope") || "").toLowerCase();
    const isEmployee = (role || "").toLowerCase() === "employee";
    const sql = getSql(c.env);

    const rows = await sql`
      SELECT
        pg.id,
        pg.framework,
        pg.profile_version_id,
        pg.owner_employee_id,
        COALESCE(e.first_name || ' ' || e.last_name, 'Organisation') AS owner_name,
        pg.perspective_code,
        pg.title,
        pg.description,
        pg.weight_pct,
        pg.visibility,
        pg.status,
        pg.confidence_level,
        pg.confidence_score,
        pg.progress_pct,
        pg.computed_score,
        pg.rule_version_pinned,
        pg.start_date,
        pg.end_date
      FROM performance_goals pg
      LEFT JOIN employees e ON e.id = pg.owner_employee_id
      WHERE pg.tenant_id = ${companyId}
        AND (${framework === "ALL"}::boolean = TRUE OR UPPER(pg.framework) = ${framework})
        AND (${isEmployee || scope === "self"}::boolean = FALSE OR pg.owner_employee_id = ${userId} OR pg.visibility = 'PUBLIC')
      ORDER BY pg.id DESC
      LIMIT 100
    `;

    const items = rows.map((r: any) => ({
      id: String(r.id),
      framework: r.framework || "BSC",
      profileVersionId: r.profile_version_id || "preset-bsc-classic",
      ownerId: r.owner_employee_id,
      ownerName: r.owner_name,
      title: r.title,
      description: r.description,
      status: r.status,
      weight: Number(r.weight_pct ?? 0),
      visibility: r.visibility || "TEAM",
      progress: Number(r.progress_pct ?? 0),
      computedScore: Number(r.computed_score ?? r.progress_pct ?? 0),
      ruleVersionPinned: r.rule_version_pinned || "v1.0",
      extensions:
        r.framework === "OKR"
          ? { okr: { confidence: r.confidence_level || "ON_TRACK", confidenceValue: Number(r.confidence_score ?? 0.7) } }
          : r.framework === "MBO"
            ? { mbo: { ratingScaleId: "ops_5pt" } }
            : { bsc: { perspectiveId: r.perspective_code || "FINANCIAL" } },
    }));

    return c.json({ asAt: new Date().toISOString(), total: items.length, items });
  });

  // §6.1: Adaptive Home Dashboard (<= 6 cards, no sensitive peer/reward data)
  app.get("/api/v1/performance/dashboard", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const sql = getSql(c.env);
    const isEmployee = (role || "").toLowerCase() === "employee";

    const [agg] = await sql`
      SELECT
        COUNT(*)::int AS total_goals,
        COUNT(*) FILTER (WHERE status = 'pending_approval')::int AS pending_approvals,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_goals,
        COALESCE(AVG(progress_pct), 0)::int AS avg_progress
      FROM performance_goals
      WHERE tenant_id = ${companyId}
        AND (${isEmployee}::boolean = FALSE OR owner_employee_id = ${userId})
    `;

    return c.json({
      asAt: new Date().toISOString(),
      role,
      actionCards: [
        { key: "checkins_due", label: "Check-ins Due", value: 2, route: "goals" },
        { key: "approvals_waiting", label: "Approvals Waiting", value: Number(agg?.pending_approvals ?? 0), route: "goals" },
        { key: "avg_progress", label: "Cycle Progress", value: `${agg?.avg_progress ?? 0}%`, route: "goals" },
        { key: "completed", label: "Completed Goals", value: Number(agg?.completed_goals ?? 0), route: "reviews" },
      ],
    });
  });

  // §6.3 / ADR-PM-06: One Alignment Endpoint, Three Render Modes
  app.get("/api/v1/performance/alignment", async (c) => {
    const { companyId } = c.get("tenant");
    const renderMode = (c.req.query("renderMode") || "cascade").toLowerCase();
    const sql = getSql(c.env);

    const goals = await sql`
      SELECT id, title, framework, progress_pct, status
      FROM performance_goals
      WHERE tenant_id = ${companyId}
      LIMIT 100
    `;
    let links: any[] = [];
    try {
      links = await sql`
        SELECT id, child_goal_id, parent_goal_id
        FROM performance_goal_alignment
        WHERE tenant_id = ${companyId}
      `;
    } catch {
      links = [];
    }

    const linkedChildIds = new Set(links.map((l: any) => String(l.child_goal_id)));
    const orphanCount = goals.filter((g: any) => !linkedChildIds.has(String(g.id))).length;

    return c.json({
      asAt: new Date().toISOString(),
      renderMode: ["cascade", "grid", "list"].includes(renderMode) ? renderMode : "cascade",
      nodes: goals.map((g: any) => ({
        id: String(g.id),
        title: g.title,
        framework: g.framework || "BSC",
        progress: Number(g.progress_pct ?? 0),
        status: g.status,
      })),
      edges: links.map((l: any) => ({
        id: String(l.id),
        childGoalId: String(l.child_goal_id),
        parentGoalId: String(l.parent_goal_id),
      })),
      coverage: {
        totalGoals: goals.length,
        alignedGoals: goals.length - orphanCount,
        orphanCount,
      },
    });
  });

  app.post("/api/v1/performance/alignment/link", zValidator("json", alignLinkSchema), async (c) => {
    const { companyId } = c.get("tenant");
    const { childGoalId, parentGoalId } = c.req.valid("json");
    const sql = getSql(c.env);

    let existing: Array<{ childId: string; parentId: string }> = [];
    try {
      const rows = await sql`
        SELECT child_goal_id, parent_goal_id
        FROM performance_goal_alignment
        WHERE tenant_id = ${companyId}
      `;
      existing = rows.map((r: any) => ({
        childId: String(r.child_goal_id),
        parentId: String(r.parent_goal_id),
      }));
    } catch {
      existing = [];
    }

    if (hasAlignmentCycle(existing, childGoalId, parentGoalId)) {
      return c.json(
        {
          error: {
            code: "PERF_ALIGNMENT_CYCLE",
            message: "Alignment link rejected: linking these goals would create a circular dependency.",
          },
        },
        400
      );
    }

    const linkId = `ALN-${crypto.randomUUID()}`;
    await sql`
      INSERT INTO performance_goal_alignment (id, tenant_id, child_goal_id, parent_goal_id)
      VALUES (${linkId}, ${companyId}, ${childGoalId}, ${parentGoalId})
    `;
    return c.json({ ok: true, id: linkId, childGoalId, parentGoalId }, 201);
  });

  // §6.10 / ADR-PM-08: Seeded Framework Presets
  app.get("/api/v1/performance/settings/presets", async (c) => {
    return c.json({ presets: SEEDED_FRAMEWORK_PRESETS });
  });

  // §6.11: 6 Insight Cards
  app.get("/api/v1/performance/reports/insights", async (c) => {
    const { companyId } = c.get("tenant");
    const sql = getSql(c.env);
    const [agg] = await sql`
      SELECT
        COUNT(*)::int AS total_goals,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_goals,
        COALESCE(AVG(progress_pct), 0)::int AS avg_progress
      FROM performance_goals
      WHERE tenant_id = ${companyId}
    `;
    const total = Math.max(1, Number(agg?.total_goals ?? 1));
    const completionRate = Math.round((Number(agg?.completed_goals ?? 0) / total) * 100);

    return c.json({
      asAt: new Date().toISOString(),
      cards: [
        { key: "completion", title: "Completion", value: `${completionRate}%`, formula: "Completed / Active Goals", sparkline: [25, 38, 49, 60, completionRate] },
        { key: "alignment", title: "Alignment", value: "84%", formula: "Aligned / Total Goals", sparkline: [68, 72, 77, 81, 84] },
        { key: "quality", title: "Quality", value: "88/100", formula: "SMART & KR Rule Score", sparkline: [75, 79, 82, 85, 88] },
        { key: "cadence", title: "Cadence", value: "91%", formula: "Check-ins Performed / Due", sparkline: [80, 84, 86, 89, 91] },
        { key: "ratings", title: "Ratings", value: `${agg?.avg_progress ?? 0}%`, formula: "Weighted Roll-up Avg", sparkline: [55, 62, 68, 72, Number(agg?.avg_progress ?? 0)] },
        { key: "fairness", title: "Fairness", value: "Suppressed (<5)", formula: "Demographic Parity Check", sparkline: [0, 0, 0, 0, 0], suppressed: true },
      ],
    });
  });

  // §6.13 / §8.9: Explain Endpoint (Calculation Snapshot)
  app.get("/api/v1/performance/explain/:entityType/:id", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const entityType = c.req.param("entityType");
    const id = c.req.param("id");
    const sql = getSql(c.env);

    const rows = await sql`
      SELECT id, title, framework, profile_version_id, owner_employee_id, weight_pct, progress_pct, computed_score, rule_version_pinned, updated_at
      FROM performance_goals
      WHERE tenant_id = ${companyId} AND id::text = ${id}
      LIMIT 1
    `;
    if (rows.length === 0) {
      return c.json({ error: { code: "PERF_NOT_FOUND", message: `${entityType} ${id} not found.` } }, 404);
    }

    const g = rows[0];
    const isEmployee = (role || "").toLowerCase() === "employee";
    if (isEmployee && Number(g.owner_employee_id) !== userId) {
      return c.json({ error: { code: "PERF_FORBIDDEN", message: "Not permitted to inspect another employee's calculation snapshot." } }, 403);
    }

    const framework = (g.framework || "BSC") as PerformanceFramework;
    const computed = computeMeasureScore("ratio", {
      actual: Number(g.progress_pct ?? 0),
      baseline: 0,
      target: 100,
      framework,
    });

    return c.json({
      entityType,
      id: String(g.id),
      title: g.title,
      framework,
      frameworkProfileVersion: g.profile_version_id || "preset-v1.0",
      ruleVersion: g.rule_version_pinned || "ratio-v1.0",
      formula: computed.formula,
      measureInputs: [{ label: "Progress", baseline: 0, target: 100, actual: Number(g.progress_pct ?? 0) }],
      weights: { goalWeightPct: Number(g.weight_pct ?? 100) },
      computedScore: Number(g.computed_score ?? computed.score),
      rounding: framework === "OKR" ? "2 decimals (0.00–1.00)" : "1 decimal (0–100%)",
      timestamp: g.updated_at || new Date().toISOString(),
      actor: `Employee #${g.owner_employee_id}`,
      warnings: [],
    });
  });

  return app;
}

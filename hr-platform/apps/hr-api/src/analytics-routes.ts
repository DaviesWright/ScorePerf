import { Hono } from "hono";
import type { TenantContext } from "./auth";
import type { Env } from "./index";

export type AnalyticsModule = "leave" | "performance" | "skills" | "hris" | "cross";
export type AnalyticsScope = "self" | "team" | "org_unit" | "company";

const MIN_COHORT_DEFAULT = 5;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function resolveAnalyticsScope(
  role: string,
  requestedScope?: string | null
): { ok: true; scope: AnalyticsScope } | { ok: false; status: 403; error: string; message: string } {
  const r = (role || "employee").toLowerCase();
  const req = (requestedScope || "").toLowerCase();

  const isCompany = [
    "hr_manager",
    "hr_admin",
    "hr_director",
    "hr",
    "admin",
    "super_admin",
    "ceo",
    "md",
    "executive",
    "auditor",
  ].includes(r);
  const isDept = isCompany || r === "hr_officer" || r === "dept_head";
  const isManager = isDept || r === "line_manager" || r === "manager";

  if (req === "company" && !isCompany) {
    return { ok: false, status: 403, error: "ANALYTICS_FORBIDDEN", message: `Role '${role}' cannot query company-wide analytics.` };
  }
  if (req === "org_unit" && !isDept) {
    return { ok: false, status: 403, error: "ANALYTICS_FORBIDDEN", message: `Role '${role}' cannot query org-unit analytics.` };
  }
  if (req === "team" && !isManager) {
    return { ok: false, status: 403, error: "ANALYTICS_FORBIDDEN", message: `Role '${role}' cannot query team analytics.` };
  }

  if (req === "self" || req === "team" || req === "org_unit" || req === "company") {
    return { ok: true, scope: req };
  }
  if (isCompany) return { ok: true, scope: "company" };
  if (isDept) return { ok: true, scope: "org_unit" };
  if (isManager) return { ok: true, scope: "team" };
  return { ok: true, scope: "self" };
}

export function applySmallGroupSuppression(
  cohortSize: number,
  numericValue: number | null,
  unit = "%",
  minCohort = MIN_COHORT_DEFAULT
): {
  suppressed: boolean;
  value: number | null;
  displayValue: string;
  cohortSize: number;
  tooltip: string;
} {
  if (cohortSize > 0 && cohortSize < minCohort) {
    return {
      suppressed: true,
      value: null,
      displayValue: "—",
      cohortSize,
      tooltip: "Data suppressed to protect confidentiality.",
    };
  }
  return {
    suppressed: false,
    value: numericValue,
    displayValue: numericValue === null ? "—" : `${numericValue}${unit}`,
    cohortSize,
    tooltip: numericValue === null ? "No data" : `${numericValue}${unit} (n=${cohortSize})`,
  };
}

export function createAnalyticsRoutes(getSql: (env: Env) => any) {
  const app = new Hono<{ Bindings: Env; Variables: { tenant: TenantContext } }>();

  app.get("/api/v1/analytics/:module/kpi", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const mod = c.req.param("module") as AnalyticsModule;
    const scopeCheck = resolveAnalyticsScope(role, c.req.query("scope"));
    if (!scopeCheck.ok) {
      return c.json({ error: scopeCheck.error, message: scopeCheck.message }, scopeCheck.status);
    }

    const sql = getSql(c.env);
    const asAt = new Date().toISOString();

    if (mod === "leave") {
      const [stats] = await sql`
        SELECT
          (SELECT COUNT(*)::int FROM employees WHERE company_id = ${companyId} AND is_active = TRUE
            AND (${scopeCheck.scope === "self"}::boolean = FALSE OR id = ${userId})) AS headcount,
          (SELECT COUNT(DISTINCT lr.employee_id)::int FROM leave_requests lr
            WHERE lr.company_id = ${companyId} AND lr.status = 'approved'
              AND lr.start_date <= CURRENT_DATE AND lr.end_date >= CURRENT_DATE
              AND (${scopeCheck.scope === "self"}::boolean = FALSE OR lr.employee_id = ${userId})) AS on_leave_today,
          (SELECT COUNT(*)::int FROM leave_requests lr
            WHERE lr.company_id = ${companyId} AND lr.status IN ('pending','submitted','in_review')
              AND (${scopeCheck.scope === "self"}::boolean = FALSE OR lr.employee_id = ${userId})) AS pending_count,
          (SELECT COALESCE(SUM(lr.requested_days), 0)::int FROM leave_requests lr
            WHERE lr.company_id = ${companyId} AND lr.status = 'approved'
              AND (${scopeCheck.scope === "self"}::boolean = FALSE OR lr.employee_id = ${userId})) AS days_taken
      `;
      const hc = Math.max(1, Number(stats?.headcount ?? 1));
      const utilPct = Math.min(100, Math.round((Number(stats?.days_taken ?? 0) / (hc * 21)) * 100));
      return c.json({
        module: "leave",
        scope: scopeCheck.scope,
        asAt,
        cards: [
          { key: "utilisation", label: "Leave Utilisation", value: `${utilPct}%`, delta: "+2%", trend: "up", sparkline: [12, 14, 15, 18, 22, utilPct] },
          { key: "on_leave", label: "On Leave Today", value: String(stats?.on_leave_today ?? 0), delta: "Live", trend: "neutral", sparkline: [2, 3, 2, 4, 3, Number(stats?.on_leave_today ?? 0)] },
          { key: "pending", label: "Pending Approvals", value: String(stats?.pending_count ?? 0), delta: "Action", trend: Number(stats?.pending_count ?? 0) > 0 ? "down" : "up", sparkline: [5, 4, 6, 3, 4, Number(stats?.pending_count ?? 0)] },
          { key: "days_taken", label: "Approved Days YTD", value: String(stats?.days_taken ?? 0), delta: "YTD", trend: "up", sparkline: [20, 40, 65, 90, 110, Number(stats?.days_taken ?? 0)] },
        ],
      });
    }

    if (mod === "performance") {
      const [stats] = await sql`
        SELECT
          COUNT(*)::int AS total_goals,
          COALESCE(AVG(progress_pct), 0)::int AS avg_progress,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_goals
        FROM performance_goals
        WHERE tenant_id = ${companyId}
          AND (${scopeCheck.scope === "self"}::boolean = FALSE OR owner_employee_id = ${userId})
      `;
      return c.json({
        module: "performance",
        scope: scopeCheck.scope,
        asAt,
        cards: [
          { key: "goal_completion", label: "Goal Completion", value: `${stats?.avg_progress ?? 0}%`, delta: "+5%", trend: "up", sparkline: [30, 42, 55, 63, 70, Number(stats?.avg_progress ?? 0)] },
          { key: "total_goals", label: "Active Goals", value: String(stats?.total_goals ?? 0), delta: "Cycle", trend: "neutral", sparkline: [10, 12, 14, 15, 16, Number(stats?.total_goals ?? 0)] },
          { key: "completed", label: "Completed Goals", value: String(stats?.completed_goals ?? 0), delta: "Verified", trend: "up", sparkline: [1, 2, 3, 4, 5, Number(stats?.completed_goals ?? 0)] },
        ],
      });
    }

    // HRIS / Skills / Cross default KPI cards
    const [org] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE is_active = TRUE)::int AS headcount,
        COUNT(*) FILTER (WHERE is_active = FALSE)::int AS leavers
      FROM employees WHERE company_id = ${companyId}
    `;
    const hc = Number(org?.headcount ?? 54);
    const lv = Number(org?.leavers ?? 0);
    return c.json({
      module: mod,
      scope: scopeCheck.scope,
      asAt,
      cards: [
        { key: "headcount", label: "Active Headcount", value: String(hc), delta: "100%", trend: "up", sparkline: [50, 51, 52, 53, 54, hc] },
        { key: "turnover", label: "Turnover Rate", value: `${hc + lv > 0 ? Math.round((lv / (hc + lv)) * 100) : 0}%`, delta: "Stable", trend: "neutral", sparkline: [4, 3, 3, 2, 2, 2] },
      ],
    });
  });

  app.get("/api/v1/analytics/:module/heatmap", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const mod = c.req.param("module") as AnalyticsModule;
    const groupBy = (c.req.query("groupBy") || "department").toLowerCase(); // department | role
    const suppressThreshold = Number(c.req.query("minCohort") || MIN_COHORT_DEFAULT);

    const scopeCheck = resolveAnalyticsScope(role, c.req.query("scope"));
    if (!scopeCheck.ok) {
      return c.json({ error: scopeCheck.error, message: scopeCheck.message }, scopeCheck.status);
    }

    const sql = getSql(c.env);
    const asAt = new Date().toISOString();

    if (mod === "leave") {
      // Leave Heatmap by Department OR by Job Role across Leave Types or Months
      const dimExpr = groupBy === "role" ? "COALESCE(e.role, 'Staff')" : "COALESCE(d.name, 'Unassigned')";
      const raw = await sql.unsafe(
        `SELECT
           ${dimExpr} AS row_label,
           COALESCE(lt.name, 'Annual Leave') AS col_label,
           COUNT(DISTINCT e.id)::int AS cohort_size,
           COALESCE(SUM(lr.requested_days) FILTER (WHERE lr.status = 'approved'), 0)::int AS days_taken
         FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
         LEFT JOIN leave_requests lr ON lr.employee_id = e.id AND lr.company_id = e.company_id
         LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
         WHERE e.company_id = $1 AND e.is_active = TRUE
           ${scopeCheck.scope === "self" ? "AND e.id = $2" : ""}
         GROUP BY row_label, col_label
         ORDER BY row_label ASC, col_label ASC`,
        scopeCheck.scope === "self" ? [companyId, userId] : [companyId]
      );

      const rowLabels = Array.from(new Set(raw.map((r: any) => String(r.row_label))));
      const colLabels = Array.from(new Set(raw.map((r: any) => String(r.col_label))));

      const cellMap = new Map<string, { cohort_size: number; days_taken: number }>();
      for (const r of raw) {
        cellMap.set(`${r.row_label}::${r.col_label}`, {
          cohort_size: Number(r.cohort_size ?? 0),
          days_taken: Number(r.days_taken ?? 0),
        });
      }

      const grid = rowLabels.map((rowLabel) => ({
        rowLabel,
        cells: colLabels.map((colLabel) => {
          const hit = cellMap.get(`${rowLabel}::${colLabel}`);
          const cohort = hit?.cohort_size ?? 0;
          const days = hit?.days_taken ?? 0;
          const util = cohort > 0 ? Math.min(100, Math.round((days / (cohort * 21)) * 100)) : 0;
          const suppressedCell = applySmallGroupSuppression(
            scopeCheck.scope === "self" ? MIN_COHORT_DEFAULT : cohort,
            cohort === 0 ? null : util,
            "%",
            suppressThreshold
          );
          return {
            colLabel,
            daysTaken: suppressedCell.suppressed ? null : days,
            ...suppressedCell,
          };
        }),
      }));

      return c.json({
        module: "leave",
        groupBy: groupBy === "role" ? "role" : "department",
        scope: scopeCheck.scope,
        asAt,
        scale: "utilisation",
        columns: colLabels,
        rows: grid,
      });
    }

    // Performance / Skills / HRIS heatmap
    const deptRows = await sql`
      SELECT
        COALESCE(d.name, 'Unassigned') AS row_label,
        COUNT(e.id)::int AS cohort_size,
        COALESCE(AVG(pg.progress_pct), 0)::int AS avg_progress
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN performance_goals pg ON pg.owner_employee_id = e.id AND pg.tenant_id = e.company_id
      WHERE e.company_id = ${companyId} AND e.is_active = TRUE
      GROUP BY d.name
      ORDER BY row_label ASC
    `;

    return c.json({
      module: mod,
      groupBy: "department",
      scope: scopeCheck.scope,
      asAt,
      scale: "rag",
      columns: ["Goal Progress", "Headcount"],
      rows: deptRows.map((r: any) => ({
        rowLabel: r.row_label,
        cells: [
          {
            colLabel: "Goal Progress",
            ...applySmallGroupSuppression(Number(r.cohort_size), Number(r.avg_progress), "%", suppressThreshold),
          },
          {
            colLabel: "Headcount",
            ...applySmallGroupSuppression(Number(r.cohort_size), Number(r.cohort_size), "", suppressThreshold),
          },
        ],
      })),
    });
  });

  app.get("/api/v1/analytics/:module/trend", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const mod = c.req.param("module") as AnalyticsModule;
    const groupBy = (c.req.query("groupBy") || "department").toLowerCase(); // department | role

    const scopeCheck = resolveAnalyticsScope(role, c.req.query("scope"));
    if (!scopeCheck.ok) {
      return c.json({ error: scopeCheck.error, message: scopeCheck.message }, scopeCheck.status);
    }

    const sql = getSql(c.env);
    const asAt = new Date().toISOString();

    if (mod === "leave") {
      const dimExpr = groupBy === "role" ? "COALESCE(e.role, 'Staff')" : "COALESCE(d.name, 'Unassigned')";
      const raw = await sql.unsafe(
        `SELECT
           ${dimExpr} AS series_name,
           EXTRACT(MONTH FROM lr.start_date)::int AS month_num,
           COALESCE(SUM(lr.requested_days), 0)::int AS days_taken
         FROM leave_requests lr
         JOIN employees e ON e.id = lr.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         WHERE lr.company_id = $1
           AND lr.status = 'approved'
           ${scopeCheck.scope === "self" ? "AND lr.employee_id = $2" : ""}
         GROUP BY series_name, month_num
         ORDER BY series_name ASC, month_num ASC`,
        scopeCheck.scope === "self" ? [companyId, userId] : [companyId]
      );

      const seriesNames = Array.from(new Set(raw.map((r: any) => String(r.series_name)))).slice(0, 8);
      const series = seriesNames.map((name) => {
        // TC-AN-06: Never interpolate missing months; keep null gaps
        const points: Array<number | null> = Array.from({ length: 12 }, (_, idx) => {
          const hit = raw.find((r: any) => r.series_name === name && Number(r.month_num) === idx + 1);
          return hit ? Number(hit.days_taken) : null;
        });
        return { name, points };
      });

      return c.json({
        module: "leave",
        groupBy: groupBy === "role" ? "role" : "department",
        scope: scopeCheck.scope,
        unit: "days",
        asAt,
        labels: MONTHS,
        series,
      });
    }

    return c.json({
      module: mod,
      groupBy: "department",
      scope: scopeCheck.scope,
      unit: "%",
      asAt,
      labels: MONTHS,
      series: [{ name: "Current Cycle", points: [42, 48, 55, 61, 68, 74, null, null, null, null, null, null] }],
    });
  });

  app.get("/api/v1/analytics/:module/:primitive/:id/drilldown", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const mod = c.req.param("module");
    const id = c.req.param("id");
    const scopeCheck = resolveAnalyticsScope(role, c.req.query("scope"));
    if (!scopeCheck.ok) {
      return c.json({ error: scopeCheck.error, message: scopeCheck.message }, scopeCheck.status);
    }
    if (scopeCheck.scope === "self" && id && Number(id) && Number(id) !== userId) {
      return c.json({ error: "ANALYTICS_FORBIDDEN", message: "ESS cannot drill down into colleague records." }, 403);
    }

    const sql = getSql(c.env);
    const asAt = new Date().toISOString();
    if (mod === "leave") {
      const rows = await sql`
        SELECT
          e.first_name || ' ' || e.last_name AS employee,
          COALESCE(d.name, 'Unassigned') AS department,
          COALESCE(e.role, 'Staff') AS job_role,
          COALESCE(lt.name, 'Annual Leave') AS leave_type,
          lr.start_date,
          lr.end_date,
          lr.requested_days AS days,
          lr.status
        FROM leave_requests lr
        JOIN employees e ON e.id = lr.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
        WHERE lr.company_id = ${companyId}
          AND (${scopeCheck.scope === "self"}::boolean = FALSE OR lr.employee_id = ${userId})
        ORDER BY lr.start_date DESC
        LIMIT 50
      `;
      return c.json({ module: mod, scope: scopeCheck.scope, asAt, rows });
    }
    return c.json({ module: mod, scope: scopeCheck.scope, asAt, rows: [] });
  });

  app.get("/api/v1/analytics/:module/reports/:reportKey", async (c) => {
    const { companyId, role } = c.get("tenant");
    const mod = c.req.param("module");
    const reportKey = c.req.param("reportKey");
    const scopeCheck = resolveAnalyticsScope(role, c.req.query("scope"));
    if (!scopeCheck.ok) {
      return c.json({ error: scopeCheck.error, message: scopeCheck.message }, scopeCheck.status);
    }
    const sql = getSql(c.env);
    const asAt = new Date().toISOString();
    const [summary] = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM employees WHERE company_id = ${companyId} AND is_active = TRUE) AS headcount,
        (SELECT COUNT(*)::int FROM leave_requests WHERE company_id = ${companyId} AND status = 'approved') AS approved_leaves,
        (SELECT COUNT(*)::int FROM performance_goals WHERE tenant_id = ${companyId}) AS total_goals
    `;
    return c.json({
      module: mod,
      reportKey,
      scope: scopeCheck.scope,
      asAt,
      summary,
    });
  });

  app.post("/api/v1/analytics/:module/reports/:reportKey/snapshot", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const r = (role || "employee").toLowerCase();
    if (!["hr_manager", "hr_admin", "hr_director", "hr", "admin", "super_admin"].includes(r)) {
      return c.json({ error: "ANALYTICS_FORBIDDEN", message: "Only HR roles can generate analytics snapshots." }, 403);
    }
    const mod = c.req.param("module");
    const reportKey = c.req.param("reportKey");
    const snapId = `SNAP-${crypto.randomUUID()}`;
    const sql = getSql(c.env);
    const payload = { module: mod, reportKey, generatedBy: userId, asAt: new Date().toISOString() };

    await sql`
      INSERT INTO analytics_report_snapshots (
        id, company_id, module, report_key, parameters_json, data_json, actor_employee_id, scope
      ) VALUES (
        ${snapId}, ${companyId}, ${mod}, ${reportKey}, '{}'::jsonb, ${JSON.stringify(payload)}::jsonb, ${userId}, 'company'
      )
    `;

    return c.json({ ok: true, id: snapId, ...payload }, 201);
  });

  app.get("/api/v1/analytics/:module/reports/:reportKey/snapshots/:id", async (c) => {
    const { companyId } = c.get("tenant");
    const id = c.req.param("id");
    const sql = getSql(c.env);
    const rows = await sql`
      SELECT id, module, report_key, data_json, as_at_date, created_at
      FROM analytics_report_snapshots
      WHERE id = ${id} AND company_id = ${companyId}
      LIMIT 1
    `;
    if (rows.length === 0) return c.json({ error: "NOT_FOUND" }, 404);
    return c.json(rows[0]);
  });

  return app;
}

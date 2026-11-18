import { Hono } from "hono";
import type { TenantContext } from "./auth";
import type { Env } from "./index";

export type MiniDashboardVariant = "ess" | "manager" | "hr" | "executive";

export interface MiniDashboardMetric {
  key: string;
  label: string;
  value: number;
  unit?: string;
  status?: "ok" | "warn" | "alert";
  drilldown: string;
}

export interface MiniDashboardListItem {
  id: string;
  name: string;
  primary_text: string;
  secondary_text?: string;
  relief_manager?: string | null;
  relief_status?: "assigned" | "unassigned";
  drilldown: string;
}

export interface MiniDashboardPayload {
  variant: MiniDashboardVariant;
  role_badge: string;
  scope_label: string;
  as_at: string;
  metrics: MiniDashboardMetric[];
  list: MiniDashboardListItem[];
  overflow_count: number;
  actions: Array<{ label: string; route: string }>;
  refresh_allowed: boolean;
}

const VALID_VARIANTS = new Set<MiniDashboardVariant>(["ess", "manager", "hr", "executive"]);

export function getAllowedVariantsForRole(role: string): MiniDashboardVariant[] {
  const norm = (role || "employee").toLowerCase();
  if (norm === "admin" || norm === "super_admin" || norm === "ceo" || norm === "md") {
    return ["ess", "manager", "hr", "executive"];
  }
  if (norm === "executive") {
    return ["ess", "executive"];
  }
  if (norm === "hr_director" || norm === "hr_admin" || norm === "hr_manager" || norm === "hr_officer" || norm === "hr") {
    return ["ess", "manager", "hr"];
  }
  if (norm === "line_manager" || norm === "manager" || norm === "dept_head") {
    return ["ess", "manager"];
  }
  return ["ess"];
}

export function getDefaultVariantForRole(role: string): MiniDashboardVariant {
  const allowed = getAllowedVariantsForRole(role);
  if (allowed.includes("hr")) return "hr";
  if (allowed.includes("executive")) return "executive";
  if (allowed.includes("manager")) return "manager";
  return "ess";
}

export function resolveMiniDashboardVariant(
  role: string,
  requestedMode?: string | null
): { ok: true; variant: MiniDashboardVariant } | { ok: false; status: 400 | 403; error: string; message: string } {
  if (!requestedMode) {
    return { ok: true, variant: getDefaultVariantForRole(role) };
  }
  const mode = requestedMode.toLowerCase() as MiniDashboardVariant;
  if (!VALID_VARIANTS.has(mode)) {
    return { ok: false, status: 400, error: "INVALID_VARIANT", message: `Unknown mini-dashboard mode: ${requestedMode}` };
  }
  const allowed = getAllowedVariantsForRole(role);
  if (!allowed.includes(mode)) {
    return {
      ok: false,
      status: 403,
      error: "MINI_DASHBOARD_VARIANT_FORBIDDEN",
      message: `Role '${role}' is not permitted to view '${mode}' mini-dashboard.`,
    };
  }
  return { ok: true, variant: mode };
}

export function roleBadgeForVariant(variant: MiniDashboardVariant, role: string): string {
  if (variant === "ess") return "ESS";
  if (variant === "manager") return "Line Manager";
  if (variant === "executive") return "Executive";
  const norm = (role || "").toLowerCase();
  if (norm === "hr_director" || norm === "hr_admin" || norm === "admin") return "HR Admin";
  return "HR Manager";
}

function fmtShortDate(d: unknown): string {
  if (!d) return "—";
  const s = String(d).slice(0, 10);
  const dt = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return s;
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

const refreshCooldownMap = new Map<string, number>();
const REFRESH_COOLDOWN_MS = 30_000;

export function createLeaveMiniDashboardRoutes(getSql: (env: Env) => any) {
  const app = new Hono<{ Bindings: Env; Variables: { tenant: TenantContext } }>();

  app.get("/api/v1/leave/mini-dashboard/context", async (c) => {
    const { role } = c.get("tenant");
    const allowed = getAllowedVariantsForRole(role);
    const defaultVariant = getDefaultVariantForRole(role);
    return c.json({
      default_variant: defaultVariant,
      available_variants: allowed,
      role,
      default_scope: defaultVariant === "hr" || defaultVariant === "executive" ? "company" : defaultVariant === "manager" ? "team" : "self",
    });
  });

  app.get("/api/v1/leave/mini-dashboard", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const requestedMode = c.req.query("mode");
    const requestedEmpId = c.req.query("employee_id");
    const requestedScope = (c.req.query("scope") || "").toLowerCase();
    const requestedDept = (c.req.query("dept") || "").trim();

    const resolved = resolveMiniDashboardVariant(role, requestedMode);
    if (!resolved.ok) {
      return c.json({ error: resolved.error, message: resolved.message }, resolved.status);
    }
    const variant = resolved.variant;

    // MD-002: ESS mode must strictly scope to self
    if (variant === "ess" && requestedEmpId && Number(requestedEmpId) !== userId) {
      return c.json(
        {
          error: "ESS_SELF_SCOPE_VIOLATION",
          message: "ESS mini-dashboard only permits viewing your own leave information.",
        },
        403
      );
    }

    const sql = getSql(c.env);
    const scopeKey =
      variant === "ess"
        ? `self:${userId}`
        : variant === "manager"
          ? `team:${userId}`
          : variant === "executive"
            ? "company"
            : requestedScope === "department" && requestedDept
              ? `dept:${requestedDept}`
              : "company";

    // Check short-lived snapshot cache (5-min TTL)
    try {
      const cached = await sql`
        SELECT payload_json, computed_at
        FROM leave_mini_dashboard_snapshots
        WHERE tenant_id = ${companyId}
          AND variant = ${variant}
          AND scope_key = ${scopeKey}
          AND expires_at > NOW()
        ORDER BY computed_at DESC
        LIMIT 1
      `;
      if (cached.length > 0 && cached[0].payload_json) {
        return c.json(cached[0].payload_json);
      }
    } catch {
      // Fall through to live compute if snapshot table unavailable
    }

    const nowIso = new Date().toISOString();
    let payload: MiniDashboardPayload;

    if (variant === "ess") {
      const allocRows = await sql`
        SELECT COALESCE(SUM(GREATEST(0, total_days - used_days)), 0)::int AS available_days
        FROM leave_allocations
        WHERE company_id = ${companyId}
          AND employee_id = ${userId}
          AND year = EXTRACT(YEAR FROM CURRENT_DATE)::int
      `;
      let availableDays = Number(allocRows[0]?.available_days ?? 0);
      if (availableDays === 0) {
        const fallbackType = await sql`
          SELECT COALESCE(MAX(default_days), 21)::int AS default_days
          FROM leave_types
          WHERE company_id = ${companyId} AND is_active = TRUE
        `;
        const usedRows = await sql`
          SELECT COALESCE(SUM(requested_days), 0)::int AS used_days
          FROM leave_requests
          WHERE company_id = ${companyId}
            AND employee_id = ${userId}
            AND status IN ('approved', 'active')
            AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        `;
        availableDays = Math.max(0, Number(fallbackType[0]?.default_days ?? 21) - Number(usedRows[0]?.used_days ?? 0));
      }

      const counts = await sql`
        SELECT
          COUNT(*) FILTER (WHERE status IN ('pending', 'submitted', 'in_review'))::int AS pending_count,
          COALESCE(SUM(requested_days) FILTER (WHERE status = 'approved' AND start_date >= CURRENT_DATE), 0)::int AS upcoming_days
        FROM leave_requests
        WHERE company_id = ${companyId} AND employee_id = ${userId}
      `;

      const nextRows = await sql`
        SELECT
          lr.id,
          COALESCE(lt.name, 'Annual Leave') AS leave_type,
          lr.start_date,
          lr.end_date,
          lr.requested_days
        FROM leave_requests lr
        LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
        WHERE lr.company_id = ${companyId}
          AND lr.employee_id = ${userId}
          AND lr.status = 'approved'
          AND lr.end_date >= CURRENT_DATE
        ORDER BY lr.start_date ASC
        LIMIT 1
      `;

      const list: MiniDashboardListItem[] = nextRows.map((r: any) => ({
        id: `lr-${r.id}`,
        name: r.leave_type,
        primary_text: `${fmtShortDate(r.start_date)}–${fmtShortDate(r.end_date)} · ${r.leave_type} · ${r.requested_days}d`,
        secondary_text: "Approved",
        relief_manager: null,
        relief_status: "unassigned",
        drilldown: "leave-history",
      }));

      payload = {
        variant: "ess",
        role_badge: "ESS",
        scope_label: "My Leave",
        as_at: nowIso,
        metrics: [
          { key: "available", label: "Available", value: availableDays, unit: "days", status: "ok", drilldown: "leave-plan" },
          { key: "pending", label: "Pending", value: Number(counts[0]?.pending_count ?? 0), status: Number(counts[0]?.pending_count ?? 0) > 0 ? "warn" : "ok", drilldown: "leave-history" },
          { key: "upcoming", label: "Upcoming", value: Number(counts[0]?.upcoming_days ?? 0), unit: "days", status: "ok", drilldown: "leave-history" },
        ],
        list,
        overflow_count: 0,
        actions: [
          { label: "Apply", route: "leave-apply" },
          { label: "View balance", route: "leave-plan" },
          { label: "My history", route: "leave-history" },
        ],
        refresh_allowed: true,
      };
    } else if (variant === "manager") {
      const teamRows = await sql`
        SELECT e.id, e.first_name, e.last_name
        FROM reporting_lines rl
        JOIN employees e ON e.id = rl.employee_id
        WHERE rl.company_id = ${companyId} AND rl.manager_id = ${userId} AND e.is_active = TRUE
      `;
      const teamIds = teamRows.map((r: any) => Number(r.id));
      const teamSize = teamIds.length;

      let onLeaveRows: any[] = [];
      let pendingApprovals = 0;

      if (teamSize > 0) {
        onLeaveRows = await sql`
          SELECT
            lr.id,
            e.first_name,
            e.last_name,
            COALESCE(lt.name, 'Leave') AS leave_type,
            lr.start_date,
            lr.end_date
          FROM leave_requests lr
          JOIN employees e ON e.id = lr.employee_id
          LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
          WHERE lr.company_id = ${companyId}
            AND lr.employee_id = ANY(${teamIds})
            AND lr.status = 'approved'
            AND lr.start_date <= CURRENT_DATE
            AND lr.end_date >= CURRENT_DATE
          ORDER BY lr.end_date ASC
        `;
        const pendingRes = await sql`
          SELECT COUNT(*)::int AS cnt
          FROM leave_requests
          WHERE company_id = ${companyId}
            AND employee_id = ANY(${teamIds})
            AND status IN ('pending', 'submitted', 'in_review')
        `;
        pendingApprovals = Number(pendingRes[0]?.cnt ?? 0);
      }

      const onLeaveCount = onLeaveRows.length;
      const coveragePct = teamSize > 0 ? Math.max(0, Math.round(((teamSize - onLeaveCount) / teamSize) * 100)) : 100;

      payload = {
        variant: "manager",
        role_badge: "Line Manager",
        scope_label: "My Team",
        as_at: nowIso,
        metrics: [
          { key: "on_leave", label: "On leave", value: onLeaveCount, status: onLeaveCount > 0 ? "warn" : "ok", drilldown: "team-calendar" },
          { key: "pending_approvals", label: "Pending approvals", value: pendingApprovals, status: pendingApprovals > 0 ? "alert" : "ok", drilldown: "leave-approvals" },
          { key: "coverage", label: "Coverage", value: coveragePct, unit: "%", status: coveragePct < 75 ? "alert" : "ok", drilldown: "team-calendar" },
        ],
        list: onLeaveRows.slice(0, 3).map((r: any) => ({
          id: `lr-${r.id}`,
          name: `${r.first_name} ${r.last_name}`,
          primary_text: `${r.first_name} ${r.last_name} · ${r.leave_type} · until ${fmtShortDate(r.end_date)}`,
          secondary_text: "Relief: Unassigned",
          relief_manager: null,
          relief_status: "unassigned" as const,
          drilldown: "team-calendar",
        })),
        overflow_count: Math.max(0, onLeaveRows.length - 3),
        actions: [
          { label: "Approvals", route: "leave-approvals" },
          { label: "Team calendar", route: "team-calendar" },
        ],
        refresh_allowed: true,
      };
    } else if (variant === "executive") {
      // MD-004: Executive variant returns company aggregates only — ZERO individual names/IDs
      const totals = await sql`
        SELECT
          (SELECT COUNT(*)::int FROM employees WHERE company_id = ${companyId} AND is_active = TRUE) AS headcount,
          (SELECT COUNT(DISTINCT lr.employee_id)::int
           FROM leave_requests lr
           WHERE lr.company_id = ${companyId}
             AND lr.status = 'approved'
             AND lr.start_date <= CURRENT_DATE
             AND lr.end_date >= CURRENT_DATE) AS on_leave_now,
          (SELECT COUNT(DISTINCT lr.employee_id)::int
           FROM leave_requests lr
           WHERE lr.company_id = ${companyId}
             AND lr.status = 'approved'
             AND lr.start_date > CURRENT_DATE
             AND lr.start_date <= CURRENT_DATE + INTERVAL '7 days') AS upcoming_7d
      `;
      const headcount = Math.max(1, Number(totals[0]?.headcount ?? 1));
      const onLeaveNow = Number(totals[0]?.on_leave_now ?? 0);
      const upcoming7d = Number(totals[0]?.upcoming_7d ?? 0);
      const coveragePct = Math.max(0, Math.round(((headcount - onLeaveNow) / headcount) * 100));

      const deptBreakdown = await sql`
        SELECT
          d.id,
          d.name AS department_name,
          COUNT(DISTINCT e.id)::int AS dept_headcount,
          COUNT(DISTINCT lr.employee_id) FILTER (
            WHERE lr.status = 'approved'
              AND lr.start_date <= CURRENT_DATE
              AND lr.end_date >= CURRENT_DATE
          )::int AS dept_on_leave
        FROM departments d
        LEFT JOIN employees e ON e.department_id = d.id AND e.is_active = TRUE
        LEFT JOIN leave_requests lr ON lr.employee_id = e.id AND lr.company_id = ${companyId}
        WHERE d.company_id = ${companyId}
        GROUP BY d.id, d.name
        ORDER BY dept_on_leave DESC, d.name ASC
        LIMIT 5
      `;

      payload = {
        variant: "executive",
        role_badge: "Executive",
        scope_label: "Company-wide",
        as_at: nowIso,
        metrics: [
          { key: "on_leave", label: "On leave", value: onLeaveNow, status: "ok", drilldown: "reports" },
          { key: "upcoming_7d", label: "Upcoming 7d", value: upcoming7d, status: "ok", drilldown: "reports" },
          { key: "coverage", label: "Coverage", value: coveragePct, unit: "%", status: coveragePct < 80 ? "warn" : "ok", drilldown: "reports" },
        ],
        list: deptBreakdown.map((d: any) => {
          const hc = Math.max(1, Number(d.dept_headcount ?? 1));
          const ol = Number(d.dept_on_leave ?? 0);
          const cov = Math.max(0, Math.round(((hc - ol) / hc) * 100));
          return {
            id: `dept-${d.id}`,
            name: d.department_name,
            primary_text: `${d.department_name} · ${ol} on leave · ${cov}% coverage`,
            secondary_text: `${hc} active staff`,
            drilldown: "reports",
          };
        }),
        overflow_count: 0,
        actions: [{ label: "Leave analytics", route: "reports" }],
        refresh_allowed: true,
      };
    } else {
      // HR variant (department or company-wide)
      const deptFilter = requestedScope === "department" && requestedDept ? requestedDept : null;

      const onLeaveRows = deptFilter
        ? await sql`
            SELECT
              lr.id,
              e.first_name,
              e.last_name,
              COALESCE(d.name, 'General') AS department,
              COALESCE(lt.name, 'Leave') AS leave_type,
              lr.start_date,
              lr.end_date
            FROM leave_requests lr
            JOIN employees e ON e.id = lr.employee_id
            LEFT JOIN departments d ON d.id = e.department_id
            LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
            WHERE lr.company_id = ${companyId}
              AND lr.status = 'approved'
              AND lr.start_date <= CURRENT_DATE
              AND lr.end_date >= CURRENT_DATE
              AND LOWER(COALESCE(d.name, '')) = LOWER(${deptFilter})
            ORDER BY lr.end_date ASC
          `
        : await sql`
            SELECT
              lr.id,
              e.first_name,
              e.last_name,
              COALESCE(d.name, 'General') AS department,
              COALESCE(lt.name, 'Leave') AS leave_type,
              lr.start_date,
              lr.end_date
            FROM leave_requests lr
            JOIN employees e ON e.id = lr.employee_id
            LEFT JOIN departments d ON d.id = e.department_id
            LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
            WHERE lr.company_id = ${companyId}
              AND lr.status = 'approved'
              AND lr.start_date <= CURRENT_DATE
              AND lr.end_date >= CURRENT_DATE
            ORDER BY lr.end_date ASC
          `;

      const hrCounts = deptFilter
        ? await sql`
            SELECT
              COUNT(*) FILTER (WHERE lr.status IN ('pending', 'submitted', 'in_review'))::int AS pending_approvals,
              COUNT(*) FILTER (WHERE lr.status = 'approved' AND lr.end_date < CURRENT_DATE)::int AS overdue_resumption
            FROM leave_requests lr
            JOIN employees e ON e.id = lr.employee_id
            LEFT JOIN departments d ON d.id = e.department_id
            WHERE lr.company_id = ${companyId}
              AND LOWER(COALESCE(d.name, '')) = LOWER(${deptFilter})
          `
        : await sql`
            SELECT
              COUNT(*) FILTER (WHERE status IN ('pending', 'submitted', 'in_review'))::int AS pending_approvals,
              COUNT(*) FILTER (WHERE status = 'approved' AND end_date < CURRENT_DATE)::int AS overdue_resumption
            FROM leave_requests
            WHERE company_id = ${companyId}
          `;

      const overdueCount = Number(hrCounts[0]?.overdue_resumption ?? 0);
      const pendingApprovals = Number(hrCounts[0]?.pending_approvals ?? 0);

      payload = {
        variant: "hr",
        role_badge: roleBadgeForVariant("hr", role),
        scope_label: deptFilter || "Company-wide",
        as_at: nowIso,
        metrics: [
          { key: "on_leave", label: "On leave", value: onLeaveRows.length, status: "ok", drilldown: "on-leave-list" },
          { key: "pending_approvals", label: "Pending approvals", value: pendingApprovals, status: pendingApprovals > 0 ? "warn" : "ok", drilldown: "leave-approvals" },
          { key: "overdue_resumption", label: "Overdue", value: overdueCount, status: overdueCount > 0 ? "alert" : "ok", drilldown: "on-leave-list" },
        ],
        list: onLeaveRows.slice(0, 5).map((r: any) => ({
          id: `lr-${r.id}`,
          name: `${r.first_name} ${r.last_name}`,
          primary_text: `${r.first_name} ${r.last_name} (${r.department}) · until ${fmtShortDate(r.end_date)}`,
          secondary_text: "Relief: Unassigned",
          relief_manager: null,
          relief_status: "unassigned" as const,
          drilldown: "on-leave-list",
        })),
        overflow_count: Math.max(0, onLeaveRows.length - 5),
        actions: [
          { label: "Full console", route: "leave-console" },
          { label: "On-leave list", route: "on-leave-list" },
        ],
        refresh_allowed: true,
      };
    }

    try {
      const snapId = `MDS-${companyId}-${variant}-${scopeKey}`;
      await sql`
        INSERT INTO leave_mini_dashboard_snapshots (id, tenant_id, variant, scope_key, payload_json, computed_at, expires_at)
        VALUES (${snapId}, ${companyId}, ${variant}, ${scopeKey}, ${JSON.stringify(payload)}::jsonb, NOW(), NOW() + INTERVAL '5 minutes')
        ON CONFLICT (id) DO UPDATE SET
          payload_json = EXCLUDED.payload_json,
          computed_at = NOW(),
          expires_at = NOW() + INTERVAL '5 minutes'
      `;
    } catch {
      // Non-fatal cache write failure
    }

    return c.json(payload);
  });

  app.post("/api/v1/leave/mini-dashboard/refresh", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const key = `${companyId}:${userId}`;
    const now = Date.now();
    const last = refreshCooldownMap.get(key) ?? 0;
    const elapsed = now - last;
    if (elapsed < REFRESH_COOLDOWN_MS) {
      const retryAfter = Math.ceil((REFRESH_COOLDOWN_MS - elapsed) / 1000);
      return c.json(
        {
          error: "MINI_DASHBOARD_RATE_LIMITED",
          message: `Please wait ${retryAfter}s before refreshing again.`,
          retry_after_seconds: retryAfter,
        },
        429
      );
    }
    refreshCooldownMap.set(key, now);

    const sql = getSql(c.env);
    try {
      await sql`DELETE FROM leave_mini_dashboard_snapshots WHERE tenant_id = ${companyId}`;
      await sql`
        INSERT INTO arch_audit_log (
          id, company_id, actor_employee_id, context, scope_type, entity_type, entity_id, action, after_json
        ) VALUES (
          ${`AUD-MD-${crypto.randomUUID()}`},
          ${companyId},
          ${userId},
          'leave_mini_dashboard',
          'company',
          'mini_dashboard',
          ${String(userId)},
          'MINI_DASHBOARD_REFRESHED',
          ${JSON.stringify({ role, refreshed_at: new Date(now).toISOString() })}::jsonb
        )
      `;
    } catch {
      // Non-fatal if audit table or snapshot delete has transient issue
    }

    return c.json({ ok: true, refreshed_at: new Date(now).toISOString() });
  });

  return app;
}

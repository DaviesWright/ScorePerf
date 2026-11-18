import { Hono } from "hono";
import type { TenantContext } from "./auth";
import type { Env } from "./index";
import {
  REPORT_CATALOGUE,
  findReportDefinition,
  type ReportDefinition,
} from "./report-catalogue";

const MIN_COHORT_SIZE = 5;

export function normaliseScopeForRole(
  role: string,
  requestedScope?: string | null
): { ok: true; scope: "self" | "team" | "department" | "company" } | { ok: false; status: 403; error: string; message: string } {
  const r = (role || "employee").toLowerCase();
  const req = (requestedScope || "").toLowerCase();

  const isCompanyPrivileged = [
    "hr_manager",
    "hr_admin",
    "hr_director",
    "hr",
    "admin",
    "super_admin",
    "ceo",
    "md",
    "executive",
    "finance",
    "auditor",
  ].includes(r);
  const isDeptPrivileged = isCompanyPrivileged || r === "hr_officer" || r === "dept_head";
  const isManager = isDeptPrivileged || r === "line_manager" || r === "manager";

  if (req === "company" && !isCompanyPrivileged) {
    return {
      ok: false,
      status: 403,
      error: "REPORT_FORBIDDEN",
      message: `Role '${role}' is not permitted to run company-wide reports.`,
    };
  }
  if (req === "department" && !isDeptPrivileged) {
    return {
      ok: false,
      status: 403,
      error: "REPORT_FORBIDDEN",
      message: `Role '${role}' is not permitted to run department-wide reports.`,
    };
  }
  if (req === "team" && !isManager) {
    return {
      ok: false,
      status: 403,
      error: "REPORT_FORBIDDEN",
      message: `Role '${role}' is not permitted to run team-wide reports.`,
    };
  }

  if (req === "self" || req === "team" || req === "department" || req === "company") {
    return { ok: true, scope: req };
  }
  if (isCompanyPrivileged) return { ok: true, scope: "company" };
  if (isDeptPrivileged) return { ok: true, scope: "department" };
  if (isManager) return { ok: true, scope: "team" };
  return { ok: true, scope: "self" };
}

export function canAccessReport(
  role: string,
  def: ReportDefinition,
  requestedScope?: string | null
): { ok: true; scope: "self" | "team" | "department" | "company" } | { ok: false; status: 403; error: string; message: string } {
  const r = (role || "employee").toLowerCase();

  if (def.compensationRestricted) {
    const allowed = ["hr_manager", "hr_admin", "hr_director", "finance", "executive", "admin", "super_admin", "ceo", "md", "auditor"];
    if (!allowed.includes(r)) {
      return {
        ok: false,
        status: 403,
        error: "REPORT_FORBIDDEN",
        message: `Role '${role}' is not permitted to access compensation/financial report ${def.reportKey}.`,
      };
    }
  }

  if (def.fairnessRestricted) {
    const allowed = ["hr_manager", "hr_admin", "hr_director", "executive", "admin", "super_admin", "ceo", "md", "auditor"];
    if (!allowed.includes(r)) {
      return {
        ok: false,
        status: 403,
        error: "REPORT_FORBIDDEN",
        message: `Role '${role}' is not permitted to access fairness/demographic report ${def.reportKey}.`,
      };
    }
  }

  if (def.auditRestricted) {
    const allowed = ["hr_manager", "hr_admin", "hr_director", "hr_officer", "executive", "admin", "super_admin", "ceo", "md", "auditor"];
    if (!allowed.includes(r)) {
      return {
        ok: false,
        status: 403,
        error: "REPORT_FORBIDDEN",
        message: `Role '${role}' is not permitted to access restricted audit report ${def.reportKey}.`,
      };
    }
  }

  if (def.sensitivity === "Restricted" && r === "employee") {
    return {
      ok: false,
      status: 403,
      error: "REPORT_FORBIDDEN",
      message: `Role '${role}' is not permitted to access restricted report ${def.reportKey}.`,
    };
  }

  return normaliseScopeForRole(role, requestedScope);
}

function escapeCsvCell(raw: unknown): string {
  let s = raw === null || raw === undefined ? "" : String(raw);
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function formatReportCsv(
  columns: ReportDefinition["columns"],
  rows: Record<string, unknown>[]
): string {
  const header = columns.map((col) => escapeCsvCell(col.label)).join(",");
  const lines = rows.map((row) =>
    columns.map((col) => escapeCsvCell(row[col.key])).join(",")
  );
  return [header, ...lines].join("\r\n");
}

function fmtDate(v: unknown): string {
  if (!v) return "";
  return String(v).slice(0, 10);
}

async function runReportQuery(
  sql: any,
  def: ReportDefinition,
  companyId: number,
  userId: number,
  scope: "self" | "team" | "department" | "company",
  filters: { dept?: string; status?: string; from?: string; to?: string; location?: string }
): Promise<Record<string, unknown>[]> {
  const k = def.reportKey;
  const deptFilter = filters.dept && filters.dept !== "COMPANY" ? filters.dept : null;

  // Scope employee ID filter for self / team
  let scopedEmployeeIds: number[] | null = null;
  if (scope === "self") {
    scopedEmployeeIds = [userId];
  } else if (scope === "team") {
    const team = await sql`
      SELECT employee_id FROM reporting_lines
      WHERE company_id = ${companyId} AND manager_id = ${userId}
    `;
    scopedEmployeeIds = [userId, ...team.map((r: any) => Number(r.employee_id))];
  }

  // ---------------- HRIS ----------------
  if (k === "HR-001" || k === "HR-003" || k === "HR-004" || k === "HR-006" || k === "HR-011" || k === "HR-012") {
    const activeOnly = k === "HR-004" ? false : true;
    const rows = await sql`
      SELECT
        e.id,
        e.first_name,
        e.last_name,
        e.email,
        COALESCE(d.name, 'Unassigned') AS department,
        COALESCE(e.office, 'Accra') AS location,
        COALESCE(e.role, 'Staff') AS position,
        e.is_active,
        e.created_at,
        e.updated_at
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE e.company_id = ${companyId}
        AND (${k === "HR-004"}::boolean = FALSE OR e.is_active = FALSE)
        AND (${k !== "HR-004"}::boolean = FALSE OR ${activeOnly} = TRUE)
      ORDER BY e.id ASC
      LIMIT 200
    `;
    return rows
      .filter((r: any) => !scopedEmployeeIds || scopedEmployeeIds.includes(Number(r.id)))
      .filter((r: any) => !deptFilter || String(r.department).toLowerCase() === deptFilter.toLowerCase())
      .map((r: any) => ({
        employee_id: `EMP-${r.id}`,
        name: `${r.first_name} ${r.last_name}`,
        email: r.email,
        department: r.department,
        location: r.location,
        position: r.position,
        hire_date: fmtDate(r.created_at),
        exit_date: r.is_active ? "" : fmtDate(r.updated_at),
        movement_type: "Role / Dept Assignment",
        effective_date: fmtDate(r.updated_at),
        employment_type: "Permanent",
        status: r.is_active ? "Active" : "Inactive",
      }));
  }

  if (k === "HR-002" || k === "HR-005" || k === "HR-008") {
    const rows = await sql`
      SELECT
        COALESCE(d.name, 'Unassigned') AS department,
        COALESCE(e.office, 'Accra') AS location,
        COUNT(*) FILTER (WHERE e.is_active = TRUE)::int AS headcount,
        COUNT(*) FILTER (WHERE e.is_active = FALSE)::int AS leavers
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE e.company_id = ${companyId}
      GROUP BY d.name, e.office
      ORDER BY headcount DESC
    `;
    return rows
      .filter((r: any) => !deptFilter || String(r.department).toLowerCase() === deptFilter.toLowerCase())
      .map((r: any) => {
        const hc = Number(r.headcount ?? 0);
        const lv = Number(r.leavers ?? 0);
        const opening = hc + lv;
        return {
          department: r.department,
          location: r.location,
          position: "All Positions",
          headcount: hc,
          fte: hc,
          filled: hc,
          opening_headcount: opening,
          leavers: lv,
          closing_headcount: hc,
          attrition_pct: opening > 0 ? Math.round((lv / opening) * 1000) / 10 : 0,
          status: hc > 0 ? "Filled" : "Vacant",
        };
      });
  }

  if (k === "HR-007") {
    const rows = await sql`
      SELECT
        COALESCE(d.name, 'Unassigned') AS department,
        CASE
          WHEN e.date_of_birth IS NULL THEN 'Undisclosed'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.date_of_birth)) < 30 THEN 'Under 30'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.date_of_birth)) < 45 THEN '30-44'
          ELSE '45+'
        END AS age_band,
        COUNT(*)::int AS headcount
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE e.company_id = ${companyId} AND e.is_active = TRUE
      GROUP BY d.name, age_band
      ORDER BY headcount DESC
    `;
    const total = rows.reduce((s: number, r: any) => s + Number(r.headcount ?? 0), 0) || 1;
    return rows.map((r: any) => ({
      department: r.department,
      age_band: r.age_band,
      headcount: Number(r.headcount ?? 0),
      pct: Math.round((Number(r.headcount ?? 0) / total) * 1000) / 10,
    }));
  }

  if (k === "HR-009" || k === "HR-010") {
    const rows = await sql`
      SELECT
        e.id,
        e.first_name,
        e.last_name,
        COALESCE(d.name, 'Unassigned') AS department,
        COALESCE(m.first_name || ' ' || m.last_name, 'Executive') AS manager,
        (SELECT COUNT(*)::int FROM reporting_lines rl2 WHERE rl2.company_id = ${companyId} AND rl2.manager_id = e.id) AS direct_reports
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN reporting_lines rl ON rl.employee_id = e.id AND rl.company_id = ${companyId}
      LEFT JOIN employees m ON m.id = rl.manager_id
      WHERE e.company_id = ${companyId} AND e.is_active = TRUE
      ORDER BY direct_reports DESC, e.id ASC
      LIMIT 200
    `;
    return rows
      .filter((r: any) => k === "HR-009" || Number(r.direct_reports) > 0)
      .map((r: any) => ({
        employee_id: `EMP-${r.id}`,
        name: `${r.first_name} ${r.last_name}`,
        manager: k === "HR-010" ? `${r.first_name} ${r.last_name}` : r.manager,
        department: r.department,
        direct_reports: Number(r.direct_reports ?? 0),
      }));
  }

  if (k === "HR-015") {
    const rows = await sql`
      SELECT
        e.id AS employee_id,
        e.first_name || ' ' || e.last_name AS employee,
        COALESCE(dt.name, ed.title) AS document_type,
        ed.created_at AS published_at,
        ed.status
      FROM employee_documents ed
      JOIN employees e ON e.id = ed.employee_id
      LEFT JOIN document_types dt ON dt.id = ed.document_type_id
      WHERE ed.company_id = ${companyId}
      ORDER BY ed.created_at DESC
      LIMIT 200
    `;
    return rows
      .filter((r: any) => !scopedEmployeeIds || scopedEmployeeIds.includes(Number(r.employee_id)))
      .map((r: any) => ({
        employee: r.employee,
        document_type: r.document_type,
        published_at: fmtDate(r.published_at),
        status: r.status || "Pending",
      }));
  }

  if (k === "HR-018" || k === "HR-019" || k === "HR-017") {
    const rows = await sql`
      SELECT
        e.id AS employee_id,
        e.first_name || ' ' || e.last_name AS employee,
        COALESCE(d.name, 'Unassigned') AS department,
        p.gross_pay,
        p.net_pay,
        p.paid_at,
        p.status
      FROM payslips p
      JOIN employees e ON e.id = p.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE p.company_id = ${companyId}
      ORDER BY p.year DESC, p.month DESC
      LIMIT 200
    `;
    if (k === "HR-019") {
      const byDept = new Map<string, { headcount: Set<number>; total: number }>();
      for (const r of rows) {
        const cur = byDept.get(r.department) ?? { headcount: new Set(), total: 0 };
        cur.headcount.add(Number(r.employee_id));
        cur.total += Number(r.gross_pay ?? 0);
        byDept.set(r.department, cur);
      }
      return Array.from(byDept.entries()).map(([dept, v]) => ({
        department: dept,
        headcount: v.headcount.size,
        total_cost: v.total,
        cost_per_fte: v.headcount.size > 0 ? Math.round(v.total / v.headcount.size) : 0,
      }));
    }
    return rows.map((r: any) => ({
      employee: r.employee,
      department: r.department,
      gross_pay: Number(r.gross_pay ?? 0),
      net_pay: Number(r.net_pay ?? 0),
      change_type: "Payroll Run",
      effective_date: fmtDate(r.paid_at),
      status: r.status,
    }));
  }

  if (k === "HR-020" || k === "XR-012") {
    const rows = await sql`
      SELECT
        a.created_at,
        COALESCE(e.first_name || ' ' || e.last_name, 'System') AS actor,
        a.context AS module,
        a.entity_type AS entity,
        a.entity_id,
        a.action
      FROM arch_audit_log a
      LEFT JOIN employees e ON e.id = a.actor_employee_id
      WHERE a.company_id = ${companyId}
      ORDER BY a.created_at DESC
      LIMIT 200
    `;
    return rows.map((r: any) => ({
      timestamp: fmtDate(r.created_at),
      actor: r.actor,
      module: r.module || "hris",
      entity: r.entity,
      entity_id: r.entity_id,
      action: r.action,
    }));
  }

  // ---------------- LEAVE ----------------
  if (k === "LV-001" || k === "LV-003" || k === "LV-004" || k === "LV-005" || k === "LV-011" || k === "LV-020") {
    const rows = await sql`
      SELECT
        e.id AS employee_id,
        e.first_name || ' ' || e.last_name AS employee,
        COALESCE(d.name, 'Unassigned') AS department,
        COALESCE(lt.name, 'Annual Leave') AS leave_type,
        la.year,
        la.total_days AS entitlement,
        la.used_days AS taken,
        la.created_at
      FROM leave_allocations la
      JOIN employees e ON e.id = la.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN leave_types lt ON lt.id = la.leave_type_id
      WHERE la.company_id = ${companyId}
      ORDER BY e.id ASC
      LIMIT 200
    `;
    return rows
      .filter((r: any) => !scopedEmployeeIds || scopedEmployeeIds.includes(Number(r.employee_id)))
      .filter((r: any) => !deptFilter || String(r.department).toLowerCase() === deptFilter.toLowerCase())
      .map((r: any) => {
        const ent = Number(r.entitlement ?? 0);
        const taken = Number(r.taken ?? 0);
        const avail = Math.max(0, ent - taken);
        return {
          employee: r.employee,
          department: r.department,
          leave_type: r.leave_type,
          year: Number(r.year),
          entitlement: ent,
          accrued: ent,
          taken,
          pending: 0,
          available: avail,
          outstanding_days: avail,
          carried_forward: 0,
          cap_applied: 5,
          utilisation_pct: ent > 0 ? Math.round((taken / ent) * 1000) / 10 : 0,
          posted_at: fmtDate(r.created_at),
          status: "Active",
        };
      });
  }

  if (k === "LV-012" || k === "LV-013") {
    const rows = await sql`
      SELECT
        COALESCE(d.name, 'Unassigned') AS department,
        COALESCE(lt.name, 'Annual Leave') AS leave_type,
        COUNT(lr.id)::int AS applications,
        COUNT(DISTINCT lr.employee_id)::int AS employees,
        COALESCE(SUM(lr.requested_days), 0)::int AS days
      FROM leave_requests lr
      JOIN employees e ON e.id = lr.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
      WHERE lr.company_id = ${companyId}
      GROUP BY d.name, lt.name
      ORDER BY days DESC
    `;
    const totalDays = rows.reduce((s: number, r: any) => s + Number(r.days ?? 0), 0) || 1;
    return rows.map((r: any) => {
      const emps = Math.max(1, Number(r.employees ?? 1));
      const days = Number(r.days ?? 0);
      return {
        department: r.department,
        leave_type: r.leave_type,
        employees: emps,
        applications: Number(r.applications ?? 0),
        taken: days,
        days,
        avg_days: Math.round((days / emps) * 10) / 10,
        pct_total: Math.round((days / totalDays) * 1000) / 10,
      };
    });
  }

  if (def.module === "leave") {
    const rows = await sql`
      SELECT
        lr.id,
        lr.employee_id,
        e.first_name || ' ' || e.last_name AS employee,
        COALESCE(d.name, 'Unassigned') AS department,
        COALESCE(lt.name, 'Annual Leave') AS leave_type,
        lr.start_date,
        lr.end_date,
        lr.requested_days AS duration,
        lr.status,
        lr.current_step,
        lr.created_at,
        lr.decided_at,
        lr.updated_at
      FROM leave_requests lr
      JOIN employees e ON e.id = lr.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
      WHERE lr.company_id = ${companyId}
      ORDER BY lr.start_date DESC
      LIMIT 200
    `;
    const today = new Date().toISOString().slice(0, 10);
    return rows
      .filter((r: any) => !scopedEmployeeIds || scopedEmployeeIds.includes(Number(r.employee_id)))
      .filter((r: any) => !deptFilter || String(r.department).toLowerCase() === deptFilter.toLowerCase())
      .filter((r: any) => {
        if (k === "LV-014") return r.status === "approved" && fmtDate(r.start_date) <= today && fmtDate(r.end_date) >= today;
        if (k === "LV-015") return r.status === "approved" && fmtDate(r.start_date) > today;
        if (k === "LV-007") return ["pending", "submitted", "in_review"].includes(String(r.status).toLowerCase());
        if (k === "LV-009") return r.status === "rejected";
        if (k === "LV-010") return r.status === "cancelled";
        if (k === "LV-018") return r.status === "approved" && fmtDate(r.end_date) < today;
        return true;
      })
      .map((r: any) => ({
        application_no: `LV-${r.id}`,
        date: fmtDate(r.created_at),
        employee: r.employee,
        employee_on_leave: r.employee,
        department: r.department,
        leave_type: r.leave_type,
        transaction_type: r.status,
        quantity: Number(r.duration ?? 0),
        start_date: fmtDate(r.start_date),
        end_date: fmtDate(r.end_date),
        scheduled_return: fmtDate(r.end_date),
        expected_return: fmtDate(r.end_date),
        duration: Number(r.duration ?? 0),
        days_pending: 1,
        days_overdue: 0,
        stage: r.current_step || "Line Manager",
        relief_manager: "Unassigned",
        relief_officer: "Unassigned",
        relief_status: "Unassigned",
        status: r.status,
        decided_at: fmtDate(r.decided_at),
        updated_at: fmtDate(r.updated_at),
      }));
  }

  // ---------------- PERFORMANCE ----------------
  if (def.module === "performance") {
    const rows = await sql`
      SELECT
        pg.id,
        pg.owner_employee_id,
        COALESCE(e.first_name || ' ' || e.last_name, 'Org Goal') AS employee,
        COALESCE(d.name, 'Company') AS department,
        pg.title,
        pg.framework,
        pg.perspective_code,
        pg.weight_pct,
        pg.progress_pct,
        pg.computed_score,
        pg.status
      FROM performance_goals pg
      LEFT JOIN employees e ON e.id = pg.owner_employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE pg.tenant_id = ${companyId}
      ORDER BY pg.id DESC
      LIMIT 200
    `;
    const filtered = rows
      .filter((r: any) => !scopedEmployeeIds || scopedEmployeeIds.includes(Number(r.owner_employee_id)))
      .filter((r: any) => !deptFilter || String(r.department).toLowerCase() === deptFilter.toLowerCase());

    if (k === "PM-005" || k === "PM-015") {
      const byPersp = new Map<string, { count: number; totalProg: number }>();
      for (const r of filtered) {
        const p = r.perspective_code || "General";
        const cur = byPersp.get(p) ?? { count: 0, totalProg: 0 };
        cur.count += 1;
        cur.totalProg += Number(r.progress_pct ?? 0);
        byPersp.set(p, cur);
      }
      return Array.from(byPersp.entries()).map(([perspective, v]) => ({
        perspective,
        objective_count: v.count,
        objectives: v.count,
        avg_progress: v.count > 0 ? Math.round(v.totalProg / v.count) : 0,
        score: v.count > 0 ? Math.round(v.totalProg / v.count) : 0,
      }));
    }

    return filtered.map((r: any) => ({
      employee: r.employee,
      owner: r.employee,
      department: r.department,
      goal: r.title,
      objective: r.title,
      pillar: r.perspective_code || "Strategic",
      aligned: r.perspective_code ? "Yes" : "No",
      weight: Number(r.weight_pct ?? 0),
      progress_pct: Number(r.progress_pct ?? 0),
      score: Number(r.computed_score ?? r.progress_pct ?? 0),
      checkins_performed: 1,
      stage: "Mid-Year",
      status: r.status,
    }));
  }

  // ---------------- ASSETS ----------------
  if (def.module === "assets") {
    const rows = await sql`
      SELECT
        ca.id,
        ca.asset_code AS asset_tag,
        COALESCE(ac.name, 'Hardware') AS category,
        ca.name,
        ca.serial_number,
        ca.status,
        ca.purchase_price,
        ca.warranty_expiry,
        ca.created_at,
        aa.employee_id,
        aa.allocated_date,
        e.first_name || ' ' || e.last_name AS assigned_to,
        COALESCE(d.name, 'Unassigned') AS department
      FROM company_assets ca
      LEFT JOIN asset_categories ac ON ac.id = ca.category_id
      LEFT JOIN asset_allocations aa ON aa.asset_id = ca.id AND aa.return_date IS NULL
      LEFT JOIN employees e ON e.id = aa.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE ca.company_id = ${companyId}
      ORDER BY ca.id ASC
      LIMIT 200
    `;
    return rows
      .filter((r: any) => !scopedEmployeeIds || (r.employee_id && scopedEmployeeIds.includes(Number(r.employee_id))))
      .map((r: any) => ({
        asset_tag: r.asset_tag,
        category: r.category,
        name: r.name,
        serial_number: r.serial_number || "—",
        assigned_to: r.assigned_to || "In Stock",
        employee: r.assigned_to || "In Stock",
        department: r.department,
        assigned_at: fmtDate(r.allocated_date),
        cost: Number(r.purchase_price ?? 0),
        nbv: Number(r.purchase_price ?? 0),
        location: "Main Office",
        status: r.status,
        updated_at: fmtDate(r.created_at),
      }));
  }

  // ---------------- CROSS-MODULE ----------------
  if (k === "XR-013") {
    const rows = await sql`
      SELECT id, first_name, last_name, email, office, date_of_birth
      FROM employees
      WHERE company_id = ${companyId} AND is_active = TRUE
      LIMIT 200
    `;
    const issues: Record<string, unknown>[] = [];
    for (const r of rows) {
      if (!r.office) issues.push({ employee: `${r.first_name} ${r.last_name}`, field: "office", issue: "Missing office location", severity: "Medium" });
      if (!r.date_of_birth) issues.push({ employee: `${r.first_name} ${r.last_name}`, field: "date_of_birth", issue: "Missing DOB", severity: "Low" });
    }
    return issues;
  }

  // Default Cross-Module summary (XR-001, XR-003, XR-015, etc.)
  const summaryRows = await sql`
    SELECT
      COALESCE(d.name, 'Unassigned') AS department,
      COUNT(DISTINCT e.id)::int AS headcount,
      COUNT(DISTINCT lr.employee_id) FILTER (
        WHERE lr.status = 'approved' AND lr.start_date <= CURRENT_DATE AND lr.end_date >= CURRENT_DATE
      )::int AS on_leave
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN leave_requests lr ON lr.employee_id = e.id AND lr.company_id = ${companyId}
    WHERE e.company_id = ${companyId} AND e.is_active = TRUE
    GROUP BY d.name
    ORDER BY headcount DESC
  `;
  if (k === "XR-015") {
    const totalHc = summaryRows.reduce((s: number, r: any) => s + Number(r.headcount ?? 0), 0);
    const totalOl = summaryRows.reduce((s: number, r: any) => s + Number(r.on_leave ?? 0), 0);
    return [
      { metric: "Active Headcount", value: totalHc, status: "On Track" },
      { metric: "Currently On Leave", value: totalOl, status: "Normal" },
      { metric: "Workforce Coverage", value: `${totalHc > 0 ? Math.round(((totalHc - totalOl) / totalHc) * 100) : 100}%`, status: "Healthy" },
    ];
  }
  return summaryRows.map((r: any) => {
    const hc = Math.max(1, Number(r.headcount ?? 1));
    const ol = Number(r.on_leave ?? 0);
    const avail = Math.max(0, hc - ol);
    const cov = Math.round((avail / hc) * 100);
    return {
      department: r.department,
      headcount: hc,
      scheduled: hc,
      on_leave: ol,
      available: avail,
      on_leave_pct: Math.round((ol / hc) * 100),
      coverage_pct: cov,
      availability_pct: cov,
    };
  });
}

export function createReportRoutes(getSql: (env: Env) => any) {
  const app = new Hono<{ Bindings: Env; Variables: { tenant: TenantContext } }>();

  app.get("/api/v1/reports/catalogue", async (c) => {
    const { role } = c.get("tenant");
    const items = REPORT_CATALOGUE.map((def) => {
      const access = canAccessReport(role, def, null);
      return {
        reportKey: def.reportKey,
        name: def.name,
        module: def.module,
        purpose: def.purpose,
        grain: def.grain,
        columns: def.columns,
        filters: def.filters,
        drillDown: def.drillDown,
        sensitivity: def.sensitivity,
        frequency: def.frequency,
        phase: def.phase,
        accessible: access.ok,
      };
    });
    return c.json({ total: items.length, reports: items });
  });

  app.get("/api/v1/reports/:module/:reportKey", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const module = c.req.param("module");
    const reportKey = c.req.param("reportKey");
    const def = findReportDefinition(module, reportKey);

    if (!def) {
      return c.json({ error: "REPORT_NOT_FOUND", message: `Unknown report ${module}/${reportKey}` }, 404);
    }

    const requestedScope = c.req.query("scope");
    const access = canAccessReport(role, def, requestedScope);
    if (!access.ok) {
      return c.json({ error: access.error, message: access.message }, access.status);
    }

    const format = (c.req.query("format") || "json").toLowerCase();
    const page = Math.max(1, Number(c.req.query("page") || 1));
    const pageSize = Math.min(200, Math.max(1, Number(c.req.query("pageSize") || 50)));
    const filters = {
      dept: c.req.query("dept") || undefined,
      status: c.req.query("status") || undefined,
      from: c.req.query("from") || undefined,
      to: c.req.query("to") || undefined,
      location: c.req.query("location") || undefined,
    };

    const sql = getSql(c.env);
    let rows = await runReportQuery(sql, def, companyId, userId, access.scope, filters);

    // Part 6 Rule 5: Small-group suppression (min cohort = 5)
    let suppressed = false;
    let suppressionReason: string | null = null;
    if (def.smallGroupSuppression) {
      const totalCohort = rows.reduce((sum, r) => sum + Number(r.headcount ?? r.count ?? r.case_count ?? r.appeal_count ?? 1), 0);
      const hasSmallRow = rows.some((r) => {
        const cnt = Number(r.headcount ?? r.count ?? r.case_count ?? r.appeal_count ?? MIN_COHORT_SIZE);
        return cnt > 0 && cnt < MIN_COHORT_SIZE;
      });
      if (rows.length > 0 && (totalCohort < MIN_COHORT_SIZE || hasSmallRow)) {
        suppressed = true;
        suppressionReason = `Small-group suppression applied: cohort size below minimum threshold (${MIN_COHORT_SIZE}).`;
        rows = [];
      }
    }

    const totalCount = rows.length;
    const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);

    // Audit REPORT_VIEWED / REPORT_EXPORTED
    const auditAction = format === "csv" || format === "xlsx" || format === "pdf" ? "REPORT_EXPORTED" : "REPORT_VIEWED";
    try {
      await sql`
        INSERT INTO arch_audit_log (
          id, company_id, actor_employee_id, context, scope_type, entity_type, entity_id, action, after_json
        ) VALUES (
          ${`AUD-RPT-${crypto.randomUUID()}`},
          ${companyId},
          ${userId},
          'reporting_catalogue',
          ${access.scope},
          'report',
          ${def.reportKey},
          ${auditAction},
          ${JSON.stringify({ module: def.module, format, scope: access.scope, rowCount: totalCount })}::jsonb
        )
      `;
    } catch {
      // Non-fatal in isolated environments
    }

    if (format === "csv") {
      const csv = formatReportCsv(def.columns, rows);
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${def.reportKey}.csv"`,
        },
      });
    }

    const nowIso = new Date().toISOString();
    return c.json({
      reportKey: def.reportKey,
      title: def.name,
      module: def.module,
      phase: def.phase,
      sensitivity: def.sensitivity,
      generatedAt: nowIso,
      asAt: nowIso,
      filters: { scope: access.scope, ...filters },
      columns: def.columns,
      rows: pagedRows,
      totals: { rowCount: totalCount, page, pageSize },
      drillDown: def.drillDown,
      suppressed,
      suppressionReason,
    });
  });

  return app;
}

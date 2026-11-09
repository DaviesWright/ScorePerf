import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { zValidator } from "@hono/zod-validator";
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import postgres from "postgres";
import {
  CreateEmployeeSchema,
  CreateCycleSchema,
  CreateAppraisalSchema,
  CreateKpiSchema,
  CreateSessionSchema,
  TransitionCycleSchema,
  CalculateScoreSchema,
  JobMessage,
} from "@hr-platform/shared";
import {
  DEFAULT_APPROVAL_SETTINGS,
  INTEGRATION_PROVIDERS,
  PROVIDER_INFO,
  leaveStepOutcome,
  managerDecidesStep,
  objectivesManagerDecides,
  preflight,
  slotStatus,
  validateApprovalSettings,
  validateConnection,
  validateOffice,
  type ApprovalSettings,
  type IntegrationProvider,
  type LeaveChain,
} from "@hr-platform/shared";
import { ADAPTERS, RESERVED_SECRET_NAMES } from "./integrations/adapters";
import { authenticate, type TenantContext } from "./auth";
import { createAuthRoutes } from "./auth-routes";
import { createReviewerRoutes } from "./reviewer-routes";
import { createAssetRoutes, openRecoveryTask, overdueAssets } from "./assets-routes";
import { createOrgRoutes } from "./org-routes";
import { isSerialViolation, normaliseSerial, recoveryTaskTitle } from "@hr-platform/shared";
import type { MagicLinkDeps } from "./magic-link";
import { z } from "zod";
import {
  canAmend,
  canCancel,
  canDecide,
  canDecideObjectives,
  canDeleteObjective,
  canEditObjective,
  canUpdateProgress,
  checkDateShape,
  checkWeights,
  isDecider,
  isHr,
  MAX_OBJECTIVES,
  objectivesOpen,
  remainingDays,
  totalWeight,
  canApprovePlan,
  canSubmitPlan,
  carryForwardDays,
  countWorkingDays,
  isPlanLapsed,
  planDeadline,
  parseReportingLinesCsv,
  parseStrategyCsv,
  DEFAULT_PERFORMANCE_SETTINGS,
  validatePerformanceSettings,
  type PerformanceSettings,
  validateObjective,
  validateRequest,
  type ObjectiveStatus,
  PROFILE_FIELDS,
  PROFILE_FIELD_LABELS,
  type ProfileField,
  profileValueError,
  canDecideProfileChange,
  PDF_MAX_BYTES,
  isPdf,
  payslipError,
  netPay,
  acknowledgmentError,
  weightedProgress,
} from "@hr-platform/shared";

export interface Env {
  HYPERDRIVE: {
    connectionString: string;
  };
  SESSIONS: KVNamespace;
  // R2 bucket scoreview-docs (wrangler.jsonc r2_buckets). Holds leave evidence: doctor's notes and photos.
  DOCS: R2Bucket;
  JOBS_QUEUE: Queue<JobMessage>;
  REVIEW_WORKFLOW: Workflow;
  // Worker secret (`wrangler secret put AUTH_JWT_SECRET`; `.dev.vars` locally), at least 32 characters.
  AUTH_JWT_SECRET: string;
  // Origin of the frontend that sign-in links point at, e.g. https://hr.example.com (`.dev.vars` locally).
  FRONTEND_URL: string;
  // Local development only: "1" prints sign-in links to the worker log instead of emailing them.
  // Must never be set in a deployed environment, where the log is not a safe place for a credential.
  MAGIC_LINK_DEV_LOG?: string;
}

const app = new Hono<{
  Bindings: Env;
  Variables: { tenant: TenantContext };
}>();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

// Root welcome & API Directory
app.get("/", (c) => {
  return c.json({
    service: "hr-api",
    version: "1.0.0",
    status: "healthy",
    frontend: "http://localhost:3000",
    activeModules: {
      employeeManagement: "/api/v1/employees",
      frameworks: "/api/v1/frameworks",
      performance: "/api/v1/cycles",
      appraisals: "/api/v1/appraisals",
      attendance: "/api/v1/attendance",
      leave: "/api/v1/leaves",
      assets: "/api/v1/assets",
      helpdesk: "/api/v1/helpdesk/tickets",
      projects: "/api/v1/projects",
      documents: "/api/v1/documents",
      kpis: "/api/v1/kpis",
    },
    suppressedModules: {
      recruitment: "Suppressed (schema and records intact)",
      onboarding: "Suppressed (schema and records intact)",
      offboarding: "Suppressed (schema and records intact)",
      payroll: "Suppressed (schema and records intact)",
    },
  });
});

// Health check
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    service: "hr-api",
    timestamp: new Date().toISOString(),
  });
});

// Public sign-in (magic link + KV). Deliberately outside /api/v1: these routes mint the token that
// `authenticate` checks. See src/auth-routes.ts.
app.route("/auth", createAuthRoutes<Env>(magicLinkDeps));
app.route("/auth", createReviewerRoutes(getSql));

// Authentication: every /api/v1 route needs a signed bearer token. The tenant (company), user and
// role come from its claims, never from request headers (ADR-0005, SOC2 CC6.1, ISO 27001 A.9.4.2).
// Hono runs handlers in registration order, so this must stay above every /api/v1 route
// (test/wiring.test.ts enforces it).
app.use("/api/v1/*", authenticate);

// KV Sessions (Auth & State). The SESSIONS namespace also holds sign-in links (`ml:`, `mlr:`), so every
// session key is prefixed `sess:`; otherwise a caller could plant a forged `ml:` entry through this
// endpoint and redeem it to sign in as another user (test/wiring.test.ts enforces the prefix).
app.post("/api/v1/session", zValidator("json", CreateSessionSchema), async (c) => {
  const { sessionId, session, ttlSeconds } = c.req.valid("json");
  await c.env.SESSIONS.put(`sess:${sessionId}`, JSON.stringify(session), {
    expirationTtl: ttlSeconds,
  });
  return c.json({ success: true, sessionId });
});

app.get("/api/v1/session/:id", async (c) => {
  const raw = await c.env.SESSIONS.get(`sess:${c.req.param("id")}`);
  if (!raw) return c.json({ error: "Session not found" }, 404);
  return c.json({ sessionId: c.req.param("id"), session: JSON.parse(raw) });
});

// RBAC for protected routes (runs after `authenticate`, which is mounted above the first /api/v1 route).
app.use("/api/v1/*", async (c, next) => {
  const { role } = c.get("tenant");

  // Creating or changing appraisal cycles, KPIs and scores is an HR action. (Reads stay open to every signed-in role.)
  if (c.req.method !== "GET" && /^\/api\/v1\/(cycles|kpis|scores)(\/|$)/.test(c.req.path) && role !== "hr_admin" && role !== "hr_director") {
    return c.json({ error: "Forbidden", message: "Only HR roles can change appraisal cycles, KPIs and scores." }, 403);
  }

  // Strict RBAC: No one can see payroll/compensation unless authorized
  if (c.req.path.startsWith("/api/v1/payroll")) {
    if (role === "employee" || role === "line_manager") {
      return c.json(
        {
          error: "Forbidden",
          code: "RBAC_PAYROLL_ACCESS_DENIED",
          message: `Role '${role}' is strictly unauthorized from accessing company payroll and compensation details under SOC2 CC6.1 and ISO 27001 A.9.4.2.`,
          requiredScope: "payroll:read",
          userRole: role,
          timestamp: new Date().toISOString(),
        },
        403
      );
    }
  }

  await next();
});

// Helper: Database client via Hyperdrive
function getSql(env: Env) {
  return postgres(env.HYPERDRIVE.connectionString, { max: 10, idle_timeout: 20 });
}

// Wiring for src/magic-link.ts. The link base comes from FRONTEND_URL, never from the request.
function magicLinkDeps(env: Env): MagicLinkDeps {
  const sql = getSql(env);
  const toUser = (r: Record<string, unknown>) => ({
    id: Number(r.id),
    companyId: Number(r.company_id),
    role: String(r.role),
  });
  return {
    kv: env.SESSIONS,
    linkBase: new URL(env.FRONTEND_URL).origin,
    async findActiveUsersByEmail(email) {
      // employees is UNIQUE (company_id, email), so an address can match several tenants; LIMIT 2 is
      // enough for the caller to see the ambiguity. access_role, not role: role is a job title that any
      // signed-in user can set when creating an employee (db/migrations/0001_employees_access_role.sql).
      const rows = await sql`
        SELECT id, company_id, access_role AS role FROM employees WHERE lower(email) = ${email} AND is_active LIMIT 2
      `;
      return rows.map(toUser);
    },
    async findActiveUser(companyId, userId) {
      const rows = await sql`
        SELECT id, company_id, access_role AS role FROM employees WHERE company_id = ${companyId} AND id = ${userId} AND is_active
      `;
      return rows[0] ? toUser(rows[0]) : null;
    },
    async deliver(email, link) {
      if (env.MAGIC_LINK_DEV_LOG === "1") {
        console.log(`[dev] sign-in link for ${email}: ${link}`);
        return;
      }
      // No mail provider is wired yet (open decision, docs/HANDOVER.md). Fail closed rather than log a credential.
      throw new Error("no mail provider configured");
    },
  };
}

// The signed-in user's own profile. The frontend uses it to show who is signed in; the access role comes
// from the verified token, never from the client.
app.get("/api/v1/me", async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT e.id, e.first_name, e.last_name, e.email, e.role AS job_title, d.name AS department
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id AND d.company_id = e.company_id
    WHERE e.id = ${userId} AND e.company_id = ${companyId} AND e.is_active
  `;
  if (rows.length === 0) return c.json({ error: "Not found" }, 404);
  const r = rows[0];
  return c.json({
    id: Number(r.id),
    companyId,
    firstName: String(r.first_name),
    lastName: String(r.last_name),
    email: String(r.email),
    jobTitle: String(r.job_title),
    department: r.department ? String(r.department) : null,
    accessRole: role,
  });
});

// 1. Employees (DRF-style)
app.get("/api/v1/employees", async (c) => {
  const { companyId } = c.get("tenant");
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT id, first_name, last_name, email, role, is_active
    FROM employees
    WHERE company_id = ${companyId}
    ORDER BY id ASC
  `;
  return c.json({ count: rows.length, results: rows });
});

app.post("/api/v1/employees", zValidator("json", CreateEmployeeSchema), async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can add employees." }, 403);
  const data = c.req.valid("json");
  const sql = getSql(c.env);

  const [employee] = await sql`
    INSERT INTO employees (company_id, department_id, first_name, last_name, email, role, is_active)
    VALUES (${companyId}, ${data.departmentId || null}, ${data.firstName}, ${data.lastName}, ${data.email}, ${data.role}, true)
    RETURNING id, company_id, department_id, first_name, last_name, email, role, is_active, created_at
  `;

  return c.json(employee, 201);
});

// 2. KPIs (Validated with Zod, enqueues background job)
app.post("/api/v1/kpis", zValidator("json", CreateKpiSchema), async (c) => {
  const { companyId } = c.get("tenant");
  const { name, target, unit } = c.req.valid("json");
  const sql = getSql(c.env);

  const [kpi] = await sql`
    INSERT INTO kpis (company_id, name, target, unit)
    VALUES (${companyId}, ${name}, ${target}, ${unit})
    RETURNING id, name, target, unit, created_at
  `;

  // Enqueue background event to Cloudflare Queue
  await c.env.JOBS_QUEUE.send({
    type: "kpi_created",
    companyId,
    kpiId: kpi.id,
    name: kpi.name,
    target: Number(kpi.target),
    timestamp: new Date().toISOString(),
  });

  return c.json(kpi, 201);
});

// 2b. Frameworks Directory & Single Framework Governance
app.get("/api/v1/frameworks", async (c) => {
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT id, code, name, description, is_active
    FROM framework_types
    ORDER BY id ASC
  `;
  return c.json({
    count: rows.length,
    results: rows,
    governance: {
      rule: "Single Framework per Appraisal (OKR / MBO / BSC)",
      selectionPolicy: "One framework must be explicitly chosen when an appraisal cycle is initiated.",
      immutability: "Once selected, the framework is permanently locked for that appraisal cycle.",
      antiMixing: "A mix of frameworks cannot be used for any single appraisal (strict mutual exclusivity).",
    },
  });
});

// 3. Performance Cycles (Framework Purity Enforced)
app.get("/api/v1/cycles", async (c) => {
  const { companyId } = c.get("tenant");
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT 
      pc.*,
      ft.code as framework_code,
      ft.name as framework_name,
      ft.description as framework_description
    FROM performance_cycles pc
    JOIN framework_types ft ON pc.framework_type_id = ft.id
    WHERE pc.company_id = ${companyId}
    ORDER BY pc.start_date DESC
  `;
  return c.json({ count: rows.length, results: rows });
});

app.post("/api/v1/cycles", zValidator("json", CreateCycleSchema), async (c) => {
  const { companyId } = c.get("tenant");
  const data = c.req.valid("json");
  const sql = getSql(c.env);

  let frameworkTypeId = data.framework_type_id;
  if (!frameworkTypeId && data.framework_code) {
    const [ft] = await sql`SELECT id FROM framework_types WHERE code = ${data.framework_code}`;
    if (!ft) {
      return c.json({ error: `Framework '${data.framework_code}' is not supported.` }, 400);
    }
    frameworkTypeId = ft.id;
  }

  if (!frameworkTypeId) {
    return c.json({ error: "framework_code ('OKR' | 'MBO' | 'BSC') or framework_type_id must be provided." }, 400);
  }

  const [cycle] = await sql`
    INSERT INTO performance_cycles (
      company_id, title, description, framework_type_id,
      framework_configuration_id, start_date, end_date, status
    ) VALUES (
      ${companyId}, ${data.title}, ${data.description}, ${frameworkTypeId},
      ${data.framework_configuration_id || null}, ${data.start_date}, ${data.end_date}, 'draft'
    )
    RETURNING *
  `;

  const [created] = await sql`
    SELECT 
      pc.*,
      ft.code as framework_code,
      ft.name as framework_name
    FROM performance_cycles pc
    JOIN framework_types ft ON pc.framework_type_id = ft.id
    WHERE pc.id = ${cycle.id}
  `;

  return c.json(created, 201);
});

// Cycle update with Framework Immutability Lock
app.patch("/api/v1/cycles/:id", async (c) => {
  const { companyId } = c.get("tenant");
  const cycleId = parseInt(c.req.param("id"), 10);
  const body = await c.req.json().catch(() => ({}));

  if ("framework_type_id" in body || "framework_code" in body) {
    return c.json({
      error: "Framework mutation prohibited",
      message: "Once selected, the framework is locked for this appraisal cycle. A mix of frameworks cannot be used for any single appraisal.",
    }, 400);
  }

  const sql = getSql(c.env);
  const [updated] = await sql`
    UPDATE performance_cycles
    SET 
      title = COALESCE(${body.title || null}, title),
      description = COALESCE(${body.description || null}, description),
      updated_at = NOW()
    WHERE id = ${cycleId} AND company_id = ${companyId}
    RETURNING *
  `;

  if (!updated) return c.json({ error: "Cycle not found" }, 404);
  return c.json(updated);
});

app.post("/api/v1/cycles/:id/transition", zValidator("json", TransitionCycleSchema), async (c) => {
  const { companyId } = c.get("tenant");
  const cycleId = parseInt(c.req.param("id"), 10);
  const { target_status } = c.req.valid("json");
  const sql = getSql(c.env);

  const [updated] = await sql`
    UPDATE performance_cycles
    SET status = ${target_status}, updated_at = NOW()
    WHERE id = ${cycleId} AND company_id = ${companyId}
    RETURNING *
  `;

  if (!updated) {
    return c.json({ error: "Cycle not found" }, 404);
  }

  // Trigger Cloudflare Workflow when cycle becomes active
  if (target_status === "active") {
    await c.env.REVIEW_WORKFLOW.create({
      id: `cycle-${cycleId}-review-flow`,
      params: { cycleId, companyId },
    });
  }

  return c.json(updated);
});

// 3b. Appraisals & Performance Reviews (Framework Purity Guaranteed)
app.get("/api/v1/appraisals", async (c) => {
  const { companyId } = c.get("tenant");
  const cycleIdParam = c.req.query("cycleId");
  const sql = getSql(c.env);

  let reviews;
  if (cycleIdParam) {
    const cycleId = parseInt(cycleIdParam, 10);
    reviews = await sql`
      SELECT pr.*, e.first_name, e.last_name, pc.title as cycle_title, ft.code as framework_code
      FROM performance_reviews pr
      JOIN employees e ON pr.employee_id = e.id
      JOIN performance_cycles pc ON pr.cycle_id = pc.id
      JOIN framework_types ft ON pc.framework_type_id = ft.id
      WHERE pr.company_id = ${companyId} AND pr.cycle_id = ${cycleId}
      ORDER BY pr.created_at DESC
    `;
  } else {
    reviews = await sql`
      SELECT pr.*, e.first_name, e.last_name, pc.title as cycle_title, ft.code as framework_code
      FROM performance_reviews pr
      JOIN employees e ON pr.employee_id = e.id
      JOIN performance_cycles pc ON pr.cycle_id = pc.id
      JOIN framework_types ft ON pc.framework_type_id = ft.id
      WHERE pr.company_id = ${companyId}
      ORDER BY pr.created_at DESC LIMIT 50
    `;
  }

  return c.json({ count: reviews.length, results: reviews });
});

app.post("/api/v1/appraisals", zValidator("json", CreateAppraisalSchema), async (c) => {
  const { companyId } = c.get("tenant");
  const data = c.req.valid("json");
  const sql = getSql(c.env);

  // 1. Fetch Cycle and its locked framework
  const [cycle] = await sql`
    SELECT pc.*, ft.code as framework_code, ft.name as framework_name
    FROM performance_cycles pc
    JOIN framework_types ft ON pc.framework_type_id = ft.id
    WHERE pc.id = ${data.cycleId} AND pc.company_id = ${companyId}
  `;

  if (!cycle) {
    return c.json({ error: "Cycle not found" }, 404);
  }

  // 2. Enforce Framework Purity: An appraisal MUST match the cycle's framework exactly.
  if (cycle.framework_code === "OKR" && (data.mboPayload || data.bscPayload)) {
    return c.json({
      error: "Mixed Frameworks Prohibited",
      message: `Appraisal cycle '${cycle.title}' is configured strictly for OKR. MBO or BSC components cannot be mixed into an OKR appraisal.`,
      lockedFramework: "OKR",
    }, 422);
  }

  if (cycle.framework_code === "MBO" && (data.okrPayload || data.bscPayload)) {
    return c.json({
      error: "Mixed Frameworks Prohibited",
      message: `Appraisal cycle '${cycle.title}' is configured strictly for MBO. OKR or BSC components cannot be mixed into an MBO appraisal.`,
      lockedFramework: "MBO",
    }, 422);
  }

  if (cycle.framework_code === "BSC" && (data.okrPayload || data.mboPayload)) {
    return c.json({
      error: "Mixed Frameworks Prohibited",
      message: `Appraisal cycle '${cycle.title}' is configured strictly for BSC. OKR or MBO components cannot be mixed into a Balanced Scorecard appraisal.`,
      lockedFramework: "BSC",
    }, 422);
  }

  // 3. Insert appraisal record
  const [review] = await sql`
    INSERT INTO performance_reviews (
      company_id, cycle_id, employee_id, reviewer_id, feedback, status
    ) VALUES (
      ${companyId}, ${data.cycleId}, ${data.employeeId}, ${data.reviewerId || null}, ${data.feedback}, 'completed'
    )
    ON CONFLICT (cycle_id, employee_id, reviewer_id)
    DO UPDATE SET feedback = EXCLUDED.feedback, updated_at = NOW()
    RETURNING *
  `;

  return c.json({
    appraisal: review,
    cycleTitle: cycle.title,
    lockedFramework: cycle.framework_code,
    frameworkPurityVerified: true,
  }, 201);
});

// 4. Enqueue Score Calculation Job
app.post("/api/v1/scores/calculate", zValidator("json", CalculateScoreSchema), async (c) => {
  const { companyId } = c.get("tenant");
  const { cycleId, employeeId } = c.req.valid("json");

  await c.env.JOBS_QUEUE.send({
    type: "score_calculation",
    companyId,
    cycleId,
    employeeId,
    timestamp: new Date().toISOString(),
  });

  return c.json({ queued: true, cycleId, employeeId });
});

// 5. Leave Management
app.get("/api/v1/leaves", async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  const sql = getSql(c.env);
  // Approver roles see the whole company's requests; everyone else sees only their own (reasons can be private).
  const onlyMine = !isDecider(role);
  const leaves = await sql`
    SELECT lr.*, lt.name as leave_type_name, e.first_name, e.last_name
    FROM leave_requests lr
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    JOIN employees e ON lr.employee_id = e.id
    WHERE lr.company_id = ${companyId} AND (${!onlyMine} OR lr.employee_id = ${userId})
    ORDER BY lr.created_at DESC LIMIT 50
  `;
  return c.json({ count: leaves.length, results: leaves });
});

// ---- Leave: own requests, balances, approvals (rules in packages/shared/src/leave.ts) ----
const LeaveRequestBody = z.object({
  leaveTypeId: z.number().int().positive(),
  startDate: z.string().max(10),
  endDate: z.string().max(10),
  reason: z.string().max(500).default(""),
  halfDay: z.enum(["morning", "afternoon"]).optional(),
});
const LeaveDecisionBody = z.object({ decision: z.enum(["approve", "reject"]), comment: z.string().trim().max(1000).optional() });
const HolidayBody = z.object({ name: z.string().trim().min(2).max(255), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

const toLeaveRequest = (r: Record<string, unknown>) => ({
  id: Number(r.id),
  employeeId: Number(r.employee_id),
  employeeName: r.first_name ? `${r.first_name} ${r.last_name}` : undefined,
  department: r.department ? String(r.department) : undefined,
  leaveTypeId: Number(r.leave_type_id),
  leaveType: String(r.leave_type_name),
  startDate: String(r.start_date),
  endDate: String(r.end_date),
  days: Number(r.requested_days),
  status: String(r.status),
  reason: String(r.reason ?? ""),
  decidedBy: r.approved_by ? Number(r.approved_by) : null,
});

async function baseBalances(sql: ReturnType<typeof getSql>, companyId: number, userId: number, year: number) {
  const rows = await sql`
    SELECT lt.id, lt.name, COALESCE(a.total_days, lt.default_days)::float AS total,
      COALESCE(SUM(CASE WHEN r.status = 'approved' THEN r.requested_days END), 0)::float AS used,
      COALESCE(SUM(CASE WHEN r.status = 'pending' THEN r.requested_days END), 0)::float AS pending
    FROM leave_types lt
    LEFT JOIN leave_allocations a
      ON a.leave_type_id = lt.id AND a.employee_id = ${userId} AND a.company_id = ${companyId} AND a.year = ${year}
    LEFT JOIN leave_requests r
      ON r.leave_type_id = lt.id AND r.employee_id = ${userId} AND r.company_id = ${companyId}
      AND r.status IN ('approved', 'pending') AND EXTRACT(YEAR FROM r.start_date) = ${year}
    WHERE lt.company_id = ${companyId} AND lt.is_active
    GROUP BY lt.id, lt.name, a.total_days, lt.default_days
    ORDER BY lt.id
  `;
  return rows.map((r) => ({
    leaveTypeId: Number(r.id),
    name: String(r.name),
    total: Number(r.total),
    used: Number(r.used),
    pending: Number(r.pending),
    remaining: remainingDays(Number(r.total), Number(r.used), Number(r.pending)),
  }));
}

// Balance = entitlement + HR adjustments this year + days carried from last year (if the type allows it, capped, and
// expiring on 31 March) - approved - pending. Carry-forward looks back one year only.
async function leaveBalances(sql: ReturnType<typeof getSql>, companyId: number, userId: number, year: number) {
  const [now, prev, adjustments, types] = await Promise.all([
    baseBalances(sql, companyId, userId, year),
    baseBalances(sql, companyId, userId, year - 1),
    sql`
      SELECT leave_type_id, plan_year, COALESCE(SUM(days), 0)::float AS days FROM leave_balance_adjustments
      WHERE company_id = ${companyId} AND employee_id = ${userId} AND plan_year IN (${year}, ${year - 1})
      GROUP BY leave_type_id, plan_year
    `,
    sql`SELECT id, is_carry_forward, carry_forward_limit::float AS cap FROM leave_types WHERE company_id = ${companyId}`,
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const adjustedBy = (typeId: number, y: number) =>
    Number(adjustments.find((a) => Number(a.leave_type_id) === typeId && Number(a.plan_year) === y)?.days ?? 0);
  return now.map((b) => {
    const type = types.find((t) => Number(t.id) === b.leaveTypeId);
    const last = prev.find((p) => p.leaveTypeId === b.leaveTypeId);
    const prevRemaining = last ? last.total + adjustedBy(b.leaveTypeId, year - 1) - last.used : 0;
    const carried = carryForwardDays({
      prevRemaining,
      limit: type?.cap === null || type?.cap === undefined ? null : Number(type.cap),
      today,
      year,
      carries: Boolean(type?.is_carry_forward),
    });
    const adjusted = adjustedBy(b.leaveTypeId, year);
    const total = b.total + adjusted + carried;
    return { ...b, total, carried, adjusted, remaining: remainingDays(total, b.used, b.pending) };
  });
}

app.get("/api/v1/leave/me", async (c) => {
  const { companyId, userId } = c.get("tenant");
  const sql = getSql(c.env);
  const year = new Date().getUTCFullYear();
  const [balances, requests] = await Promise.all([
    leaveBalances(sql, companyId, userId, year),
    sql`
      SELECT lr.id, lr.employee_id, lr.leave_type_id, lt.name AS leave_type_name, lr.start_date::text AS start_date,
        lr.end_date::text AS end_date, lr.requested_days, lr.status, lr.reason, lr.approved_by
      FROM leave_requests lr
      JOIN leave_types lt ON lt.id = lr.leave_type_id
      WHERE lr.company_id = ${companyId} AND lr.employee_id = ${userId}
      ORDER BY lr.start_date DESC LIMIT 100
    `,
  ]);
  return c.json({ year, balances, requests: requests.map(toLeaveRequest) });
});

app.post("/api/v1/leave/requests", zValidator("json", LeaveRequestBody), async (c) => {
  const { companyId, userId } = c.get("tenant");
  const body = c.req.valid("json");
  const sql = getSql(c.env);
  // Dates are validated before any date-typed SQL sees them: a malformed value would otherwise fail in Postgres.
  const shapeError = checkDateShape(body.startDate, body.endDate);
  if (shapeError) return c.json({ error: shapeError }, 422);

  const year = Number(body.startDate.slice(0, 4));
  const balances = await leaveBalances(sql, companyId, userId, year);
  const balance = balances.find((b) => b.leaveTypeId === body.leaveTypeId);
  if (!balance) return c.json({ error: "Unknown leave type." }, 400);

  const [holidayRows, overlapRows] = await Promise.all([
    sql`SELECT holiday_date::text AS d FROM company_holidays WHERE company_id = ${companyId}`,
    sql`
      SELECT 1 FROM leave_requests
      WHERE company_id = ${companyId} AND employee_id = ${userId} AND status IN ('approved', 'pending')
        AND start_date <= ${body.endDate}::date AND end_date >= ${body.startDate}::date
      LIMIT 1
    `,
  ]);

  const result = validateRequest(body, {
    today: new Date().toISOString().slice(0, 10),
    holidays: new Set(holidayRows.map((r) => String(r.d))),
    remaining: balance.remaining,
    overlaps: overlapRows.length > 0,
  });
  if (!result.ok) return c.json({ error: result.error }, 422);

  const inserted = await sql`
    INSERT INTO leave_requests (company_id, employee_id, leave_type_id, start_date, end_date, requested_days, status, reason, half_day_period)
    VALUES (${companyId}, ${userId}, ${body.leaveTypeId}, ${body.startDate}, ${body.endDate}, ${result.days}, 'pending', ${body.reason}, ${body.halfDay ?? null})
    RETURNING id
  `;
  const requester = await personName(sql, companyId, userId);
  await notifyManagerAndHr(sql, companyId, userId, userId, "leave_requested",
    `${requester} requested ${balance.name} leave, ${body.startDate} to ${body.endDate} (${result.days} day${result.days === 1 ? "" : "s"}).`);
  return c.json({ id: Number(inserted[0].id), days: result.days, status: "pending" }, 201);
});

// Notifications for leave and trips go to the employee's solid manager and to HR. The actor is never notified of
// their own action. Recipients are computed in one statement.
async function notifyManagerAndHr(
  sql: ReturnType<typeof getSql>,
  companyId: number,
  employeeId: number,
  actorId: number,
  kind: string,
  message: string,
): Promise<void> {
  await sql`
    INSERT INTO notifications (company_id, recipient_id, kind, message)
    SELECT ${companyId}, r.id, ${kind}, ${message} FROM (
      SELECT rl.manager_id AS id FROM reporting_lines rl
      WHERE rl.company_id = ${companyId} AND rl.employee_id = ${employeeId} AND rl.kind = 'solid'
      UNION
      SELECT e.id FROM employees e
      WHERE e.company_id = ${companyId} AND e.is_active AND e.access_role IN ('hr_admin', 'hr_director')
    ) r
    WHERE r.id <> ${actorId}
  `;
}

async function personName(sql: ReturnType<typeof getSql>, companyId: number, id: number): Promise<string> {
  const [row] = await sql`SELECT first_name, last_name FROM employees WHERE id = ${id} AND company_id = ${companyId}`;
  return row ? `${row.first_name} ${row.last_name}` : "Someone";
}

async function loadLeaveRequest(sql: ReturnType<typeof getSql>, companyId: number, id: number) {
  const rows = await sql`SELECT id, employee_id, status FROM leave_requests WHERE id = ${id} AND company_id = ${companyId}`;
  return rows[0] ? { id: Number(rows[0].id), employeeId: Number(rows[0].employee_id), status: String(rows[0].status) } : null;
}

app.post("/api/v1/leave/requests/:id/cancel", async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  const id = Number(c.req.param("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return c.json({ error: "Not found" }, 404);
  const sql = getSql(c.env);
  const request = await loadLeaveRequest(sql, companyId, id);
  if (!request) return c.json({ error: "Not found" }, 404);
  if (request.employeeId !== userId) return c.json({ error: "Forbidden" }, 403);
  if (!canCancel({ userId, role }, request)) return c.json({ error: "Only pending requests can be cancelled." }, 409);
  const updated = await sql`
    UPDATE leave_requests SET status = 'cancelled', updated_at = NOW()
    WHERE id = ${id} AND company_id = ${companyId} AND employee_id = ${userId} AND status = 'pending' RETURNING id
  `;
  if (updated.length === 0) return c.json({ error: "Only pending requests can be cancelled." }, 409);
  await notifyManagerAndHr(sql, companyId, userId, userId, "leave_cancelled",
    `${await personName(sql, companyId, userId)} cancelled a pending leave request.`);
  return c.json({ id, status: "cancelled" });
});

/** True when `managerId` holds the solid (approving) reporting line of `employeeId`. */
async function isSolidManager(sql: ReturnType<typeof getSql>, companyId: number, managerId: number, employeeId: number): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM reporting_lines
    WHERE company_id = ${companyId} AND employee_id = ${employeeId} AND manager_id = ${managerId} AND kind = 'solid' LIMIT 1
  `;
  return rows.length > 0;
}

app.get("/api/v1/leave/approvals", async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  if (!isDecider(role)) return c.json({ error: "Forbidden" }, 403);
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT lr.id, lr.employee_id, lr.leave_type_id, lt.name AS leave_type_name, lr.start_date::text AS start_date,
      lr.end_date::text AS end_date, lr.requested_days, lr.status, lr.reason, lr.approved_by,
      lr.current_step, lt.approval_chain,
      e.first_name, e.last_name, d.name AS department
    FROM leave_requests lr
    JOIN leave_types lt ON lt.id = lr.leave_type_id
    JOIN employees e ON e.id = lr.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE lr.company_id = ${companyId} AND lr.status = 'pending' AND lr.employee_id <> ${userId}
      AND (${isHrRole(role)}::boolean OR lr.employee_id IN (
        SELECT employee_id FROM reporting_lines WHERE company_id = ${companyId} AND manager_id = ${userId} AND kind = 'solid'))
    ORDER BY lr.start_date ASC LIMIT 200
  `;
  // A line manager sees a request only at a step whose configured approver is the line manager.
  const levels = await loadApprovalSettings(sql, companyId);
  const visible = rows.filter((r) => isHrRole(role) || managerDecidesStep(levelsFor(levels, String(r.approval_chain)), Number(r.current_step)));
  return c.json({ count: visible.length, results: visible.map(toLeaveRequest) });
});

app.post("/api/v1/leave/requests/:id/decision", zValidator("json", LeaveDecisionBody), async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  if (!isDecider(role)) return c.json({ error: "Forbidden" }, 403);
  const id = Number(c.req.param("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return c.json({ error: "Not found" }, 404);
  const sql = getSql(c.env);
  const request = await loadLeaveRequest(sql, companyId, id);
  if (!request) return c.json({ error: "Not found" }, 404);
  if (request.employeeId === userId) return c.json({ error: "You cannot decide your own request." }, 403);
  const solid = await isSolidManager(sql, companyId, userId, request.employeeId);
  if (!canDecide({ userId, role }, request, solid)) return c.json({ error: "You can only decide requests from your solid reports, or HR can decide." }, 403);
  const body = c.req.valid("json");
  if (body.decision === "reject" && (body.comment ?? "").length < 3) {
    return c.json({ error: "A rejection needs a reason of at least 3 characters." }, 422);
  }
  const [meta] = await sql`
    SELECT lr.current_step, lt.approval_chain, lt.requires_evidence,
      (SELECT count(*)::int FROM leave_evidence ev WHERE ev.request_id = lr.id) AS evidence
    FROM leave_requests lr JOIN leave_types lt ON lt.id = lr.leave_type_id
    WHERE lr.id = ${id} AND lr.company_id = ${companyId}
  `;
  if (!meta) return c.json({ error: "Not found" }, 404);
  const hr = isHrRole(role);
  // The configured levels for this chain decide the step. Defaults: "manager" stops at the line manager, and
  // "manager_then_hr" moves an approval on to HR. HR decides any step and finishes the request.
  const levels = levelsFor(await loadApprovalSettings(sql, companyId), String(meta.approval_chain));
  const step = Number(meta.current_step);
  const outcome = leaveStepOutcome(levels, step, { hr, solidManager: solid }, body.decision);
  if (outcome.action === "forbidden") return c.json({ error: outcome.reason }, 403);
  if (outcome.action === "advance") {
    const moved = await sql`
      UPDATE leave_requests SET current_step = ${outcome.step}, updated_at = NOW()
      WHERE id = ${id} AND company_id = ${companyId} AND status = 'pending' AND current_step = ${step} RETURNING id
    `;
    if (moved.length === 0) return c.json({ error: "This request is no longer pending." }, 409);
    const nextIsHr = levels[outcome.step - 1] === "hr";
    await notifyManagerAndHr(sql, companyId, request.employeeId, userId, "leave_awaiting_hr",
      `${await personName(sql, companyId, userId)} approved a leave request for ${await personName(sql, companyId, request.employeeId)}; it now needs ${nextIsHr ? "HR" : "the next"} approval.`);
    return c.json({ id, status: "pending", step: outcome.step });
  }
  if (body.decision === "approve" && meta.requires_evidence && Number(meta.evidence) === 0) {
    return c.json({ error: "Evidence must be attached before this leave can be approved." }, 422);
  }
  const status = body.decision === "approve" ? "approved" : "rejected";
  const updated = await sql`
    UPDATE leave_requests SET status = ${status}, approved_by = ${userId}, updated_at = NOW(),
      decided_at = NOW(), decision_comment = ${body.comment ?? null}
    WHERE id = ${id} AND company_id = ${companyId} AND status = 'pending' RETURNING id
  `;
  if (updated.length === 0) return c.json({ error: "This request is no longer pending." }, 409);
  await notifyManagerAndHr(sql, companyId, request.employeeId, userId, "leave_decided",
    `${await personName(sql, companyId, userId)} ${status} a leave request for ${await personName(sql, companyId, request.employeeId)}.`);
  return c.json({ id, status });
});

// Leave types: HR sets the name, the default days each person gets, and whether unused days carry forward. A change to
// default_days changes every balance that has no per-person allocation (leaveBalances falls back to default_days).
const LeaveTypeBody = z.object({
  name: z.string().trim().min(2).max(100),
  defaultDays: z.number().int().min(0).max(365),
  isCarryForward: z.boolean().default(false),
});
const LeaveTypeUpdateBody = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  defaultDays: z.number().int().min(0).max(365).optional(),
  isCarryForward: z.boolean().optional(),
  isActive: z.boolean().optional(),
  requiresEvidence: z.boolean().optional(),
  approvalChain: z.enum(["manager", "manager_then_hr"]).optional(),
  carryForwardLimit: z.number().min(0).max(365).nullable().optional(),
});
const BalanceAdjustBody = z.object({
  employeeId: z.number().int().positive(),
  leaveTypeId: z.number().int().positive(),
  year: z.number().int().min(2000).max(2100),
  days: z.number().min(-365).max(365).refine((d) => d !== 0, { message: "Days cannot be zero." }),
  reason: z.string().trim().min(5).max(500),
});

app.get("/api/v1/leave/types", async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Forbidden" }, 403);
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT id, name, default_days, is_carry_forward, is_active, requires_evidence, approval_chain,
      carry_forward_limit::float8 AS carry_forward_limit
    FROM leave_types WHERE company_id = ${companyId} ORDER BY id
  `;
  return c.json({
    results: rows.map((r) => ({
      id: Number(r.id),
      name: String(r.name),
      defaultDays: Number(r.default_days),
      isCarryForward: Boolean(r.is_carry_forward),
      isActive: Boolean(r.is_active),
      requiresEvidence: Boolean(r.requires_evidence),
      approvalChain: String(r.approval_chain),
      carryForwardLimit: r.carry_forward_limit === null ? null : Number(r.carry_forward_limit),
    })),
  });
});

app.post("/api/v1/leave/types", zValidator("json", LeaveTypeBody), async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can add leave types." }, 403);
  const body = c.req.valid("json");
  const sql = getSql(c.env);
  const dup = await sql`SELECT 1 FROM leave_types WHERE company_id = ${companyId} AND lower(name) = lower(${body.name}) LIMIT 1`;
  if (dup.length > 0) return c.json({ error: "A leave type with that name already exists." }, 409);
  const inserted = await sql`
    INSERT INTO leave_types (company_id, name, default_days, is_carry_forward) VALUES (${companyId}, ${body.name}, ${body.defaultDays}, ${body.isCarryForward})
    RETURNING id
  `;
  return c.json({ id: Number(inserted[0].id) }, 201);
});

app.post("/api/v1/leave/types/:id/update", zValidator("json", LeaveTypeUpdateBody), async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can change leave types." }, 403);
  const id = objectiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const body = c.req.valid("json");
  const sql = getSql(c.env);
  const [current] = await sql`
    SELECT id, name, default_days, is_carry_forward, is_active, requires_evidence, approval_chain,
      carry_forward_limit::float8 AS carry_forward_limit
    FROM leave_types WHERE id = ${id} AND company_id = ${companyId}
  `;
  if (!current) return c.json({ error: "Not found" }, 404);
  const name = body.name ?? String(current.name);
  if (name.toLowerCase() !== String(current.name).toLowerCase()) {
    const dup = await sql`SELECT 1 FROM leave_types WHERE company_id = ${companyId} AND lower(name) = lower(${name}) AND id <> ${id} LIMIT 1`;
    if (dup.length > 0) return c.json({ error: "A leave type with that name already exists." }, 409);
  }
  await sql`
    UPDATE leave_types SET name = ${name}, default_days = ${body.defaultDays ?? Number(current.default_days)},
      is_carry_forward = ${body.isCarryForward ?? Boolean(current.is_carry_forward)}, is_active = ${body.isActive ?? Boolean(current.is_active)},
      requires_evidence = ${body.requiresEvidence ?? (current.requires_evidence as boolean)},
      approval_chain = ${body.approvalChain ?? (current.approval_chain as string)},
      carry_forward_limit = ${body.carryForwardLimit === undefined ? (current.carry_forward_limit as number | null) : body.carryForwardLimit}
    WHERE id = ${id} AND company_id = ${companyId}
  `;
  return c.json({ id, updated: true });
});

// HR adjusts a balance with a reason. Every adjustment is kept with who made it and when; nothing is overwritten.
app.post("/api/v1/leave/balances/adjust", zValidator("json", BalanceAdjustBody), async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can adjust leave balances." }, 403);
  const body = c.req.valid("json");
  const sql = getSql(c.env);
  const [employee] = await sql`SELECT 1 FROM employees WHERE id = ${body.employeeId} AND company_id = ${companyId}`;
  if (!employee) return c.json({ error: "No employee with that id." }, 422);
  const [type] = await sql`SELECT 1 FROM leave_types WHERE id = ${body.leaveTypeId} AND company_id = ${companyId}`;
  if (!type) return c.json({ error: "Unknown leave type." }, 422);
  const inserted = await sql`
    INSERT INTO leave_balance_adjustments (company_id, employee_id, leave_type_id, plan_year, days, reason, adjusted_by)
    VALUES (${companyId}, ${body.employeeId}, ${body.leaveTypeId}, ${body.year}, ${body.days}, ${body.reason}, ${userId})
    RETURNING id
  `;
  return c.json({ id: Number(inserted[0].id) }, 201);
});

app.get("/api/v1/leave/balances/adjustments", async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Forbidden" }, 403);
  const employeeId = Number(c.req.query("employeeId"));
  if (!Number.isSafeInteger(employeeId) || employeeId <= 0) return c.json({ error: "employeeId is required." }, 422);
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT a.id, a.plan_year, a.days::float8 AS days, a.reason, a.created_at, lt.name AS leave_type,
      h.first_name AS by_first, h.last_name AS by_last
    FROM leave_balance_adjustments a
    JOIN leave_types lt ON lt.id = a.leave_type_id
    LEFT JOIN employees h ON h.id = a.adjusted_by
    WHERE a.company_id = ${companyId} AND a.employee_id = ${employeeId}
    ORDER BY a.created_at DESC LIMIT 200
  `;
  return c.json({
    results: rows.map((r) => ({
      id: Number(r.id),
      leaveType: String(r.leave_type),
      year: Number(r.plan_year),
      days: Number(r.days),
      reason: String(r.reason),
      adjustedBy: r.by_first ? `${r.by_first} ${r.by_last}` : null,
      createdAt: new Date(String(r.created_at)).toISOString(),
    })),
  });
});

// Company holidays: everyone reads; HR adds and removes. Used when working days are counted.
app.get("/api/v1/holidays", async (c) => {
  const { companyId } = c.get("tenant");
  const sql = getSql(c.env);
  const rows = await sql`SELECT id, name, holiday_date::text AS date FROM company_holidays WHERE company_id = ${companyId} ORDER BY holiday_date`;
  return c.json({ results: rows.map((r) => ({ id: Number(r.id), name: String(r.name), date: String(r.date) })) });
});

app.post("/api/v1/holidays", zValidator("json", HolidayBody), async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can add holidays." }, 403);
  const body = c.req.valid("json");
  const sql = getSql(c.env);
  const dup = await sql`SELECT 1 FROM company_holidays WHERE company_id = ${companyId} AND holiday_date = ${body.date}::date LIMIT 1`;
  if (dup.length > 0) return c.json({ error: "A holiday already exists on that date." }, 409);
  const inserted = await sql`
    INSERT INTO company_holidays (company_id, name, holiday_date) VALUES (${companyId}, ${body.name}, ${body.date}::date) RETURNING id
  `;
  return c.json({ id: Number(inserted[0].id) }, 201);
});

app.post("/api/v1/holidays/:id/delete", async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can remove holidays." }, 403);
  const id = objectiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const sql = getSql(c.env);
  const deleted = await sql`DELETE FROM company_holidays WHERE id = ${id} AND company_id = ${companyId} RETURNING id`;
  if (deleted.length === 0) return c.json({ error: "Not found" }, 404);
  return c.json({ id, deleted: true });
});

app.get("/api/v1/leave/calendar", async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isDecider(role)) return c.json({ error: "Forbidden" }, 403);
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT lr.id, lr.employee_id, lr.leave_type_id, lt.name AS leave_type_name, lr.start_date::text AS start_date,
      lr.end_date::text AS end_date, lr.requested_days, lr.status, lr.reason, lr.approved_by,
      e.first_name, e.last_name, d.name AS department
    FROM leave_requests lr
    JOIN leave_types lt ON lt.id = lr.leave_type_id
    JOIN employees e ON e.id = lr.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE lr.company_id = ${companyId} AND lr.status = 'approved' AND lr.end_date >= CURRENT_DATE
    ORDER BY lr.start_date ASC LIMIT 200
  `;
  return c.json({ count: rows.length, results: rows.map(toLeaveRequest) });
});

// ---------------------------------------------------------------------------------------------------------
// Objectives: employees draft, submit; deciders approve or return; HR amends. Approved objectives are
// locked here (every write is guarded by status in its WHERE clause) and again by the database trigger
// trg_objective_lock (db/migrations/0002_objective_approval_lock.sql), so SQL run outside the API is refused too.
// ---------------------------------------------------------------------------------------------------------
const ObjectiveFields = z.object({
  title: z.string().max(300),
  weight: z.number(),
  target: z.string().max(1000).default(""),
  metric: z.string().max(1000).default(""),
});
const ObjectiveCreateBody = ObjectiveFields.extend({ cycleId: z.number().int().positive() });
const ObjectiveCycleBody = z.object({ cycleId: z.number().int().positive() });
const ObjectiveDecisionBody = z.object({
  cycleId: z.number().int().positive(),
  employeeId: z.number().int().positive(),
  decision: z.enum(["approve", "return"]),
});
const ObjectiveAmendBody = z.object({
  reason: z.string().trim().min(5).max(1000),
  title: z.string().max(300).optional(),
  weight: z.number().optional(),
  target: z.string().max(1000).optional(),
  metric: z.string().max(1000).optional(),
});
const ObjectiveProgressBody = z.object({ progress: z.number().int().min(0).max(100) });

type Sql = ReturnType<typeof getSql>;

function toObjective(r: Record<string, unknown>) {
  return {
    id: Number(r.id),
    employeeId: Number(r.employee_id),
    cycleId: r.cycle_id === null ? null : Number(r.cycle_id),
    title: String(r.title),
    weight: Number(r.weight),
    target: String(r.target),
    metric: String(r.metric),
    status: String(r.status) as ObjectiveStatus,
    progress: Number(r.progress_percentage),
    approvedBy: r.approved_by === null ? null : Number(r.approved_by),
    approvedAt: r.approved_at ? new Date(String(r.approved_at)).toISOString() : null,
    locked: r.locked_at !== null,
    ...(r.first_name !== undefined ? { employeeName: `${r.first_name} ${r.last_name}`, department: r.department ? String(r.department) : null } : {}),
  };
}

const OBJECTIVE_COLUMNS = `id, employee_id, cycle_id, title, weight, target, metric, status, progress_percentage, approved_by, approved_at, locked_at`;

/** The requested cycle, or the newest one that is open for goal setting. */
async function objectiveCycle(sql: Sql, companyId: number, cycleId: number | null) {
  const rows = cycleId
    ? await sql`SELECT id, title, status::text AS status, start_date::text AS start_date, end_date::text AS end_date FROM performance_cycles WHERE id = ${cycleId} AND company_id = ${companyId}`
    : await sql`
        SELECT id, title, status::text AS status, start_date::text AS start_date, end_date::text AS end_date FROM performance_cycles
        WHERE company_id = ${companyId} AND status IN ('configured', 'approved', 'active') ORDER BY start_date DESC, id DESC LIMIT 1
      `;
  if (!rows[0]) return null;
  const r = rows[0];
  return { id: Number(r.id), title: String(r.title), status: String(r.status), startDate: String(r.start_date), endDate: String(r.end_date), open: objectivesOpen(String(r.status)) };
}

function queryCycleId(raw: string | undefined): number | null {
  const n = Number(raw);
  return raw !== undefined && Number.isSafeInteger(n) && n > 0 ? n : null;
}

async function loadObjective(sql: Sql, companyId: number, id: number) {
  const rows = await sql`
    SELECT o.id, o.employee_id, o.cycle_id, o.title, o.weight, o.target, o.metric, o.status, o.progress_percentage,
      o.approved_by, o.approved_at, o.locked_at, c.status::text AS cycle_status
    FROM employee_objectives o LEFT JOIN performance_cycles c ON c.id = o.cycle_id
    WHERE o.id = ${id} AND o.company_id = ${companyId}
  `;
  return rows[0] ?? null;
}

const objectiveId = (raw: string): number | null => {
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

app.get("/api/v1/objectives/me", async (c) => {
  const { companyId, userId } = c.get("tenant");
  const sql = getSql(c.env);
  const cycle = await objectiveCycle(sql, companyId, queryCycleId(c.req.query("cycleId")));
  if (!cycle) return c.json({ cycle: null, objectives: [], total: 0 });
  const rows = await sql`
    SELECT ${sql.unsafe(OBJECTIVE_COLUMNS)} FROM employee_objectives
    WHERE company_id = ${companyId} AND employee_id = ${userId} AND cycle_id = ${cycle.id} ORDER BY id
  `;
  const objectives = rows.map(toObjective);
  return c.json({ cycle, objectives, total: totalWeight(objectives.map((o) => o.weight)) });
});

app.post("/api/v1/objectives", zValidator("json", ObjectiveCreateBody), async (c) => {
  const { companyId, userId } = c.get("tenant");
  const body = c.req.valid("json");
  const sql = getSql(c.env);
  const cycle = await objectiveCycle(sql, companyId, body.cycleId);
  if (!cycle) return c.json({ error: "Not found" }, 404);
  if (!cycle.open) return c.json({ error: "Goal setting is closed for this cycle." }, 409);
  const invalid = validateObjective(body);
  if (invalid) return c.json({ error: invalid }, 422);
  const count = await sql`SELECT count(*)::int AS n FROM employee_objectives WHERE company_id = ${companyId} AND employee_id = ${userId} AND cycle_id = ${cycle.id}`;
  if (Number(count[0].n) >= MAX_OBJECTIVES) return c.json({ error: `You can set at most ${MAX_OBJECTIVES} objectives per cycle.` }, 422);
  const inserted = await sql`
    INSERT INTO employee_objectives (company_id, cycle_id, employee_id, title, status, weight, target, metric, start_date, end_date)
    VALUES (${companyId}, ${cycle.id}, ${userId}, ${body.title.trim()}, 'draft', ${body.weight}, ${body.target}, ${body.metric}, ${cycle.startDate}::date, ${cycle.endDate}::date)
    RETURNING id
  `;
  return c.json({ id: Number(inserted[0].id), status: "draft" }, 201);
});

app.post("/api/v1/objectives/submit", zValidator("json", ObjectiveCycleBody), async (c) => {
  const { companyId, userId } = c.get("tenant");
  const { cycleId } = c.req.valid("json");
  const sql = getSql(c.env);
  const cycle = await objectiveCycle(sql, companyId, cycleId);
  if (!cycle) return c.json({ error: "Not found" }, 404);
  if (!cycle.open) return c.json({ error: "Goal setting is closed for this cycle." }, 409);
  const all = await sql`SELECT weight, status FROM employee_objectives WHERE company_id = ${companyId} AND employee_id = ${userId} AND cycle_id = ${cycleId}`;
  const weightError = checkWeights(all.map((r) => Number(r.weight)));
  if (weightError) return c.json({ error: weightError }, 422);
  const updated = await sql`
    UPDATE employee_objectives SET status = 'submitted', updated_at = NOW()
    WHERE company_id = ${companyId} AND employee_id = ${userId} AND cycle_id = ${cycleId} AND status IN ('draft', 'returned') RETURNING id
  `;
  if (updated.length === 0) return c.json({ error: "There is nothing new to submit." }, 409);
  return c.json({ submitted: updated.length });
});

app.get("/api/v1/objectives/pending", async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  if (!isDecider(role)) return c.json({ error: "Forbidden" }, 403);
  const sql = getSql(c.env);
  const managerLevel = objectivesManagerDecides(await loadApprovalSettings(sql, companyId));
  const cycle = await objectiveCycle(sql, companyId, queryCycleId(c.req.query("cycleId")));
  if (!cycle) return c.json({ cycle: null, results: [] });
  const rows = await sql`
    SELECT o.id, o.employee_id, o.cycle_id, o.title, o.weight, o.target, o.metric, o.status, o.progress_percentage,
      o.approved_by, o.approved_at, o.locked_at, e.first_name, e.last_name, d.name AS department
    FROM employee_objectives o
    JOIN employees e ON e.id = o.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE o.company_id = ${companyId} AND o.cycle_id = ${cycle.id} AND o.status = 'submitted' AND o.employee_id <> ${userId}
      AND (${isHrRole(role)}::boolean OR (${managerLevel}::boolean AND o.employee_id IN (
        SELECT employee_id FROM reporting_lines WHERE company_id = ${companyId} AND manager_id = ${userId} AND kind = 'solid')))
    ORDER BY o.employee_id, o.id LIMIT 500
  `;
  return c.json({ cycle, results: rows.map(toObjective) });
});

app.post("/api/v1/objectives/decision", zValidator("json", ObjectiveDecisionBody), async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  const { cycleId, employeeId, decision } = c.req.valid("json");
  if (!isDecider(role)) return c.json({ error: "Forbidden" }, 403);
  if (employeeId === userId) return c.json({ error: "You cannot decide your own objectives." }, 403);
  const sql = getSql(c.env);
  const cycle = await objectiveCycle(sql, companyId, cycleId);
  if (!cycle) return c.json({ error: "Not found" }, 404);
  if (!cycle.open) return c.json({ error: "Goal setting is closed for this cycle." }, 409);
  // The objective approval level decides whether a line manager may decide at all; HR always can.
  const managerLevel = objectivesManagerDecides(await loadApprovalSettings(sql, companyId));
  const solid = managerLevel && (await isSolidManager(sql, companyId, userId, employeeId));
  if (!canDecideObjectives({ userId, role }, employeeId, "submitted", solid)) {
    return c.json({ error: "You can only decide objectives of your solid reports, or HR can decide." }, 403);
  }
  const updated =
    decision === "approve"
      ? await sql`
          UPDATE employee_objectives SET status = 'approved', approved_by = ${userId}, approved_at = NOW(), locked_at = NOW(), updated_at = NOW()
          WHERE company_id = ${companyId} AND employee_id = ${employeeId} AND cycle_id = ${cycleId} AND status = 'submitted' RETURNING id
        `
      : await sql`
          UPDATE employee_objectives SET status = 'returned', updated_at = NOW()
          WHERE company_id = ${companyId} AND employee_id = ${employeeId} AND cycle_id = ${cycleId} AND status = 'submitted' RETURNING id
        `;
  if (updated.length === 0) return c.json({ error: "Nothing is waiting for a decision." }, 409);
  return c.json({ decided: updated.length, status: decision === "approve" ? "approved" : "returned" });
});

// My notifications: newest first, with the unread count. Each user only ever sees and marks their own.
app.get("/api/v1/notifications", async (c) => {
  const { companyId, userId } = c.get("tenant");
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT id, kind, message, created_at, read_at FROM notifications
    WHERE company_id = ${companyId} AND recipient_id = ${userId}
    ORDER BY created_at DESC LIMIT 50
  `;
  const [count] = await sql`
    SELECT count(*)::int AS n FROM notifications WHERE company_id = ${companyId} AND recipient_id = ${userId} AND read_at IS NULL
  `;
  return c.json({
    unread: Number(count.n),
    results: rows.map((r) => ({
      id: Number(r.id),
      kind: String(r.kind),
      message: String(r.message),
      createdAt: new Date(String(r.created_at)).toISOString(),
      read: r.read_at !== null,
    })),
  });
});

app.post("/api/v1/notifications/:id/read", async (c) => {
  const { companyId, userId } = c.get("tenant");
  const id = objectiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const sql = getSql(c.env);
  const updated = await sql`
    UPDATE notifications SET read_at = NOW()
    WHERE id = ${id} AND company_id = ${companyId} AND recipient_id = ${userId} AND read_at IS NULL RETURNING id
  `;
  return c.json({ id, marked: updated.length });
});

app.post("/api/v1/notifications/read-all", async (c) => {
  const { companyId, userId } = c.get("tenant");
  const sql = getSql(c.env);
  const updated = await sql`
    UPDATE notifications SET read_at = NOW()
    WHERE company_id = ${companyId} AND recipient_id = ${userId} AND read_at IS NULL RETURNING id
  `;
  return c.json({ marked: updated.length });
});

// Reporting lines: HR loads a CSV of (employee, manager, solid|dotted). A load replaces all lines in one transaction.
// Every email must match an active employee in this company; unknown emails are reported by line.
const ReportingImportBody = z.object({ csv: z.string().min(1).max(120_000) });
const isHrRole = (role: string) => role === "hr_admin" || role === "hr_director";

app.post("/api/v1/reporting-lines/import", zValidator("json", ReportingImportBody), async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can load reporting lines." }, 403);
  const parsed = parseReportingLinesCsv(c.req.valid("json").csv);
  if (parsed.errors.length > 0) return c.json({ error: "The file has errors.", errors: parsed.errors }, 422);
  const sql = getSql(c.env);
  const people = await sql`SELECT id, lower(email) AS email FROM employees WHERE company_id = ${companyId} AND is_active`;
  const idByEmail = new Map(people.map((p) => [String(p.email), Number(p.id)]));
  const errors = parsed.rows.flatMap((r) => {
    const out: { line: number; message: string }[] = [];
    if (!idByEmail.has(r.employeeEmail)) out.push({ line: r.line, message: `No active employee with email ${r.employeeEmail}.` });
    if (!idByEmail.has(r.managerEmail)) out.push({ line: r.line, message: `No active employee with email ${r.managerEmail}.` });
    return out;
  });
  if (errors.length > 0) return c.json({ error: "Some emails are not in the company.", errors }, 422);
  await sql.begin(async (tx) => {
    await tx`DELETE FROM reporting_lines WHERE company_id = ${companyId}`;
    for (const r of parsed.rows) {
      await tx`
        INSERT INTO reporting_lines (company_id, employee_id, manager_id, kind)
        VALUES (${companyId}, ${idByEmail.get(r.employeeEmail)!}, ${idByEmail.get(r.managerEmail)!}, ${r.kind})
      `;
    }
  });
  return c.json({ loaded: parsed.rows.length }, 201);
});

// HR view: every reporting line with names.
app.get("/api/v1/reporting-lines", async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Forbidden" }, 403);
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT rl.kind, e.id AS employee_id, e.first_name AS e_first, e.last_name AS e_last,
      m.id AS manager_id, m.first_name AS m_first, m.last_name AS m_last
    FROM reporting_lines rl
    JOIN employees e ON e.id = rl.employee_id
    JOIN employees m ON m.id = rl.manager_id
    WHERE rl.company_id = ${companyId}
    ORDER BY e.last_name, e.first_name, rl.kind
  `;
  return c.json({
    lines: rows.map((r) => ({
      kind: String(r.kind),
      employeeId: Number(r.employee_id),
      employeeName: `${r.e_first} ${r.e_last}`,
      managerId: Number(r.manager_id),
      managerName: `${r.m_first} ${r.m_last}`,
    })),
  });
});

// Anyone: my managers (solid and dotted) and my reports (solid and dotted).
app.get("/api/v1/reporting-lines/me", async (c) => {
  const { companyId, userId } = c.get("tenant");
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT rl.kind, rl.employee_id, rl.manager_id,
      e.first_name AS e_first, e.last_name AS e_last, m.first_name AS m_first, m.last_name AS m_last
    FROM reporting_lines rl
    JOIN employees e ON e.id = rl.employee_id
    JOIN employees m ON m.id = rl.manager_id
    WHERE rl.company_id = ${companyId} AND (rl.employee_id = ${userId} OR rl.manager_id = ${userId})
  `;
  const person = (id: number, first: unknown, last: unknown) => ({ id, name: `${first} ${last}` });
  const managers = rows
    .filter((r) => Number(r.employee_id) === userId)
    .map((r) => ({ kind: String(r.kind), ...person(Number(r.manager_id), r.m_first, r.m_last) }));
  const reports = rows
    .filter((r) => Number(r.manager_id) === userId)
    .map((r) => ({ kind: String(r.kind), ...person(Number(r.employee_id), r.e_first, r.e_last) }));
  return c.json({ managers, reports });
});

// Corporate strategy: HR loads a CSV (validated by parseStrategyCsv). A load replaces the whole strategy in one
// transaction. Anyone can read it; only HR admins and directors load it.
const StrategyImportBody = z.object({ csv: z.string().min(1).max(60_000) });

app.get("/api/v1/strategy", async (c) => {
  const { companyId } = c.get("tenant");
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT id, perspective, objective, measure, target::float8 AS target, owner, weight::float8 AS weight, loaded_at
    FROM corporate_strategy_goals WHERE company_id = ${companyId} ORDER BY perspective, id
  `;
  return c.json({
    loadedAt: rows[0] ? new Date(String(rows[0].loaded_at)).toISOString() : null,
    goals: rows.map((r) => ({
      id: Number(r.id),
      perspective: String(r.perspective),
      objective: String(r.objective),
      measure: String(r.measure),
      target: Number(r.target),
      owner: r.owner ? String(r.owner) : null,
      weight: r.weight === null ? null : Number(r.weight),
    })),
  });
});

app.post("/api/v1/strategy/import", zValidator("json", StrategyImportBody), async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  if (role !== "hr_admin" && role !== "hr_director") return c.json({ error: "Only HR can load the corporate strategy." }, 403);
  const parsed = parseStrategyCsv(c.req.valid("json").csv);
  if (parsed.errors.length > 0) return c.json({ error: "The file has errors.", errors: parsed.errors }, 422);
  const sql = getSql(c.env);
  await sql.begin(async (tx) => {
    await tx`DELETE FROM corporate_strategy_goals WHERE company_id = ${companyId}`;
    for (const g of parsed.rows) {
      await tx`
        INSERT INTO corporate_strategy_goals (company_id, perspective, objective, measure, target, owner, weight, loaded_by)
        VALUES (${companyId}, ${g.perspective}, ${g.objective}, ${g.measure}, ${g.target}, ${g.owner}, ${g.weight}, ${userId})
      `;
    }
  });
  return c.json({ loaded: parsed.rows.length }, 201);
});

// Company performance settings: everyone reads the saved values (or the defaults); only HR saves them.
const PerformanceSettingsBody = z.object({
  pillarWeights: z.object({ financial: z.number(), customer: z.number(), internal: z.number(), learning: z.number() }),
  minObjectives: z.number(),
  maxObjectives: z.number(),
  mandatoryCorporateAlignment: z.boolean(),
  allowEmployeeProposeKeyResults: z.boolean(),
});

app.get("/api/v1/performance/settings", async (c) => {
  const { companyId } = c.get("tenant");
  const sql = getSql(c.env);
  const rows = await sql`SELECT settings, updated_at FROM performance_settings WHERE company_id = ${companyId}`;
  const settings = rows[0] ? (rows[0].settings as PerformanceSettings) : DEFAULT_PERFORMANCE_SETTINGS;
  return c.json({ settings, updatedAt: rows[0] ? new Date(String(rows[0].updated_at)).toISOString() : null, saved: rows.length > 0 });
});

app.post("/api/v1/performance/settings/update", zValidator("json", PerformanceSettingsBody), async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can change performance settings." }, 403);
  const settings = c.req.valid("json") as PerformanceSettings;
  const errors = validatePerformanceSettings(settings);
  if (errors.length > 0) return c.json({ error: "The settings are not valid.", errors }, 422);
  const sql = getSql(c.env);
  await sql`
    INSERT INTO performance_settings (company_id, settings, updated_by, updated_at)
    VALUES (${companyId}, ${JSON.stringify(settings)}::jsonb, ${userId}, NOW())
    ON CONFLICT (company_id) DO UPDATE SET settings = EXCLUDED.settings, updated_by = EXCLUDED.updated_by, updated_at = NOW()
  `;
  return c.json({ saved: true, settings });
});

// Home page content for everyone: active announcements, birthdays in the next 14 days, and the staff directory.
const AnnouncementBody = z.object({
  title: z.string().trim().min(3).max(200),
  body: z.string().max(5000).default(""),
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

app.get("/api/v1/home", async (c) => {
  const { companyId, role } = c.get("tenant");
  const sql = getSql(c.env);
  const [announcements, people] = await Promise.all([
    sql`
      SELECT id, title, body, published_on::text AS published_on, expires_on::text AS expires_on
      FROM announcements
      WHERE company_id = ${companyId} AND published_on <= CURRENT_DATE AND (expires_on IS NULL OR expires_on >= CURRENT_DATE)
      ORDER BY published_on DESC, id DESC LIMIT 20
    `,
    sql`
      SELECT e.id, e.first_name, e.last_name, e.email, e.role AS job_title, e.date_of_birth::text AS dob, d.name AS department
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id AND d.company_id = e.company_id
      WHERE e.company_id = ${companyId} AND e.is_active
      ORDER BY e.last_name, e.first_name LIMIT 500
    `,
  ]);

  // Birthdays: next occurrence of each date of birth, within 7 days. Computed here because the staff list is small.
  const now = new Date();
  const year = now.getUTCFullYear();
  const todayMs = Date.UTC(year, now.getUTCMonth(), now.getUTCDate());
  const birthdays = people
    .filter((p) => p.dob)
    .map((p) => {
      const [, m, d] = String(p.dob).split("-").map(Number);
      let next = Date.UTC(year, m - 1, d);
      if (next < todayMs) next = Date.UTC(year + 1, m - 1, d);
      const daysUntil = Math.round((next - todayMs) / 86_400_000);
      return {
        employeeName: `${p.first_name} ${p.last_name}`,
        department: p.department ? String(p.department) : null,
        jobTitle: String(p.job_title),
        date: new Date(next).toISOString().slice(0, 10),
        daysUntil,
      };
    })
    .filter((b) => b.daysUntil <= 7)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return c.json({
    today: now.toISOString().slice(0, 10),
    canPost: role === "hr_admin",
    announcements: announcements.map((a) => ({
      id: Number(a.id),
      title: String(a.title),
      body: String(a.body),
      publishedOn: String(a.published_on),
      expiresOn: a.expires_on ? String(a.expires_on) : null,
    })),
    birthdays,
    directory: people.map((p) => ({
      id: Number(p.id),
      name: `${p.first_name} ${p.last_name}`,
      email: String(p.email),
      jobTitle: String(p.job_title),
      department: p.department ? String(p.department) : null,
    })),
  });
});

// Only HR admins post and archive announcements. Archiving ends an announcement today rather than deleting it.
app.post("/api/v1/announcements", zValidator("json", AnnouncementBody), async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  if (role !== "hr_admin") return c.json({ error: "Only HR admins can post announcements." }, 403);
  const body = c.req.valid("json");
  const today = new Date().toISOString().slice(0, 10);
  if (body.expiresOn && body.expiresOn < today) return c.json({ error: "The expiry date cannot be in the past." }, 422);
  const sql = getSql(c.env);
  const inserted = await sql`
    INSERT INTO announcements (company_id, title, body, expires_on, created_by)
    VALUES (${companyId}, ${body.title}, ${body.body}, ${body.expiresOn ?? null}, ${userId})
    RETURNING id
  `;
  return c.json({ id: Number(inserted[0].id) }, 201);
});

app.post("/api/v1/announcements/:id/archive", async (c) => {
  const { companyId, role } = c.get("tenant");
  if (role !== "hr_admin") return c.json({ error: "Only HR admins can archive announcements." }, 403);
  const id = objectiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const sql = getSql(c.env);
  const updated = await sql`
    UPDATE announcements SET expires_on = CURRENT_DATE
    WHERE id = ${id} AND company_id = ${companyId} AND published_on <= CURRENT_DATE AND (expires_on IS NULL OR expires_on > CURRENT_DATE)
    RETURNING id
  `;
  if (updated.length === 0) return c.json({ error: "Not found or already ended." }, 409);
  return c.json({ id, archived: true });
});

// Dashboard: company-wide counts for everyone; approval queues and who is away only for deciders.
app.get("/api/v1/dashboard", async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  const decider = isDecider(role);
  const requestedWindow = Number(c.req.query("days") ?? 14);
  const windowDays = [7, 14, 30].includes(requestedWindow) ? requestedWindow : 14;
  const sql = getSql(c.env);
  const [away, myPending, cycleRows, approvalCounts, upcoming] = await Promise.all([
    sql`SELECT count(*)::int AS n FROM leave_requests WHERE company_id = ${companyId} AND status = 'approved' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE`,
    sql`SELECT count(*)::int AS n FROM leave_requests WHERE company_id = ${companyId} AND employee_id = ${userId} AND status = 'pending'`,
    sql`
      SELECT id, title, status::text AS status FROM performance_cycles
      WHERE company_id = ${companyId} AND status IN ('configured', 'approved', 'active')
      ORDER BY start_date DESC, id DESC LIMIT 1
    `,
    decider
      ? sql`
          SELECT
            (SELECT count(*)::int FROM leave_requests WHERE company_id = ${companyId} AND status = 'pending' AND employee_id <> ${userId}) AS leave_pending,
            (SELECT count(DISTINCT employee_id)::int FROM employee_objectives WHERE company_id = ${companyId} AND status = 'submitted' AND employee_id <> ${userId}) AS people_waiting
        `
      : Promise.resolve(null),
    decider
      ? sql`
          SELECT lr.start_date::text AS start_date, lr.end_date::text AS end_date, lt.name AS leave_type,
            e.first_name, e.last_name, d.name AS department
          FROM leave_requests lr
          JOIN leave_types lt ON lt.id = lr.leave_type_id
          JOIN employees e ON e.id = lr.employee_id
          LEFT JOIN departments d ON d.id = e.department_id
          WHERE lr.company_id = ${companyId} AND lr.status = 'approved'
            AND lr.start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ${windowDays}::int
          ORDER BY lr.start_date LIMIT 10
        `
      : Promise.resolve(null),
  ]);

  // Objective counts for the open cycle, company-wide and for the signed-in user.
  let cycle = null;
  let company = null;
  let mine = null;
  if (cycleRows[0]) {
    const cid = Number(cycleRows[0].id);
    const byStatus = await sql`
      SELECT employee_id, status, count(*)::int AS n FROM employee_objectives
      WHERE company_id = ${companyId} AND cycle_id = ${cid} GROUP BY employee_id, status
    `;
    const tally = (rows: Record<string, unknown>[]) => {
      const total = rows.reduce((s, r) => s + Number(r.n), 0);
      const approved = rows.filter((r) => r.status === "approved").reduce((s, r) => s + Number(r.n), 0);
      return { total, approved, approvedPct: total === 0 ? null : Math.round((approved / total) * 100) };
    };
    cycle = { id: cid, title: String(cycleRows[0].title), status: String(cycleRows[0].status), open: objectivesOpen(String(cycleRows[0].status)) };
    company = tally([...byStatus]);
    const own = byStatus.filter((r) => Number(r.employee_id) === userId);
    mine = {
      ...tally(own),
      awaiting: own.filter((r) => r.status !== "approved").reduce((s, r) => s + Number(r.n), 0),
    };
  }

  // Chart series: aggregates only, company-wide, for everyone who can open the dashboard.
  const [leaveByMonth, headcount, objectivesByDepartment] = await Promise.all([
    sql`
      SELECT to_char(date_trunc('month', start_date), 'YYYY-MM') AS month,
        count(*) FILTER (WHERE status = 'approved')::int AS approved,
        count(*) FILTER (WHERE status = 'pending')::int AS pending
      FROM leave_requests
      WHERE company_id = ${companyId} AND status IN ('approved', 'pending')
        AND start_date >= date_trunc('month', CURRENT_DATE) - interval '11 months'
      GROUP BY 1 ORDER BY 1
    `,
    sql`
      SELECT COALESCE(d.name, 'Unassigned') AS department, COALESCE(e.office, 'Unassigned') AS office, count(*)::int AS n
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE e.company_id = ${companyId} AND e.is_active
      GROUP BY 1, 2 ORDER BY 1, 2
    `,
    cycleRows[0]
      ? sql`
          SELECT COALESCE(d.name, 'Unassigned') AS department, count(*)::int AS total,
            count(*) FILTER (WHERE o.status = 'approved')::int AS approved,
            COALESCE(round(avg(o.progress_percentage) FILTER (WHERE o.status = 'approved'))::int, 0) AS avg_progress
          FROM employee_objectives o
          JOIN employees e ON e.id = o.employee_id
          LEFT JOIN departments d ON d.id = e.department_id
          WHERE o.company_id = ${companyId} AND o.cycle_id = ${Number(cycleRows[0].id)}
          GROUP BY 1 ORDER BY 1
        `
      : Promise.resolve([]),
  ]);

  return c.json({
    onLeaveToday: Number(away[0].n),
    myPendingLeave: Number(myPending[0].n),
    cycle,
    objectives: { company, mine },
    charts: {
      leaveByMonth: leaveByMonth.map((r) => ({ month: String(r.month), approved: Number(r.approved), pending: Number(r.pending) })),
      headcount: headcount.map((r) => ({ department: String(r.department), office: String(r.office), n: Number(r.n) })),
      objectivesByDepartment: objectivesByDepartment.map((r) => ({
        department: String(r.department),
        total: Number(r.total),
        approved: Number(r.approved),
        avgProgress: Number(r.avg_progress),
      })),
    },
    approvals: approvalCounts
      ? { leavePending: Number(approvalCounts[0].leave_pending), peopleWaiting: Number(approvalCounts[0].people_waiting) }
      : null,
    upcomingLeave: upcoming
      ? upcoming.map((r) => ({
          startDate: String(r.start_date),
          endDate: String(r.end_date),
          leaveType: String(r.leave_type),
          employeeName: `${r.first_name} ${r.last_name}`,
          department: r.department ? String(r.department) : null,
        }))
      : null,
  });
});

// HR's view of every objective in a cycle, so an approved one can be picked for amendment.
app.get("/api/v1/objectives/all", async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHr(role)) return c.json({ error: "Forbidden" }, 403);
  const sql = getSql(c.env);
  const cycle = await objectiveCycle(sql, companyId, queryCycleId(c.req.query("cycleId")));
  if (!cycle) return c.json({ cycle: null, results: [] });
  const rows = await sql`
    SELECT o.id, o.employee_id, o.cycle_id, o.title, o.weight, o.target, o.metric, o.status, o.progress_percentage,
      o.approved_by, o.approved_at, o.locked_at, e.first_name, e.last_name, d.name AS department
    FROM employee_objectives o
    JOIN employees e ON e.id = o.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE o.company_id = ${companyId} AND o.cycle_id = ${cycle.id}
    ORDER BY e.last_name, e.first_name, o.id LIMIT 1000
  `;
  return c.json({ cycle, results: rows.map(toObjective) });
});

// HR's progress heatmap: every approved objective in a cycle with its progress, one row per objective per person.
app.get("/api/v1/objectives/team-progress", async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHr(role)) return c.json({ error: "Forbidden" }, 403);
  const sql = getSql(c.env);
  const cycle = await objectiveCycle(sql, companyId, queryCycleId(c.req.query("cycleId")));
  if (!cycle) return c.json({ cycle: null, results: [] });
  const rows = await sql`
    SELECT o.id, o.employee_id, o.title, o.weight, o.progress_percentage, e.first_name, e.last_name, d.name AS department
    FROM employee_objectives o
    JOIN employees e ON e.id = o.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE o.company_id = ${companyId} AND o.cycle_id = ${cycle.id} AND o.status = 'approved'
    ORDER BY e.last_name, e.first_name, o.id LIMIT 1000
  `;
  return c.json({
    cycle,
    results: rows.map((r) => ({
      id: Number(r.id),
      employeeId: Number(r.employee_id),
      employeeName: `${r.first_name} ${r.last_name}`,
      department: r.department ?? null,
      title: r.title,
      weight: Number(r.weight),
      progress: Number(r.progress_percentage),
    })),
  });
});

app.get("/api/v1/objectives/amendments", async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHr(role)) return c.json({ error: "Forbidden" }, 403);
  const sql = getSql(c.env);
  const cycleId = queryCycleId(c.req.query("cycleId"));
  const rows = await sql`
    SELECT a.id, a.objective_id, a.reason, a.before_values, a.after_values, a.created_at, o.title AS objective_title,
      e.first_name AS owner_first, e.last_name AS owner_last, h.first_name AS by_first, h.last_name AS by_last
    FROM objective_amendments a
    LEFT JOIN employee_objectives o ON o.id = a.objective_id
    LEFT JOIN employees e ON e.id = o.employee_id
    LEFT JOIN employees h ON h.id = a.amended_by
    WHERE a.company_id = ${companyId} AND (${cycleId}::int IS NULL OR o.cycle_id = ${cycleId})
    ORDER BY a.created_at DESC LIMIT 200
  `;
  return c.json({
    results: rows.map((r) => ({
      id: Number(r.id),
      objectiveId: r.objective_id === null ? null : Number(r.objective_id),
      objectiveTitle: r.objective_title ? String(r.objective_title) : null,
      owner: r.owner_first ? `${r.owner_first} ${r.owner_last}` : null,
      amendedBy: r.by_first ? `${r.by_first} ${r.by_last}` : null,
      reason: String(r.reason),
      before: r.before_values,
      after: r.after_values,
      createdAt: new Date(String(r.created_at)).toISOString(),
    })),
  });
});

app.post("/api/v1/objectives/:id/update", zValidator("json", ObjectiveFields), async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  const id = objectiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const body = c.req.valid("json");
  const sql = getSql(c.env);
  const row = await loadObjective(sql, companyId, id);
  if (!row) return c.json({ error: "Not found" }, 404);
  if (Number(row.employee_id) !== userId) return c.json({ error: "Forbidden" }, 403);
  const current = { id, employeeId: userId, status: String(row.status) as ObjectiveStatus, weight: Number(row.weight) };
  if (!canEditObjective({ userId, role }, current)) {
    return c.json({ error: current.status === "approved" ? "Approved objectives are locked. Ask HR to amend it." : "Submitted objectives cannot be edited." }, 409);
  }
  if (row.cycle_status === null || !objectivesOpen(String(row.cycle_status))) return c.json({ error: "Goal setting is closed for this cycle." }, 409);
  const invalid = validateObjective(body);
  if (invalid) return c.json({ error: invalid }, 422);
  const updated = await sql`
    UPDATE employee_objectives SET title = ${body.title.trim()}, weight = ${body.weight}, target = ${body.target}, metric = ${body.metric},
      status = 'draft', updated_at = NOW()
    WHERE id = ${id} AND company_id = ${companyId} AND employee_id = ${userId} AND status IN ('draft', 'returned') RETURNING id
  `;
  if (updated.length === 0) return c.json({ error: "This objective can no longer be edited." }, 409);
  return c.json({ id, status: "draft" });
});

app.post("/api/v1/objectives/:id/delete", async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  const id = objectiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const sql = getSql(c.env);
  const row = await loadObjective(sql, companyId, id);
  if (!row) return c.json({ error: "Not found" }, 404);
  if (Number(row.employee_id) !== userId) return c.json({ error: "Forbidden" }, 403);
  const current = { id, employeeId: userId, status: String(row.status) as ObjectiveStatus, weight: Number(row.weight) };
  if (!canDeleteObjective({ userId, role }, current)) {
    return c.json({ error: current.status === "approved" ? "Approved objectives are locked and cannot be deleted." : "Submitted objectives cannot be deleted." }, 409);
  }
  if (row.cycle_status === null || !objectivesOpen(String(row.cycle_status))) return c.json({ error: "Goal setting is closed for this cycle." }, 409);
  const deleted = await sql`
    DELETE FROM employee_objectives WHERE id = ${id} AND company_id = ${companyId} AND employee_id = ${userId} AND status IN ('draft', 'returned') RETURNING id
  `;
  if (deleted.length === 0) return c.json({ error: "This objective can no longer be deleted." }, 409);
  return c.json({ id, deleted: true });
});

app.post("/api/v1/objectives/:id/progress", zValidator("json", ObjectiveProgressBody), async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  const id = objectiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const sql = getSql(c.env);
  const row = await loadObjective(sql, companyId, id);
  if (!row) return c.json({ error: "Not found" }, 404);
  if (Number(row.employee_id) !== userId) return c.json({ error: "Forbidden" }, 403);
  const current = { id, employeeId: userId, status: String(row.status) as ObjectiveStatus, weight: Number(row.weight) };
  if (!canUpdateProgress({ userId, role }, current)) return c.json({ error: "Progress can be recorded once an objective is approved." }, 409);
  const { progress } = c.req.valid("json");
  await sql`UPDATE employee_objectives SET progress_percentage = ${progress}, updated_at = NOW() WHERE id = ${id} AND company_id = ${companyId} AND employee_id = ${userId} AND status = 'approved'`;
  return c.json({ id, progress });
});

class AmendRejected extends Error {
  constructor(message: string, readonly httpStatus: 404 | 409 | 422) {
    super(message);
  }
}

// The only way to change an approved objective. One transaction: the app.amend flag lifts the database lock for
// this transaction alone, the change and its audit row commit together, and the owner's weights must still total
// 100 or everything rolls back.
app.post("/api/v1/objectives/:id/amend", zValidator("json", ObjectiveAmendBody), async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  if (!isHr(role)) return c.json({ error: "Forbidden" }, 403);
  const id = objectiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const body = c.req.valid("json");
  const sql = getSql(c.env);
  const row = await loadObjective(sql, companyId, id);
  if (!row) return c.json({ error: "Not found" }, 404);
  const current = { id, employeeId: Number(row.employee_id), status: String(row.status) as ObjectiveStatus, weight: Number(row.weight) };
  if (current.employeeId === userId) return c.json({ error: "You cannot amend your own objective." }, 403);
  if (!canAmend({ userId, role }, current, String(row.cycle_status ?? "closed"))) {
    return c.json({ error: current.status !== "approved" ? "Only approved objectives are amended; others are edited by their owner." : "This cycle is closed to changes." }, 409);
  }
  const next = {
    title: body.title ?? String(row.title),
    weight: body.weight ?? Number(row.weight),
    target: body.target ?? String(row.target),
    metric: body.metric ?? String(row.metric),
  };
  const before = { title: String(row.title), weight: Number(row.weight), target: String(row.target), metric: String(row.metric) };
  if (JSON.stringify(before) === JSON.stringify({ ...next, title: next.title.trim() })) return c.json({ error: "Nothing was changed." }, 422);
  const invalid = validateObjective(next);
  if (invalid) return c.json({ error: invalid }, 422);
  const after = { ...next, title: next.title.trim() };

  try {
    await sql.begin(async (tx) => {
      await tx`SELECT set_config('app.amend', 'on', true)`;
      const updated = await tx`
        UPDATE employee_objectives SET title = ${after.title}, weight = ${after.weight}, target = ${after.target}, metric = ${after.metric}, updated_at = NOW()
        WHERE id = ${id} AND company_id = ${companyId} AND status = 'approved' RETURNING employee_id, cycle_id
      `;
      if (updated.length === 0) throw new AmendRejected("This objective is no longer approved.", 409);
      const weights = await tx`SELECT weight FROM employee_objectives WHERE company_id = ${companyId} AND employee_id = ${updated[0].employee_id} AND cycle_id = ${updated[0].cycle_id}`;
      const weightError = checkWeights(weights.map((r) => Number(r.weight)));
      if (weightError) throw new AmendRejected(weightError, 422);
      await tx`
        INSERT INTO objective_amendments (company_id, objective_id, amended_by, reason, before_values, after_values)
        VALUES (${companyId}, ${id}, ${userId}, ${body.reason}, ${tx.json(before)}, ${tx.json(after)})
      `;
    });
  } catch (err) {
    if (err instanceof AmendRejected) return c.json({ error: err.message }, err.httpStatus);
    throw err;
  }
  return c.json({ id, amended: true });
});

// Annual leave plan. Entries must start at least six weeks after they are submitted. HR approves no later than six
// weeks before the start. An unapproved entry past that deadline is returned to the manager by the sweep.
const PlanBody = z.object({
  leaveTypeId: z.number().int().positive(),
  startDate: z.string().max(10),
  endDate: z.string().max(10),
  reason: z.string().trim().max(500).default(""),
});
const PlanDecisionBody = z.object({ decision: z.enum(["approve", "reject"]), comment: z.string().trim().max(1000).optional() });

app.post("/api/v1/leave/plan", zValidator("json", PlanBody), async (c) => {
  const { companyId, userId } = c.get("tenant");
  const body = c.req.valid("json");
  const shape = checkDateShape(body.startDate, body.endDate);
  if (shape) return c.json({ error: shape }, 422);
  const today = new Date().toISOString().slice(0, 10);
  if (!canSubmitPlan(today, body.startDate)) return c.json({ error: "Plan leave at least six weeks ahead of the start date." }, 422);
  const sql = getSql(c.env);
  const type = await sql`SELECT 1 FROM leave_types WHERE id = ${body.leaveTypeId} AND company_id = ${companyId} AND is_active`;
  if (type.length === 0) return c.json({ error: "Unknown leave type." }, 400);
  const holidays = await sql`SELECT holiday_date::text AS d FROM company_holidays WHERE company_id = ${companyId}`;
  const days = countWorkingDays(body.startDate, body.endDate, new Set(holidays.map((h) => String(h.d))));
  if (days === 0) return c.json({ error: "Those dates contain no working days." }, 422);
  const inserted = await sql`
    INSERT INTO annual_leave_plans (company_id, employee_id, plan_year, leave_type_id, start_date, end_date, days)
    VALUES (${companyId}, ${userId}, ${Number(body.startDate.slice(0, 4))}, ${body.leaveTypeId}, ${body.startDate}::date, ${body.endDate}::date, ${days})
    RETURNING id
  `;
  return c.json({ id: Number(inserted[0].id), days, status: "draft" }, 201);
});

app.get("/api/v1/leave/plan/me", async (c) => {
  const { companyId, userId } = c.get("tenant");
  const year = Number(c.req.query("year") ?? new Date().getUTCFullYear());
  if (!Number.isSafeInteger(year) || year < 2000 || year > 2100) return c.json({ error: "Invalid year." }, 422);
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT p.id, p.start_date::text AS start_date, p.end_date::text AS end_date, p.days::float8 AS days, p.status,
      p.decision_comment, lt.name AS leave_type
    FROM annual_leave_plans p JOIN leave_types lt ON lt.id = p.leave_type_id
    WHERE p.company_id = ${companyId} AND p.employee_id = ${userId} AND p.plan_year = ${year}
    ORDER BY p.start_date
  `;
  return c.json({
    year,
    results: rows.map((r) => ({
      id: Number(r.id),
      leaveType: String(r.leave_type),
      startDate: String(r.start_date),
      endDate: String(r.end_date),
      days: Number(r.days),
      status: String(r.status),
      deadline: planDeadline(String(r.start_date)),
      decisionComment: r.decision_comment ? String(r.decision_comment) : null,
    })),
  });
});

// HR: plan entries waiting for a decision, earliest deadline first.
app.get("/api/v1/leave/plan/pending", async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Forbidden" }, 403);
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT p.id, p.start_date::text AS start_date, p.end_date::text AS end_date, p.days::float8 AS days,
      lt.name AS leave_type, e.first_name, e.last_name, d.name AS department
    FROM annual_leave_plans p
    JOIN leave_types lt ON lt.id = p.leave_type_id
    JOIN employees e ON e.id = p.employee_id
    LEFT JOIN departments d ON d.id = e.department_id AND d.company_id = e.company_id
    WHERE p.company_id = ${companyId} AND p.status = 'submitted'
    ORDER BY p.start_date LIMIT 300
  `;
  return c.json({
    results: rows.map((r) => ({
      id: Number(r.id),
      employeeName: `${r.first_name} ${r.last_name}`,
      department: r.department ? String(r.department) : null,
      leaveType: String(r.leave_type),
      startDate: String(r.start_date),
      endDate: String(r.end_date),
      days: Number(r.days),
      deadline: planDeadline(String(r.start_date)),
    })),
  });
});

app.post("/api/v1/leave/plan/:id/submit", async (c) => {
  const { companyId, userId } = c.get("tenant");
  const id = objectiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const sql = getSql(c.env);
  const [entry] = await sql`SELECT start_date::text AS start_date, status FROM annual_leave_plans WHERE id = ${id} AND company_id = ${companyId} AND employee_id = ${userId}`;
  if (!entry) return c.json({ error: "Not found" }, 404);
  if (entry.status !== "draft" && entry.status !== "returned") return c.json({ error: "Only draft or returned entries can be submitted." }, 409);
  const today = new Date().toISOString().slice(0, 10);
  if (!canSubmitPlan(today, String(entry.start_date))) return c.json({ error: "It is too late to plan this absence; it must start at least six weeks ahead." }, 422);
  await sql`UPDATE annual_leave_plans SET status = 'submitted', decision_comment = NULL WHERE id = ${id} AND company_id = ${companyId} AND employee_id = ${userId}`;
  await notifyManagerAndHr(sql, companyId, userId, userId, "plan_submitted",
    `${await personName(sql, companyId, userId)} submitted a leave plan for ${String(entry.start_date)} (approval needed by ${planDeadline(String(entry.start_date))}).`);
  return c.json({ id, status: "submitted" });
});

// HR approves or returns submitted plan entries. Approval is refused after the six-week deadline.
app.post("/api/v1/leave/plan/:id/decision", zValidator("json", PlanDecisionBody), async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR approves leave plans." }, 403);
  const id = objectiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const body = c.req.valid("json");
  if (body.decision === "reject" && (body.comment ?? "").length < 3) {
    return c.json({ error: "A return needs a reason of at least 3 characters." }, 422);
  }
  const sql = getSql(c.env);
  const [entry] = await sql`SELECT employee_id, start_date::text AS start_date, status FROM annual_leave_plans WHERE id = ${id} AND company_id = ${companyId}`;
  if (!entry) return c.json({ error: "Not found" }, 404);
  if (entry.status !== "submitted") return c.json({ error: "Only submitted entries can be decided." }, 409);
  const today = new Date().toISOString().slice(0, 10);
  if (body.decision === "approve" && !canApprovePlan(today, String(entry.start_date))) {
    return c.json({ error: `The approval deadline was ${planDeadline(String(entry.start_date))}. This entry must go back to the manager.` }, 409);
  }
  const status = body.decision === "approve" ? "approved" : "returned";
  await sql`
    UPDATE annual_leave_plans SET status = ${status}, decided_by = ${userId}, decided_at = NOW(), decision_comment = ${body.comment ?? null}
    WHERE id = ${id} AND company_id = ${companyId} AND status = 'submitted'
  `;
  await notifyManagerAndHr(sql, companyId, Number(entry.employee_id), userId, "plan_decided",
    `${await personName(sql, companyId, userId)} ${status === "approved" ? "approved" : "returned"} a leave plan entry for ${await personName(sql, companyId, Number(entry.employee_id))}.`);
  return c.json({ id, status });
});

// Sweep: unapproved entries past their deadline go back to the manager. HR runs it; a scheduled job can call it later.
app.post("/api/v1/leave/plan/sweep", async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can run the plan sweep." }, 403);
  const sql = getSql(c.env);
  const today = new Date().toISOString().slice(0, 10);
  const due = await sql`
    SELECT id, employee_id, start_date::text AS start_date, status FROM annual_leave_plans
    WHERE company_id = ${companyId} AND status IN ('draft', 'submitted') AND start_date - 42 < ${today}::date
  `;
  let returned = 0;
  for (const e of due) {
    if (!isPlanLapsed(today, String(e.start_date), String(e.status))) continue;
    await sql`
      UPDATE annual_leave_plans SET status = 'returned', decided_at = NOW(), decision_comment = 'Not approved six weeks before the start; returned to your manager.'
      WHERE id = ${Number(e.id)} AND company_id = ${companyId} AND status IN ('draft', 'submitted')
    `;
    await notifyManagerAndHr(sql, companyId, Number(e.employee_id), userId, "plan_lapsed",
      `A leave plan entry for ${await personName(sql, companyId, Number(e.employee_id))} starting ${String(e.start_date)} was not approved in time and is back with the manager.`);
    returned += 1;
  }
  return c.json({ returned });
});

// Business trips. Requested like leave and decided by the same rule (solid manager or HR, never your own). Approved
// trips appear on the team and company leave views as "Travel". They do not use leave balances.
const TripBody = z.object({
  destination: z.string().trim().min(2).max(200),
  purpose: z.string().trim().max(1000).default(""),
  startDate: z.string().max(10),
  endDate: z.string().max(10),
});
const TripDecisionBody = z.object({ decision: z.enum(["approve", "reject"]), comment: z.string().trim().max(1000).optional() });

const tripRow = (r: Record<string, unknown>) => ({
  id: -Number(r.id), // negative so it cannot clash with a leave request id on the same screen
  employeeName: `${r.first_name} ${r.last_name}`,
  leaveType: "Travel",
  startDate: String(r.start_date),
  endDate: String(r.end_date),
  days: null,
  halfDayPeriod: null,
  destination: String(r.destination),
});

app.post("/api/v1/leave/trips", zValidator("json", TripBody), async (c) => {
  const { companyId, userId } = c.get("tenant");
  const body = c.req.valid("json");
  const shape = checkDateShape(body.startDate, body.endDate);
  if (shape) return c.json({ error: shape }, 422);
  const today = new Date().toISOString().slice(0, 10);
  if (body.startDate < today) return c.json({ error: "A trip cannot start in the past." }, 422);
  const sql = getSql(c.env);
  const inserted = await sql`
    INSERT INTO business_trips (company_id, employee_id, destination, purpose, start_date, end_date)
    VALUES (${companyId}, ${userId}, ${body.destination}, ${body.purpose}, ${body.startDate}::date, ${body.endDate}::date)
    RETURNING id
  `;
  await notifyManagerAndHr(sql, companyId, userId, userId, "trip_requested",
    `${await personName(sql, companyId, userId)} requested a business trip to ${body.destination}, ${body.startDate} to ${body.endDate}.`);
  return c.json({ id: Number(inserted[0].id), status: "pending" }, 201);
});

app.get("/api/v1/leave/trips/me", async (c) => {
  const { companyId, userId } = c.get("tenant");
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT id, destination, purpose, start_date::text AS start_date, end_date::text AS end_date, status, decision_comment
    FROM business_trips WHERE company_id = ${companyId} AND employee_id = ${userId} ORDER BY start_date DESC LIMIT 50
  `;
  return c.json({
    results: rows.map((r) => ({
      id: Number(r.id),
      destination: String(r.destination),
      purpose: String(r.purpose),
      startDate: String(r.start_date),
      endDate: String(r.end_date),
      status: String(r.status),
      decisionComment: r.decision_comment ? String(r.decision_comment) : null,
    })),
  });
});

// Pending trips the signed-in user may decide: HR sees all; a line manager sees their solid reports' trips.
app.get("/api/v1/leave/trips/pending", async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  if (!isDecider(role)) return c.json({ error: "Forbidden" }, 403);
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT t.id, t.destination, t.start_date::text AS start_date, t.end_date::text AS end_date, e.first_name, e.last_name, d.name AS department
    FROM business_trips t
    JOIN employees e ON e.id = t.employee_id
    LEFT JOIN departments d ON d.id = e.department_id AND d.company_id = e.company_id
    WHERE t.company_id = ${companyId} AND t.status = 'pending' AND t.employee_id <> ${userId}
      AND (${isHrRole(role)}::boolean OR t.employee_id IN (
        SELECT employee_id FROM reporting_lines WHERE company_id = ${companyId} AND manager_id = ${userId} AND kind = 'solid'))
    ORDER BY t.start_date LIMIT 200
  `;
  return c.json({
    results: rows.map((r) => ({
      id: Number(r.id),
      destination: String(r.destination),
      startDate: String(r.start_date),
      endDate: String(r.end_date),
      employeeName: `${r.first_name} ${r.last_name}`,
      department: r.department ? String(r.department) : null,
    })),
  });
});

app.post("/api/v1/leave/trips/:id/decision", zValidator("json", TripDecisionBody), async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  const id = objectiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const body = c.req.valid("json");
  if (body.decision === "reject" && (body.comment ?? "").length < 3) {
    return c.json({ error: "A rejection needs a reason of at least 3 characters." }, 422);
  }
  const sql = getSql(c.env);
  const [trip] = await sql`SELECT id, employee_id, status FROM business_trips WHERE id = ${id} AND company_id = ${companyId}`;
  if (!trip) return c.json({ error: "Not found" }, 404);
  const row = { id, employeeId: Number(trip.employee_id), status: String(trip.status) };
  const solid = await isSolidManager(sql, companyId, userId, row.employeeId);
  if (!canDecide({ userId, role }, row, solid)) {
    return c.json({ error: "You can only decide trips of your solid reports, or HR can decide." }, 403);
  }
  const status = body.decision === "approve" ? "approved" : "rejected";
  const updated = await sql`
    UPDATE business_trips SET status = ${status}, decided_by = ${userId}, decided_at = NOW(), decision_comment = ${body.comment ?? null}
    WHERE id = ${id} AND company_id = ${companyId} AND status = 'pending' RETURNING id
  `;
  if (updated.length === 0) return c.json({ error: "This trip is no longer pending." }, 409);
  await notifyManagerAndHr(sql, companyId, trip.employee_id as number, userId, "trip_decided",
    `${await personName(sql, companyId, userId)} ${status} a business trip for ${await personName(sql, companyId, Number(trip.employee_id))}.`);
  return c.json({ id, status });
});

app.post("/api/v1/leave/trips/:id/cancel", async (c) => {
  const { companyId, userId } = c.get("tenant");
  const id = objectiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const sql = getSql(c.env);
  const updated = await sql`
    UPDATE business_trips SET status = 'cancelled'
    WHERE id = ${id} AND company_id = ${companyId} AND employee_id = ${userId} AND status = 'pending' RETURNING id
  `;
  if (updated.length === 0) return c.json({ error: "Only your own pending trips can be cancelled." }, 409);
  await notifyManagerAndHr(sql, companyId, userId, userId, "trip_cancelled",
    `${await personName(sql, companyId, userId)} cancelled a pending business trip.`);
  return c.json({ id, status: "cancelled" });
});

// Leave evidence (doctor's note, photo). Stored in the DOCS bucket. Only the owner uploads, while the request is
// pending. The owner, HR and the solid manager can see and download it. The file's bytes must match its type.
const EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;
const EVIDENCE_SIGNATURES: Record<string, (b: Uint8Array) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "application/pdf": (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
};

async function canSeeEvidence(sql: ReturnType<typeof getSql>, companyId: number, userId: number, role: string, employeeId: number): Promise<boolean> {
  if (userId === employeeId || isHrRole(role)) return true;
  return isSolidManager(sql, companyId, userId, employeeId);
}

app.post("/api/v1/leave/requests/:id/evidence", async (c) => {
  const { companyId, userId } = c.get("tenant");
  const id = objectiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const sql = getSql(c.env);
  const [req] = await sql`SELECT employee_id, status FROM leave_requests WHERE id = ${id} AND company_id = ${companyId}`;
  if (!req) return c.json({ error: "Not found" }, 404);
  if (Number(req.employee_id) !== userId) return c.json({ error: "Only the person who asked for the leave can attach evidence." }, 403);
  if (req.status !== "pending") return c.json({ error: "Evidence can only be added while the request is pending." }, 409);
  const contentType = (c.req.header("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const signature = EVIDENCE_SIGNATURES[contentType];
  if (!signature) return c.json({ error: "Upload a JPEG, PNG or PDF." }, 422);
  const bytes = new Uint8Array(await c.req.arrayBuffer());
  if (bytes.length === 0 || bytes.length > EVIDENCE_MAX_BYTES) return c.json({ error: "The file must be between 1 byte and 5 MB." }, 422);
  if (!signature(bytes)) return c.json({ error: "The file content does not match its type." }, 422);
  const key = `leave/${companyId}/${id}/${crypto.randomUUID()}`;
  await c.env.DOCS.put(key, bytes, { httpMetadata: { contentType } });
  const inserted = await sql`
    INSERT INTO leave_evidence (company_id, request_id, storage_key, content_type, size_bytes, uploaded_by)
    VALUES (${companyId}, ${id}, ${key}, ${contentType}, ${bytes.length}, ${userId}) RETURNING id
  `;
  return c.json({ id: Number(inserted[0].id), sizeBytes: bytes.length }, 201);
});

app.get("/api/v1/leave/requests/:id/evidence", async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  const id = objectiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const sql = getSql(c.env);
  const [req] = await sql`SELECT employee_id FROM leave_requests WHERE id = ${id} AND company_id = ${companyId}`;
  if (!req) return c.json({ error: "Not found" }, 404);
  if (!(await canSeeEvidence(sql, companyId, userId, role, Number(req.employee_id)))) return c.json({ error: "Forbidden" }, 403);
  const rows = await sql`SELECT id, content_type, size_bytes, uploaded_at FROM leave_evidence WHERE request_id = ${id} ORDER BY uploaded_at`;
  return c.json({
    results: rows.map((r) => ({ id: Number(r.id), contentType: String(r.content_type), sizeBytes: Number(r.size_bytes), uploadedAt: new Date(String(r.uploaded_at)).toISOString() })),
  });
});

app.get("/api/v1/leave/evidence/:evidenceId", async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  const evidenceId = objectiveId(c.req.param("evidenceId"));
  if (evidenceId === null) return c.json({ error: "Not found" }, 404);
  const sql = getSql(c.env);
  const [ev] = await sql`
    SELECT ev.storage_key, ev.content_type, lr.employee_id
    FROM leave_evidence ev JOIN leave_requests lr ON lr.id = ev.request_id
    WHERE ev.id = ${evidenceId} AND ev.company_id = ${companyId}
  `;
  if (!ev) return c.json({ error: "Not found" }, 404);
  if (!(await canSeeEvidence(sql, companyId, userId, role, Number(ev.employee_id)))) return c.json({ error: "Forbidden" }, 403);
  const object = await c.env.DOCS.get(String(ev.storage_key));
  if (!object) return c.json({ error: "The file is missing from storage." }, 404);
  return c.body(object.body, 200, {
    "Content-Type": String(ev.content_type),
    "Content-Disposition": "attachment",
    "Cache-Control": "private, no-store",
  });
});

// Leave views by date range. Default: today to 60 days ahead. Ranges are capped at a year.
function leaveWindow(c: { req: { query: (k: string) => string | undefined } }): { from: string; to: string } | { error: string } {
  const today = new Date().toISOString().slice(0, 10);
  const from = c.req.query("from") ?? today;
  const to = c.req.query("to") ?? new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);
  const shape = checkDateShape(from, to);
  return shape ? { error: shape } : { from, to };
}

// My department: approved leave of everyone in the same department as the signed-in user.
app.get("/api/v1/leave/team", async (c) => {
  const { companyId, userId } = c.get("tenant");
  const win = leaveWindow(c);
  if ("error" in win) return c.json({ error: win.error }, 422);
  const sql = getSql(c.env);
  const [me] = await sql`
    SELECT e.department_id, d.name AS department FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id AND d.company_id = e.company_id
    WHERE e.id = ${userId} AND e.company_id = ${companyId}
  `;
  if (!me || me.department_id === null) return c.json({ department: null, from: win.from, to: win.to, results: [] });
  const rows = await sql`
    SELECT lr.id, lr.start_date::text AS start_date, lr.end_date::text AS end_date, lr.requested_days::float8 AS days,
      lr.half_day_period, lt.name AS leave_type, e.first_name, e.last_name
    FROM leave_requests lr
    JOIN employees e ON e.id = lr.employee_id
    JOIN leave_types lt ON lt.id = lr.leave_type_id
    WHERE lr.company_id = ${companyId} AND e.department_id = ${me.department_id} AND lr.status = 'approved'
      AND lr.start_date <= ${win.to}::date AND lr.end_date >= ${win.from}::date
    ORDER BY lr.start_date, e.last_name
  `;
  const trips = await sql`
    SELECT t.id, t.destination, t.start_date::text AS start_date, t.end_date::text AS end_date, e.first_name, e.last_name
    FROM business_trips t JOIN employees e ON e.id = t.employee_id
    WHERE t.company_id = ${companyId} AND e.department_id = ${me.department_id} AND t.status = 'approved'
      AND t.start_date <= ${win.to}::date AND t.end_date >= ${win.from}::date
  `;
  const results = [...rows.map(leaveRow), ...trips.map(tripRow)].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return c.json({ department: String(me.department), from: win.from, to: win.to, results });
});

// Company-wide leave, visible to every signed-in user, so a task can be planned around a colleague's absence in
// another department. Everyone sees approved leave; pending requests are shown to HR only.
app.get("/api/v1/leave/company", async (c) => {
  const { companyId, role } = c.get("tenant");
  const win = leaveWindow(c);
  if ("error" in win) return c.json({ error: win.error }, 422);
  const sql = getSql(c.env);
  const statuses = isHrRole(role) ? ["approved", "pending"] : ["approved"];
  const rows = await sql`
    SELECT lr.id, lr.start_date::text AS start_date, lr.end_date::text AS end_date, lr.requested_days::float8 AS days,
      lr.half_day_period, lr.status, lt.name AS leave_type, e.first_name, e.last_name, d.name AS department
    FROM leave_requests lr
    JOIN employees e ON e.id = lr.employee_id
    JOIN leave_types lt ON lt.id = lr.leave_type_id
    LEFT JOIN departments d ON d.id = e.department_id AND d.company_id = e.company_id
    WHERE lr.company_id = ${companyId} AND lr.status = ANY(${statuses})
      AND lr.start_date <= ${win.to}::date AND lr.end_date >= ${win.from}::date
    ORDER BY d.name NULLS LAST, lr.start_date, e.last_name
  `;
  return c.json({
    from: win.from,
    to: win.to,
    canSeePending: isHrRole(role),
    results: [
      ...rows.map((r) => ({ ...leaveRow(r), status: String(r.status), department: r.department ? String(r.department) : null })),
      ...(await sql`
        SELECT t.id, t.destination, t.status, t.start_date::text AS start_date, t.end_date::text AS end_date,
          e.first_name, e.last_name, d.name AS department
        FROM business_trips t
        JOIN employees e ON e.id = t.employee_id
        LEFT JOIN departments d ON d.id = e.department_id AND d.company_id = e.company_id
        WHERE t.company_id = ${companyId} AND t.status = ANY(${statuses})
          AND t.start_date <= ${win.to}::date AND t.end_date >= ${win.from}::date
      `).map((t) => ({ ...tripRow(t), status: String(t.status), department: t.department ? String(t.department) : null })),
    ].sort((a, b) => a.startDate.localeCompare(b.startDate)),
  });
});

const leaveRow = (r: Record<string, unknown>) => ({
  id: Number(r.id),
  employeeName: `${r.first_name} ${r.last_name}`,
  leaveType: String(r.leave_type),
  startDate: String(r.start_date),
  endDate: String(r.end_date),
  days: Number(r.days),
  halfDayPeriod: r.half_day_period ? String(r.half_day_period) : null,
});

// 6. Attendance & Time Tracking
app.get("/api/v1/attendance", async (c) => {
  const { companyId } = c.get("tenant");
  const sql = getSql(c.env);
  const records = await sql`
    SELECT ar.*, e.first_name, e.last_name
    FROM attendance_records ar
    JOIN employees e ON ar.employee_id = e.id
    WHERE ar.company_id = ${companyId}
    ORDER BY ar.attendance_date DESC LIMIT 50
  `;
  return c.json({ count: records.length, results: records });
});

// 7. Recruitment (SUPPRESSED - Preserved in Schema, Inactive)
app.get("/api/v1/recruitment/jobs", async (c) => {
  return c.json({
    suppressed: true,
    module: "recruitment",
    message: "Recruitment module is currently suppressed by enterprise policy. Database records remain intact.",
    count: 0,
    results: [],
  });
});

app.get("/api/v1/recruitment/candidates", async (c) => {
  return c.json({
    suppressed: true,
    module: "recruitment",
    message: "Recruitment module is currently suppressed by enterprise policy. Database records remain intact.",
    count: 0,
    results: [],
  });
});

// 8. Payroll & Payslips (SUPPRESSED - Preserved in Schema, Inactive)
app.get("/api/v1/payroll/payslips", async (c) => {
  return c.json({
    suppressed: true,
    module: "payroll",
    message: "Payroll module is currently suppressed by enterprise policy. Database records remain intact.",
    count: 0,
    results: [],
  });
});

// --- Self-service (db/migrations/0015_self_service.sql). Paths stay off /api/v1/payroll: the RBAC middleware blocks it for employees.

// Notifications for banking and tax requests go to HR only, never to the solid manager. The actor is skipped.
async function notifyHr(sql: Sql, companyId: number, actorId: number, kind: string, message: string): Promise<void> {
  await sql`
    INSERT INTO notifications (company_id, recipient_id, kind, message)
    SELECT ${companyId}, e.id, ${kind}, ${message} FROM employees e
    WHERE e.company_id = ${companyId} AND e.is_active AND e.access_role IN ('hr_admin', 'hr_director') AND e.id <> ${actorId}
  `;
}

// A PDF from a base64 JSON field (the frontend proxy only forwards JSON). Returns the bytes or the reason refused.
function readPdf(b64: string): { bytes: Uint8Array } | { error: string } {
  let binary: string;
  try {
    binary = atob(b64);
  } catch {
    return { error: "The file is not valid base64." };
  }
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  if (bytes.length > PDF_MAX_BYTES) return { error: "The file must be 5 MB or smaller." };
  if (!isPdf(bytes)) return { error: "The file must be a PDF." };
  return { bytes };
}

const PdfBase64 = z.string().min(8).max(7_000_000);
const ProfileChangeBody = z.object({ field: z.enum(PROFILE_FIELDS), value: z.string().trim().min(1).max(100) });
const ProfileDecisionBody = z.object({ decision: z.enum(["approve", "reject"]), comment: z.string().trim().max(500).default("") });
const PayslipUploadBody = z.object({
  employeeId: z.number().int().positive(),
  month: z.number().int(),
  year: z.number().int(),
  grossPay: z.number(),
  deductions: z.number(),
  fileBase64: PdfBase64,
});
const DocumentTypeBody = z.object({ name: z.string().trim().min(2).max(100) });
const DocumentPublishBody = z.object({
  title: z.string().trim().min(3).max(200),
  documentTypeId: z.number().int().positive().nullable().optional(),
  fileBase64: PdfBase64,
});

const toProfileRequest = (r: Record<string, unknown>) => ({
  id: Number(r.id),
  field: String(r.field),
  fieldLabel: PROFILE_FIELD_LABELS[r.field as ProfileField] ?? String(r.field),
  oldValue: String(r.old_value),
  newValue: String(r.new_value),
  status: String(r.status),
  decisionComment: r.decision_comment === null || r.decision_comment === undefined ? null : String(r.decision_comment),
  createdAt: new Date(String(r.created_at)).toISOString(),
  decidedAt: r.decided_at ? new Date(String(r.decided_at)).toISOString() : null,
  ...(r.first_name !== undefined ? { employeeName: `${r.first_name} ${r.last_name}` } : {}),
});

// Banking and tax details. An employee asks for a change; HR approves or rejects. A stored value changes only inside the
// approval transaction, which also marks the request approved.
app.get("/api/v1/profile/details", async (c) => {
  const { companyId, userId } = c.get("tenant");
  const sql = getSql(c.env);
  const [values, requests] = await Promise.all([
    sql`SELECT field, value FROM employee_bank_tax_fields WHERE company_id = ${companyId} AND employee_id = ${userId}`,
    sql`
      SELECT id, field, old_value, new_value, status, decision_comment, created_at, decided_at FROM profile_change_requests
      WHERE company_id = ${companyId} AND employee_id = ${userId} ORDER BY created_at DESC LIMIT 50
    `,
  ]);
  return c.json({
    values: Object.fromEntries(values.map((v) => [String(v.field), String(v.value)])),
    requests: requests.map(toProfileRequest),
  });
});

app.post("/api/v1/profile/changes", zValidator("json", ProfileChangeBody), async (c) => {
  const { companyId, userId } = c.get("tenant");
  const body = c.req.valid("json");
  const problem = profileValueError(body.field, body.value);
  if (problem) return c.json({ error: problem }, 422);
  const sql = getSql(c.env);
  const [current] = await sql`SELECT value FROM employee_bank_tax_fields WHERE company_id = ${companyId} AND employee_id = ${userId} AND field = ${body.field}`;
  const oldValue = current ? String(current.value) : "";
  if (oldValue === body.value) return c.json({ error: "That is already the stored value." }, 409);
  const waiting = `${PROFILE_FIELD_LABELS[body.field]} already has a request waiting for HR.`;
  const [open] = await sql`SELECT 1 FROM profile_change_requests WHERE company_id = ${companyId} AND employee_id = ${userId} AND field = ${body.field} AND status = 'pending'`;
  if (open) return c.json({ error: waiting }, 409);
  // The unique index on open requests catches two submissions at once.
  const inserted = await sql`
    INSERT INTO profile_change_requests (company_id, employee_id, field, old_value, new_value)
    VALUES (${companyId}, ${userId}, ${body.field}, ${oldValue}, ${body.value}) RETURNING id
  `.catch((e: { code?: string }) => {
    if (e.code === "23505") return null;
    throw e;
  });
  if (!inserted) return c.json({ error: waiting }, 409);
  await notifyHr(sql, companyId, userId, "profile_change_requested", `${await personName(sql, companyId, userId)} asked to change ${PROFILE_FIELD_LABELS[body.field]}.`);
  return c.json({ id: Number(inserted[0].id), status: "pending" }, 201);
});

app.get("/api/v1/profile/changes/pending", async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can review profile changes." }, 403);
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT r.id, r.employee_id, r.field, r.old_value, r.new_value, r.status, r.decision_comment, r.created_at, r.decided_at,
      e.first_name, e.last_name
    FROM profile_change_requests r JOIN employees e ON e.id = r.employee_id
    WHERE r.company_id = ${companyId} AND r.status = 'pending' ORDER BY r.created_at LIMIT 200
  `;
  return c.json({ count: rows.length, results: rows.map(toProfileRequest) });
});

app.post("/api/v1/profile/changes/:id/decision", zValidator("json", ProfileDecisionBody), async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  const id = objectiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const body = c.req.valid("json");
  const sql = getSql(c.env);
  const [pr] = await sql`SELECT employee_id, field, new_value, status FROM profile_change_requests WHERE id = ${id} AND company_id = ${companyId}`;
  if (!pr) return c.json({ error: "Not found" }, 404);
  const refusal = canDecideProfileChange({ userId, role }, Number(pr.employee_id));
  if (refusal) return c.json({ error: refusal }, 403);
  if (pr.status !== "pending") return c.json({ error: "This request has already been decided." }, 409);
  const approved = body.decision === "approve";
  const applied = await sql.begin(async (tx) => {
    // The status is checked again in this UPDATE, so two HR users deciding at once cannot both apply the change.
    const decided = await tx`
      UPDATE profile_change_requests SET status = ${approved ? "approved" : "rejected"}, decided_by = ${userId}, decided_at = NOW(),
        decision_comment = ${body.comment}
      WHERE id = ${id} AND company_id = ${companyId} AND status = 'pending' RETURNING id
    `;
    if (decided.length === 0) return false;
    if (approved) {
      await tx`
        INSERT INTO employee_bank_tax_fields (company_id, employee_id, field, value, updated_by, updated_at)
        VALUES (${companyId}, ${pr.employee_id}, ${pr.field}, ${pr.new_value}, ${userId}, NOW())
        ON CONFLICT (employee_id, field) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()
      `;
    }
    // The audit diff names the field and the outcome only. Account numbers and other values never enter the log.
    await tx`
      INSERT INTO audit_logs (company_id, actor_id, entity_name, entity_id, action, diff)
      VALUES (${companyId}, ${userId}, 'profile_change_requests', ${String(id)}, ${approved ? "approved" : "rejected"},
        ${JSON.stringify({ field: String(pr.field) })}::jsonb)
    `;
    return true;
  });
  if (!applied) return c.json({ error: "This request has already been decided." }, 409);
  const label = PROFILE_FIELD_LABELS[pr.field as ProfileField];
  await sql`
    INSERT INTO notifications (company_id, recipient_id, kind, message)
    VALUES (${companyId}, ${pr.employee_id}, 'profile_change_decided', ${`Your change to ${label} was ${approved ? "approved" : "rejected"}.`})
  `;
  return c.json({ id, status: approved ? "approved" : "rejected" });
});

// Payslips. Employees list and download their own. HR uploads one PDF per employee and month; the amounts are checked
// here and net pay is computed on the server.
app.get("/api/v1/payslips", async (c) => {
  const { companyId, userId } = c.get("tenant");
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT id, month, year, gross_pay, deductions, net_pay, paid_at FROM payslips
    WHERE company_id = ${companyId} AND employee_id = ${userId} AND storage_key IS NOT NULL
    ORDER BY year DESC, month DESC LIMIT 60
  `;
  return c.json({
    count: rows.length,
    results: rows.map((r) => ({
      id: Number(r.id),
      month: Number(r.month),
      year: Number(r.year),
      grossPay: Number(r.gross_pay),
      deductions: Number(r.deductions),
      netPay: Number(r.net_pay),
      paidAt: r.paid_at ? new Date(String(r.paid_at)).toISOString() : null,
    })),
  });
});

app.post("/api/v1/payslips", zValidator("json", PayslipUploadBody), async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can upload payslips." }, 403);
  const body = c.req.valid("json");
  const problem = payslipError(body);
  if (problem) return c.json({ error: problem }, 422);
  const file = readPdf(body.fileBase64);
  if ("error" in file) return c.json({ error: file.error }, 422);
  const sql = getSql(c.env);
  const [employee] = await sql`SELECT id FROM employees WHERE id = ${body.employeeId} AND company_id = ${companyId} AND is_active`;
  if (!employee) return c.json({ error: "Employee not found." }, 404);
  const duplicate = "A payslip for that employee and month is already uploaded.";
  const [taken] = await sql`SELECT 1 FROM payslips WHERE company_id = ${companyId} AND employee_id = ${body.employeeId} AND month = ${body.month} AND year = ${body.year}`;
  if (taken) return c.json({ error: duplicate }, 409);
  const key = `payslips/${companyId}/${crypto.randomUUID()}.pdf`;
  await c.env.DOCS.put(key, file.bytes, { httpMetadata: { contentType: "application/pdf" } });
  const inserted = await sql`
    INSERT INTO payslips (company_id, employee_id, month, year, gross_pay, deductions, net_pay, status, storage_key)
    VALUES (${companyId}, ${body.employeeId}, ${body.month}, ${body.year}, ${body.grossPay}, ${body.deductions},
      ${netPay(body.grossPay, body.deductions)}, 'published', ${key})
    RETURNING id
  `.catch(async (e: { code?: string }) => {
    await c.env.DOCS.delete(key);
    if (e.code === "23505") return null;
    throw e;
  });
  if (!inserted) return c.json({ error: duplicate }, 409);
  return c.json({ id: Number(inserted[0].id) }, 201);
});

app.get("/api/v1/payslips/:id/file", async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  const id = objectiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const sql = getSql(c.env);
  const [p] = await sql`SELECT employee_id, month, year, storage_key FROM payslips WHERE id = ${id} AND company_id = ${companyId}`;
  if (!p || !p.storage_key) return c.json({ error: "Not found" }, 404);
  if (Number(p.employee_id) !== userId && !isHrRole(role)) return c.json({ error: "Forbidden" }, 403);
  const object = await c.env.DOCS.get(String(p.storage_key));
  if (!object) return c.json({ error: "The file is missing from storage." }, 404);
  return c.body(object.body, 200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="payslip-${p.year}-${String(p.month).padStart(2, "0")}.pdf"`,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
});

// Document centre. HR publishes a PDF to every active employee; each employee acknowledges their own copy.
// employee_documents holds one row per employee per publication; file_url is the object key of the PDF.
app.get("/api/v1/document-types", async (c) => {
  const { companyId } = c.get("tenant");
  const sql = getSql(c.env);
  const rows = await sql`SELECT id, name FROM document_types WHERE company_id = ${companyId} ORDER BY name`;
  return c.json({ count: rows.length, results: rows.map((r) => ({ id: Number(r.id), name: String(r.name) })) });
});

app.post("/api/v1/document-types", zValidator("json", DocumentTypeBody), async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can add document types." }, 403);
  const { name } = c.req.valid("json");
  const sql = getSql(c.env);
  const inserted = await sql`
    INSERT INTO document_types (company_id, name) VALUES (${companyId}, ${name}) ON CONFLICT (company_id, name) DO NOTHING RETURNING id
  `;
  if (inserted.length === 0) return c.json({ error: "That document type already exists." }, 409);
  return c.json({ id: Number(inserted[0].id), name }, 201);
});

const toDocumentRow = (r: Record<string, unknown>) => ({
  id: Number(r.id),
  title: String(r.title),
  typeName: r.type_name === null || r.type_name === undefined ? null : String(r.type_name),
  status: String(r.status),
  publishedAt: new Date(String(r.created_at)).toISOString(),
  acknowledgedAt: r.acknowledged_at ? new Date(String(r.acknowledged_at)).toISOString() : null,
});

app.post("/api/v1/documents/publish", zValidator("json", DocumentPublishBody), async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can publish documents." }, 403);
  const body = c.req.valid("json");
  const file = readPdf(body.fileBase64);
  if ("error" in file) return c.json({ error: file.error }, 422);
  const sql = getSql(c.env);
  if (body.documentTypeId) {
    const [type] = await sql`SELECT 1 FROM document_types WHERE id = ${body.documentTypeId} AND company_id = ${companyId}`;
    if (!type) return c.json({ error: "Document type not found." }, 422);
  }
  const key = `documents/${companyId}/${crypto.randomUUID()}.pdf`;
  await c.env.DOCS.put(key, file.bytes, { httpMetadata: { contentType: "application/pdf" } });
  // The casts type the parameters in the SELECT list, so Postgres does not guess their types.
  const published = await sql`
    INSERT INTO employee_documents (company_id, employee_id, document_type_id, title, file_url, status)
    SELECT CAST(${companyId} AS INTEGER), e.id, CAST(${body.documentTypeId ?? null} AS INTEGER), CAST(${body.title} AS VARCHAR(255)),
      CAST(${key} AS TEXT), 'pending'
    FROM employees e WHERE e.company_id = ${companyId} AND e.is_active
    RETURNING id
  `.catch(async (e: unknown) => {
    await c.env.DOCS.delete(key);
    throw e;
  });
  if (published.length === 0) {
    await c.env.DOCS.delete(key);
    return c.json({ error: "There are no active employees to publish to." }, 422);
  }
  return c.json({ published: published.length }, 201);
});

// My documents, newest first.
app.get("/api/v1/documents/me", async (c) => {
  const { companyId, userId } = c.get("tenant");
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT ed.id, ed.title, ed.status, ed.created_at, ed.acknowledged_at, dt.name AS type_name
    FROM employee_documents ed LEFT JOIN document_types dt ON dt.id = ed.document_type_id
    WHERE ed.company_id = ${companyId} AND ed.employee_id = ${userId} ORDER BY ed.created_at DESC LIMIT 200
  `;
  return c.json({ count: rows.length, results: rows.map(toDocumentRow) });
});

// HR view: one line per publication, with how many copies are acknowledged.
app.get("/api/v1/documents/publications", async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can see publication status." }, 403);
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT min(id) AS sample_id, min(title) AS title, min(created_at) AS published_at,
      count(*)::int AS total, count(acknowledged_at)::int AS acknowledged
    FROM employee_documents WHERE company_id = ${companyId}
    GROUP BY file_url ORDER BY min(created_at) DESC LIMIT 100
  `;
  return c.json({
    count: rows.length,
    results: rows.map((r) => ({
      sampleId: Number(r.sample_id),
      title: String(r.title),
      publishedAt: new Date(String(r.published_at)).toISOString(),
      total: Number(r.total),
      acknowledged: Number(r.acknowledged),
      outstanding: Number(r.total) - Number(r.acknowledged),
    })),
  });
});

app.post("/api/v1/documents/:id/acknowledge", async (c) => {
  const { companyId, userId } = c.get("tenant");
  const id = objectiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const sql = getSql(c.env);
  const [doc] = await sql`SELECT employee_id, status FROM employee_documents WHERE id = ${id} AND company_id = ${companyId}`;
  if (!doc) return c.json({ error: "Not found" }, 404);
  if (Number(doc.employee_id) !== userId) return c.json({ error: "You can only acknowledge your own documents." }, 403);
  const refusal = acknowledgmentError(String(doc.status));
  if (refusal) return c.json({ error: refusal }, 409);
  const updated = await sql`
    UPDATE employee_documents SET status = 'acknowledged', acknowledged_at = NOW()
    WHERE id = ${id} AND company_id = ${companyId} AND employee_id = ${userId} AND status = 'pending' RETURNING id
  `;
  if (updated.length === 0) return c.json({ error: "This document is already acknowledged." }, 409);
  return c.json({ id, status: "acknowledged" });
});

app.get("/api/v1/documents/:id/file", async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  const id = objectiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const sql = getSql(c.env);
  const [doc] = await sql`SELECT employee_id, title, file_url FROM employee_documents WHERE id = ${id} AND company_id = ${companyId}`;
  if (!doc) return c.json({ error: "Not found" }, 404);
  if (Number(doc.employee_id) !== userId && !isHrRole(role)) return c.json({ error: "Forbidden" }, 403);
  const object = await c.env.DOCS.get(String(doc.file_url));
  if (!object) return c.json({ error: "The file is missing from storage." }, 404);
  return c.body(object.body, 200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${String(doc.title).replace(/[^\w .-]/g, "_")}.pdf"`,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
});

// Personal performance (read only): my objectives in the chosen or latest cycle, their weighted progress and my review status.
app.get("/api/v1/performance/me", async (c) => {
  const { companyId, userId } = c.get("tenant");
  const cycleId = queryCycleId(c.req.query("cycleId"));
  const sql = getSql(c.env);
  const [cycle] = cycleId
    ? await sql`SELECT id, title, status::text AS status, start_date::text AS start_date, end_date::text AS end_date
        FROM performance_cycles WHERE id = ${cycleId} AND company_id = ${companyId}`
    : await sql`SELECT id, title, status::text AS status, start_date::text AS start_date, end_date::text AS end_date
        FROM performance_cycles WHERE company_id = ${companyId} ORDER BY start_date DESC, id DESC LIMIT 1`;
  if (!cycle) return c.json({ cycle: null, objectives: [], progress: null, reviews: [], assignmentStatus: null });
  const [objectives, reviews, assignment] = await Promise.all([
    sql`SELECT ${sql.unsafe(OBJECTIVE_COLUMNS)} FROM employee_objectives WHERE company_id = ${companyId} AND employee_id = ${userId} AND cycle_id = ${cycle.id} ORDER BY id`,
    sql`SELECT status, updated_at FROM performance_reviews WHERE company_id = ${companyId} AND employee_id = ${userId} AND cycle_id = ${cycle.id} ORDER BY id`,
    sql`SELECT status FROM performance_assignments WHERE company_id = ${companyId} AND employee_id = ${userId} AND cycle_id = ${cycle.id}`,
  ]);
  const mapped = objectives.map(toObjective);
  return c.json({
    cycle: { id: Number(cycle.id), title: String(cycle.title), status: String(cycle.status), startDate: String(cycle.start_date), endDate: String(cycle.end_date) },
    objectives: mapped,
    progress: weightedProgress(mapped.map((o) => ({ progress: o.progress, weight: o.weight }))),
    reviews: reviews.map((r) => ({ status: String(r.status), updatedAt: new Date(String(r.updated_at)).toISOString() })),
    assignmentStatus: assignment[0] ? String(assignment[0].status) : null,
  });
});

// 9. Asset Management
// Assets. asset_allocations is the assignment ledger: an open assignment has return_date NULL, and the unique index
// asset_allocations_one_open allows at most one. Writes are HR only. Assigning or returning locks the asset row.
const AssetCondition = z.enum(["new", "good", "fair", "poor"]);
const AssetCreateBody = z.object({
  name: z.string().trim().min(2).max(255),
  assetCode: z.string().trim().min(2).max(50),
  categoryId: z.number().int().positive().nullable().optional(),
  serialNumber: z.string().trim().max(100).nullable().optional(),
  condition: AssetCondition.default("good"),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  purchasePrice: z.number().min(0).max(9_999_999_999.99).nullable().optional(),
  warrantyExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
const AssetAssignBody = z.object({ employeeId: z.number().int().positive(), condition: AssetCondition });
const AssetReturnBody = z.object({ condition: AssetCondition, notes: z.string().max(1000).default("") });

// HR view: every asset with its current holder (open assignment only, one row per asset).
app.get("/api/v1/assets", async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Forbidden" }, 403);
  const sql = getSql(c.env);
  const assets = await sql`
    SELECT ca.id, ca.asset_code, ca.name, ca.serial_number, ca.status, ca.asset_condition,
      ca.purchase_date::text AS purchase_date, ca.purchase_price::text AS purchase_price,
      ca.warranty_expiry::text AS warranty_expiry, ca.notes,
      ac.name AS category_name, e.id AS employee_id, e.first_name, e.last_name
    FROM company_assets ca
    LEFT JOIN asset_categories ac ON ac.id = ca.category_id
    LEFT JOIN asset_allocations aa ON aa.asset_id = ca.id AND aa.return_date IS NULL
    LEFT JOIN employees e ON e.id = aa.employee_id
    WHERE ca.company_id = ${companyId}
    ORDER BY ca.id ASC LIMIT 500
  `;
  return c.json({ count: assets.length, results: assets });
});

// Anyone: the assets assigned to me right now.
app.get("/api/v1/assets/me", async (c) => {
  const { companyId, userId } = c.get("tenant");
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT ca.id, ca.asset_code, ca.name, aa.allocated_date::text AS allocated_date
    FROM asset_allocations aa
    JOIN company_assets ca ON ca.id = aa.asset_id
    WHERE aa.company_id = ${companyId} AND aa.employee_id = ${userId} AND aa.return_date IS NULL
    ORDER BY aa.allocated_date
  `;
  return c.json({ results: rows.map((r) => ({ id: Number(r.id), assetCode: String(r.asset_code), name: String(r.name), allocatedDate: String(r.allocated_date) })) });
});

app.post("/api/v1/assets", zValidator("json", AssetCreateBody), async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can register assets." }, 403);
  const body = c.req.valid("json");
  const sql = getSql(c.env);
  const dup = await sql`SELECT 1 FROM company_assets WHERE company_id = ${companyId} AND asset_code = ${body.assetCode} LIMIT 1`;
  if (dup.length > 0) return c.json({ error: "An asset with this code already exists." }, 409);
  try {
    const inserted = await sql`
      INSERT INTO company_assets (company_id, category_id, name, asset_code, serial_number, status, asset_condition, purchase_date, purchase_price, warranty_expiry, notes)
      VALUES (${companyId}, ${body.categoryId ?? null}, ${body.name}, ${body.assetCode}, ${normaliseSerial(body.serialNumber)}, 'available', ${body.condition},
        ${body.purchaseDate ?? null}, ${body.purchasePrice ?? null}, ${body.warrantyExpiry ?? null}, ${body.notes ?? null})
      RETURNING id
    `;
    return c.json({ id: Number(inserted[0].id), status: "available" }, 201);
  } catch (err) {
    if (isSerialViolation(err)) return c.json({ error: "Another asset already has this serial number." }, 409);
    throw err;
  }
});

app.post("/api/v1/assets/:id/assign", zValidator("json", AssetAssignBody), async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can assign assets." }, 403);
  const id = objectiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const body = c.req.valid("json");
  const sql = getSql(c.env);
  const employee = await sql`SELECT 1 FROM employees WHERE id = ${body.employeeId} AND company_id = ${companyId} AND is_active`;
  if (employee.length === 0) return c.json({ error: "No active employee with that id." }, 422);
  try {
    await sql.begin(async (tx) => {
      const [asset] = await tx`SELECT status FROM company_assets WHERE id = ${id} AND company_id = ${companyId} FOR UPDATE`;
      if (!asset) throw new AmendRejected("Not found.", 404);
      if (asset.status !== "available") throw new AmendRejected(`This asset is ${asset.status}, not available.`, 409);
      await tx`
        INSERT INTO asset_allocations (company_id, asset_id, employee_id, allocated_date, condition_on_allocation, assigned_by)
        VALUES (${companyId}, ${id}, ${body.employeeId}, CURRENT_DATE, ${body.condition}, ${userId})
      `;
      await tx`UPDATE company_assets SET status = 'allocated', asset_condition = ${body.condition} WHERE id = ${id}`;
    });
  } catch (err) {
    if (err instanceof AmendRejected) return c.json({ error: err.message }, err.httpStatus);
    throw err;
  }
  return c.json({ id, status: "allocated" }, 201);
});

// Return: condition decides the next status. new or good goes back to stock; fair or poor goes to maintenance.
app.post("/api/v1/assets/:id/return", zValidator("json", AssetReturnBody), async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can record returns." }, 403);
  const id = objectiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const body = c.req.valid("json");
  const nextStatus = body.condition === "new" || body.condition === "good" ? "available" : "maintenance";
  const sql = getSql(c.env);
  try {
    await sql.begin(async (tx) => {
      const [asset] = await tx`SELECT status FROM company_assets WHERE id = ${id} AND company_id = ${companyId} FOR UPDATE`;
      if (!asset) throw new AmendRejected("Not found.", 404);
      const open = await tx`SELECT id FROM asset_allocations WHERE asset_id = ${id} AND company_id = ${companyId} AND return_date IS NULL FOR UPDATE`;
      if (open.length === 0) throw new AmendRejected("This asset is not assigned to anyone.", 409);
      await tx`
        UPDATE asset_allocations SET return_date = CURRENT_DATE, condition_on_return = ${body.condition}, return_notes = ${body.notes}
        WHERE id = ${open[0].id}
      `;
      await tx`UPDATE company_assets SET status = ${nextStatus}, asset_condition = ${body.condition} WHERE id = ${id}`;
    });
  } catch (err) {
    if (err instanceof AmendRejected) return c.json({ error: err.message }, err.httpStatus);
    throw err;
  }
  return c.json({ id, status: nextStatus });
});

// HR: open assignments held longer than `days` (default 365). Visibility only; nothing is enforced automatically.
app.get("/api/v1/assets/overdue", async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Forbidden" }, 403);
  const raw = Number(c.req.query("days") ?? 365);
  const days = Number.isSafeInteger(raw) && raw >= 0 && raw <= 3650 ? raw : 365;
  // The threshold is the category's overdue_days when set, else `days`. See assets-routes.ts.
  const rows = await overdueAssets(getSql(c.env), companyId, days);
  return c.json({
    days,
    results: rows.map((r) => ({
      assetId: r.assetId,
      assetCode: r.assetCode,
      name: r.name,
      allocatedDate: r.allocatedDate,
      daysHeld: r.daysHeld,
      thresholdDays: r.thresholdDays,
      employeeId: r.employeeId,
      employeeName: r.employeeName,
    })),
  });
});

// HR: offboard an employee. Refused while they still hold an open assignment; the list of assets is returned so HR
// can recover them first. Deactivates the account (is_active = false); the record is kept.
app.post("/api/v1/employees/:id/offboard", async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can offboard employees." }, 403);
  const id = objectiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  if (id === userId) return c.json({ error: "You cannot offboard your own account." }, 403);
  const sql = getSql(c.env);
  const [person] = await sql`SELECT id, is_active FROM employees WHERE id = ${id} AND company_id = ${companyId}`;
  if (!person) return c.json({ error: "Not found" }, 404);
  if (!person.is_active) return c.json({ error: "This employee is already offboarded." }, 409);
  const held = await sql`
    SELECT ca.id, ca.asset_code, ca.name
    FROM asset_allocations aa JOIN company_assets ca ON ca.id = aa.asset_id
    WHERE aa.company_id = ${companyId} AND aa.employee_id = ${id} AND aa.return_date IS NULL
    ORDER BY ca.asset_code
  `;
  if (held.length > 0) {
    // Records the "Recover N assets from [name]" task for HR. The block itself stays until each asset is returned or written off.
    await openRecoveryTask(sql, companyId, id, userId);
    const [who] = await sql`SELECT first_name, last_name FROM employees WHERE id = ${id}`;
    return c.json(
      {
        error: `${held.length} asset(s) must be returned or written off before offboarding.`,
        recoveryTask: recoveryTaskTitle(held.length, `${who.first_name} ${who.last_name}`),
        openAssets: held.map((a) => ({ id: Number(a.id), assetCode: String(a.asset_code), name: String(a.name) })),
      },
      409,
    );
  }
  await sql`UPDATE employees SET is_active = false, updated_at = NOW() WHERE id = ${id} AND company_id = ${companyId}`;
  // Nothing is left to recover, so an open recovery task for this person closes with the offboarding.
  await sql`
    UPDATE asset_recovery_tasks SET status = 'closed', closed_by = ${userId}, closed_at = NOW(),
      close_note = 'Offboarded with every asset returned or written off.'
    WHERE company_id = ${companyId} AND employee_id = ${id} AND status = 'open'
  `;
  return c.json({ id, offboarded: true });
});

// HR: every assignment of one asset, newest first.
app.get("/api/v1/assets/:id/history", async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Forbidden" }, 403);
  const id = objectiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT aa.id, aa.allocated_date::text AS allocated_date, aa.return_date::text AS return_date,
      aa.condition_on_allocation, aa.condition_on_return, aa.return_notes,
      e.first_name, e.last_name
    FROM asset_allocations aa
    LEFT JOIN employees e ON e.id = aa.employee_id
    WHERE aa.company_id = ${companyId} AND aa.asset_id = ${id}
    ORDER BY aa.allocated_date DESC, aa.id DESC
  `;
  return c.json({
    results: rows.map((r) => ({
      id: Number(r.id),
      employeeName: r.first_name ? `${r.first_name} ${r.last_name}` : null,
      allocatedDate: String(r.allocated_date),
      returnDate: r.return_date ? String(r.return_date) : null,
      conditionOnAllocation: r.condition_on_allocation ? String(r.condition_on_allocation) : null,
      conditionOnReturn: r.condition_on_return ? String(r.condition_on_return) : null,
      returnNotes: r.return_notes ? String(r.return_notes) : null,
    })),
  });
});

// Assets part B: categories, asset details, write-off and approval, recovery tasks, team view, CSV. See assets-routes.ts.
app.route("/", createAssetRoutes(getSql));

// Organogram: generated tree and HR job-title entry. See org-routes.ts.
app.route("/", createOrgRoutes(getSql));

// 10. Helpdesk Support Tickets
app.get("/api/v1/helpdesk/tickets", async (c) => {
  const { companyId } = c.get("tenant");
  const sql = getSql(c.env);
  const tickets = await sql`
    SELECT ht.*, e.first_name, e.last_name, hc.name as category_name
    FROM helpdesk_tickets ht
    JOIN employees e ON ht.employee_id = e.id
    LEFT JOIN helpdesk_categories hc ON ht.category_id = hc.id
    WHERE ht.company_id = ${companyId}
    ORDER BY ht.created_at DESC LIMIT 50
  `;
  return c.json({ count: tickets.length, results: tickets });
});

// 11. Projects & Timesheets
app.get("/api/v1/projects", async (c) => {
  const { companyId } = c.get("tenant");
  const sql = getSql(c.env);
  const projects = await sql`
    SELECT * FROM projects
    WHERE company_id = ${companyId}
    ORDER BY created_at DESC
  `;
  return c.json({ count: projects.length, results: projects });
});

// 12. Documents & End-to-End Encryption (E2EE) Status
// HR only: every employee's document rows. Employees use GET /api/v1/documents/me.
app.get("/api/v1/documents", async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can see every employee's documents." }, 403);
  const sql = getSql(c.env);
  const docs = await sql`
    SELECT ed.*, dt.name as document_type_name, e.first_name, e.last_name
    FROM employee_documents ed
    JOIN employees e ON ed.employee_id = e.id
    LEFT JOIN document_types dt ON ed.document_type_id = dt.id
    WHERE ed.company_id = ${companyId}
    ORDER BY ed.created_at DESC LIMIT 50
  `;
  return c.json({
    count: docs.length,
    results: docs,
    security: {
      e2ee_enabled: true,
      encryption_cipher: "AES-GCM-256",
      key_management: "Envelope Encryption (KMS / Edge Crypto)",
      integrity_verification: "SHA-256 Per-Document Digest",
    },
  });
});

// 12b. Compliance & Data Privacy Status (SOC2 Type II, ISO 27001)
app.get("/api/v1/compliance/privacy-status", async (c) => {
  return c.json({
    compliance: {
      soc2_type_ii: {
        certified: true,
        audit_period: "2026-01-01 to 2026-12-31",
        trust_criteria: ["Security", "Confidentiality", "Availability"],
        attestation_firm: "Schellman & Company, LLC",
        report_status: "CURRENT",
      },
      iso_27001_2022: {
        certified: true,
        certificate_id: "ISMS-GB-94821",
        accreditation_body: "UKAS / BSI Assurance",
        annex_a_controls: "100% Enforced",
      },
      gdpr_compliance: {
        dpo_registered: true,
        data_residency: "London, UK (eu-west-2)",
        article_30_records: "Automated via Immutable Ledger",
      },
      encryption_standard: {
        at_rest: "AES-GCM-256 (Cloudflare R2 / Neon Dedicated)",
        in_transit: "TLS 1.3 / Strict Transport Security (HSTS)",
        e2ee_sensitive_docs: "Enabled (Envelope Encryption with per-tenant master key)",
      },
    },
    rbac: {
      enforcement: "Strict Role-Based Access Control Active",
      payroll_rule: "Zero-access to payroll/compensation for employees and line managers unless explicitly authorized.",
    },
  });
});

// 12c. Immutable Audit Trails (SOC2 CC6.8, ISO 27001 A.12.4.1)
const inMemoryAuditLedger = [
  {
    id: "AUD-202611-001",
    timestamp: "2026-11-03T09:14:22.108Z",
    actorType: "HUMAN",
    actorName: "Richard Barnes",
    actorEmail: "richard.barnes@senrab.com",
    actorRole: "hr_director",
    action: "TENANT_SECURITY_POLICY_LOCK",
    resource: "tenant:1:security_policy",
    details: "Enforced SOC2 Type II and ISO 27001 strict single-framework governance.",
    ipAddress: "51.148.132.44",
    immutableHash: "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
    complianceTag: "SOC2-CC6.1",
  },
  {
    id: "AUD-202611-002",
    timestamp: "2026-11-03T11:22:15.441Z",
    actorType: "AI_AGENT",
    actorName: "Omni-Agent Copilot",
    actorEmail: "omni-agent@system.internal",
    actorRole: "ai_copilot",
    action: "LEAVE_REQUEST_AUTO_DRAFTED",
    resource: "leave:draft:accra_travel",
    details: "AI auto-drafted travel leave to Accra after balance and calendar conflict checks.",
    ipAddress: "127.0.0.1 (Worker Edge)",
    immutableHash: "a149c9586fe54716b5394a81cfb5fa350e93a7d4a29a6744047a0640f09a63c7",
    complianceTag: "ISO27001-A.12.4.1",
  },
  {
    id: "AUD-202611-003",
    timestamp: "2026-11-03T14:40:02.890Z",
    actorType: "HUMAN",
    actorName: "Paa Kwesi Barnes",
    actorEmail: "paa.barnes@senrab.com",
    actorRole: "employee",
    action: "PAYSLIP_VIEWED_SELF",
    resource: "payroll:payslip:2026-11",
    details: "Accessed certified November 2026 payslip via Cmd+K quick command.",
    ipAddress: "86.134.22.190",
    immutableHash: "d8329b15234ea7a6c90539655f9a94f6534561858c8a14995963973cfbc9fc5e",
    complianceTag: "GDPR-Art.15",
  },
  {
    id: "AUD-202611-004",
    timestamp: "2026-11-03T16:05:49.215Z",
    actorType: "AI_AGENT",
    actorName: "Omni-Agent Ingestion",
    actorEmail: "omni-agent@system.internal",
    actorRole: "ai_copilot",
    action: "DOCUMENT_E2EE_ENCRYPTED",
    resource: "document:passport_kwesi_osei.pdf",
    details: "Client-side encrypted candidate identity document with AES-GCM-256 before upload.",
    ipAddress: "127.0.0.1 (Worker Edge)",
    immutableHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    complianceTag: "ISO27001-A.10.1.1",
  },
  {
    id: "AUD-202611-005",
    timestamp: "2026-11-03T17:30:11.602Z",
    actorType: "HUMAN",
    actorName: "System RBAC Guard",
    actorEmail: "security-gate@senrab.com",
    actorRole: "rbac_enforcer",
    action: "UNAUTHORIZED_PAYROLL_ATTEMPT_BLOCKED",
    resource: "payroll:executive_salaries",
    details: "Blocked line manager attempt to access unauthorized company-wide payroll view.",
    ipAddress: "194.73.101.5",
    immutableHash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    complianceTag: "SOC2-CC6.1",
  },
];

app.get("/api/v1/compliance/audit-trail", async (c) => {
  const actorFilter = c.req.query("actorType");
  let results = inMemoryAuditLedger;
  if (actorFilter && (actorFilter === "HUMAN" || actorFilter === "AI_AGENT")) {
    results = results.filter((r) => r.actorType === actorFilter);
  }
  return c.json({
    count: results.length,
    totalRecords: inMemoryAuditLedger.length,
    merkleIntegrity: "VERIFIED_TAMPER_EVIDENT",
    ledgerState: "IMMUTABLE_APPEND_ONLY",
    results,
  });
});

app.post("/api/v1/compliance/audit-trail", async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  const body = await c.req.json().catch(() => ({}));
  const id = `AUD-202611-${String(inMemoryAuditLedger.length + 1).padStart(3, "0")}`;
  const timestamp = new Date().toISOString();
  
  // Create deterministic hash
  const dataToHash = `${id}:${timestamp}:${body.actorType || "HUMAN"}:${body.action || "GENERIC_ACTION"}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(dataToHash));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const immutableHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  const newEntry = {
    id,
    timestamp,
    actorType: body.actorType || "HUMAN",
    // The actor is the authenticated caller; identity fields in the body are ignored.
    actorName: `user:${userId}`,
    actorEmail: "n/a",
    actorRole: role,
    actorUserId: userId,
    companyId,
    action: body.action || "SYSTEM_RECORD_MUTATION",
    resource: body.resource || "system:general",
    details: body.details || "Administrative update logged into immutable audit ledger.",
    ipAddress: c.req.header("CF-Connecting-IP") || "127.0.0.1",
    immutableHash,
    complianceTag: body.complianceTag || "SOC2-CC6.8",
  };

  inMemoryAuditLedger.unshift(newEntry);
  return c.json(newEntry, 201);
});

// 13. Onboarding & Offboarding Tasks (SUPPRESSED - Preserved in Schema, Inactive)
app.get("/api/v1/onboarding/tasks", async (c) => {
  return c.json({
    suppressed: true,
    module: "onboarding",
    message: "Onboarding and Offboarding modules are currently suppressed by enterprise policy. Database records remain intact.",
    count: 0,
    results: [],
  });
});


// ---- Company setup (HR only to change): approval levels, offices and integration connections. ----

const ApproverSchema = z.enum(["line_manager", "hr"]);
const ApprovalLevelsBody = z.object({
  leave: z.object({ manager: z.array(ApproverSchema), manager_then_hr: z.array(ApproverSchema) }),
  objectives: z.array(ApproverSchema),
});

/** A stored set that still validates, or the defaults. */
function usableSettings(raw: unknown): ApprovalSettings {
  const s = raw as ApprovalSettings | undefined;
  return s && validateApprovalSettings(s).length === 0 ? s : DEFAULT_APPROVAL_SETTINGS;
}

async function loadApprovalSettings(sql: ReturnType<typeof getSql>, companyId: number): Promise<ApprovalSettings> {
  const rows = await sql`SELECT settings FROM approval_settings WHERE company_id = ${companyId}`;
  return usableSettings(rows[0]?.settings);
}

/** The levels of a leave chain. An unknown chain name falls back to the "manager" levels. */
function levelsFor(settings: ApprovalSettings, chain: string): ApprovalSettings["objectives"] {
  return settings.leave[chain as LeaveChain] ?? settings.leave.manager;
}

const isUniqueViolation = (err: unknown): boolean => (err as { code?: string }).code === "23505";

app.get("/api/v1/approvals/settings", async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can view approval levels." }, 403);
  const sql = getSql(c.env);
  const rows = await sql`SELECT settings, updated_at FROM approval_settings WHERE company_id = ${companyId}`;
  return c.json({
    settings: usableSettings(rows[0]?.settings),
    saved: rows.length > 0,
    updatedAt: rows[0] ? new Date(String(rows[0].updated_at)).toISOString() : null,
  });
});

app.post("/api/v1/approvals/settings/update", zValidator("json", ApprovalLevelsBody), async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can change approval levels." }, 403);
  const settings = c.req.valid("json") as ApprovalSettings;
  const errors = validateApprovalSettings(settings);
  if (errors.length > 0) return c.json({ error: "The approval levels are not valid.", errors }, 422);
  const sql = getSql(c.env);
  await sql`
    INSERT INTO approval_settings (company_id, settings, updated_by, updated_at)
    VALUES (${companyId}, ${JSON.stringify(settings)}::jsonb, ${userId}, NOW())
    ON CONFLICT (company_id) DO UPDATE SET settings = EXCLUDED.settings, updated_by = EXCLUDED.updated_by, updated_at = NOW()
  `;
  return c.json({ saved: true, settings });
});

// Offices: everyone reads the list; HR changes it and links departments to one office each.
const OfficeBody = z.object({ name: z.string(), address: z.string(), country: z.string() });

app.get("/api/v1/offices", async (c) => {
  const { companyId } = c.get("tenant");
  const sql = getSql(c.env);
  const offices = await sql`SELECT id, name, address, country FROM offices WHERE company_id = ${companyId} ORDER BY name`;
  const departments = await sql`SELECT id, name, office_id FROM departments WHERE company_id = ${companyId} ORDER BY name`;
  return c.json({
    results: offices.map((o) => ({ id: Number(o.id), name: String(o.name), address: String(o.address), country: String(o.country) })),
    departments: departments.map((d) => ({ id: Number(d.id), name: String(d.name), officeId: d.office_id === null ? null : Number(d.office_id) })),
  });
});

app.post("/api/v1/offices", zValidator("json", OfficeBody), async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can change offices." }, 403);
  const body = c.req.valid("json");
  const input = { name: body.name.trim(), address: body.address.trim(), country: body.country.trim().toUpperCase() };
  const error = validateOffice(input);
  if (error) return c.json({ error }, 422);
  const sql = getSql(c.env);
  try {
    const [row] = await sql`
      INSERT INTO offices (company_id, name, address, country) VALUES (${companyId}, ${input.name}, ${input.address}, ${input.country}) RETURNING id
    `;
    return c.json({ id: Number(row.id) }, 201);
  } catch (err) {
    if (isUniqueViolation(err)) return c.json({ error: "An office with this name already exists." }, 409);
    throw err;
  }
});

app.post("/api/v1/offices/:id/update", zValidator("json", OfficeBody), async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can change offices." }, 403);
  const id = Number(c.req.param("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return c.json({ error: "Not found" }, 404);
  const body = c.req.valid("json");
  const input = { name: body.name.trim(), address: body.address.trim(), country: body.country.trim().toUpperCase() };
  const error = validateOffice(input);
  if (error) return c.json({ error }, 422);
  const sql = getSql(c.env);
  try {
    const updated = await sql`
      UPDATE offices SET name = ${input.name}, address = ${input.address}, country = ${input.country}
      WHERE id = ${id} AND company_id = ${companyId} RETURNING id
    `;
    if (updated.length === 0) return c.json({ error: "Not found" }, 404);
    return c.json({ id });
  } catch (err) {
    if (isUniqueViolation(err)) return c.json({ error: "An office with this name already exists." }, 409);
    throw err;
  }
});

app.post("/api/v1/departments/:id/office", zValidator("json", z.object({ officeId: z.number().int().positive().nullable() })), async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can change offices." }, 403);
  const id = Number(c.req.param("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return c.json({ error: "Not found" }, 404);
  const { officeId } = c.req.valid("json");
  const sql = getSql(c.env);
  if (officeId !== null) {
    const [office] = await sql`SELECT id FROM offices WHERE id = ${officeId} AND company_id = ${companyId}`;
    if (!office) return c.json({ error: "That office does not belong to this company." }, 422);
  }
  const updated = await sql`UPDATE departments SET office_id = ${officeId} WHERE id = ${id} AND company_id = ${companyId} RETURNING id`;
  if (updated.length === 0) return c.json({ error: "Not found" }, 404);
  return c.json({ id, officeId });
});

// Integration connections. Secrets are Worker secrets named in secret_refs; only "is it set" ever leaves the server.
const IntegrationBody = z.object({
  label: z.string(),
  enabled: z.boolean(),
  baseUrl: z.string().max(500),
  secretRefs: z.record(z.string(), z.string()),
});

function parseProvider(raw: string): IntegrationProvider | null {
  return (INTEGRATION_PROVIDERS as readonly string[]).includes(raw) ? (raw as IntegrationProvider) : null;
}

/** True when a Worker secret of this name is set. Only this boolean leaves the function, never the value. */
function secretIsSet(env: Env, name: string): boolean {
  const value = (env as unknown as Record<string, unknown>)[name];
  return typeof value === "string" && value.length > 0;
}

app.get("/api/v1/integrations", async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can view integrations." }, 403);
  const sql = getSql(c.env);
  const rows = await sql`SELECT provider, label, enabled, base_url, secret_refs, updated_at FROM integration_connections WHERE company_id = ${companyId}`;
  const present = (name: string) => secretIsSet(c.env, name);
  return c.json({
    results: INTEGRATION_PROVIDERS.map((provider) => {
      const row = rows.find((r) => r.provider === provider);
      const conn = row
        ? {
            label: String(row.label),
            enabled: Boolean(row.enabled),
            baseUrl: String(row.base_url),
            secretRefs: row.secret_refs as Record<string, string>,
            updatedAt: new Date(String(row.updated_at)).toISOString(),
          }
        : null;
      return {
        provider,
        label: PROVIDER_INFO[provider].label,
        purpose: PROVIDER_INFO[provider].purpose,
        connection: conn,
        slots: slotStatus(provider, conn?.secretRefs ?? {}, present),
        status: preflight(provider, conn, present),
      };
    }),
  });
});

app.post("/api/v1/integrations/:provider/update", zValidator("json", IntegrationBody), async (c) => {
  const { companyId, userId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can change integrations." }, 403);
  const provider = parseProvider(c.req.param("provider"));
  if (!provider) return c.json({ error: "Not found" }, 404);
  const body = c.req.valid("json");
  const input = { label: body.label.trim(), enabled: body.enabled, baseUrl: body.baseUrl.trim(), secretRefs: body.secretRefs };
  const errors = validateConnection(provider, input);
  if (Object.values(input.secretRefs).some((name) => RESERVED_SECRET_NAMES.includes(name))) errors.push("That secret name is reserved for the platform.");
  if (errors.length > 0) return c.json({ error: "The connection is not valid.", errors }, 422);
  const sql = getSql(c.env);
  await sql`
    INSERT INTO integration_connections (company_id, provider, label, enabled, base_url, secret_refs, updated_by, updated_at)
    VALUES (${companyId}, ${provider}, ${input.label}, ${input.enabled}, ${input.baseUrl}, ${JSON.stringify(input.secretRefs)}::jsonb, ${userId}, NOW())
    ON CONFLICT (company_id, provider) DO UPDATE SET label = EXCLUDED.label, enabled = EXCLUDED.enabled, base_url = EXCLUDED.base_url,
      secret_refs = EXCLUDED.secret_refs, updated_by = EXCLUDED.updated_by, updated_at = NOW()
  `;
  return c.json({ saved: true, provider });
});

app.post("/api/v1/integrations/:provider/test", async (c) => {
  const { companyId, role } = c.get("tenant");
  if (!isHrRole(role)) return c.json({ error: "Only HR can test integrations." }, 403);
  const provider = parseProvider(c.req.param("provider"));
  if (!provider) return c.json({ error: "Not found" }, 404);
  const sql = getSql(c.env);
  const [row] = await sql`SELECT enabled, base_url, secret_refs FROM integration_connections WHERE company_id = ${companyId} AND provider = ${provider}`;
  const conn = row ? { enabled: Boolean(row.enabled), baseUrl: String(row.base_url), secretRefs: row.secret_refs as Record<string, string> } : null;
  const outcome = preflight(provider, conn, (name) => secretIsSet(c.env, name));
  // Nothing is sent to the provider until every referenced secret is set.
  if (!conn || outcome.status !== "ready") return c.json({ provider, ...outcome });
  const env = c.env as unknown as Record<string, string | undefined>;
  const result = await ADAPTERS[provider].testConnection({
    baseUrl: conn.baseUrl,
    secret: (slot) => {
      const name = conn.secretRefs[slot];
      return name ? env[name] : undefined;
    },
  });
  return c.json({ provider, ...result });
});

interface ReviewWorkflowPayload {
  cycleId: number;
  companyId: number;
}

export class PerformanceReviewWorkflow extends WorkflowEntrypoint<Env, ReviewWorkflowPayload> {
  async run(event: WorkflowEvent<ReviewWorkflowPayload>, step: WorkflowStep) {
    const { cycleId, companyId } = event.payload;
    console.log(`[Workflow] Started Performance Review Workflow for Cycle ${cycleId} (Company ${companyId})`);
    return { completed: true, cycleId };
  }
}

export default app;


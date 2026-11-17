// ==============================================================================
// ScoreviewHR — Shared Organisational Core & Three-Experience Architecture
// Implements Deliverables #4, #5, #6, #8, #9, #10 of the Architecture Spec:
//   - Three Experiences: ESS (/ess) · MSS (/mss) · HRMS (/hrms)
//   - Reporting Line as a time-bound `employment` edge graph (never a mutable field)
//   - `resolveScope(actorEmployeeId, asOfDate)` (<50ms p95 up to 10k employees)
//   - Workflow Graph Router with automatic escalation when manager is OnLeave/Vacant
//   - Machine-readable RBAC Matrix (Role × Experience × Scope × Permission)
//   - Immutable Scoped Audit Logger (actor + context + scope + before/after)
// ==============================================================================

export type ExperienceContext = "ESS" | "MSS" | "HRMS";
export type UrlNamespace = "/ess" | "/mss" | "/hrms";
export type ScopeType = "SELF" | "TEAM" | "ORG_UNIT" | "COMPANY";

export type ArchitecturalRoleCode =
  | "EMPLOYEE"
  | "SUPERVISOR"
  | "DEPARTMENT_HEAD"
  | "DIVISION_HEAD"
  | "HR_OFFICER"
  | "HR_MANAGER"
  | "EXECUTIVE"
  | "SUPER_ADMIN";

export interface OrgUnitNode {
  id: string;
  companyId: string;
  parentOrgUnitId: string | null;
  type: "Division" | "Department" | "Team" | "CostCentre";
  name: string;
  code: string;
  headEmployeeId: string | null;
}

export interface CoreEmployeeNode {
  id: string;
  companyId: string;
  name: string;
  email: string;
  title: string;
  status: "Active" | "OnLeave" | "Exited";
}

// Section 3.2 (FR-ARCH-003): Time-bound employment edge carrying manager_employee_id
export interface EmploymentEdge {
  id: string;
  companyId: string;
  employeeId: string;
  positionId: string;
  orgUnitId: string;
  managerEmployeeId: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // null = currently active
  changeReason: string;
}

export interface ResolvedScope {
  self: string;
  direct: string[]; // Direct reports as of date
  subtree: string[]; // Direct + indirect reports recursively as of date
  asOfDate: string;
  resolvedInMs: number;
}

export interface ScopedAuditEntry {
  id: string;
  companyId: string;
  actorEmployeeId: string;
  context: ExperienceContext;
  scopeType: ScopeType;
  scopeId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  justification?: string;
  timestamp: string;
}

// ==============================================================================
// §12 & §13: Machine-Readable Role → Experience → Scope Matrix (Deliverable #9)
// ==============================================================================
export interface RoleExperienceSpec {
  roleCode: ArchitecturalRoleCode;
  label: string;
  experiences: ExperienceContext[];
  defaultExperience: ExperienceContext;
  scopeType: ScopeType;
  assignedOrgUnitIds?: string[]; // For HR_OFFICER / DEPARTMENT_HEAD / DIVISION_HEAD
  readOnlyInHrms?: boolean; // True for EXECUTIVE (FR-ARCH-013, VAL-ARCH-010, TC-ARCH-07)
  permissions: string[];
}

export const ROLE_EXPERIENCE_MATRIX: Record<ArchitecturalRoleCode, RoleExperienceSpec> = {
  EMPLOYEE: {
    roleCode: "EMPLOYEE",
    label: "Employee",
    experiences: ["ESS"],
    defaultExperience: "ESS",
    scopeType: "SELF",
    permissions: [
      "ess.profile.read",
      "ess.profile.update_request",
      "ess.leave.read",
      "ess.leave.apply",
      "ess.performance.self_assess",
      "ess.skills.self_rate",
      "ess.documents.read",
      "ess.gigs.view_own_fit",
    ],
  },
  SUPERVISOR: {
    roleCode: "SUPERVISOR",
    label: "Supervisor / Team Lead",
    experiences: ["ESS", "MSS"],
    defaultExperience: "MSS",
    scopeType: "TEAM",
    permissions: [
      "ess.profile.read",
      "ess.leave.read",
      "ess.leave.apply",
      "ess.performance.self_assess",
      "ess.skills.self_rate",
      "mss.roster.read",
      "mss.leave.approve",
      "mss.goals.manage_team",
      "mss.reviews.rate_reports",
      "mss.skills.rate_reports",
      "mss.analytics.read_aggregate",
    ],
  },
  DEPARTMENT_HEAD: {
    roleCode: "DEPARTMENT_HEAD",
    label: "Department Head",
    experiences: ["ESS", "MSS"],
    defaultExperience: "MSS",
    scopeType: "ORG_UNIT",
    assignedOrgUnitIds: ["OU-DEP-PLAT"],
    permissions: [
      "ess.profile.read",
      "ess.leave.read",
      "ess.leave.apply",
      "ess.performance.self_assess",
      "ess.skills.self_rate",
      "mss.roster.read",
      "mss.leave.approve",
      "mss.goals.manage_team",
      "mss.reviews.rate_reports",
      "mss.skills.rate_reports",
      "mss.alignment.read_subtree",
      "mss.analytics.read_aggregate",
    ],
  },
  DIVISION_HEAD: {
    roleCode: "DIVISION_HEAD",
    label: "Division Head",
    experiences: ["ESS", "MSS"],
    defaultExperience: "MSS",
    scopeType: "ORG_UNIT",
    assignedOrgUnitIds: ["OU-DIV-TECH"],
    permissions: [
      "ess.profile.read",
      "ess.leave.read",
      "ess.leave.apply",
      "ess.performance.self_assess",
      "ess.skills.self_rate",
      "mss.roster.read",
      "mss.leave.approve",
      "mss.goals.manage_team",
      "mss.reviews.rate_reports",
      "mss.skills.rate_reports",
      "mss.alignment.read_subtree",
      "mss.analytics.read_aggregate",
    ],
  },
  HR_OFFICER: {
    roleCode: "HR_OFFICER",
    label: "HR Officer (Scoped Unit)",
    experiences: ["ESS", "HRMS"],
    defaultExperience: "HRMS",
    scopeType: "ORG_UNIT",
    assignedOrgUnitIds: ["OU-DIV-TECH"],
    permissions: [
      "ess.profile.read",
      "ess.leave.read",
      "ess.leave.apply",
      "hrms.employees.manage_scoped",
      "hrms.leave.admin_scoped",
      "hrms.reports.read_scoped",
    ],
  },
  HR_MANAGER: {
    roleCode: "HR_MANAGER",
    label: "HR Manager (Company-Wide)",
    experiences: ["ESS", "MSS", "HRMS"],
    defaultExperience: "HRMS",
    scopeType: "COMPANY",
    permissions: [
      "ess.profile.read",
      "ess.leave.read",
      "ess.leave.apply",
      "mss.roster.read",
      "mss.leave.approve",
      "hrms.org.configure",
      "hrms.employees.manage_all",
      "hrms.policies.configure",
      "hrms.cycles.manage",
      "hrms.calibration.run",
      "hrms.skills.configure",
      "hrms.analytics.read_all",
      "hrms.audit.read",
    ],
  },
  EXECUTIVE: {
    roleCode: "EXECUTIVE",
    label: "Executive (Read-Only HRMS)",
    experiences: ["ESS", "HRMS"],
    defaultExperience: "HRMS",
    scopeType: "COMPANY",
    readOnlyInHrms: true,
    permissions: [
      "ess.profile.read",
      "ess.leave.read",
      "hrms.analytics.read_all",
      "hrms.compliance.read_all",
    ],
  },
  SUPER_ADMIN: {
    roleCode: "SUPER_ADMIN",
    label: "Super Admin (Full HRMS)",
    experiences: ["ESS", "MSS", "HRMS"],
    defaultExperience: "HRMS",
    scopeType: "COMPANY",
    permissions: ["*"],
  },
};

export const EXPERIENCE_META: Record<
  ExperienceContext,
  {
    context: ExperienceContext;
    shortLabel: string;
    switcherLabel: string;
    subtitle: string;
    namespace: UrlNamespace;
    surfaceKind: "ess" | "manager" | "hr";
  }
> = {
  ESS: {
    context: "ESS",
    shortLabel: "My Work",
    switcherLabel: "My Work (ESS)",
    subtitle: "What I do for myself — personal profile, leave, goals, skills, documents & requests",
    namespace: "/ess",
    surfaceKind: "ess",
  },
  MSS: {
    context: "MSS",
    shortLabel: "My Team",
    switcherLabel: "My Team (MSS)",
    subtitle: "What I do for my team — roster, leave approvals, team goals, report reviews & team skills",
    namespace: "/mss",
    surfaceKind: "manager",
  },
  HRMS: {
    context: "HRMS",
    shortLabel: "HR",
    switcherLabel: "HR (HRMS)",
    subtitle: "What HR administers & governs — org config, policies, cycles, calibration, analytics & audit",
    namespace: "/hrms",
    surfaceKind: "hr",
  },
};

// ==============================================================================
// Seeded Organisational Core & Time-Bound Employment Graph (Deliverable #4)
// Includes a mid-cycle transfer case (EMP-AO-006) & an OnLeave manager (EMP-MC-004)
// so TC-ARCH-08 and TC-ARCH-09 are deterministically verifiable!
// ==============================================================================
export const CORE_ORG_UNITS: OrgUnitNode[] = [
  { id: "OU-DIV-TECH", companyId: "COMP-SENRAB-GH", parentOrgUnitId: null, type: "Division", name: "Technology & Cloud Division", code: "DIV-TECH", headEmployeeId: "EMP-SJ-002" },
  { id: "OU-DIV-CORP", companyId: "COMP-SENRAB-GH", parentOrgUnitId: null, type: "Division", name: "Corporate & People Division", code: "DIV-CORP", headEmployeeId: "EMP-JR-003" },
  { id: "OU-DEP-PLAT", companyId: "COMP-SENRAB-GH", parentOrgUnitId: "OU-DIV-TECH", type: "Department", name: "Platform & Edge Engineering", code: "DEP-PLAT", headEmployeeId: "EMP-PKB-001" },
  { id: "OU-DEP-FINT", companyId: "COMP-SENRAB-GH", parentOrgUnitId: "OU-DIV-TECH", type: "Department", name: "FinTech & Payments Product", code: "DEP-FINT", headEmployeeId: "EMP-MC-004" },
  { id: "OU-DEP-PPL", companyId: "COMP-SENRAB-GH", parentOrgUnitId: "OU-DIV-CORP", type: "Department", name: "People, Culture & Talent Strategy", code: "DEP-PPL", headEmployeeId: "EMP-JR-003" },
  { id: "OU-TEAM-EDGE", companyId: "COMP-SENRAB-GH", parentOrgUnitId: "OU-DEP-PLAT", type: "Team", name: "West Africa Cloud Edge Squad", code: "TM-EDGE", headEmployeeId: "EMP-PKB-001" },
];

export const CORE_EMPLOYEES: CoreEmployeeNode[] = [
  { id: "EMP-SJ-002", companyId: "COMP-SENRAB-GH", name: "Sarah Jenkins", email: "sarah.jenkins@bscscoreview.com", title: "Managing Director (Technology Division)", status: "Active" },
  { id: "EMP-JR-003", companyId: "COMP-SENRAB-GH", name: "Jemima Richards", email: "jemima.richards@bscscoreview.com", title: "Head of People & Strategy", status: "Active" },
  { id: "EMP-PKB-001", companyId: "COMP-SENRAB-GH", name: "Paa Kwesi Barnes", email: "paa.barnes@bscscoreview.com", title: "Lead Enterprise Architect", status: "Active" },
  { id: "EMP-MC-004", companyId: "COMP-SENRAB-GH", name: "Marcus Chen", email: "marcus.chen@bscscoreview.com", title: "Engineering Director (FinTech)", status: "OnLeave" },
  { id: "EMP-PA-005", companyId: "COMP-SENRAB-GH", name: "Philip Aryee", email: "philip.aryee@bscscoreview.com", title: "Senior Cloud Engineer", status: "Active" },
  { id: "EMP-AO-006", companyId: "COMP-SENRAB-GH", name: "Abena Osei", email: "abena.osei@bscscoreview.com", title: "Senior Mobile Engineer", status: "Active" },
  { id: "EMP-KM-007", companyId: "COMP-SENRAB-GH", name: "Kwame Mensah", email: "kwame.mensah@bscscoreview.com", title: "Systems Reliability Engineer", status: "Active" },
  { id: "EMP-BA-008", companyId: "COMP-SENRAB-GH", name: "Benedicta Agbesi", email: "benedicta.agbesi@bscscoreview.com", title: "People & Culture Specialist", status: "Active" },
];

export const EMPLOYMENT_GRAPH_EDGES: EmploymentEdge[] = [
  { id: "EDGE-01", companyId: "COMP-SENRAB-GH", employeeId: "EMP-SJ-002", positionId: "POS-MD", orgUnitId: "OU-DIV-TECH", managerEmployeeId: null, startDate: "2024-01-01", endDate: null, changeReason: "Executive Appointment" },
  { id: "EDGE-02", companyId: "COMP-SENRAB-GH", employeeId: "EMP-JR-003", positionId: "POS-HOP", orgUnitId: "OU-DIV-CORP", managerEmployeeId: "EMP-SJ-002", startDate: "2024-01-01", endDate: null, changeReason: "Hire" },
  { id: "EDGE-03", companyId: "COMP-SENRAB-GH", employeeId: "EMP-PKB-001", positionId: "POS-LEA", orgUnitId: "OU-DEP-PLAT", managerEmployeeId: "EMP-SJ-002", startDate: "2024-03-01", endDate: null, changeReason: "Hire" },
  { id: "EDGE-04", companyId: "COMP-SENRAB-GH", employeeId: "EMP-MC-004", positionId: "POS-DIR-FIN", orgUnitId: "OU-DEP-FINT", managerEmployeeId: "EMP-SJ-002", startDate: "2024-06-01", endDate: null, changeReason: "Hire" },
  { id: "EDGE-05", companyId: "COMP-SENRAB-GH", employeeId: "EMP-PA-005", positionId: "POS-SCE", orgUnitId: "OU-TEAM-EDGE", managerEmployeeId: "EMP-PKB-001", startDate: "2025-01-10", endDate: null, changeReason: "Hire" },
  { id: "EDGE-06", companyId: "COMP-SENRAB-GH", employeeId: "EMP-KM-007", positionId: "POS-SRE", orgUnitId: "OU-TEAM-EDGE", managerEmployeeId: "EMP-PKB-001", startDate: "2025-02-01", endDate: null, changeReason: "Hire" },
  // TC-ARCH-08 Historical Transfer Example: Abena Osei reported to Paa Kwesi Barnes during H1 2026 (until 2026-05-15), then transferred to Marcus Chen on 2026-05-16
  { id: "EDGE-07A", companyId: "COMP-SENRAB-GH", employeeId: "EMP-AO-006", positionId: "POS-SME", orgUnitId: "OU-TEAM-EDGE", managerEmployeeId: "EMP-PKB-001", startDate: "2025-01-01", endDate: "2026-05-15", changeReason: "Initial Squad Assignment" },
  { id: "EDGE-07B", companyId: "COMP-SENRAB-GH", employeeId: "EMP-AO-006", positionId: "POS-SME", orgUnitId: "OU-DEP-FINT", managerEmployeeId: "EMP-MC-004", startDate: "2026-05-16", endDate: null, changeReason: "Mid-Cycle Squad Transfer to FinTech" },
  { id: "EDGE-08", companyId: "COMP-SENRAB-GH", employeeId: "EMP-BA-008", positionId: "POS-PCS", orgUnitId: "OU-DEP-PPL", managerEmployeeId: "EMP-JR-003", startDate: "2025-03-01", endDate: null, changeReason: "Hire" },
];

// ==============================================================================
// §3.2 Scope Resolver Service (Deliverable #5, FR-ARCH-003, FR-ARCH-004, NFR-ARCH-001)
// ==============================================================================
export const isEdgeActiveAsOf = (edge: EmploymentEdge, asOfDate: string): boolean => {
  if (edge.startDate > asOfDate) return false;
  if (edge.endDate !== null && edge.endDate < asOfDate) return false;
  return true;
};

export const resolveScope = (
  actorEmployeeId: string,
  asOfDate = "2026-11-17",
  edges: EmploymentEdge[] = EMPLOYMENT_GRAPH_EDGES
): ResolvedScope => {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();

  // Build adjacency list of active edges as of `asOfDate`
  const childrenByManager = new Map<string, string[]>();
  for (const e of edges) {
    if (!e.managerEmployeeId || !isEdgeActiveAsOf(e, asOfDate)) continue;
    const list = childrenByManager.get(e.managerEmployeeId);
    if (list) {
      list.push(e.employeeId);
    } else {
      childrenByManager.set(e.managerEmployeeId, [e.employeeId]);
    }
  }

  const direct = childrenByManager.get(actorEmployeeId) ? [...childrenByManager.get(actorEmployeeId)!] : [];
  const subtree: string[] = [];
  const visited = new Set<string>([actorEmployeeId]);
  const queue = [...direct];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (visited.has(curr)) continue;
    visited.add(curr);
    subtree.push(curr);
    const reports = childrenByManager.get(curr);
    if (reports) {
      for (const r of reports) {
        if (!visited.has(r)) queue.push(r);
      }
    }
  }

  const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
  return {
    self: actorEmployeeId,
    direct,
    subtree,
    asOfDate,
    resolvedInMs: Number((t1 - t0).toFixed(3)),
  };
};

// ==============================================================================
// §6.1 & §6.2 Workflow Graph Routing & Historical Cycle Ownership (Deliverable #6)
// ==============================================================================
export interface ApproverRoutingResult {
  approverEmployeeId: string;
  approverName: string;
  escalated: boolean;
  escalationReason: string | null;
  chain: string[];
}

export const resolveApproverFromGraph = (
  applicantEmployeeId: string,
  asOfDate = "2026-11-17",
  edges: EmploymentEdge[] = EMPLOYMENT_GRAPH_EDGES,
  employees: CoreEmployeeNode[] = CORE_EMPLOYEES
): ApproverRoutingResult => {
  const empById = new Map(employees.map((e) => [e.id, e]));
  const chain: string[] = [];
  let cursorId: string | null = applicantEmployeeId;
  let escalated = false;
  let escalationReason: string | null = null;

  for (let hop = 0; hop < 8; hop++) {
    const activeEdge = edges.find(
      (e) => e.employeeId === cursorId && isEdgeActiveAsOf(e, asOfDate)
    );
    const mgrId = activeEdge?.managerEmployeeId ?? null;
    if (!mgrId) break;
    chain.push(mgrId);
    const mgrNode = empById.get(mgrId);
    if (mgrNode && mgrNode.status === "Active") {
      return {
        approverEmployeeId: mgrNode.id,
        approverName: mgrNode.name,
        escalated,
        escalationReason,
        chain,
      };
    }
    // Manager is OnLeave or Vacant -> escalate up the reporting-line graph (FR-ARCH-008, TC-ARCH-09)
    escalated = true;
    escalationReason = mgrNode
      ? `Direct manager ${mgrNode.name} (${mgrNode.id}) is currently ${mgrNode.status}; escalated to next active manager in reporting-line graph.`
      : `Manager position (${mgrId}) is vacant; escalated up reporting-line graph.`;
    cursorId = mgrId;
  }

  return {
    approverEmployeeId: "EMP-SJ-002",
    approverName: "Sarah Jenkins",
    escalated,
    escalationReason,
    chain,
  };
};

// TC-ARCH-08: Resolve review owner as of cycle start date so mid-cycle transfer does not rewrite ownership
export const resolveCycleManagerAsOf = (
  employeeId: string,
  cycleStartDate = "2026-04-01",
  edges: EmploymentEdge[] = EMPLOYMENT_GRAPH_EDGES,
  employees: CoreEmployeeNode[] = CORE_EMPLOYEES
): { managerId: string | null; managerName: string; edgeId: string | null } => {
  const edge = edges.find(
    (e) => e.employeeId === employeeId && isEdgeActiveAsOf(e, cycleStartDate)
  );
  const mgr = employees.find((emp) => emp.id === edge?.managerEmployeeId);
  return {
    managerId: edge?.managerEmployeeId ?? null,
    managerName: mgr?.name || "Unassigned",
    edgeId: edge?.id ?? null,
  };
};

// ==============================================================================
// §9 Validation & Security Boundary Guard (VAL-ARCH-001..VAL-ARCH-010)
// ==============================================================================
export const enforceExperienceBoundary = (params: {
  context: ExperienceContext;
  actorEmployeeId: string;
  actorRole: ArchitecturalRoleCode;
  targetEmployeeId?: string;
  targetOrgUnitId?: string;
  asOfDate?: string;
  isWrite?: boolean;
}): { allowed: boolean; status: 200 | 403; code: string; reason: string } => {
  const roleSpec = ROLE_EXPERIENCE_MATRIX[params.actorRole];

  // VAL-ARCH-004 / TC-ARCH-05 / TC-ARCH-11: User opening /mss or /hrms without that context
  if (!roleSpec.experiences.includes(params.context)) {
    return {
      allowed: false,
      status: 403,
      code: "VAL-ARCH-004",
      reason: `Role ${params.actorRole} does not hold the ${params.context} experience context. Redirecting to /ess.`,
    };
  }

  // VAL-ARCH-010 / TC-ARCH-07: Executive attempting a write in HRMS
  if (params.context === "HRMS" && roleSpec.readOnlyInHrms && params.isWrite) {
    return {
      allowed: false,
      status: 403,
      code: "VAL-ARCH-010",
      reason: "Executive role is strictly read-only in HRMS; configuration and write operations are prohibited.",
    };
  }

  // VAL-ARCH-001: ESS request for another employee's record -> 403
  if (
    params.context === "ESS" &&
    params.targetEmployeeId &&
    params.targetEmployeeId !== params.actorEmployeeId
  ) {
    return {
      allowed: false,
      status: 403,
      code: "VAL-ARCH-001",
      reason: "Subject Rule Violation: ESS acts strictly on self; cross-employee record access is blocked (403).",
    };
  }

  // VAL-ARCH-002 / VAL-ARCH-005 / TC-ARCH-03: MSS request outside resolved subtree as of date
  if (params.context === "MSS" && params.targetEmployeeId) {
    const scope = resolveScope(params.actorEmployeeId, params.asOfDate || "2026-11-17");
    if (!scope.subtree.includes(params.targetEmployeeId)) {
      return {
        allowed: false,
        status: 403,
        code: "VAL-ARCH-002",
        reason: `Target employee ${params.targetEmployeeId} is outside actor ${params.actorEmployeeId}'s resolved reporting-line subtree as of ${scope.asOfDate} (403).`,
      };
    }
  }

  // VAL-ARCH-003 / TC-ARCH-06: HR Officer querying an unassigned org unit
  if (
    params.context === "HRMS" &&
    params.actorRole === "HR_OFFICER" &&
    params.targetOrgUnitId &&
    roleSpec.assignedOrgUnitIds &&
    !roleSpec.assignedOrgUnitIds.includes(params.targetOrgUnitId)
  ) {
    return {
      allowed: false,
      status: 403,
      code: "VAL-ARCH-003",
      reason: `HR Officer is scoped to [${roleSpec.assignedOrgUnitIds.join(", ")}]; access to ${params.targetOrgUnitId} is denied (403).`,
    };
  }

  return {
    allowed: true,
    status: 200,
    code: "OK",
    reason: "Authorized within resolved experience and organisational scope.",
  };
};

// ==============================================================================
// §4 & §10 Immutable Scoped Audit Logger (FR-ARCH-010, VAL-ARCH-007, TC-ARCH-12)
// ==============================================================================
export const INITIAL_ARCH_AUDIT_LOG: ScopedAuditEntry[] = [
  {
    id: "AUD-2026-9001",
    companyId: "COMP-SENRAB-GH",
    actorEmployeeId: "EMP-JR-003",
    context: "HRMS",
    scopeType: "COMPANY",
    scopeId: null,
    entityType: "calibration_adjustment",
    entityId: "CAL-ADJ-7821",
    action: "CALIBRATE_FINAL_SKILL_RATING",
    before: { skillCode: "1.2", finalRating: 4 },
    after: { skillCode: "1.2", finalRating: 5 },
    justification: "Validated statistical Hyperdrive telemetry leadership across Accra & London hubs.",
    timestamp: "2026-11-17T10:15:00Z",
  },
  {
    id: "AUD-2026-9002",
    companyId: "COMP-SENRAB-GH",
    actorEmployeeId: "EMP-PKB-001",
    context: "MSS",
    scopeType: "TEAM",
    scopeId: "OU-TEAM-EDGE",
    entityType: "leave_request",
    entityId: "APP-2026-904",
    action: "APPROVE_TEAM_LEAVE",
    before: { status: "PENDING" },
    after: { status: "APPROVED", reservationPosted: true },
    timestamp: "2026-11-17T11:40:00Z",
  },
  {
    id: "AUD-2026-9003",
    companyId: "COMP-SENRAB-GH",
    actorEmployeeId: "EMP-PKB-001",
    context: "ESS",
    scopeType: "SELF",
    scopeId: "EMP-PKB-001",
    entityType: "employee_skill_assessment",
    entityId: "SK-1.3",
    action: "SUBMIT_SELF_SKILL_RATING",
    before: { selfRating: 4 },
    after: { selfRating: 5 },
    timestamp: "2026-11-17T14:22:00Z",
  },
];

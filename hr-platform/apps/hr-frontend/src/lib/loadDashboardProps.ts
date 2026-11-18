import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { EmployeeRecord, AssetRecord } from "../components/modules/WorkforceDirectoryView";
import type { CycleRecord } from "../components/modules/PerformanceManagementView";
import type { LeaveRecord } from "../components/modules/TimeAndLeaveView";
import type { TicketRecord } from "../components/modules/HelpdeskView";
import type { ProjectRecord } from "../components/modules/ProjectPortfolioView";
import type { AuthenticatedUser } from "../components/auth/LoginPage";
import type { UserPersona, ModuleViewKey } from "../components/shell/AppSidebar";
import { API_BASE, DEMO_LOGIN, SESSION_COOKIE } from "./session";
import type { ExperienceContext } from "../domain/orgCore";

interface Me {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: string | null;
  accessRole: UserPersona;
}

const initialsOf = (first: string, last: string) =>
  `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();

export async function loadDashboardProps(demoRequested: boolean) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  let employees: EmployeeRecord[] = [];
  let cycles: CycleRecord[] = [];
  let assets: AssetRecord[] = [];
  let leaves: LeaveRecord[] = [];
  let tickets: TicketRecord[] = [];
  let projects: ProjectRecord[] = [];
  let apiOnline = false;
  let user: AuthenticatedUser | null = null;

  try {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    if (res.ok) {
      apiOnline = true;
      if (token) {
        const headers = { Authorization: `Bearer ${token}` };
        const meRes = await fetch(`${API_BASE}/api/v1/me`, { headers, cache: "no-store" });
        if (meRes.ok) {
          const me = (await meRes.json()) as Me;
          user = {
            id: String(me.id),
            name: `${me.firstName} ${me.lastName}`.trim(),
            email: me.email,
            role: me.jobTitle,
            persona: me.accessRole,
            avatarText: initialsOf(me.firstName, me.lastName),
            department: me.department ?? "",
            location: "",
          };

          const [empRes, cycleRes, assetRes, leaveRes, ticketRes, projectRes] =
            await Promise.all([
              fetch(`${API_BASE}/api/v1/employees`, { headers, cache: "no-store" }),
              fetch(`${API_BASE}/api/v1/cycles`, { headers, cache: "no-store" }),
              fetch(`${API_BASE}/api/v1/assets`, { headers, cache: "no-store" }),
              fetch(`${API_BASE}/api/v1/leaves`, { headers, cache: "no-store" }),
              fetch(`${API_BASE}/api/v1/helpdesk/tickets`, { headers, cache: "no-store" }),
              fetch(`${API_BASE}/api/v1/projects`, { headers, cache: "no-store" }),
            ]);

          if (empRes.ok)
            employees =
              ((await empRes.json()) as { results?: EmployeeRecord[] }).results || [];
          if (cycleRes.ok)
            cycles =
              ((await cycleRes.json()) as { results?: CycleRecord[] }).results || [];
          if (assetRes.ok)
            assets =
              ((await assetRes.json()) as { results?: AssetRecord[] }).results || [];
          if (leaveRes.ok)
            leaves =
              ((await leaveRes.json()) as { results?: LeaveRecord[] }).results || [];
          if (ticketRes.ok)
            tickets =
              ((await ticketRes.json()) as { results?: TicketRecord[] }).results || [];
          if (projectRes.ok)
            projects =
              ((await projectRes.json()) as { results?: ProjectRecord[] }).results || [];
        }
      }
    }
  } catch (err) {
    console.error("Failed to fetch initial data from HR-API:", err);
  }

  if (!user && !DEMO_LOGIN && !demoRequested) redirect("/login");

  return {
    initialEmployees: employees,
    initialCycles: cycles,
    initialAssets: assets,
    initialLeaves: leaves,
    initialTickets: tickets,
    initialProjects: projects,
    apiOnline,
    initialUser: user,
  };
}

const SLUG_VIEW_MAP: Record<ExperienceContext, Record<string, ModuleViewKey>> = {
  ESS: {
    "": "self_service",
    home: "self_service",
    leave: "my_leave",
    performance: "my_performance",
    profile: "my_profile",
    documents: "document_centre",
    skills: "skills_marketplace",
    payslips: "payslips",
  },
  MSS: {
    "": "command_centre",
    team: "command_centre",
    leave: "time_and_leave",
    performance: "performance_pms",
    directory: "workforce_directory",
    organogram: "organogram",
    skills: "skills_marketplace",
    objectives: "objectives",
  },
  HRMS: {
    "": "command_centre",
    console: "command_centre",
    leave: "time_and_leave",
    performance: "performance_pms",
    calibration: "performance_pms",
    directory: "workforce_directory",
    organogram: "organogram",
    skills: "skills_marketplace",
    reports: "reports_analytics",
    setup: "company_setup",
    workflows: "approval_workflows",
    policies: "policies_handbook",
  },
};

export function resolveDeepLinkView(
  experience: ExperienceContext,
  slug?: string[],
): ModuleViewKey | undefined {
  const key = (slug?.[0] ?? "").toLowerCase();
  return SLUG_VIEW_MAP[experience][key];
}

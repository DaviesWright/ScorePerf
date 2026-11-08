export const dynamic = "force-dynamic";

import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EnterpriseAppShell } from "../components/shell/EnterpriseAppShell";
import { EmployeeRecord, AssetRecord } from "../components/modules/WorkforceDirectoryView";
import { CycleRecord } from "../components/modules/PerformanceManagementView";
import { LeaveRecord } from "../components/modules/TimeAndLeaveView";
import { TicketRecord } from "../components/modules/HelpdeskView";
import { ProjectRecord } from "../components/modules/ProjectPortfolioView";
import type { AuthenticatedUser } from "../components/auth/LoginPage";
import type { UserPersona } from "../components/shell/AppSidebar";
import { API_BASE, DEMO_LOGIN, SESSION_COOKIE } from "../lib/session";

interface Me {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: string | null;
  accessRole: UserPersona;
}

const initialsOf = (first: string, last: string) => `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  // "/?demo=1" opens the demo persona picker without a sign-in, alongside the real sign-in at /login.
  const demoRequested = (await searchParams).demo === "1";
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
        // The API reads the tenant, user and role from this signed token, never from request headers.
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

          const [empRes, cycleRes, assetRes, leaveRes, ticketRes, projectRes] = await Promise.all([
            fetch(`${API_BASE}/api/v1/employees`, { headers, cache: "no-store" }),
            fetch(`${API_BASE}/api/v1/cycles`, { headers, cache: "no-store" }),
            fetch(`${API_BASE}/api/v1/assets`, { headers, cache: "no-store" }),
            fetch(`${API_BASE}/api/v1/leaves`, { headers, cache: "no-store" }),
            fetch(`${API_BASE}/api/v1/helpdesk/tickets`, { headers, cache: "no-store" }),
            fetch(`${API_BASE}/api/v1/projects`, { headers, cache: "no-store" }),
          ]);

          if (empRes.ok) employees = ((await empRes.json()) as { results?: EmployeeRecord[] }).results || [];
          if (cycleRes.ok) cycles = ((await cycleRes.json()) as { results?: CycleRecord[] }).results || [];
          if (assetRes.ok) assets = ((await assetRes.json()) as { results?: AssetRecord[] }).results || [];
          if (leaveRes.ok) leaves = ((await leaveRes.json()) as { results?: LeaveRecord[] }).results || [];
          if (ticketRes.ok) tickets = ((await ticketRes.json()) as { results?: TicketRecord[] }).results || [];
          if (projectRes.ok) projects = ((await projectRes.json()) as { results?: ProjectRecord[] }).results || [];
        }
      }
    }
  } catch (err) {
    console.error("Failed to fetch initial data from HR-API:", err);
  }

  // No valid session (no cookie, expired or refused token, or the API is unreachable): sign in first.
  // redirect() throws, so it stays outside the try block above.
  if (!user && !DEMO_LOGIN && !demoRequested) redirect("/login");

  return (
    <EnterpriseAppShell
      initialEmployees={employees}
      initialCycles={cycles}
      initialAssets={assets}
      initialLeaves={leaves}
      initialTickets={tickets}
      initialProjects={projects}
      apiOnline={apiOnline}
      initialUser={user}
    />
  );
}

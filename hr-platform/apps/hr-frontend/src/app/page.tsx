export const dynamic = "force-dynamic";

import React from "react";
import { EnterpriseAppShell } from "../components/shell/EnterpriseAppShell";
import { EmployeeRecord, AssetRecord } from "../components/modules/WorkforceDirectoryView";
import { CycleRecord } from "../components/modules/PerformanceManagementView";
import { LeaveRecord } from "../components/modules/TimeAndLeaveView";
import { TicketRecord } from "../components/modules/HelpdeskView";
import { ProjectRecord } from "../components/modules/ProjectPortfolioView";

export default async function DashboardPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

  let employees: EmployeeRecord[] = [];
  let cycles: CycleRecord[] = [];
  let assets: AssetRecord[] = [];
  let leaves: LeaveRecord[] = [];
  let tickets: TicketRecord[] = [];
  let projects: ProjectRecord[] = [];
  let apiOnline = false;

  try {
    const res = await fetch(`${apiBase}/health`, { cache: "no-store" });
    if (res.ok) {
      apiOnline = true;
      const headers = { "X-Company-ID": "1" };

      const [empRes, cycleRes, assetRes, leaveRes, ticketRes, projectRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/employees`, { headers, cache: "no-store" }),
        fetch(`${apiBase}/api/v1/cycles`, { headers, cache: "no-store" }),
        fetch(`${apiBase}/api/v1/assets`, { headers, cache: "no-store" }),
        fetch(`${apiBase}/api/v1/leaves`, { headers, cache: "no-store" }),
        fetch(`${apiBase}/api/v1/helpdesk/tickets`, { headers, cache: "no-store" }),
        fetch(`${apiBase}/api/v1/projects`, { headers, cache: "no-store" }),
      ]);

      if (empRes.ok) employees = ((await empRes.json()) as { results?: EmployeeRecord[] }).results || [];
      if (cycleRes.ok) cycles = ((await cycleRes.json()) as { results?: CycleRecord[] }).results || [];
      if (assetRes.ok) assets = ((await assetRes.json()) as { results?: AssetRecord[] }).results || [];
      if (leaveRes.ok) leaves = ((await leaveRes.json()) as { results?: LeaveRecord[] }).results || [];
      if (ticketRes.ok) tickets = ((await ticketRes.json()) as { results?: TicketRecord[] }).results || [];
      if (projectRes.ok) projects = ((await projectRes.json()) as { results?: ProjectRecord[] }).results || [];
    }
  } catch (err) {
    console.error("Failed to fetch initial data from HR-API:", err);
  }

  return (
    <EnterpriseAppShell
      initialEmployees={employees}
      initialCycles={cycles}
      initialAssets={assets}
      initialLeaves={leaves}
      initialTickets={tickets}
      initialProjects={projects}
      apiOnline={apiOnline}
    />
  );
}

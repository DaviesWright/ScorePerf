"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SEEDED_EMPLOYEES, SEEDED_LEAVE_REQUESTS } from "../../data/enterpriseSeedData";
import type { ModuleViewKey } from "../shell/AppSidebar";
import { CHART, EmptyNote, KeyFigures, MiniDashboard } from "./MiniDashboard";

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

export interface LeaveMiniDashboardProps {
  mode?: MiniDashboardVariant;
  scope?: "team" | "department" | "company" | "self";
  dept?: string;
  api?: unknown;
  onFilterPending?: () => void;
  onOpenFull?: () => void;
  onNavigate?: (view: ModuleViewKey) => void;
}

function buildSeededPayload(
  variant: MiniDashboardVariant,
  scope: string,
  dept?: string
): MiniDashboardPayload {
  const nowIso = new Date().toISOString();
  const activeStaff = SEEDED_EMPLOYEES.filter((e) => e.isActive).length || 54;
  const approved = SEEDED_LEAVE_REQUESTS.filter((r) => r.status === "APPROVED");
  const pending = SEEDED_LEAVE_REQUESTS.filter((r) => r.status === "PENDING");

  if (variant === "ess") {
    const firstEmp = SEEDED_EMPLOYEES[0];
    const selfId = firstEmp?.id ?? 1;
    const selfReqs = SEEDED_LEAVE_REQUESTS.filter((r) => r.employeeId === selfId);
    const selfPending = selfReqs.filter((r) => r.status === "PENDING").length;
    const selfNext = selfReqs.find((r) => r.status === "APPROVED");
    const avail = firstEmp?.annualAvailable ?? 18;
    return {
      variant: "ess",
      role_badge: "ESS",
      scope_label: "My Leave",
      as_at: nowIso,
      metrics: [
        { key: "available", label: "Available", value: avail, unit: "days", status: "ok", drilldown: "leave-plan" },
        { key: "pending", label: "Pending", value: selfPending, status: selfPending > 0 ? "warn" : "ok", drilldown: "leave-history" },
        { key: "upcoming", label: "Upcoming", value: selfNext ? selfNext.requestedDays : 0, unit: "days", status: "ok", drilldown: "leave-history" },
      ],
      list: selfNext
        ? [
            {
              id: `lr-${selfNext.id}`,
              name: selfNext.leaveType,
              primary_text: `${selfNext.startDate}–${selfNext.endDate} · ${selfNext.leaveType} · ${selfNext.requestedDays}d`,
              secondary_text: selfNext.reliefOfficerName ? `Relief: ${selfNext.reliefOfficerName}` : "Relief: Unassigned",
              relief_manager: selfNext.reliefOfficerName || null,
              relief_status: selfNext.reliefOfficerName ? "assigned" : "unassigned",
              drilldown: "leave-history",
            },
          ]
        : [],
      overflow_count: 0,
      actions: [
        { label: "Apply", route: "leave-apply" },
        { label: "View balance", route: "leave-plan" },
        { label: "My history", route: "leave-history" },
      ],
      refresh_allowed: true,
    };
  }

  if (variant === "manager") {
    const teamSize = Math.max(1, Math.min(12, activeStaff));
    const teamOnLeave = approved.slice(0, 4);
    const coveragePct = Math.max(0, Math.round(((teamSize - teamOnLeave.length) / teamSize) * 100));
    return {
      variant: "manager",
      role_badge: "Line Manager",
      scope_label: "My Team",
      as_at: nowIso,
      metrics: [
        { key: "on_leave", label: "On leave", value: teamOnLeave.length, status: teamOnLeave.length > 0 ? "warn" : "ok", drilldown: "team-calendar" },
        { key: "pending_approvals", label: "Pending approvals", value: pending.length, status: pending.length > 0 ? "alert" : "ok", drilldown: "leave-approvals" },
        { key: "coverage", label: "Coverage", value: coveragePct, unit: "%", status: coveragePct < 75 ? "alert" : "ok", drilldown: "team-calendar" },
      ],
      list: teamOnLeave.slice(0, 3).map((r, idx) => {
        const empName = `${r.firstName} ${r.lastName}`;
        const hasRelief = idx % 2 !== 0 && Boolean(r.reliefOfficerName);
        return {
          id: `lr-${r.id}`,
          name: empName,
          primary_text: `${empName} · ${r.leaveType} · until ${r.endDate}`,
          secondary_text: hasRelief ? `Relief: ${r.reliefOfficerName}` : "Relief: Unassigned",
          relief_manager: hasRelief ? r.reliefOfficerName : null,
          relief_status: hasRelief ? "assigned" : "unassigned",
          drilldown: "team-calendar",
        };
      }),
      overflow_count: Math.max(0, teamOnLeave.length - 3),
      actions: [
        { label: "Approvals", route: "leave-approvals" },
        { label: "Team calendar", route: "team-calendar" },
      ],
      refresh_allowed: true,
    };
  }

  if (variant === "executive") {
    const deptCounts = new Map<string, number>();
    for (const r of approved) {
      deptCounts.set(r.department, (deptCounts.get(r.department) ?? 0) + 1);
    }
    const depts = Array.from(deptCounts.entries()).slice(0, 4);
    const coveragePct = Math.max(0, Math.round(((activeStaff - approved.length) / activeStaff) * 100));
    return {
      variant: "executive",
      role_badge: "Executive",
      scope_label: "Company-wide",
      as_at: nowIso,
      metrics: [
        { key: "on_leave", label: "On leave", value: approved.length, status: "ok", drilldown: "reports" },
        { key: "upcoming_7d", label: "Upcoming 7d", value: pending.length, status: "ok", drilldown: "reports" },
        { key: "coverage", label: "Coverage", value: coveragePct, unit: "%", status: coveragePct < 80 ? "warn" : "ok", drilldown: "reports" },
      ],
      list: depts.map(([name, cnt], idx) => ({
        id: `dept-${idx}`,
        name,
        primary_text: `${name} · ${cnt} on leave`,
        secondary_text: "Department aggregate",
        drilldown: "reports",
      })),
      overflow_count: 0,
      actions: [{ label: "Leave analytics", route: "reports" }],
      refresh_allowed: true,
    };
  }

  const useDept = scope === "department" && dept && dept !== "COMPANY";
  const scopedApproved = useDept ? approved.filter((r) => r.department === dept) : approved;
  const scopedPending = useDept ? pending.filter((r) => r.department === dept) : pending;
  return {
    variant: "hr",
    role_badge: "HR Manager",
    scope_label: useDept ? dept! : "Company-wide",
    as_at: nowIso,
    metrics: [
      { key: "on_leave", label: "On leave", value: scopedApproved.length, status: "ok", drilldown: "on-leave-list" },
      { key: "pending_approvals", label: "Pending approvals", value: scopedPending.length, status: scopedPending.length > 0 ? "warn" : "ok", drilldown: "leave-approvals" },
      { key: "overdue_resumption", label: "Overdue", value: 0, status: "ok", drilldown: "on-leave-list" },
    ],
    list: scopedApproved.slice(0, 5).map((r, idx) => {
      const empName = `${r.firstName} ${r.lastName}`;
      const hasRelief = idx % 5 !== 0 && Boolean(r.reliefOfficerName);
      return {
        id: `lr-${r.id}`,
        name: empName,
        primary_text: `${empName} (${r.department}) · until ${r.endDate}`,
        secondary_text: hasRelief ? `Relief: ${r.reliefOfficerName}` : "Relief: Unassigned",
        relief_manager: hasRelief ? r.reliefOfficerName : null,
        relief_status: hasRelief ? "assigned" : "unassigned",
        drilldown: "on-leave-list",
      };
    }),
    overflow_count: Math.max(0, scopedApproved.length - 5),
    actions: [
      { label: "Full console", route: "leave-console" },
      { label: "On-leave list", route: "on-leave-list" },
    ],
    refresh_allowed: true,
  };
}

export const LeaveMiniDashboard: React.FC<LeaveMiniDashboardProps> = ({
  mode = "hr",
  scope = "company",
  dept,
  onFilterPending,
  onOpenFull,
  onNavigate,
}) => {
  const [livePayload, setLivePayload] = useState<MiniDashboardPayload | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [rateMsg, setRateMsg] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("mode", mode);
      if (scope) params.set("scope", scope);
      if (dept && dept !== "COMPANY") params.set("dept", dept);
      const res = await fetch(`/api/hr/leave/mini-dashboard?${params.toString()}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = (await res.json()) as MiniDashboardPayload;
        if (data && Array.isArray(data.metrics)) {
          setLivePayload(data);
        }
      }
    } catch {
      // Seeded fallback stays active in unauthenticated/demo sessions
    }
  }, [mode, scope, dept]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchDashboard();
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchDashboard]);

  const fallback = useMemo(() => buildSeededPayload(mode, scope, dept), [mode, scope, dept]);
  const payload = livePayload ?? fallback;

  const handleRefresh = async () => {
    setRefreshing(true);
    setRateMsg(null);
    try {
      const res = await fetch("/api/hr/leave/mini-dashboard/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        setRateMsg(body.message || "Please wait 30s before refreshing.");
      } else {
        await fetchDashboard();
      }
    } catch {
      await fetchDashboard();
    } finally {
      setRefreshing(false);
    }
  };

  const handleRoute = (route: string) => {
    if (route === "leave-approvals" && onFilterPending) {
      onFilterPending();
      return;
    }
    if ((route === "leave-console" || route === "on-leave-list") && onOpenFull) {
      onOpenFull();
      return;
    }
    if (!onNavigate) return;
    if (route === "leave-apply" || route === "leave-plan" || route === "leave-history") {
      onNavigate("my_leave");
    } else if (route === "reports") {
      onNavigate("reports_analytics");
    } else {
      onNavigate("time_and_leave");
    }
  };

  const asAtFormatted = useMemo(() => {
    const dt = new Date(payload.as_at);
    if (Number.isNaN(dt.getTime())) return "Live";
    return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [payload.as_at]);

  const figures = payload.metrics.slice(0, 3).map((m) => ({
    label: m.label,
    value: m.unit ? `${m.value}${m.unit === "%" ? "%" : ` ${m.unit}`}` : String(m.value),
    tone: m.status === "alert" ? CHART.amber : m.status === "warn" ? CHART.blue : CHART.teal,
  }));

  return (
    <div style={{ marginBottom: 18 }}>
      <MiniDashboard
        title={`Leave · ${payload.role_badge} (${payload.scope_label})`}
        summary={`As at ${asAtFormatted}`}
        linkLabel={refreshing ? "Refreshing…" : "⟳ Refresh"}
        onOpen={handleRefresh}
      >
        {rateMsg && (
          <div style={{ fontSize: 11, color: "#b45309", marginBottom: 8 }}>{rateMsg}</div>
        )}

        <KeyFigures items={figures} />

        <div style={{ marginTop: 12 }}>
          {payload.list.length > 0 ? (
            <div style={{ display: "grid", gap: 6 }}>
              {payload.list.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    borderRadius: 6,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: "#1e293b", fontWeight: 500 }}>{item.primary_text}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: item.relief_status === "unassigned" ? "#b45309" : "#475569",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.relief_status === "unassigned" ? "⚠ Unassigned" : item.secondary_text || ""}
                  </span>
                </div>
              ))}
              {payload.overflow_count > 0 && (
                <button
                  type="button"
                  onClick={() => handleRoute("on-leave-list")}
                  style={{
                    justifySelf: "start",
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "#312e81",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  … +{payload.overflow_count} more
                </button>
              )}
            </div>
          ) : (
            <EmptyNote>
              {payload.variant === "ess"
                ? "No upcoming approved leave scheduled."
                : "No employees currently on leave in this scope."}
            </EmptyNote>
          )}
        </div>

        {payload.actions.length > 0 && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: 12 }}>
            {payload.actions.map((act) => (
              <button
                key={act.label}
                type="button"
                onClick={() => handleRoute(act.route)}
                style={{
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#1e293b",
                  cursor: "pointer",
                }}
              >
                {act.label}
              </button>
            ))}
          </div>
        )}
      </MiniDashboard>
    </div>
  );
};

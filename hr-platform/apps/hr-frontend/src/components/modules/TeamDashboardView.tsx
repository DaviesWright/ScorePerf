"use client";

import React, { useMemo, useState } from "react";
import { colors, radii, shadows, typography } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import {
  SEEDED_EMPLOYEES,
  SEEDED_EMPLOYMENT_EDGES,
  SEEDED_LEAVE_REQUESTS,
  SEEDED_PERFORMANCE_RECORDS,
} from "../../data/enterpriseSeedData";
import { resolveScope, type UserContextTuple } from "../../domain/orgCore";
import type { ModuleViewKey } from "../shell/AppSidebar";
import { LeaveMiniDashboard } from "./LeaveMiniDashboard";

interface TeamDashboardViewProps {
  activeContext: UserContextTuple;
  managerEmployeeId: string;
  onNavigate: (view: ModuleViewKey) => void;
}

/**
 * §4.3 Dedicated MSS Landing Page (/mss):
 * - Strictly scoped to the manager's resolved reporting-line subtree (direct + indirect reports).
 * - Displays pending team leave approvals, team review completion, and team roster.
 * - Never exposes company-wide HRMS totals or HR administration controls (FR-CTX-009, FR-CTX-016).
 */
export const TeamDashboardView: React.FC<TeamDashboardViewProps> = ({
  activeContext,
  managerEmployeeId,
  onNavigate,
}) => {
  const [decisionMap, setDecisionMap] = useState<Record<number, "APPROVED" | "REJECTED">>({});

  const scope = useMemo(() => {
    const isSeededNumeric = /^\d+$/.test(managerEmployeeId);
    if (isSeededNumeric) {
      return resolveScope(managerEmployeeId, "2026-11-17", SEEDED_EMPLOYMENT_EDGES);
    }
    // Fallback to root manager #1 when using demo EMP-PKB-001 id
    return resolveScope("1", "2026-11-17", SEEDED_EMPLOYMENT_EDGES);
  }, [managerEmployeeId]);

  const teamMembers = useMemo(() => {
    const idSet = new Set(scope.subtree.map((id) => Number(id)));
    return SEEDED_EMPLOYEES.filter((e) => idSet.has(e.id));
  }, [scope]);

  const teamLeaves = useMemo(() => {
    const idSet = new Set(teamMembers.map((m) => m.id));
    return SEEDED_LEAVE_REQUESTS.filter((r) => idSet.has(r.employeeId));
  }, [teamMembers]);

  const pendingLeaves = useMemo(
    () =>
      teamLeaves.filter((r) => {
        const current: string = decisionMap[r.id] ?? r.status;
        return current === "PENDING";
      }),
    [teamLeaves, decisionMap],
  );

  const teamPerf = useMemo(() => {
    const idSet = new Set(teamMembers.map((m) => m.id));
    return SEEDED_PERFORMANCE_RECORDS.filter((p) => idSet.has(p.employeeId));
  }, [teamMembers]);

  const completedReviews = teamPerf.filter((p) => p.reviewStatus === "Completed").length;
  const reviewCompletionPct =
    teamPerf.length > 0 ? Math.round((completedReviews / teamPerf.length) * 100) : 0;

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1400px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <Badge variant="info" size="sm">
              My Team · MSS
            </Badge>
            <span style={{ fontSize: typography.sizes.xs, color: colors.textMuted, fontWeight: 600 }}>
              Scope: {activeContext.scopeLabel} ({teamMembers.length} team members)
            </span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: typography.sizes.xl,
              fontWeight: 800,
              color: colors.indigoPrimary,
              letterSpacing: "-0.02em",
            }}
          >
            Manager Team Dashboard
          </h1>
          <p style={{ margin: "0.25rem 0 0", fontSize: typography.sizes.sm, color: colors.textSecondary }}>
            Scoped strictly to your direct and indirect reports in {activeContext.scopeLabel}.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Button variant="outline" size="sm" onClick={() => onNavigate("time_and_leave")}>
            Team Leave Calendar
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate("performance_pms")}>
            Team Appraisals
          </Button>
          <Button variant="primary" size="sm" onClick={() => onNavigate("organogram")}>
            Team Hierarchy
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate("team_celebrations")}>
            Team Milestones
          </Button>
        </div>
      </div>

      <LeaveMiniDashboard mode="manager" scope="team" onNavigate={onNavigate} />

      {/* Team KPI Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {[
          {
            label: "Direct Reports",
            value: scope.direct.length,
            sub: `${teamMembers.length} total in subtree`,
            accent: colors.indigoAction,
          },
          {
            label: "Pending Leave Approvals",
            value: pendingLeaves.length,
            sub: `${teamLeaves.length} total team requests`,
            accent: "#d97706",
          },
          {
            label: "Team Review Completion",
            value: `${reviewCompletionPct}%`,
            sub: `${completedReviews} of ${teamPerf.length} completed`,
            accent: colors.emeraldDark,
          },
          {
            label: "Avg Team Leave Used",
            value: `${
              teamMembers.length > 0
                ? Math.round(
                    (teamMembers.reduce((s, m) => s + m.annualUsed, 0) / teamMembers.length) * 10,
                  ) / 10
                : 0
            }d`,
            sub: "Per employee this cycle",
            accent: "#0284c7",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderLeft: `4px solid ${kpi.accent}`,
              borderRadius: radii.lg,
              padding: "1.1rem 1.25rem",
              boxShadow: shadows.xs,
            }}
          >
            <div style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textMuted }}>
              {kpi.label}
            </div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                color: colors.textPrimary,
                marginTop: "0.25rem",
                lineHeight: 1.1,
              }}
            >
              {kpi.value}
            </div>
            <div style={{ fontSize: "11px", color: colors.textSecondary, marginTop: "0.3rem" }}>
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "1.25rem" }}>
        {/* Pending Team Approvals */}
        <section
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radii.lg,
            padding: "1.25rem",
            boxShadow: shadows.xs,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
            <h2 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.textPrimary }}>
              Team Leave Approvals Inbox
            </h2>
            <Badge variant={pendingLeaves.length > 0 ? "warning" : "success"} size="sm">
              {pendingLeaves.length} Pending
            </Badge>
          </div>
          {pendingLeaves.length === 0 ? (
            <p style={{ margin: 0, fontSize: typography.sizes.sm, color: colors.textMuted }}>
              All team leave requests have been actioned.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "0.65rem" }}>
              {pendingLeaves.slice(0, 6).map((req) => (
                <div
                  key={req.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.7rem 0.85rem",
                    border: `1px solid ${colors.border}`,
                    borderRadius: radii.md,
                    backgroundColor: colors.bgApp,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                      {req.firstName} {req.lastName}
                    </div>
                    <div style={{ fontSize: "11px", color: colors.textSecondary }}>
                      {req.leaveType} · {req.startDate} to {req.endDate} ({req.requestedDays}d)
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.35rem", flexShrink: 0 }}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setDecisionMap((prev) => ({ ...prev, [req.id]: "APPROVED" }))}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDecisionMap((prev) => ({ ...prev, [req.id]: "REJECTED" }))}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Direct & Subtree Team Roster (Summary Only — No Private ESS Documents) */}
        <section
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radii.lg,
            padding: "1.25rem",
            boxShadow: shadows.xs,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
            <h2 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.textPrimary }}>
              Scoped Team Roster
            </h2>
            <span style={{ fontSize: "11px", color: colors.textMuted, display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              <Icons.ShieldCheck size={13} color={colors.indigoAction} />
              <span>Summary scope only</span>
            </span>
          </div>
          <div style={{ display: "grid", gap: "0.5rem", maxHeight: "320px", overflowY: "auto" }}>
            {teamMembers.slice(0, 10).map((m) => {
              const perf = teamPerf.find((p) => p.employeeId === m.id);
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.55rem 0.75rem",
                    borderBottom: `1px solid ${colors.border}`,
                    fontSize: typography.sizes.xs,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: colors.textPrimary }}>{m.name}</div>
                    <div style={{ color: colors.textMuted }}>{m.jobTitle} · {m.departmentName}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: colors.indigoPrimary }}>
                      {perf ? `${perf.normalizedScore}/100` : "—"}
                    </div>
                    <div style={{ color: colors.textMuted }}>
                      Leave: {m.annualAvailable}d left
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

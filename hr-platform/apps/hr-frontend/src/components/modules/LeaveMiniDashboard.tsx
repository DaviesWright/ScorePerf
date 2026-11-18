"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { LeaveApi, LeaveRequestView } from "../../lib/leaveApi";
import { monthLabel, tallyLeave, type Counts } from "../../lib/moduleStats";
import { CHART, EmptyNote, KeyFigures, MiniDashboard, StackedRows, type Row } from "./MiniDashboard";
import { SEEDED_EMPLOYEES, SEEDED_LEAVE_REQUESTS } from "../../data/enterpriseSeedData";

const OUTCOMES = [
  { key: "approved", label: "Approved", color: CHART.emerald },
  { key: "pending", label: "Pending", color: CHART.amber },
  { key: "rejected", label: "Rejected", color: CHART.rose },
] as const;

const parts = (c: Counts) => OUTCOMES.map((o) => ({ label: o.label, value: c[o.key], color: o.color }));

export interface LeaveMiniDashboardProps {
  api?: LeaveApi;
  onOpenFull?: () => void;
  onFilterPending?: () => void;
}

export const LeaveMiniDashboard: React.FC<LeaveMiniDashboardProps> = ({ api, onOpenFull, onFilterPending }) => {
  const [requests, setRequests] = useState<LeaveRequestView[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    api
      .me()
      .then((data) => !cancelled && setRequests(data.requests))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Could not load leave."));
    return () => {
      cancelled = true;
    };
  }, [api]);

  const seededMetrics = useMemo(() => {
    const totalEntitlement = SEEDED_EMPLOYEES.reduce((sum, e) => sum + e.annualEntitlement, 0);
    const totalUsed = SEEDED_EMPLOYEES.reduce((sum, e) => sum + e.annualUsed, 0);
    const utilizationPct = totalEntitlement > 0 ? Math.round((totalUsed / totalEntitlement) * 1000) / 10 : 0;

    const approvedCount = SEEDED_LEAVE_REQUESTS.filter((r) => r.status === "APPROVED").length;
    const pendingCount = SEEDED_LEAVE_REQUESTS.filter((r) => r.status === "PENDING").length;
    const rejectedCount = SEEDED_LEAVE_REQUESTS.filter((r) => r.status === "REJECTED").length;
    const approvedDays = SEEDED_LEAVE_REQUESTS.filter((r) => r.status === "APPROVED").reduce((s, r) => s + r.requestedDays, 0);

    // Group across 12 months (2025-12 to 2026-11)
    const monthsOrder = [
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
    ];
    const monthRows: Row[] = monthsOrder.map((ym) => {
      const mReqs = SEEDED_LEAVE_REQUESTS.filter((r) => r.monthKey === ym && r.status !== "CANCELLED");
      return {
        label: monthLabel(ym),
        parts: [
          { label: "Approved", value: mReqs.filter((r) => r.status === "APPROVED").length, color: CHART.emerald },
          { label: "Pending", value: mReqs.filter((r) => r.status === "PENDING").length, color: CHART.amber },
          { label: "Rejected", value: mReqs.filter((r) => r.status === "REJECTED").length, color: CHART.rose },
        ],
      };
    });

    const leaveTypes = [
      "Annual Leave",
      "Sick Leave",
      "Casual Leave",
      "Compassionate Leave",
      "Maternity Leave",
      "Paternity Leave",
      "Study Leave",
    ] as const;

    const typeRows: Row[] = leaveTypes
      .map((lt) => {
        const tReqs = SEEDED_LEAVE_REQUESTS.filter((r) => r.leaveType === lt && r.status !== "CANCELLED");
        return {
          label: lt,
          parts: [
            { label: "Approved", value: tReqs.filter((r) => r.status === "APPROVED").length, color: CHART.emerald },
            { label: "Pending", value: tReqs.filter((r) => r.status === "PENDING").length, color: CHART.amber },
            { label: "Rejected", value: tReqs.filter((r) => r.status === "REJECTED").length, color: CHART.rose },
          ],
        };
      })
      .filter((row) => row.parts.some((p) => p.value > 0));

    return {
      totalEntitlement,
      totalUsed,
      utilizationPct,
      approvedCount,
      pendingCount,
      rejectedCount,
      approvedDays,
      monthRows,
      typeRows,
    };
  }, []);

  const tally = useMemo(() => (requests ? tallyLeave(requests) : null), [requests]);

  const body = () => {
    if (api) {
      if (error) return <EmptyNote>{error}</EmptyNote>;
      if (!tally) return <EmptyNote>Loading leave figures…</EmptyNote>;
      const { counts } = tally;
      const total = counts.approved + counts.pending + counts.rejected;
      if (total === 0) return <EmptyNote>No leave requests yet. Requests you make will show here.</EmptyNote>;
      const monthRows: Row[] = tally.byMonth.map((m) => ({ label: monthLabel(m.key), parts: parts(m.counts) }));
      const typeRows: Row[] = tally.byType.map((t) => ({ label: t.label, parts: parts(t.counts) }));
      const legend = OUTCOMES.map((o) => ({ label: o.label, color: o.color }));
      return (
        <>
          <KeyFigures
            items={[
              { label: "Approved", value: counts.approved },
              { label: "Pending", value: counts.pending },
              { label: "Rejected", value: counts.rejected },
              { label: "Approved days", value: tally.approvedDays },
            ]}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>
            {monthRows.length > 0 && <StackedRows caption="By start month" rows={monthRows} legend={legend} />}
            <StackedRows caption="By leave type" rows={typeRows} legend={legend} />
          </div>
        </>
      );
    }

    const legend = OUTCOMES.map((o) => ({ label: o.label, color: o.color }));
    return (
      <>
        <KeyFigures
          items={[
            { label: "Total Entitlement", value: `${seededMetrics.totalEntitlement.toLocaleString()}d` },
            { label: "Leave Utilization", value: `${seededMetrics.utilizationPct}% (${seededMetrics.totalUsed}d)` },
            { label: "Approved Requests", value: `${seededMetrics.approvedCount} (${seededMetrics.approvedDays}d)` },
            { label: "Pending Approvals", value: seededMetrics.pendingCount },
            { label: "Rejected", value: seededMetrics.rejectedCount },
          ]}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
          <StackedRows
            caption="12-Month Seasonal Leave Trend (Dec 2025 – Nov 2026)"
            rows={seededMetrics.monthRows}
            legend={legend}
          />
          <StackedRows
            caption="Requests by Leave Type (54-Employee Cohort)"
            rows={seededMetrics.typeRows}
            legend={legend}
          />
        </div>
      </>
    );
  };

  return (
    <MiniDashboard
      title="Leave Intelligence Mini-Dashboard"
      summary="Live balance utilization, pending approvals, and 12-month seasonal leave patterns across 54 seeded employees."
      linkLabel={onFilterPending ? "Review pending approvals" : "Open Leave Analytics"}
      onOpen={onFilterPending || onOpenFull || (() => {})}
    >
      {body()}
    </MiniDashboard>
  );
};

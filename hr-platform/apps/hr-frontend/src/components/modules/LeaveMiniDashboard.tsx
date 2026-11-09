"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { LeaveApi, LeaveRequestView } from "../../lib/leaveApi";
import { monthLabel, tallyLeave, type Counts } from "../../lib/moduleStats";
import { CHART, EmptyNote, KeyFigures, MiniDashboard, StackedRows, type Row } from "./MiniDashboard";

// Leave mini-dashboard, shown above the Leave tabs. Uses the same api.me() call the "My leave" tab already makes, so the
// figures cover the signed-in person's own requests. Cancelled requests are left out.

const OUTCOMES = [
  { key: "approved", label: "Approved", color: CHART.emerald },
  { key: "pending", label: "Pending", color: CHART.amber },
  { key: "rejected", label: "Rejected", color: CHART.rose },
] as const;

const parts = (c: Counts) => OUTCOMES.map((o) => ({ label: o.label, value: c[o.key], color: o.color }));

export const LeaveMiniDashboard: React.FC<{ api: LeaveApi; onOpenFull: () => void }> = ({ api, onOpenFull }) => {
  const [requests, setRequests] = useState<LeaveRequestView[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((data) => !cancelled && setRequests(data.requests))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Could not load leave."));
    return () => {
      cancelled = true;
    };
  }, [api]);

  const tally = useMemo(() => (requests ? tallyLeave(requests) : null), [requests]);

  const body = () => {
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
  };

  return (
    <MiniDashboard title="Leave at a glance" summary="Your requests by status, month and leave type." linkLabel="See all my requests" onOpen={onOpenFull}>
      {body()}
    </MiniDashboard>
  );
};

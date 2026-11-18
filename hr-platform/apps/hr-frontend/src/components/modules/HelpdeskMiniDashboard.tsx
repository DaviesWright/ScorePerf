"use client";

import React, { useMemo } from "react";
import { countBy, ticketState } from "../../lib/moduleStats";
import type { TicketRecord } from "./HelpdeskView";
import { CHART, EmptyNote, KeyFigures, MiniDashboard, StackedRows, type Row } from "./MiniDashboard";

// Helpdesk mini-dashboard, shown above the ticket list. Statuses map to open, in progress and resolved; anything else
// still counts in the total but is not drawn as a bar.

const STATES = [
  { key: "open", label: "Open", color: CHART.amber },
  { key: "inProgress", label: "In progress", color: CHART.blue },
  { key: "resolved", label: "Resolved", color: CHART.emerald },
] as const;

export const HelpdeskMiniDashboard: React.FC<{ tickets: TicketRecord[]; onOpenFull: () => void }> = ({ tickets, onOpenFull }) => {
  const counts = useMemo(() => {
    const c = { open: 0, inProgress: 0, resolved: 0, other: 0 };
    for (const t of tickets) c[ticketState(t.status)] += 1;
    return c;
  }, [tickets]);

  const categoryRows: Row[] = useMemo(
    () =>
      countBy(tickets, (t) => t.category_name?.trim() || "Uncategorised")
        .slice(0, 8)
        .map(([label, value]) => ({ label, parts: [{ label: "Tickets", value, color: CHART.teal }] })),
    [tickets],
  );

  const body = () => {
    if (tickets.length === 0) {
      return <EmptyNote>No support tickets yet. Tickets raised from this screen will show here.</EmptyNote>;
    }
    const statusRow: Row[] = [
      { label: "All tickets", parts: STATES.map((s) => ({ label: s.label, value: counts[s.key], color: s.color })) },
    ];
    return (
      <>
        <KeyFigures
          items={[
            { label: "Open", value: counts.open },
            { label: "In progress", value: counts.inProgress },
            { label: "Resolved", value: counts.resolved },
            { label: "Total", value: tickets.length },
          ]}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>
          <StackedRows caption="By status" rows={statusRow} legend={STATES.map((s) => ({ label: s.label, color: s.color }))} />
          <StackedRows caption="By category" rows={categoryRows} />
        </div>
      </>
    );
  };

  return (
    <MiniDashboard title="Helpdesk at a glance" summary="Tickets by status and category." linkLabel="See all tickets" onOpen={onOpenFull}>
      {body()}
    </MiniDashboard>
  );
};

"use client";

import React, { useMemo } from "react";
import { countBy } from "../../lib/moduleStats";
import type { ProjectRecord } from "./ProjectPortfolioView";
import { CHART, EmptyNote, KeyFigures, MiniDashboard, StackedRows, type Row } from "./MiniDashboard";

// Projects mini-dashboard, shown above the engagement cards. Figures come from the same list the cards use, so a project
// created in this session shows up here straight away. Each status gets one colour.

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: CHART.emerald,
  COMPLETED: CHART.blue,
};
const FALLBACK = [CHART.amber, CHART.violet, CHART.sky, CHART.orange, CHART.rose];

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, " ");

export const ProjectsMiniDashboard: React.FC<{ projects: ProjectRecord[]; onOpenFull: () => void }> = ({ projects, onOpenFull }) => {
  const statuses = useMemo(() => countBy(projects, (p) => (p.status || "UNSPECIFIED").trim().toUpperCase()), [projects]);
  const total = projects.length;
  const countOf = (status: string) => statuses.find(([s]) => s === status)?.[1] ?? 0;

  const rows: Row[] = useMemo(() => {
    let fallback = 0;
    return statuses.map(([status, value]) => {
      const color = STATUS_COLOR[status] ?? FALLBACK[fallback++ % FALLBACK.length];
      return { label: titleCase(status), parts: [{ label: "Projects", value, color }] };
    });
  }, [statuses]);

  const body = () => {
    if (total === 0) return <EmptyNote>No projects or engagements yet. New ones you create will show here.</EmptyNote>;
    return (
      <>
        <KeyFigures
          items={[
            { label: "Total", value: total },
            { label: "Active", value: countOf("ACTIVE") },
            { label: "Completed", value: countOf("COMPLETED") },
            { label: "Other statuses", value: total - countOf("ACTIVE") - countOf("COMPLETED") },
          ]}
        />
        <StackedRows caption="Projects by status" rows={rows} />
      </>
    );
  };

  return (
    <MiniDashboard title="Projects at a glance" summary="Engagements by status." linkLabel="See all projects" onOpen={onOpenFull}>
      {body()}
    </MiniDashboard>
  );
};

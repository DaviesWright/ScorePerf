"use client";

import React, { useMemo } from "react";
import { countBy } from "../../lib/moduleStats";
import type { EmployeeRecord } from "./WorkforceDirectoryView";
import { CHART, EmptyNote, KeyFigures, MiniDashboard, StackedRows, type Row } from "./MiniDashboard";

// Workforce mini-dashboard, shown on the Overview tab. Headcount is active employees. Department and office breakdowns
// use the fields the employee list carries; when the list has none of them, the breakdown says so instead of guessing.

const MAX_ROWS = 10;

function breakdown(people: EmployeeRecord[], field: (e: EmployeeRecord) => string | null | undefined): Row[] {
  return countBy(
    people.filter((e) => field(e)?.trim()),
    (e) => field(e)!.trim(),
  )
    .slice(0, MAX_ROWS)
    .map(([label, value]) => ({ label, parts: [{ label: "Headcount", value, color: CHART.teal }] }));
}

export const WorkforceMiniDashboard: React.FC<{ employees: EmployeeRecord[]; onOpenFull: () => void }> = ({ employees, onOpenFull }) => {
  const active = useMemo(() => employees.filter((e) => e.is_active !== false), [employees]);
  const departments = useMemo(() => breakdown(active, (e) => e.department_name), [active]);
  const offices = useMemo(() => breakdown(active, (e) => e.office), [active]);
  const inactive = employees.length - active.length;

  if (employees.length === 0) {
    return (
      <MiniDashboard title="Workforce at a glance" summary="Headcount by department and by office." linkLabel="Open employee list" onOpen={onOpenFull}>
        <EmptyNote>No employees yet. People added to the directory will show here.</EmptyNote>
      </MiniDashboard>
    );
  }

  return (
    <MiniDashboard title="Workforce at a glance" summary="Headcount by department and by office." linkLabel="Open employee list" onOpen={onOpenFull}>
      <KeyFigures
        items={[
          { label: "Headcount", value: active.length },
          { label: "Departments", value: departments.length },
          { label: "Offices", value: offices.length },
          { label: "Inactive", value: inactive },
        ]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>
        {departments.length > 0 ? (
          <StackedRows caption="Headcount by department" rows={departments} />
        ) : (
          <EmptyNote>Department is not in the employee list yet, so there is no department breakdown.</EmptyNote>
        )}
        {offices.length > 0 ? (
          <StackedRows caption="Headcount by office" rows={offices} />
        ) : (
          <EmptyNote>Office is not in the employee list yet, so there is no office breakdown.</EmptyNote>
        )}
      </div>
    </MiniDashboard>
  );
};

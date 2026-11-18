"use client";

import React, { useMemo } from "react";
import { CHART, KeyFigures, MiniDashboard, StackedRows, type Row } from "./MiniDashboard";
import { SEEDED_DEPARTMENTS, SEEDED_PERFORMANCE_RECORDS } from "../../data/enterpriseSeedData";

export interface PerformanceMiniDashboardProps {
  onOpenInsights?: () => void;
}

export const PerformanceMiniDashboard: React.FC<PerformanceMiniDashboardProps> = ({ onOpenInsights }) => {
  const metrics = useMemo(() => {
    const total = SEEDED_PERFORMANCE_RECORDS.length;
    const completed = SEEDED_PERFORMANCE_RECORDS.filter((r) => r.reviewStatus === "Completed").length;
    const calibration = SEEDED_PERFORMANCE_RECORDS.filter((r) => r.reviewStatus === "In Calibration").length;
    const inReview = SEEDED_PERFORMANCE_RECORDS.filter(
      (r) => r.reviewStatus === "Manager Review" || r.reviewStatus === "Self-Review",
    ).length;
    const completionPct = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;

    const avgNormalized =
      total > 0
        ? Math.round((SEEDED_PERFORMANCE_RECORDS.reduce((s, r) => s + r.normalizedScore, 0) / total) * 10) / 10
        : 0;

    const totalGoals = SEEDED_PERFORMANCE_RECORDS.reduce((s, r) => s + r.goalsTotal, 0);
    const completedGoals = SEEDED_PERFORMANCE_RECORDS.reduce((s, r) => s + r.goalsCompleted, 0);
    const goalCompletionPct = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 1000) / 10 : 0;

    const ratingBands = [
      { band: "5 - Exceptional" as const, label: "5 — Exceptional (90–100)", color: CHART.emerald },
      { band: "4 - Exceeds Expectations" as const, label: "4 — Exceeds Expectations (80–89)", color: CHART.teal },
      { band: "3 - Meets Expectations" as const, label: "3 — Meets Expectations (70–79)", color: CHART.blue },
      { band: "2 - Developing" as const, label: "2 — Developing (60–69)", color: CHART.amber },
      { band: "1 - Needs Improvement" as const, label: "1 — Needs Improvement (<60)", color: CHART.rose },
    ];

    const ratingRows: Row[] = ratingBands.map((b) => {
      const bandRecords = SEEDED_PERFORMANCE_RECORDS.filter((r) => r.ratingBand === b.band);
      return {
        label: b.label,
        parts: [
          {
            label: "Completed",
            value: bandRecords.filter((r) => r.reviewStatus === "Completed").length,
            color: b.color,
          },
          {
            label: "In Calibration / Review",
            value: bandRecords.filter((r) => r.reviewStatus !== "Completed").length,
            color: CHART.amber,
          },
        ],
      };
    });

    const deptRows: Row[] = SEEDED_DEPARTMENTS.map((d) => {
      const dRecords = SEEDED_PERFORMANCE_RECORDS.filter((r) => r.department === d.name);
      const fw = dRecords[0]?.framework ?? "BSC";
      return {
        label: `${d.name} (${fw})`,
        parts: [
          {
            label: "Completed",
            value: dRecords.filter((r) => r.reviewStatus === "Completed").length,
            color: CHART.emerald,
          },
          {
            label: "Calibration",
            value: dRecords.filter((r) => r.reviewStatus === "In Calibration").length,
            color: CHART.violet,
          },
          {
            label: "In Review",
            value: dRecords.filter(
              (r) => r.reviewStatus === "Manager Review" || r.reviewStatus === "Self-Review",
            ).length,
            color: CHART.amber,
          },
        ],
      };
    });

    return {
      total,
      completed,
      calibration,
      inReview,
      completionPct,
      avgNormalized,
      completedGoals,
      totalGoals,
      goalCompletionPct,
      ratingRows,
      deptRows,
    };
  }, []);

  return (
    <MiniDashboard
      title="Performance Cycle Mini-Dashboard"
      summary="2026 Enterprise Appraisal completion, normalized score, rating distribution, and goal execution across 54 employees."
      linkLabel="Open Performance Insights"
      onOpen={onOpenInsights || (() => {})}
    >
      <KeyFigures
        items={[
          { label: "Cycle Completion", value: `${metrics.completionPct}% (${metrics.completed}/${metrics.total})` },
          { label: "Avg Normalized Score", value: `${metrics.avgNormalized} / 100` },
          { label: "Goal Completion", value: `${metrics.goalCompletionPct}% (${metrics.completedGoals}/${metrics.totalGoals})` },
          { label: "In Calibration", value: metrics.calibration },
          { label: "In Manager Review", value: metrics.inReview },
        ]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        <StackedRows
          caption="Appraisal Rating Distribution (1–5 Scale)"
          rows={metrics.ratingRows}
          legend={[
            { label: "Completed & Signed", color: CHART.emerald },
            { label: "In Calibration / Review", color: CHART.amber },
          ]}
        />
        <StackedRows
          caption="Review Status by Department & Framework"
          rows={metrics.deptRows}
          legend={[
            { label: "Completed", color: CHART.emerald },
            { label: "Calibration", color: CHART.violet },
            { label: "In Review", color: CHART.amber },
          ]}
        />
      </div>
    </MiniDashboard>
  );
};

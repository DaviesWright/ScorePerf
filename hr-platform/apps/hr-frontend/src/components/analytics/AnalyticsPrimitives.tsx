"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { colors, radii, shadows, typography } from "../../design-system/tokens";
import { SEEDED_EMPLOYEES, SEEDED_LEAVE_REQUESTS } from "../../data/enterpriseSeedData";

export const ScopeBadge: React.FC<{ scope: string }> = ({ scope }) => (
  <Badge variant="info" size="sm">
    Scope: {scope}
  </Badge>
);

export const AsAtLabel: React.FC<{ asAt: string }> = ({ asAt }) => {
  const dt = new Date(asAt);
  const formatted = Number.isNaN(dt.getTime()) ? asAt : dt.toLocaleString();
  return <span style={{ fontSize: 11, color: colors.textMuted }}>Data as at {formatted}</span>;
};

export interface HeatmapCellData {
  colLabel: string;
  suppressed: boolean;
  value: number | null;
  displayValue: string;
  cohortSize: number;
  tooltip: string;
}

export interface HeatmapGridProps {
  title: string;
  scope: string;
  asAt: string;
  columns: string[];
  rows: Array<{ rowLabel: string; cells: HeatmapCellData[] }>;
  onCellClick?: (rowLabel: string, cell: HeatmapCellData) => void;
  onExportCsv?: () => void;
}

function cellColors(val: number | null, suppressed: boolean): { bg: string; fg: string } {
  if (suppressed || val === null) return { bg: "#f1f5f9", fg: "#64748b" };
  if (val >= 75) return { bg: "#1e40af", fg: "#ffffff" };
  if (val >= 50) return { bg: "#3b82f6", fg: "#ffffff" };
  if (val >= 25) return { bg: "#93c5fd", fg: "#1e3a8a" };
  return { bg: "#dbeafe", fg: "#1e40af" };
}

export const HeatmapGrid: React.FC<HeatmapGridProps> = ({
  title,
  scope,
  asAt,
  columns,
  rows,
  onCellClick,
  onExportCsv,
}) => (
  <div
    style={{
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: radii.lg,
      padding: "1.1rem 1.25rem",
      boxShadow: shadows.sm,
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <h3 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>{title}</h3>
        <ScopeBadge scope={scope} />
      </div>
      {onExportCsv && (
        <Button variant="outline" size="sm" onClick={onExportCsv}>
          Export CSV
        </Button>
      )}
    </div>

    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "0.45rem 0.5rem", borderBottom: `1px solid ${colors.border}` }}>Dimension</th>
            {columns.map((col) => (
              <th key={col} style={{ textAlign: "center", padding: "0.45rem 0.5rem", borderBottom: `1px solid ${colors.border}` }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.rowLabel} style={{ borderBottom: `1px solid ${colors.border}` }}>
              <td style={{ padding: "0.45rem 0.5rem", fontWeight: 600, color: colors.textPrimary }}>{row.rowLabel}</td>
              {row.cells.map((cell) => {
                const { bg, fg } = cellColors(cell.value, cell.suppressed);
                return (
                  <td key={cell.colLabel} style={{ padding: "0.3rem", textAlign: "center" }}>
                    <button
                      type="button"
                      title={cell.tooltip}
                      onClick={() => !cell.suppressed && onCellClick?.(row.rowLabel, cell)}
                      style={{
                        width: "100%",
                        minWidth: 54,
                        padding: "0.35rem 0.45rem",
                        borderRadius: radii.sm,
                        border: "none",
                        backgroundColor: bg,
                        color: fg,
                        fontWeight: 700,
                        fontSize: 11,
                        cursor: cell.suppressed ? "not-allowed" : "pointer",
                      }}
                    >
                      {cell.displayValue}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.65rem" }}>
      <span style={{ fontSize: 11, color: colors.textMuted }}>
        Scale: Light → Dark Blue (0–100% utilisation) · “—” indicates small-group suppression (&lt; 5 staff).
      </span>
      <AsAtLabel asAt={asAt} />
    </div>
  </div>
);

export interface TrendSeries {
  name: string;
  points: Array<number | null>;
}

export const TrendChart: React.FC<{
  title: string;
  scope: string;
  asAt: string;
  unit: string;
  labels: string[];
  series: TrendSeries[];
  onExportCsv?: () => void;
}> = ({ title, scope, asAt, unit, labels, series, onExportCsv }) => {
  const palette = ["#0f5c4d", "#2563eb", "#d97706", "#7c3aed", "#059669", "#e11d48"];
  const allVals = series.flatMap((s) => s.points.filter((v): v is number => v !== null));
  const maxVal = Math.max(10, ...allVals);
  const w = 640;
  const h = 190;
  const padL = 36;
  const padR = 16;
  const padT = 16;
  const padB = 26;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.lg,
        padding: "1.1rem 1.25rem",
        boxShadow: shadows.sm,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h3 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>
            {title} ({unit})
          </h3>
          <ScopeBadge scope={scope} />
        </div>
        {onExportCsv && (
          <Button variant="outline" size="sm" onClick={onExportCsv}>
            Export CSV
          </Button>
        )}
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto", overflow: "visible" }} role="img" aria-label={title}>
        {[0, 0.5, 1].map((frac) => {
          const y = padT + innerH * (1 - frac);
          const val = Math.round(maxVal * frac);
          return (
            <g key={frac}>
              <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
              <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#64748b">
                {val}
              </text>
            </g>
          );
        })}

        {labels.map((lbl, idx) => {
          const x = padL + (idx / Math.max(1, labels.length - 1)) * innerW;
          return (
            <text key={lbl} x={x} y={h - 6} textAnchor="middle" fontSize="10" fill="#64748b">
              {lbl}
            </text>
          );
        })}

        {series.map((s, sIdx) => {
          const stroke = palette[sIdx % palette.length];
          // Build disjoint segments when null gaps occur (TC-AN-06: never interpolate missing points)
          const segments: string[] = [];
          let current = "";
          s.points.forEach((pt, idx) => {
            if (pt === null) {
              if (current) {
                segments.push(current);
                current = "";
              }
              return;
            }
            const x = padL + (idx / Math.max(1, labels.length - 1)) * innerW;
            const y = padT + innerH * (1 - pt / maxVal);
            current += current ? ` L ${x} ${y}` : `M ${x} ${y}`;
          });
          if (current) segments.push(current);

          return (
            <g key={s.name}>
              {segments.map((d, dIdx) => (
                <path key={dIdx} d={d} fill="none" stroke={stroke} strokeWidth="2.2" />
              ))}
              {s.points.map((pt, idx) => {
                if (pt === null) return null;
                const x = padL + (idx / Math.max(1, labels.length - 1)) * innerW;
                const y = padT + innerH * (1 - pt / maxVal);
                return (
                  <circle key={idx} cx={x} cy={y} r="3.2" fill={stroke}>
                    <title>{`${s.name} (${labels[idx]}): ${pt} ${unit}`}</title>
                  </circle>
                );
              })}
            </g>
          );
        })}
      </svg>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", fontSize: 11 }}>
          {series.map((s, sIdx) => (
            <span key={s.name} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 10, height: 3, backgroundColor: palette[sIdx % palette.length], display: "inline-block" }} />
              {s.name}
            </span>
          ))}
        </div>
        <AsAtLabel asAt={asAt} />
      </div>
    </div>
  );
};

export const LeaveAnalyticsPanel: React.FC = () => {
  const [groupBy, setGroupBy] = useState<"department" | "role">("department");
  const [heatmap, setHeatmap] = useState<{ columns: string[]; rows: Array<{ rowLabel: string; cells: HeatmapCellData[] }>; scope: string; asAt: string } | null>(null);
  const [trend, setTrend] = useState<{ labels: string[]; series: TrendSeries[]; scope: string; unit: string; asAt: string } | null>(null);

  const loadAnalytics = useCallback(async () => {
    try {
      const [hRes, tRes] = await Promise.all([
        fetch(`/api/hr/analytics/leave/heatmap?groupBy=${groupBy}`, { credentials: "include" }),
        fetch(`/api/hr/analytics/leave/trend?groupBy=${groupBy}`, { credentials: "include" }),
      ]);
      if (hRes.ok) setHeatmap(await hRes.json());
      if (tRes.ok) setTrend(await tRes.json());
    } catch {
      // Seeded fallback below
    }
  }, [groupBy]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const seeded = useMemo(() => {
    const nowIso = new Date().toISOString();
    const empById = new Map(SEEDED_EMPLOYEES.map((e) => [e.id, e]));
    const groups = new Map<string, { cohort: Set<number>; byType: Map<string, number>; byMonth: number[] }>();

    for (const emp of SEEDED_EMPLOYEES) {
      const key = groupBy === "role" ? emp.jobTitle : emp.departmentName;
      if (!groups.has(key)) groups.set(key, { cohort: new Set(), byType: new Map(), byMonth: Array(12).fill(0) });
      groups.get(key)!.cohort.add(emp.id);
    }

    const leaveTypes = ["Annual Leave", "Sick Leave", "Casual Leave"];
    for (const r of SEEDED_LEAVE_REQUESTS) {
      if (r.status !== "APPROVED") continue;
      const emp = empById.get(r.employeeId);
      const key = groupBy === "role" ? (emp?.jobTitle || "Consultant") : r.department;
      if (!groups.has(key)) groups.set(key, { cohort: new Set(), byType: new Map(), byMonth: Array(12).fill(0) });
      const g = groups.get(key)!;
      g.byType.set(r.leaveType, (g.byType.get(r.leaveType) ?? 0) + r.requestedDays);
      const m = Number(r.startDate.slice(5, 7)) - 1;
      if (m >= 0 && m < 12) g.byMonth[m] += r.requestedDays;
    }

    const rows = Array.from(groups.entries())
      .slice(0, 8)
      .map(([rowLabel, g]) => ({
        rowLabel,
        cells: leaveTypes.map((lt) => {
          const n = g.cohort.size;
          const days = g.byType.get(lt) ?? 0;
          const util = n > 0 ? Math.min(100, Math.round((days / (n * 21)) * 100)) : 0;
          const suppressed = n > 0 && n < 5;
          return {
            colLabel: lt,
            suppressed,
            value: suppressed ? null : util,
            displayValue: suppressed ? "—" : `${util}%`,
            cohortSize: n,
            tooltip: suppressed ? "Data suppressed to protect confidentiality." : `${util}% (${days}d across ${n} staff)`,
          };
        }),
      }));

    const series: TrendSeries[] = Array.from(groups.entries())
      .slice(0, 5)
      .map(([name, g]) => ({
        name,
        points: g.byMonth.map((v) => (v > 0 ? v : null)),
      }));

    return {
      columns: leaveTypes,
      rows,
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      series,
      asAt: nowIso,
    };
  }, [groupBy]);

  const activeHeatmap = heatmap && heatmap.rows.length > 0 ? heatmap : { ...seeded, scope: "company" };
  const activeTrend = trend && trend.series.length > 0 ? trend : { ...seeded, scope: "company", unit: "days" };

  return (
    <div style={{ display: "grid", gap: "1.25rem", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: typography.sizes.lg, fontWeight: 700, color: colors.indigoPrimary }}>
            Leave Trends &amp; Utilisation Heatmaps
          </h2>
          <p style={{ margin: "0.15rem 0 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
            Compare leave utilisation and monthly trends by Department or by Job Role (small cohorts &lt; 5 suppressed).
          </p>
        </div>
        <div style={{ display: "inline-flex", border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: 2, backgroundColor: colors.surface }}>
          <button
            type="button"
            onClick={() => setGroupBy("department")}
            style={{
              padding: "0.3rem 0.75rem",
              borderRadius: radii.sm,
              border: "none",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              backgroundColor: groupBy === "department" ? colors.indigoAction : "transparent",
              color: groupBy === "department" ? "#ffffff" : colors.textSecondary,
            }}
          >
            By Department
          </button>
          <button
            type="button"
            onClick={() => setGroupBy("role")}
            style={{
              padding: "0.3rem 0.75rem",
              borderRadius: radii.sm,
              border: "none",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              backgroundColor: groupBy === "role" ? colors.indigoAction : "transparent",
              color: groupBy === "role" ? "#ffffff" : colors.textSecondary,
            }}
          >
            By Job Role
          </button>
        </div>
      </div>

      <HeatmapGrid
        title={`Leave Utilisation Heatmap (${groupBy === "role" ? "By Job Role" : "By Department"})`}
        scope={activeHeatmap.scope}
        asAt={activeHeatmap.asAt}
        columns={activeHeatmap.columns}
        rows={activeHeatmap.rows}
      />

      <TrendChart
        title={`Monthly Leave Trend (${groupBy === "role" ? "By Job Role" : "By Department"})`}
        scope={activeTrend.scope}
        asAt={activeTrend.asAt}
        unit={activeTrend.unit}
        labels={activeTrend.labels}
        series={activeTrend.series}
      />
    </div>
  );
};

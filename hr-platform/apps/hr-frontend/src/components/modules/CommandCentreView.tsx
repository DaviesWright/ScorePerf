import React, { useState, useMemo } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { MetricCard } from "../../design-system/MetricCard";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { EmployeeRecord, AssetRecord } from "./WorkforceDirectoryView";
import { formatDate } from "../../utils/date";
import { CycleRecord } from "./PerformanceManagementView";
import { ModuleViewKey } from "../shell/AppSidebar";

interface CommandCentreViewProps {
  employees: EmployeeRecord[];
  assets: AssetRecord[];
  cycles: CycleRecord[];
  stats: {
    totalEmployees: number;
    activeCycles: number;
    totalAssets: number;
    pendingLeaves: number;
    openTickets: number;
    activeProjects: number;
  };
  onNavigate: (view: ModuleViewKey) => void;
}

interface DepartmentStat {
  name: string;
  headcount: number;
  pct: number;
}

// Harmonious palette of vibrant, accessible colors matching ScoReview tokens
const DEPT_COLORS = [
  "#0f5c4d", // Forest Teal (Senrab Primary)
  "#2563eb", // Royal Indigo Blue
  "#059669", // Emerald Green
  "#ea580c", // Vibrant Peach / Coral
  "#9333ea", // Royal Purple
  "#0284c7", // Sky Cyan
  "#d97706", // Amber
  "#e11d48", // Rose Red
  "#4f46e5", // Deep Indigo
  "#0d9488", // Deep Teal
];

// Helper functions for SVG donut arcs
const polarToCartesian = (cx: number, cy: number, radius: number, angleDegrees: number) => {
  const radians = ((angleDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
};

const buildDonutArc = (
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number
) => {
  const delta = endAngle - startAngle;
  // Cap at 359.99 to avoid SVG full-circle ambiguity
  const clampedEnd = delta >= 360 ? startAngle + 359.99 : endAngle;
  const p1 = polarToCartesian(cx, cy, outerR, clampedEnd);
  const p2 = polarToCartesian(cx, cy, outerR, startAngle);
  const p3 = polarToCartesian(cx, cy, innerR, startAngle);
  const p4 = polarToCartesian(cx, cy, innerR, clampedEnd);
  const largeArc = delta > 180 ? 1 : 0;

  return `M ${p2.x} ${p2.y} A ${outerR} ${outerR} 0 ${largeArc} 1 ${p1.x} ${p1.y} L ${p4.x} ${p4.y} A ${innerR} ${innerR} 0 ${largeArc} 0 ${p3.x} ${p3.y} Z`;
};

export const CommandCentreView: React.FC<CommandCentreViewProps> = ({
  employees,
  assets,
  cycles,
  stats,
  onNavigate,
}) => {
  // Compute department breakdown dynamically from employees
  const departmentStats: DepartmentStat[] = React.useMemo(() => {
    const map = new Map<string, number>();
    employees.forEach((emp) => {
      const dept = emp.department_name || "General Consulting";
      map.set(dept, (map.get(dept) || 0) + 1);
    });

    const total = employees.length || 1;
    return Array.from(map.entries())
      .map(([name, headcount]) => ({
        name,
        headcount,
        pct: Math.round((headcount / total) * 100),
      }))
      .sort((a, b) => b.headcount - a.headcount);
  }, [employees]);

  const allocatedAssetsCount = assets.filter((a) => a.employee_id).length;
  const coveragePct = Math.round((allocatedAssetsCount / (employees.length || 1)) * 100);

  const [centerTab, setCenterTab] = useState<"command" | "dashboard">("command");
  const [viewMode, setViewMode] = useState<"donut" | "bars">("donut");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const totalStaff = employees.length || 1;
  const slices = useMemo(() => {
    let cumulative = 0;
    return departmentStats.map((dept, idx) => {
      const sliceAngle = (dept.headcount / totalStaff) * 360;
      const startAngle = cumulative;
      const endAngle = cumulative + sliceAngle;
      cumulative = endAngle;
      const color = DEPT_COLORS[idx % DEPT_COLORS.length];
      return {
        ...dept,
        startAngle,
        endAngle,
        color,
      };
    });
  }, [departmentStats, totalStaff]);

  const handleExportDigest = () => {
    const summary = [
      "SENRAB CONSULTECH - EXECUTIVE WORKFORCE DIGEST",
      `Generated: ${new Date().toISOString().slice(0, 10)}`,
      `Tenant ID: 1 • Domain: senrab.com`,
      `Total Active Workforce: ${stats.totalEmployees}`,
      `Hardware Allocation: ${coveragePct}% (${allocatedAssetsCount} / ${stats.totalAssets} fleet units assigned)`,
      `Active Appraisal Cycles: ${stats.activeCycles} (OKR, MBO, BSC)`,
      `Pending Approvals: ${stats.pendingLeaves}`,
      "",
      "PRACTICE / DEPARTMENT BREAKDOWN:",
      ...departmentStats.map((d) => `- ${d.name}: ${d.headcount} staff (${d.pct}% share)`),
    ].join("\n");

    const blob = new Blob([summary], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `senrab_executive_digest_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Title & Context */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Icons.CommandCentre size={22} color={colors.indigoAction} />
            <h1
              style={{
                fontSize: typography.sizes.xl,
                fontWeight: typography.weights.bold,
                color: colors.textPrimary,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Command Centre &amp; Dashboard
            </h1>
            <Badge variant="info" size="sm">Live Enterprise Intelligence</Badge>
          </div>
          <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
            Unified single pane of glass aggregating real-time workforce telemetry, performance cycles, and absence heatmaps.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <div style={{ display: "flex", backgroundColor: colors.surfaceSubtle, padding: "2px", borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
            <Button
              variant={centerTab === "command" ? "primary" : "outline"}
              size="sm"
              onClick={() => setCenterTab("command")}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.CommandCentre size={14} />
                <span>Command Pulse</span>
              </span>
            </Button>
            <Button
              variant={centerTab === "dashboard" ? "primary" : "outline"}
              size="sm"
              onClick={() => setCenterTab("dashboard")}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Activity size={14} />
                <span>Dashboard &amp; Heatmaps</span>
              </span>
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={handleExportDigest}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <Icons.FileText size={14} />
              <span>Export Digest</span>
            </span>
          </Button>
        </div>
      </div>

      {/* Module 1: The "Daily Brief" Contextual Intelligence Feed */}
      <div
        style={{
          border: `1px solid rgba(99, 102, 241, 0.3)`,
          borderTop: `3px solid ${colors.indigoAction}`,
          borderRadius: radii.md,
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1.5rem",
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)",
          boxShadow: "0 2px 8px rgba(79, 70, 229, 0.06)",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.45rem" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: colors.indigoAction, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <Icons.Sparkles size={14} color={colors.indigoAction} />
              <span>Dede — AI Daily Brief • {formatDate(new Date())}</span>
            </span>
            <Badge variant="success" size="sm">Sentiment +5%</Badge>
          </div>
          <div style={{ fontSize: typography.sizes.sm, color: colors.textPrimary, lineHeight: 1.5 }}>
            <div style={{ marginBottom: "0.4rem", fontWeight: 600 }}>Good morning, Paa. Here is your morning briefing:</div>
            <ul style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <li>
                <strong>{stats.pendingLeaves} leave approvals</strong> require your attention.
              </li>
              <li>
                <strong>Benedicta&apos;s Q4 OKR self-review</strong> is in calibration.
              </li>
              <li>
                Your 45-member team&apos;s average sentiment is <strong>94% positive</strong> this week across Accra and London hubs.
              </li>
            </ul>
          </div>

          {/* Dynamic Contextual Action Chips */}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
            <button
              onClick={() => onNavigate("time_and_leave")}
              style={{
                padding: "0.25rem 0.65rem",
                borderRadius: radii.full,
                border: `1px solid rgba(79, 70, 229, 0.3)`,
                backgroundColor: "#ffffff",
                fontSize: "11px",
                color: colors.indigoAction,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Review Pending Leaves ({stats.pendingLeaves}) →
            </button>
            <button
              onClick={() => onNavigate("performance_pms")}
              style={{
                padding: "0.25rem 0.65rem",
                borderRadius: radii.full,
                border: `1px solid rgba(147, 51, 234, 0.3)`,
                backgroundColor: "#ffffff",
                fontSize: "11px",
                color: colors.frameworkOkr,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Progress Check-ins & OKRs →
            </button>
            <button
              onClick={() => onNavigate("asset_management")}
              style={{
                padding: "0.25rem 0.65rem",
                borderRadius: radii.full,
                border: `1px solid rgba(16, 185, 129, 0.3)`,
                backgroundColor: "#ffffff",
                fontSize: "11px",
                color: colors.emeraldDark,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Hardware and Fleet (5 In Depot) →
            </button>
          </div>
        </div>

        {/* Vibe Check (Upgraded with Voice Note option) */}
        <div
          style={{
            width: "320px",
            padding: "0.9rem 1.1rem",
            background: "linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)",
            border: `1px solid rgba(249, 115, 22, 0.28)`,
            borderTop: `3px solid #f97316`,
            borderRadius: radii.md,
            flexShrink: 0,
            boxShadow: "0 2px 6px rgba(249, 115, 22, 0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: colors.peachDark }}>
              Team Vibe Check
            </span>
            <span style={{ fontSize: "10px", color: colors.peachDark, fontWeight: 600, backgroundColor: colors.peachSubtle, padding: "0.1rem 0.4rem", borderRadius: radii.full }}>
              Anonymous Pulse
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.35rem", marginBottom: "0.5rem" }}>
            {["🚀 Thriving", "😊 Focused", "😐 Neutral", "😓 Stressed"].map((vibe) => (
              <button
                key={vibe}
                onClick={() => alert(`Anonymous sentiment recorded: ${vibe}`)}
                style={{
                  flex: 1,
                  padding: "0.25rem 0.2rem",
                  fontSize: "10px",
                  borderRadius: radii.sm,
                  border: `1px solid rgba(249, 115, 22, 0.2)`,
                  backgroundColor: "#ffffff",
                  cursor: "pointer",
                  textAlign: "center",
                  fontWeight: 500,
                }}
              >
                {vibe}
              </button>
            ))}
          </div>

          <button
            onClick={() => alert("Simulating 10-second voice note recording...\nDede AI Transcribing: 'Delivered client cloud migration sprint ahead of schedule.'\nSentiment: +0.89 (Highly Positive).")}
            style={{
              width: "100%",
              padding: "0.4rem 0.5rem",
              borderRadius: radii.sm,
              border: `1px solid rgba(249, 115, 22, 0.3)`,
              backgroundColor: "#ffffff",
              fontSize: "11px",
              color: colors.peachDark,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              fontWeight: 600,
            }}
          >
            <Icons.Mic size={13} color="#ea580c" />
            <span>Record 10s Voice Note (Transcribed by Dede)</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (6 Operational Pillars with Icons) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
        <MetricCard
          label="Active Workforce"
          value={stats.totalEmployees}
          subtext="Full-time staff across 7 practices"
          variant="indigo"
          icon={<Icons.Users size={16} />}
          badge={<Badge variant="success" size="sm">100% Active</Badge>}
          onClick={() => onNavigate("workforce_directory")}
        />
        <MetricCard
          label="Appraisal Cycles"
          value={stats.activeCycles}
          subtext="BSC & OKR methodologies"
          variant="purple"
          icon={<Icons.Target size={16} />}
          badge={<Badge variant="info" size="sm">Active</Badge>}
          onClick={() => onNavigate("performance_pms")}
        />
        <MetricCard
          label="Pending Leaves"
          value={stats.pendingLeaves}
          subtext="Time-off & absence sign-offs"
          variant="peach"
          icon={<Icons.Calendar size={16} />}
          badge={stats.pendingLeaves > 0 ? <Badge variant="warning" size="sm">Action Due</Badge> : undefined}
          onClick={() => onNavigate("time_and_leave")}
        />
        <MetricCard
          label="Hardware & Fleet"
          value={`${coveragePct}%`}
          subtext={`${allocatedAssetsCount} of ${stats.totalAssets} fleet units assigned`}
          variant="cyan"
          icon={<Icons.Laptop size={16} />}
          badge={<Badge variant="info" size="sm">Equipped</Badge>}
          onClick={() => onNavigate("asset_management")}
        />
        <MetricCard
          label="Open IT Tickets"
          value={stats.openTickets}
          subtext="Helpdesk requests in triage"
          variant="rose"
          icon={<Icons.LifeBuoy size={16} />}
          onClick={() => onNavigate("helpdesk")}
        />
        <MetricCard
          label="Client Engagements"
          value={stats.activeProjects}
          subtext="Pan-African consulting roadmaps"
          variant="emerald"
          icon={<Icons.Briefcase size={16} />}
          onClick={() => onNavigate("projects")}
        />
      </div>

      {/* Main Operational Split or Live Dashboard */}
      {centerTab === "command" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1.75rem" }}>
        {/* Left Column: Practice Distribution as Graph / Pie Chart */}
        <div>
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              padding: "1.25rem 1.5rem",
              boxShadow: shadows.sm,
            }}
          >
            {/* Header: Title, Stats pill & View Toggle */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <h2
                    style={{
                      fontSize: typography.sizes.base,
                      fontWeight: typography.weights.semibold,
                      color: colors.textPrimary,
                      margin: 0,
                    }}
                  >
                    Practice & Department Distribution
                  </h2>
                  <Badge variant="info" size="sm">
                    {departmentStats.length} Practices
                  </Badge>
                </div>
                <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: "0.2rem" }}>
                  Workforce breakdown across organizational practices
                </div>
              </div>

              {/* View Toggle */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  backgroundColor: colors.surfaceSubtle,
                  borderRadius: radii.sm,
                  padding: "3px",
                  border: `1px solid ${colors.border}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode("donut")}
                  style={{
                    padding: "0.25rem 0.65rem",
                    fontSize: "12px",
                    fontWeight: viewMode === "donut" ? 600 : 500,
                    color: viewMode === "donut" ? colors.brandNavy : colors.textMuted,
                    backgroundColor: viewMode === "donut" ? "#ffffff" : "transparent",
                    border: "none",
                    borderRadius: radii.sm,
                    cursor: "pointer",
                    boxShadow: viewMode === "donut" ? shadows.xs : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  ◉ Pie Chart
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("bars")}
                  style={{
                    padding: "0.25rem 0.65rem",
                    fontSize: "12px",
                    fontWeight: viewMode === "bars" ? 600 : 500,
                    color: viewMode === "bars" ? colors.brandNavy : colors.textMuted,
                    backgroundColor: viewMode === "bars" ? "#ffffff" : "transparent",
                    border: "none",
                    borderRadius: radii.sm,
                    cursor: "pointer",
                    boxShadow: viewMode === "bars" ? shadows.xs : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  ▮ Bar Graph
                </button>
              </div>
            </div>

            {viewMode === "donut" ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1.75rem",
                  flexWrap: "wrap",
                }}
              >
                {/* Interactive SVG Donut Chart */}
                <div
                  style={{
                    position: "relative",
                    width: "200px",
                    height: "200px",
                    flexShrink: 0,
                    margin: "0 auto",
                  }}
                >
                  <svg
                    viewBox="0 0 200 200"
                    width="100%"
                    height="100%"
                  >
                    {slices.map((slice, idx) => {
                      const isHovered = hoveredIdx === idx;
                      const d = buildDonutArc(
                        100,
                        100,
                        isHovered ? 48 : 52,
                        isHovered ? 88 : 82,
                        slice.startAngle,
                        slice.endAngle
                      );
                      return (
                        <path
                          key={slice.name}
                          d={d}
                          fill={slice.color}
                          stroke="#ffffff"
                          strokeWidth="2"
                          strokeLinejoin="round"
                          style={{
                            cursor: "pointer",
                            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                            opacity: hoveredIdx !== null && !isHovered ? 0.6 : 1,
                            filter: isHovered ? "drop-shadow(0 4px 8px rgba(0,0,0,0.15))" : "none",
                          }}
                          onMouseEnter={() => setHoveredIdx(idx)}
                          onMouseLeave={() => setHoveredIdx(null)}
                          onClick={() => onNavigate("workforce_directory")}
                        >
                          <title>{`${slice.name}: ${slice.headcount} staff (${slice.pct}%)`}</title>
                        </path>
                      );
                    })}
                  </svg>

                  {/* Centered Focus Metric */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "none",
                      textAlign: "center",
                      padding: "1rem",
                    }}
                  >
                    <div
                      style={{
                        fontSize: hoveredIdx !== null ? "22px" : "26px",
                        fontWeight: 700,
                        color: hoveredIdx !== null ? slices[hoveredIdx].color : colors.textPrimary,
                        lineHeight: 1,
                        fontVariantNumeric: "tabular-nums",
                        transition: "color 0.2s ease",
                      }}
                    >
                      {hoveredIdx !== null ? slices[hoveredIdx].headcount : stats.totalEmployees}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: colors.textSecondary,
                        marginTop: "0.2rem",
                        maxWidth: "100px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {hoveredIdx !== null ? slices[hoveredIdx].name : "Total Staff"}
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: colors.textMuted,
                        marginTop: "0.1rem",
                      }}
                    >
                      {hoveredIdx !== null ? `${slices[hoveredIdx].pct}% of total` : "Active Workforce"}
                    </div>
                  </div>
                </div>

                {/* Right Legend: Clean, clickable practice list */}
                <div
                  style={{
                    flex: 1,
                    minWidth: "200px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                  }}
                >
                  {slices.map((slice, idx) => {
                    const isHovered = hoveredIdx === idx;
                    return (
                      <div
                        key={slice.name}
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        onClick={() => onNavigate("workforce_directory")}
                        style={{
                          padding: "0.35rem 0.5rem",
                          borderRadius: radii.sm,
                          backgroundColor: isHovered ? colors.surfaceSubtle : "transparent",
                          cursor: "pointer",
                          transition: "background-color 0.15s ease",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "0.5rem",
                            marginBottom: "0.2rem",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0, flex: 1 }}>
                            <span
                              style={{
                                width: "9px",
                                height: "9px",
                                borderRadius: "50%",
                                backgroundColor: slice.color,
                                flexShrink: 0,
                                transform: isHovered ? "scale(1.3)" : "scale(1)",
                                transition: "transform 0.15s ease",
                              }}
                            />
                            <span
                              style={{
                                fontSize: typography.sizes.xs,
                                fontWeight: isHovered ? typography.weights.semibold : typography.weights.medium,
                                color: isHovered ? slice.color : colors.textPrimary,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {slice.name}
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexShrink: 0 }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                color: isHovered ? "#ffffff" : colors.textSecondary,
                                backgroundColor: isHovered ? slice.color : colors.surfaceSubtle,
                                padding: "0.1rem 0.45rem",
                                borderRadius: radii.full,
                                fontVariantNumeric: "tabular-nums",
                                transition: "all 0.15s ease",
                              }}
                            >
                              {slice.headcount} staff
                            </span>
                            <span
                              style={{
                                fontSize: "11px",
                                color: colors.textMuted,
                                width: "30px",
                                textAlign: "right",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {slice.pct}%
                            </span>
                          </div>
                        </div>

                        {/* Visual mini-bar */}
                        <div
                          style={{
                            height: "3px",
                            backgroundColor: colors.surfaceSubtle,
                            borderRadius: radii.full,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${slice.pct}%`,
                              height: "100%",
                              backgroundColor: slice.color,
                              borderRadius: radii.full,
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Bar Graph Mode: Clean ranked visual bars */
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "0.5rem 0" }}>
                {slices.map((slice) => (
                  <div
                    key={slice.name}
                    onClick={() => onNavigate("workforce_directory")}
                    style={{
                      cursor: "pointer",
                      padding: "0.4rem 0.5rem",
                      borderRadius: radii.sm,
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.surfaceSubtle)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: slice.color }} />
                        <span style={{ fontSize: typography.sizes.xs, fontWeight: typography.weights.medium, color: colors.textPrimary }}>
                          {slice.name}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: colors.textSecondary }}>
                          {slice.headcount} staff
                        </span>
                        <span style={{ fontSize: "11px", color: colors.textMuted, fontVariantNumeric: "tabular-nums" }}>
                          ({slice.pct}%)
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        height: "8px",
                        backgroundColor: colors.surfaceSubtle,
                        borderRadius: radii.full,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${slice.pct}%`,
                          height: "100%",
                          backgroundColor: slice.color,
                          borderRadius: radii.full,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: High-Priority Operational Actions & Framework Governance */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Action Queue */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h2 style={{ fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.textPrimary, margin: 0 }}>
                Pending Sign-Offs & Actions
              </h2>
              <Badge variant="warning" size="sm">3 Items</Badge>
            </div>

            <div
              style={{
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                backgroundColor: colors.surface,
                overflow: "hidden",
              }}
            >
              {[
                {
                  title: "Annual Leave Request — Benedicta Agbesi",
                  subtitle: "People & Culture • 5 days requested (Apr 14 - Apr 18)",
                  actionText: "Review",
                  view: "time_and_leave" as ModuleViewKey,
                  badge: <Badge variant="warning" size="sm">Pending</Badge>,
                },
                {
                  title: "Hardware Reallocation — Philip Aryee",
                  subtitle: "SEN-LAP-045 • ThinkPad P16 Gen 2 awaiting confirmation",
                  actionText: "Inspect",
                  view: "asset_management" as ModuleViewKey,
                  badge: <Badge variant="info" size="sm">Assigned</Badge>,
                },
                {
                  title: "Q4 OKR Appraisal Cycle Calibration",
                  subtitle: "Enterprise Advisory • 10 objectives ready for manager sign-off",
                  actionText: "Calibrate",
                  view: "performance_pms" as ModuleViewKey,
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "0.85rem 1rem",
                    borderBottom: idx === 2 ? "none" : `1px solid ${colors.borderSubtle}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                      <span style={{ fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.textPrimary }}>
                        {item.title}
                      </span>
                      {item.badge}
                    </div>
                    <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>
                      {item.subtitle}
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => onNavigate(item.view)}>
                    {item.actionText}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Framework Governance Summary */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h2 style={{ fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.textPrimary, margin: 0 }}>
                Appraisal Framework Governance
              </h2>
            </div>

            <div
              style={{
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                backgroundColor: colors.surface,
                padding: "1rem",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                <div style={{ padding: "0.5rem", backgroundColor: colors.frameworkOkrBg, borderRadius: radii.sm, border: `1px solid ${colors.frameworkOkrBorder}` }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: colors.frameworkOkr }}>OKR</div>
                  <div style={{ fontSize: "10px", color: colors.textMuted }}>Objectives & KRs</div>
                </div>
                <div style={{ padding: "0.5rem", backgroundColor: colors.frameworkMboBg, borderRadius: radii.sm, border: `1px solid ${colors.frameworkMboBorder}` }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: colors.frameworkMbo }}>MBO</div>
                  <div style={{ fontSize: "10px", color: colors.textMuted }}>SMART Targets</div>
                </div>
                <div style={{ padding: "0.5rem", backgroundColor: colors.frameworkBscBg, borderRadius: radii.sm, border: `1px solid ${colors.frameworkBscBorder}` }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: colors.frameworkBsc }}>BSC</div>
                  <div style={{ fontSize: "10px", color: colors.textMuted }}>4 Perspectives</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : (
      /* Dashboard Tab: Live Charts, Progress Heatmaps & Absence Analytics */
      <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
        {/* At-a-Glance Key Indicators Bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radii.md,
            padding: "1rem 1.25rem",
            boxShadow: shadows.sm,
          }}
        >
          <div
            onClick={() => onNavigate("time_and_leave")}
            style={{ cursor: "pointer", borderRight: `1px solid ${colors.borderSubtle}`, paddingRight: "1rem" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: colors.textMuted, fontSize: typography.sizes.xs }}>
              <Icons.Calendar size={14} color="#10b981" />
              <span>Away Today</span>
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#10b981", margin: "0.2rem 0" }}>2</div>
            <div style={{ fontSize: "11px", color: colors.textMuted }}>On approved leave</div>
          </div>

          <div
            onClick={() => onNavigate("time_and_leave")}
            style={{ cursor: "pointer", borderRight: `1px solid ${colors.borderSubtle}`, paddingRight: "1rem" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: colors.textMuted, fontSize: typography.sizes.xs }}>
              <Icons.Clock size={14} color="#f59e0b" />
              <span>Pending Leaves</span>
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f59e0b", margin: "0.2rem 0" }}>{stats.pendingLeaves}</div>
            <div style={{ fontSize: "11px", color: colors.textMuted }}>Awaiting decision</div>
          </div>

          <div
            onClick={() => onNavigate("performance_pms")}
            style={{ cursor: "pointer", borderRight: `1px solid ${colors.borderSubtle}`, paddingRight: "1rem" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: colors.textMuted, fontSize: typography.sizes.xs }}>
              <Icons.Target size={14} color={colors.indigoAction} />
              <span>Objectives Approved</span>
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: colors.indigoAction, margin: "0.2rem 0" }}>82%</div>
            <div style={{ fontSize: "11px", color: colors.textMuted }}>18 of 22 active goals</div>
          </div>

          <div
            onClick={() => onNavigate("performance_setup")}
            style={{ cursor: "pointer", borderRight: `1px solid ${colors.borderSubtle}`, paddingRight: "1rem" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: colors.textMuted, fontSize: typography.sizes.xs }}>
              <Icons.Sliders size={14} color="#6366f1" />
              <span>Active Cycle</span>
            </div>
            <div style={{ fontSize: "1.35rem", fontWeight: 700, color: colors.textPrimary, margin: "0.25rem 0" }}>2026 Annual</div>
            <div style={{ fontSize: "11px", color: colors.emeraldDark, fontWeight: 600 }}>Open for Appraisals</div>
          </div>

          <div
            onClick={() => onNavigate("asset_management")}
            style={{ cursor: "pointer" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: colors.textMuted, fontSize: typography.sizes.xs }}>
              <Icons.Laptop size={14} color="#06b6d4" />
              <span>Fleet Assigned</span>
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#06b6d4", margin: "0.2rem 0" }}>{coveragePct}%</div>
            <div style={{ fontSize: "11px", color: colors.textMuted }}>{allocatedAssetsCount} of {stats.totalAssets} devices</div>
          </div>
        </div>

        {/* Analytics & Heatmaps 2-Column Split */}
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "1.75rem" }}>
          {/* Left Column: Leave Trend & Objective Heatmap */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* 12-Month Leave Trend Bar Chart */}
            <div
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                padding: "1.25rem 1.5rem",
                boxShadow: shadows.sm,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.textPrimary, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Icons.TrendingUp size={16} color={colors.indigoAction} />
                    Leave Activity & Absence Trend
                  </h3>
                  <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: "0.2rem" }}>
                    Requests by start month (Approved vs Pending decision)
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: "#10b981", display: "inline-block" }} />
                    <span style={{ color: colors.textSecondary }}>Approved</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: "#f59e0b", display: "inline-block" }} />
                    <span style={{ color: colors.textSecondary }}>Pending</span>
                  </div>
                </div>
              </div>

              {/* SVG 12-Month Bar Chart */}
              <div style={{ width: "100%", overflowX: "auto" }}>
                <svg viewBox="0 0 600 180" style={{ width: "100%", height: "auto", minWidth: "480px" }}>
                  {[0, 0.5, 1].map((f) => {
                    const yVal = 20 + 130 * (1 - f);
                    return (
                      <g key={f}>
                        <line x1={35} x2={585} y1={yVal} y2={yVal} stroke={colors.borderSubtle} strokeDasharray="3 3" />
                        <text x={28} y={yVal + 4} fontSize="10" textAnchor="end" fill={colors.textMuted}>{Math.round(12 * f)}</text>
                      </g>
                    );
                  })}
                  {[
                    { m: "Jun", app: 4, pend: 1 },
                    { m: "Jul", app: 7, pend: 0 },
                    { m: "Aug", app: 9, pend: 2 },
                    { m: "Sep", app: 5, pend: 1 },
                    { m: "Oct", app: 6, pend: 0 },
                    { m: "Nov", app: 8, pend: 2 },
                    { m: "Dec", app: 12, pend: 3 },
                    { m: "Jan", app: 4, pend: 1 },
                    { m: "Feb", app: 6, pend: 0 },
                    { m: "Mar", app: 5, pend: 2 },
                    { m: "Apr", app: 8, pend: 1 },
                    { m: "May", app: 11, pend: 2 },
                  ].map((s, idx) => {
                    const slotWidth = 550 / 12;
                    const x0 = 35 + idx * slotWidth + 6;
                    const barW = 13;
                    const maxV = 12;
                    const hApp = (s.app / maxV) * 130;
                    const hPend = (s.pend / maxV) * 130;
                    const yApp = 150 - hApp;
                    const yPend = 150 - hPend;
                    return (
                      <g key={s.m}>
                        <rect x={x0} y={yApp} width={barW} height={hApp} fill="#10b981" rx="2">
                          <title>{`${s.m}: ${s.app} Approved`}</title>
                        </rect>
                        <rect x={x0 + barW + 2} y={yPend} width={barW} height={hPend} fill="#f59e0b" rx="2">
                          <title>{`${s.m}: ${s.pend} Pending`}</title>
                        </rect>
                        <text x={x0 + barW} y={170} fontSize="10" textAnchor="middle" fill={colors.textMuted}>
                          {s.m}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Department Objectives & Progress Heatmap */}
            <div
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                padding: "1.25rem 1.5rem",
                boxShadow: shadows.sm,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.textPrimary, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Icons.Target size={16} color={colors.indigoAction} />
                    Objective Progress by Practice
                  </h3>
                  <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: "0.2rem" }}>
                    Average completion and approval health across consulting teams
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => onNavigate("performance_pms")}>
                  PMS Hub →
                </Button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                {[
                  { dept: "Technology Advisory", total: 11, approved: 10, avgProgress: 78, color: "#2563eb" },
                  { dept: "People & Culture", total: 5, approved: 5, avgProgress: 88, color: "#059669" },
                  { dept: "Finance & Governance", total: 3, approved: 2, avgProgress: 65, color: "#ea580c" },
                  { dept: "Customer Operations", total: 3, approved: 1, avgProgress: 60, color: "#0284c7" },
                  { dept: "Executive Leadership", total: 4, approved: 4, avgProgress: 94, color: "#9333ea" },
                ].map((item) => (
                  <div key={item.dept}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", marginBottom: "0.3rem" }}>
                      <span style={{ fontWeight: 600, color: colors.textPrimary }}>{item.dept}</span>
                      <span style={{ fontSize: "12px", color: colors.textMuted }}>
                        <strong style={{ color: colors.textPrimary }}>{item.avgProgress}%</strong> · {item.approved} of {item.total} approved
                      </span>
                    </div>
                    <div style={{ height: "8px", backgroundColor: colors.surfaceSubtle, borderRadius: radii.full, overflow: "hidden", border: `1px solid ${colors.borderSubtle}` }}>
                      <div
                        style={{
                          width: `${item.avgProgress}%`,
                          height: "100%",
                          backgroundColor: item.color,
                          borderRadius: radii.full,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Headcount Geo & Absences */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Regional Headcount Geo Distribution */}
            <div
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                padding: "1.25rem 1.5rem",
                boxShadow: shadows.sm,
              }}
            >
              <h3 style={{ margin: "0 0 0.2rem 0", fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.textPrimary, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icons.Building size={16} color={colors.indigoAction} />
                Regional Hub Distribution
              </h3>
              <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted, marginBottom: "1rem" }}>
                Pan-African workforce deployment across hub offices
              </div>

              {/* Segmented Geo Bar */}
              <div style={{ display: "flex", height: "16px", borderRadius: radii.sm, overflow: "hidden", marginBottom: "0.85rem", border: `1px solid ${colors.border}` }}>
                <div title="Accra: 15 staff (62%)" style={{ width: "62%", backgroundColor: "#0f5c4d" }} />
                <div title="London: 4 staff (17%)" style={{ width: "17%", backgroundColor: "#2563eb" }} />
                <div title="Lagos: 3 staff (13%)" style={{ width: "13%", backgroundColor: "#059669" }} />
                <div title="Nairobi: 2 staff (8%)" style={{ width: "8%", backgroundColor: "#ea580c" }} />
              </div>

              {/* Office Breakdown Pills */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {[
                  { office: "Accra Hub (HQ)", count: 15, pct: "62%", color: "#0f5c4d" },
                  { office: "London Hub", count: 4, pct: "17%", color: "#2563eb" },
                  { office: "Lagos Hub", count: 3, pct: "13%", color: "#059669" },
                  { office: "Nairobi Hub", count: 2, pct: "8%", color: "#ea580c" },
                ].map((hub) => (
                  <div
                    key={hub.office}
                    style={{
                      padding: "0.5rem 0.65rem",
                      border: `1px solid ${colors.borderSubtle}`,
                      borderRadius: radii.sm,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: hub.color }} />
                      <span style={{ fontSize: "12px", color: colors.textPrimary, fontWeight: 500 }}>{hub.office}</span>
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textSecondary }}>{hub.count} ({hub.pct})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Team Absences */}
            <div
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                padding: "1.25rem 1.5rem",
                boxShadow: shadows.sm,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.textPrimary, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Icons.Calendar size={16} color={colors.indigoAction} />
                    Upcoming Team Absences
                  </h3>
                  <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: "0.2rem" }}>
                    Scheduled leave starting in next 14 days
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => onNavigate("time_and_leave")}>
                  Leave Calendar →
                </Button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {[
                  { name: "Benedicta Agbesi", dept: "People & Culture", dates: "18 May – 22 May", type: "Annual Leave", badge: "Approved" },
                  { name: "Philip Aryee", dept: "Cloud Advisory", dates: "01 Jun – 05 Jun", type: "Annual Leave", badge: "Approved" },
                  { name: "Doreen Wesley", dept: "Customer Ops", dates: "15 Jun – 19 Jun", type: "Casual Leave", badge: "Pending" },
                ].map((leave, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "0.6rem 0.75rem",
                      backgroundColor: colors.surfaceSubtle,
                      border: `1px solid ${colors.borderSubtle}`,
                      borderRadius: radii.sm,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: colors.textPrimary }}>{leave.name}</div>
                      <div style={{ fontSize: "11px", color: colors.textMuted }}>{leave.dept} · {leave.dates}</div>
                    </div>
                    <Badge variant={leave.badge === "Approved" ? "success" : "warning"} size="sm">
                      {leave.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Hub Navigation Cards */}
            <div
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                padding: "1.25rem 1.5rem",
                boxShadow: shadows.sm,
              }}
            >
              <h3 style={{ margin: "0 0 0.75rem 0", fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.textPrimary }}>
                Core Ecosystem Jump-Points
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {[
                  { name: "People Directory", view: "workforce_directory" as ModuleViewKey, icon: <Icons.Users size={14} /> },
                  { name: "My Performance", view: "my_performance" as ModuleViewKey, icon: <Icons.Target size={14} /> },
                  { name: "Document Centre", view: "document_centre" as ModuleViewKey, icon: <Icons.FileText size={14} /> },
                  { name: "IT Hardware Assets", view: "asset_management" as ModuleViewKey, icon: <Icons.Laptop size={14} /> },
                  { name: "Projects & Gigs", view: "projects" as ModuleViewKey, icon: <Icons.Briefcase size={14} /> },
                  { name: "Governance & Reports", view: "reports_analytics" as ModuleViewKey, icon: <Icons.BarChart size={14} /> },
                ].map((hub) => (
                  <button
                    key={hub.name}
                    type="button"
                    onClick={() => onNavigate(hub.view)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.55rem 0.75rem",
                      backgroundColor: colors.surfaceSubtle,
                      border: `1px solid ${colors.border}`,
                      borderRadius: radii.sm,
                      color: colors.textPrimary,
                      fontSize: "12px",
                      fontWeight: 500,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ color: colors.indigoAction }}>{hub.icon}</span>
                    <span>{hub.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

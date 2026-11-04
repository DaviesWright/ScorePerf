import React from "react";
import { colors, typography, radii } from "../../design-system/tokens";
import { MetricCard } from "../../design-system/MetricCard";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { DataTable, Column } from "../../design-system/DataTable";
import { EmployeeRecord, AssetRecord } from "./WorkforceDirectoryView";
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

  const handleExportDigest = () => {
    const summary = [
      "SENRAB CONSULTECH - EXECUTIVE WORKFORCE DIGEST",
      `Generated: ${new Date().toISOString().slice(0, 10)}`,
      `Tenant ID: 1 • Domain: senrab.com`,
      `Total Active Workforce: ${stats.totalEmployees}`,
      `Hardware Allocation: ${coveragePct}% (${allocatedAssetsCount} / ${stats.totalAssets} fleet units assigned)`,
      `Active Appraisal Cycles: ${stats.activeCycles} (Pure OKR, MBO, BSC)`,
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

  const deptColumns: Column<DepartmentStat>[] = [
    {
      header: "Practice / Department",
      accessor: (dept) => (
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ fontWeight: typography.weights.medium, color: colors.textPrimary }}>
            {dept.name}
          </span>
        </div>
      ),
    },
    {
      header: "Headcount",
      width: "120px",
      align: "right",
      accessor: (dept) => (
        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: typography.weights.semibold }}>
          {dept.headcount}
        </span>
      ),
    },
    {
      header: "Share of Workforce",
      width: "200px",
      accessor: (dept) => (
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <div
            style={{
              flex: 1,
              height: "6px",
              backgroundColor: colors.surfaceSubtle,
              borderRadius: radii.full,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${dept.pct}%`,
                height: "100%",
                backgroundColor: colors.brandBlue,
                borderRadius: radii.full,
              }}
            />
          </div>
          <span style={{ fontSize: "11px", color: colors.textMuted, width: "32px", textAlign: "right" }}>
            {dept.pct}%
          </span>
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Title & Context */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.25rem" }}>
        <div>
          <h1
            style={{
              fontSize: typography.sizes.xl,
              fontWeight: typography.weights.bold,
              color: colors.textPrimary,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Workforce Command Centre
          </h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button variant="outline" size="sm" onClick={handleExportDigest}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <Icons.FileText size={14} />
              <span>Export Digest</span>
            </span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onNavigate("workforce_directory")}>
            Workforce Directory
          </Button>
          <Button variant="primary" size="sm" onClick={() => onNavigate("performance_pms")}>
            Appraisal Cycles
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
              <span>Dede — AI Daily Brief • {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</span>
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

      {/* Primary KPI Grid (Vibrant colored tiles) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <MetricCard
          label="Active Workforce"
          value={stats.totalEmployees}
          subtext="Full-time staff across 7 practices"
          variant="indigo"
          icon={<Icons.Users size={15} />}
          badge={<Badge variant="success" size="sm">100% Active</Badge>}
          onClick={() => onNavigate("workforce_directory")}
        />
        <MetricCard
          label="Hardware and Fleet"
          value={`${coveragePct}%`}
          subtext={`${allocatedAssetsCount} of ${stats.totalAssets} fleet units assigned`}
          variant="cyan"
          icon={<Icons.Laptop size={15} />}
          badge={<Badge variant="info" size="sm">Fully Equipped</Badge>}
          onClick={() => onNavigate("asset_management")}
        />
        <MetricCard
          label="Appraisal Frameworks"
          value={stats.activeCycles}
          subtext="Pure OKR, MBO & BSC cycles active"
          variant="purple"
          icon={<Icons.Target size={15} />}
          badge={<Badge variant="okr" size="sm">Single-Framework</Badge>}
          onClick={() => onNavigate("performance_pms")}
        />
        <MetricCard
          label="Pending Approvals"
          value={stats.pendingLeaves}
          subtext="Time-off & absence sign-offs required"
          variant="peach"
          icon={<Icons.Calendar size={15} />}
          badge={stats.pendingLeaves > 0 ? <Badge variant="warning" size="sm">Action Required</Badge> : undefined}
          onClick={() => onNavigate("time_and_leave")}
        />
      </div>

      {/* Main Operational Split */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1.75rem" }}>
        {/* Left Column: Practice Distribution */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h2 style={{ fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.textPrimary, margin: 0 }}>
              Practice & Department Distribution
            </h2>
            <span style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>
              {departmentStats.length} Practices
            </span>
          </div>

          <DataTable
            columns={deptColumns}
            data={departmentStats}
            keyExtractor={(d) => d.name}
            onRowClick={() => onNavigate("workforce_directory")}
          />
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
                  badge: <Badge variant="okr" size="sm">OKR Pure</Badge>,
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
              <span style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>
                Calibrated
              </span>
            </div>

            <div
              style={{
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                backgroundColor: colors.surface,
                padding: "1rem",
              }}
            >
              <div style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, lineHeight: 1.5, marginBottom: "0.75rem" }}>
                Each appraisal cycle operates strictly under a single governance framework. Framework mixing is prohibited at the database schema level.
              </div>
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
    </div>
  );
};

import React, { useState } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { drillProps } from "../../utils/drill";
import { DataTable, Column } from "../../design-system/DataTable";
import { LeaveRecord } from "./TimeAndLeaveView";
import { AssetRecord } from "./WorkforceDirectoryView";
import { formatDateRange, formatDate } from "../../utils/date";
import { ModuleViewKey } from "../shell/AppSidebar";
import { EssShortcutsHub } from "./ess/EssShortcutsHub";

interface EmployeeSelfServiceViewProps {
  currentEmployee: {
    id: number;
    name: string;
    email: string;
    role: string;
    department: string;
    manager: string;
    annualLeaveTotal: number;
    annualLeaveUsed: number;
  };
  assignedAsset?: AssetRecord | null;
  personalLeaves: LeaveRecord[];
  onRequestLeave: () => void;
  onReportIssue: () => void;
  onOpenPayslip?: () => void;
  onNavigate?: (view: ModuleViewKey) => void;
}

interface PersonalGoal {
  id: number;
  title: string;
  target: string;
  progress: number;
  category: string;
}

export const EmployeeSelfServiceView: React.FC<EmployeeSelfServiceViewProps> = ({
  currentEmployee,
  assignedAsset,
  personalLeaves,
  onRequestLeave,
  onReportIssue,
  onOpenPayslip,
  onNavigate,
}) => {
  const [goals, setGoals] = useState<PersonalGoal[]>([
    {
      id: 1,
      title: "Deliver Cloudflare SaaS Hyperdrive architecture with sub-15ms p99 latency",
      target: "Production verification & benchmarks",
      progress: 90,
      category: "Engineering Excellence",
    },
    {
      id: 2,
      title: "Establish 100% hardware equipment allocation across all 45 practice members",
      target: "Complete asset inventory sign-off",
      progress: 100,
      category: "Operations",
    },
    {
      id: 3,
      title: "Complete H1 Performance Appraisals under pure OKR governance",
      target: "100% self-assessment submission rate",
      progress: 70,
      category: "Strategic Leadership",
    },
  ]);

  const [selfAssessmentSubmitted, setSelfAssessmentSubmitted] = useState(false);
  const [ptoDraftSubmitted, setPtoDraftSubmitted] = useState(false);
  const [gigSubmitted, setGigSubmitted] = useState(false);
  const [synthesisViewed, setSynthesisViewed] = useState(false);

  // Performance Portfolio Tabs
  const [performanceTab, setPerformanceTab] = useState<
    "periods" | "reviews" | "achievements" | "pip"
  >("periods");

  // Selected appraisal period for action drawer
  const [selectedPeriodForAction, setSelectedPeriodForAction] = useState<string | null>(null);
  const [searchReviewQuery, setSearchReviewQuery] = useState("");
  const [activeActionMenuId, setActiveActionMenuId] = useState<number | null>(null);

  const remainingDays = currentEmployee.annualLeaveTotal - currentEmployee.annualLeaveUsed;

  const handleUpdateProgress = (goalId: number, newProgress: number) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, progress: newProgress } : g))
    );
  };

  const leaveColumns: Column<LeaveRecord>[] = [
    {
      header: "Category",
      accessor: (l) => (
        <span style={{ fontWeight: typography.weights.medium, color: colors.textPrimary }}>
          {l.leave_type_name}
        </span>
      ),
    },
    {
      header: "Dates",
      accessor: (l) => (
        <span style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, fontWeight: 500 }}>
          {formatDateRange(l.start_date, l.end_date)} ({l.requested_days} {Number(l.requested_days) === 1 ? "day" : "days"})
        </span>
      ),
    },
    {
      header: "Reason",
      accessor: (l) => (
        <span style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>
          &quot;{l.reason}&quot;
        </span>
      ),
    },
    {
      header: "Status",
      align: "center",
      accessor: (l) => (
        <Badge
          variant={
            l.status === "APPROVED"
              ? "success"
              : l.status === "PENDING"
              ? "warning"
              : "error"
          }
          size="sm"
        >
          {l.status}
        </Badge>
      ),
    },
  ];

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header Profile Summary */}
      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.md,
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: colors.indigoPrimary,
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              fontWeight: 700,
            }}
          >
            PB
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h1
                style={{
                  fontSize: typography.sizes.lg,
                  fontWeight: typography.weights.bold,
                  color: colors.indigoPrimary,
                  margin: 0,
                }}
              >
                {currentEmployee.name}
              </h1>
              <Badge variant="neutral" size="sm">Staff ID: SEN-EMP-001</Badge>
            </div>
            <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: "0.2rem" }}>
              {currentEmployee.role} • {currentEmployee.department} • Reports to: <strong>{currentEmployee.manager}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button variant="outline" size="sm" onClick={onReportIssue}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <Icons.LifeBuoy size={14} />
              <span>IT Support</span>
            </span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onRequestLeave}
            style={{ backgroundColor: colors.indigoAccent, borderColor: colors.indigoAccent }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <Icons.Plus size={14} />
              <span>Request Leave</span>
            </span>
          </Button>
        </div>
      </div>

      {/* ESS 8-Pillar Workflow Shortcut Links & Launchpad */}
      <EssShortcutsHub
        employee={currentEmployee}
        onNavigate={onNavigate}
        onOpenPayslip={onOpenPayslip}
        onRequestLeave={onRequestLeave}
        onReportIssue={onReportIssue}
      />

      {/* Proactive Push Intelligence Feed (The Push-Based HR Standard) */}
      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.indigoBorder}`,
          borderRadius: radii.xl,
          padding: "1.25rem 1.5rem",
          marginBottom: "1.75rem",
          boxShadow: "0 4px 12px rgba(30, 27, 75, 0.04)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: `linear-gradient(90deg, ${colors.indigoAction} 0%, #a855f7 50%, ${colors.emeraldAction} 100%)` }} />
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: radii.md,
                backgroundColor: colors.indigoSubtle,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icons.Sparkles size={16} color={colors.indigoAction} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h3 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>
                  Proactive Push Intelligence
                </h3>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "0.15rem 0.5rem",
                    borderRadius: radii.full,
                    backgroundColor: colors.emeraldSubtle,
                    color: colors.emeraldDark,
                    border: `1px solid ${colors.emeraldBorder}`,
                  }}
                >
                  Push-Based Active
                </span>
              </div>
              <p style={{ margin: "2px 0 0 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
                Agentic AI anticipating your administrative needs so you can focus on actual high-impact work.
              </p>
            </div>
          </div>

          <span style={{ fontSize: "11px", color: colors.textMuted, fontFamily: typography.fontMono }}>
            3 Active Context Nudges
          </span>
        </div>

        {/* 3 Push Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
          
          {/* Push Nudge 1: PTO & Long Weekend Rest */}
          <div
            style={{
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.surfaceSubtle,
              padding: "1rem 1.15rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: colors.peachDark, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <Icons.Calendar size={13} color={colors.peachDark} />
                  Rest & Wellness Optimization
                </span>
                <span style={{ fontSize: "10px", color: colors.textMuted }}>18d PTO balance</span>
              </div>
              <p style={{ margin: "0 0 0.75rem 0", fontSize: typography.sizes.xs, color: colors.textSecondary, lineHeight: 1.5 }}>
                Next Friday is a UK Bank Holiday. I noticed your team sprint has no critical deliverables on Thursday. Would you like me to submit a 1-day leave draft to give you a 4-day weekend?
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px dashed ${colors.border}`, paddingTop: "0.6rem" }}>
              <span style={{ fontSize: "11px", color: colors.textMuted }}>
                {ptoDraftSubmitted ? "✓ Submitted to manager" : "Zero calendar conflict"}
              </span>
              <Button
                variant={ptoDraftSubmitted ? "secondary" : "primary"}
                size="sm"
                disabled={ptoDraftSubmitted}
                onClick={() => setPtoDraftSubmitted(true)}
                style={{
                  backgroundColor: ptoDraftSubmitted ? colors.surface : colors.indigoAccent,
                  borderColor: ptoDraftSubmitted ? colors.border : colors.indigoAccent,
                  fontSize: "11px",
                  padding: "0.25rem 0.65rem",
                }}
              >
                {ptoDraftSubmitted ? "Draft Dispatched ✓" : "1-Click Submit Draft"}
              </Button>
            </div>
          </div>

          {/* Push Nudge 2: Skills-First Internal Gig Matching */}
          <div
            style={{
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.surfaceSubtle,
              padding: "1rem 1.15rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: colors.emeraldDark, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <Icons.Compass size={13} color={colors.emeraldDark} />
                  Skills-First Gig Match (96%)
                </span>
                <span style={{ fontSize: "10px", color: colors.emeraldDark, fontWeight: 700 }}>Top Candidate</span>
              </div>
              <p style={{ margin: "0 0 0.75rem 0", fontSize: typography.sizes.xs, color: colors.textSecondary, lineHeight: 1.5 }}>
                New stretch engagement <strong>Cross-Border Wasm Payment Engine</strong> matches your verified skills in <em>Cloudflare Workers (95%)</em> and <em>Rust (90%)</em>. 10 hrs/wk remote allocation.
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px dashed ${colors.border}`, paddingTop: "0.6rem" }}>
              <span style={{ fontSize: "11px", color: colors.textMuted }}>
                {gigSubmitted ? "✓ Profile matched" : "+GH₵15,000 project bonus"}
              </span>
              <Button
                variant={gigSubmitted ? "secondary" : "primary"}
                size="sm"
                disabled={gigSubmitted}
                onClick={() => setGigSubmitted(true)}
                style={{
                  backgroundColor: gigSubmitted ? colors.surface : colors.emeraldDark,
                  borderColor: gigSubmitted ? colors.border : colors.emeraldDark,
                  fontSize: "11px",
                  padding: "0.25rem 0.65rem",
                }}
              >
                {gigSubmitted ? "Submitted to Lead ✓" : "Apply with Verified Skills"}
              </Button>
            </div>
          </div>

          {/* Push Nudge 3: Continuous Win Aggregation */}
          <div
            style={{
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.surfaceSubtle,
              padding: "1rem 1.15rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: colors.indigoAccent, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <Icons.Target size={13} color={colors.indigoAccent} />
                  Continuous Performance Auto-Synthesis
                </span>
                <span style={{ fontSize: "10px", color: colors.indigoAccent, fontWeight: 700 }}>Bias-Free</span>
              </div>
              <p style={{ margin: "0 0 0.75rem 0", fontSize: typography.sizes.xs, color: colors.textSecondary, lineHeight: 1.5 }}>
                3 weekly wins were auto-aggregated from your sprint closures. The AI has pre-populated your Q4 OKR scorecard, eliminating annual review dread and recency bias.
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px dashed ${colors.border}`, paddingTop: "0.6rem" }}>
              <span style={{ fontSize: "11px", color: colors.textMuted }}>
                {synthesisViewed ? "✓ Synced with scorecard" : "Ready for review"}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSynthesisViewed(true)}
                style={{
                  borderColor: colors.indigoBorder,
                  color: colors.indigoPrimary,
                  fontSize: "11px",
                  padding: "0.25rem 0.65rem",
                }}
              >
                {synthesisViewed ? "Synthesis Synced ✓" : "Review Auto-Synthesis"}
              </Button>
            </div>
          </div>

        </div>
      </div>

      {/* Quick Summary Cards (Employee Self-Service) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
        {/* Latest Payslip Quick Access Card */}
        <div style={{ background: "linear-gradient(180deg, rgba(99, 102, 241, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)", border: `1px solid rgba(99, 102, 241, 0.3)`, borderTop: `3px solid ${colors.indigoAction}`, borderRadius: radii.md, padding: "1.25rem", position: "relative", overflow: "hidden", boxShadow: shadows.xs }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: colors.indigoPrimary, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Latest Payslip · Nov 2026
            </span>
            <Badge variant="success" size="sm">Paid (GHS)</Badge>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: colors.indigoPrimary, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
            GH₵28,450.00 <span style={{ fontSize: "12px", fontWeight: 500, color: colors.textMuted }}>Net Take-Home</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.6rem" }}>
            <span style={{ fontSize: "11px", color: colors.textMuted }}>Ecobank Ghana ••••4892</span>
            {onOpenPayslip && (
              <button
                onClick={onOpenPayslip}
                style={{
                  background: colors.indigoSubtle,
                  border: `1px solid ${colors.indigoBorder}`,
                  borderRadius: radii.sm,
                  color: colors.indigoAccent,
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "0.2rem 0.55rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                <span>View Payslip</span>
                <Icons.ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Leave Balance */}
        <div {...drillProps(() => onRequestLeave(), "Open leave and request time off")} style={{ background: "linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)", border: `1px solid rgba(16, 185, 129, 0.3)`, borderTop: "3px solid #10b981", borderRadius: radii.md, padding: "1.25rem", boxShadow: shadows.xs, cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: colors.emeraldDark, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Annual Leave Balance
            </span>
            <Badge variant="success" size="sm">{remainingDays} Days Left</Badge>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: colors.textPrimary, fontVariantNumeric: "tabular-nums" }}>
            {remainingDays} <span style={{ fontSize: "14px", fontWeight: 400, color: colors.textMuted }}>/ {currentEmployee.annualLeaveTotal} Days</span>
          </div>
          <div style={{ height: "6px", backgroundColor: "rgba(16, 185, 129, 0.15)", borderRadius: radii.full, overflow: "hidden", marginTop: "0.75rem" }}>
            <div style={{ width: `${(remainingDays / currentEmployee.annualLeaveTotal) * 100}%`, height: "100%", backgroundColor: colors.emeraldAction }} />
          </div>
        </div>

        {/* Corporate Shift */}
        <div style={{ background: "linear-gradient(180deg, rgba(249, 115, 22, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)", border: `1px solid rgba(249, 115, 22, 0.3)`, borderTop: "3px solid #f97316", borderRadius: radii.md, padding: "1.25rem", boxShadow: shadows.xs }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: colors.peachDark, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Assigned Shift & Hours
            </span>
            <Badge variant="neutral" size="sm">09:00 - 17:30</Badge>
          </div>
          <div style={{ fontSize: typography.sizes.base, fontWeight: 700, color: colors.textPrimary, marginTop: "0.2rem" }}>
            Standard Consulting Shift
          </div>
          <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: "0.35rem" }}>
            Accra & London Hubs • Biometric Synced
          </div>
        </div>

        {/* Assigned Hardware */}
        <div style={{ background: "linear-gradient(180deg, rgba(6, 182, 212, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)", border: `1px solid rgba(6, 182, 212, 0.3)`, borderTop: "3px solid #06b6d4", borderRadius: radii.md, padding: "1.25rem", boxShadow: shadows.xs }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#0e7490", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Assigned Workstation
            </span>
            <span style={{ fontFamily: typography.fontMono, fontSize: "11px", color: "#0891b2", fontWeight: 700 }}>
              {assignedAsset ? assignedAsset.asset_code : "SEN-LAP-001"}
            </span>
          </div>
          <div style={{ fontSize: typography.sizes.base, fontWeight: 700, color: colors.textPrimary, marginTop: "0.2rem" }}>
            {assignedAsset ? assignedAsset.name : "ThinkPad P16 Gen 2 Workstation"}
          </div>
          <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: "0.35rem" }}>
            Corporate Provisioned • 3-Year Care Plan
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PERFORMANCE PORTFOLIO & APPRAISAL PERIODS */}
      {/* ========================================================================= */}
      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.xl,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.xs,
          marginBottom: "1.75rem",
          overflow: "hidden",
        }}
      >
        {/* Top Tab Navigation (Matching Screenshot: Appraisal Periods | Performance Reviews | Exceptional Achievement | Performance Improvement Plan) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2rem",
            padding: "0.85rem 1.5rem 0 1.5rem",
            borderBottom: `1px solid ${colors.border}`,
            overflowX: "auto",
          }}
        >
          {[
            { key: "periods", label: "Appraisal Periods" },
            { key: "reviews", label: "Performance Reviews" },
            { key: "achievements", label: "Exceptional Achievement" },
            { key: "pip", label: "Performance Improvement Plan" },
          ].map((tab) => {
            const isActive = performanceTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setPerformanceTab(tab.key as typeof performanceTab)}
                style={{
                  background: "none",
                  border: "none",
                  padding: "0 0 0.85rem 0",
                  fontSize: typography.sizes.xs,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? colors.brandBlue : colors.textSecondary,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  position: "relative",
                  transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
                }}
              >
                {tab.label}
                {isActive && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: "-1px",
                      left: 0,
                      right: 0,
                      height: "3px",
                      backgroundColor: colors.brandBlue,
                      borderRadius: radii.full,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div style={{ padding: "1.5rem" }}>
          {/* TAB 1: APPRAISAL PERIODS */}
          {performanceTab === "periods" && (
            <div>
              {/* Header Bar with REVIEW LIST, Search, Pagination (Matching Screenshot) */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.25rem",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div style={{ fontSize: typography.sizes.xs, fontWeight: 800, color: colors.textPrimary, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  REVIEW LIST
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  {/* Search Icon Input */}
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchReviewQuery}
                      onChange={(e) => setSearchReviewQuery(e.target.value)}
                      style={{
                        padding: "0.35rem 0.65rem 0.35rem 1.85rem",
                        borderRadius: radii.md,
                        border: `1px solid ${colors.border}`,
                        fontSize: typography.sizes.xs,
                        width: "160px",
                        backgroundColor: colors.surfaceSubtle,
                      }}
                    />
                    <div style={{ position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)", color: colors.textMuted }}>
                      <Icons.Search size={12} />
                    </div>
                  </div>

                  {/* Pagination Controls (Matching Screenshot: Showing 1 to 1 of 1 v | < Page [1] of 1 >) */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: typography.sizes.xs, color: colors.textSecondary }}>
                    <span>Showing 1 to 2 of 2 ▾</span>
                    <span style={{ color: colors.borderSubtle }}>|</span>
                    <button style={{ background: "none", border: `1px solid ${colors.border}`, borderRadius: radii.sm, padding: "0.15rem 0.4rem", cursor: "pointer", color: colors.textMuted }}>
                      &lt;
                    </button>
                    <span>Page</span>
                    <input
                      type="text"
                      readOnly
                      value="1"
                      style={{ width: "26px", textAlign: "center", padding: "0.15rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                    />
                    <span>of 1</span>
                    <button style={{ background: "none", border: `1px solid ${colors.border}`, borderRadius: radii.sm, padding: "0.15rem 0.4rem", cursor: "pointer", color: colors.textMuted }}>
                      &gt;
                    </button>
                  </div>
                </div>
              </div>

              {/* Appraisal Cycle Cards List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {[
                  {
                    id: 1,
                    title: "2024 Appraisal",
                    progress: 4,
                    period: "Thu, 03 Jul, 2025 - Fri, 12 Sep, 2025",
                    status: "Completed",
                    endedNote: "Ended at: 13 Months, 3 Weeks, ago",
                    score: "4.6 / 5.0 (Exceeds Expectations)",
                  },
                  {
                    id: 2,
                    title: "2026 Q1 Performance Appraisal for Henley Resources",
                    progress: 92,
                    period: "Thu, 01 Jan, 2026 - Tue, 31 Mar, 2026",
                    status: "Completed",
                    endedNote: "Calibrated 2 Weeks ago",
                    score: "4.8 / 5.0 (Star Performer)",
                  },
                  {
                    id: 3,
                    title: "H2 Cycle (West Africa & UK Corridor)",
                    progress: 42,
                    period: "Wed, 01 Jul, 2026 - Thu, 31 Dec, 2026",
                    status: "In Progress",
                    endedNote: "Mid-cycle check-ins active",
                    score: "Mid-Year Review Pending",
                  },
                ].map((card) => (
                  <div
                    key={card.id}
                    style={{
                      border: `1px solid ${colors.border}`,
                      borderRadius: radii.lg,
                      padding: "1.25rem 1.5rem",
                      backgroundColor: colors.surface,
                      transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                    }}
                  >
                    {/* Top Row: Title + Circular Progress Indicator (Matching Screenshot) */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
                      <div>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: typography.sizes.base,
                            fontWeight: 700,
                            color: colors.brandBlue,
                          }}
                        >
                          {card.title}
                        </h3>
                        <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px" }}>
                          Single-Framework Purity • Rating: <strong>{card.score}</strong>
                        </div>
                      </div>

                      {/* Circular Gauge / Percentage Indicator (Matching Screenshot) */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div
                          style={{
                            position: "relative",
                            width: "48px",
                            height: "48px",
                            borderRadius: "50%",
                            background: `conic-gradient(${colors.brandBlue} ${card.progress * 3.6}deg, #e2e8f0 0deg)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <div
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "50%",
                              backgroundColor: "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "11px",
                              fontWeight: 800,
                              color: colors.brandBlue,
                            }}
                          >
                            {card.progress}%
                          </div>
                        </div>
                        <span style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, fontWeight: 500 }}>
                          Overall Progress
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Dates + Status Pill + Relative Time + Actions Button (Matching Screenshot) */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderTop: "1px solid #f1f5f9",
                        paddingTop: "0.85rem",
                        flexWrap: "wrap",
                        gap: "0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, fontWeight: 500 }}>
                          {card.period}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "0.2rem 0.65rem",
                            borderRadius: radii.full,
                            backgroundColor: card.status === "Completed" ? "rgba(22, 163, 74, 0.15)" : "rgba(37, 99, 235, 0.15)",
                            color: card.status === "Completed" ? "#16a34a" : colors.brandBlue,
                          }}
                        >
                          {card.status}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <span style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>
                          {card.endedNote}
                        </span>

                        <div style={{ position: "relative" }}>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setActiveActionMenuId(activeActionMenuId === card.id ? null : card.id)}
                            style={{
                              backgroundColor: colors.brandBlue,
                              borderColor: colors.brandBlue,
                              fontSize: typography.sizes.xs,
                              padding: "0.35rem 0.85rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.35rem",
                            }}
                          >
                            <span>◂</span>
                            <span>Actions</span>
                          </Button>

                          {activeActionMenuId === card.id && (
                            <div
                              style={{
                                position: "absolute",
                                right: 0,
                                bottom: "100%",
                                marginBottom: "4px",
                                backgroundColor: "#ffffff",
                                border: `1px solid ${colors.border}`,
                                borderRadius: radii.md,
                                boxShadow: shadows.md,
                                padding: "0.35rem 0",
                                width: "190px",
                                zIndex: 10,
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPeriodForAction(card.title);
                                  setActiveActionMenuId(null);
                                }}
                                style={{
                                  display: "block",
                                  width: "100%",
                                  textAlign: "left",
                                  padding: "0.45rem 0.85rem",
                                  fontSize: typography.sizes.xs,
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: colors.textPrimary,
                                }}
                              >
                                View Detailed Evaluation
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  alert(`Downloading official evaluation report for ${card.title} in PDF format.`);
                                  setActiveActionMenuId(null);
                                }}
                                style={{
                                  display: "block",
                                  width: "100%",
                                  textAlign: "left",
                                  padding: "0.45rem 0.85rem",
                                  fontSize: typography.sizes.xs,
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: colors.textPrimary,
                                }}
                              >
                                Download Evaluation PDF
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPerformanceTab("reviews");
                                  setActiveActionMenuId(null);
                                }}
                                style={{
                                  display: "block",
                                  width: "100%",
                                  textAlign: "left",
                                  padding: "0.45rem 0.85rem",
                                  fontSize: typography.sizes.xs,
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: colors.brandBlue,
                                  fontWeight: 600,
                                }}
                              >
                                Compare Self vs Manager Score
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: PERFORMANCE REVIEWS */}
          {performanceTab === "reviews" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                    Bilateral Review Scoring Matrix & Feedback
                  </h4>
                  <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: colors.textMuted }}>
                    Calibrated ratings comparing employee self-evaluation with line supervisor and committee scorecards.
                  </p>
                </div>
                <Badge variant="bsc" size="sm">Calibrated Framework</Badge>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ padding: "1rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, backgroundColor: colors.surfaceSubtle }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted }}>SUPERVISOR FEEDBACK (Sarah Jenkins):</div>
                  <p style={{ fontSize: typography.sizes.xs, color: colors.textPrimary, fontStyle: "italic", margin: "0.4rem 0 0 0", lineHeight: 1.5 }}>
                    &ldquo;Exemplary leadership in architecting the zero-trust edge infrastructure and driving high-velocity sprint deliveries across West Africa and London teams.&rdquo;
                  </p>
                </div>
                <div style={{ padding: "1rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, backgroundColor: "rgba(16, 185, 129, 0.05)" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: colors.emeraldDark }}>CALIBRATED RATING:</div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color: colors.emeraldDark, marginTop: "0.2rem" }}>
                    4.8 / 5.0
                  </div>
                  <div style={{ fontSize: "11px", color: colors.textSecondary }}>Grade Band: Star Performer (Top 10% Tier)</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EXCEPTIONAL ACHIEVEMENT */}
          {performanceTab === "achievements" && (
            <div>
              <h4 style={{ margin: "0 0 0.5rem 0", fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                Honors, Citations & Verified Peer Kudos
              </h4>
              <p style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
                Formal recognition awarded for outstanding technical, client, or cross-functional contributions.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ padding: "1rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                      🏆 Innovation Excellence Award · Q1 2026
                    </div>
                    <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px" }}>
                      Awarded for delivering sub-second Hyperdrive query latency across multi-region Neon pools.
                    </div>
                  </div>
                  <Badge variant="success" size="sm">+GH₵10,000 Bonus Paid</Badge>
                </div>
                <div style={{ padding: "1rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                      ⭐ Peer Kudos from Adjoa Asare
                    </div>
                    <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px" }}>
                      &ldquo;Mentored the data engineering squad through mathematical rating calibration standards.&rdquo;
                    </div>
                  </div>
                  <span style={{ fontSize: "11px", color: colors.textMuted }}>Verified 18 Oct</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PERFORMANCE IMPROVEMENT PLAN (PIP) */}
          {performanceTab === "pip" && (
            <div style={{ padding: "1.5rem", textAlign: "center", backgroundColor: colors.surfaceSubtle, borderRadius: radii.md, border: `1px solid ${colors.borderSubtle}` }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(16, 185, 129, 0.15)", color: colors.emeraldDark, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "0.5rem" }}>
                ✓
              </div>
              <h4 style={{ margin: "0 0 0.25rem 0", fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                Exemplary Performance Status
              </h4>
              <p style={{ margin: 0, fontSize: typography.sizes.xs, color: colors.textMuted }}>
                No active Performance Improvement Plan (PIP) directives. Rating stands in the top quintile.
              </p>
            </div>
          )}
        </div>
      </div>

            {/* Main Content Split: My Goals vs My Leave History */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1.75rem" }}>
        {/* Left: Active Appraisal Scorecard & Self-Review */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div>
              <h2 style={{ fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.indigoPrimary, margin: 0 }}>
                My Q4 Appraisal Scorecard (OKR Framework)
              </h2>
              <span style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>
                Cycle: FY26 Q4 Strategic Leadership Review • Single-Framework Pure
              </span>
            </div>
            <Badge variant="okr" size="sm">Self-Review Active</Badge>
          </div>

          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              overflow: "hidden",
            }}
          >
            {goals.map((goal, idx) => (
              <div
                key={goal.id}
                style={{
                  padding: "1rem 1.25rem",
                  borderBottom: idx === goals.length - 1 ? "none" : `1px solid ${colors.borderSubtle}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.35rem" }}>
                  <div style={{ flex: 1, paddingRight: "1rem" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: colors.textMuted, textTransform: "uppercase" }}>
                      {goal.category}
                    </span>
                    <div style={{ fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.textPrimary, marginTop: "0.15rem" }}>
                      {goal.title}
                    </div>
                    <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: "0.2rem" }}>
                      Target: {goal.target}
                    </div>
                  </div>
                  <span style={{ fontSize: "14px", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: colors.indigoAction }}>
                    {goal.progress}%
                  </span>
                </div>

                {/* Interactive Self-Rating Slider */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.6rem" }}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={goal.progress}
                    disabled={selfAssessmentSubmitted}
                    onChange={(e) => handleUpdateProgress(goal.id, parseInt(e.target.value, 10))}
                    style={{ flex: 1, cursor: selfAssessmentSubmitted ? "not-allowed" : "pointer", accentColor: colors.indigoAction }}
                  />
                  <span style={{ fontSize: "11px", color: colors.textMuted, width: "70px", textAlign: "right" }}>
                    Self-Rating
                  </span>
                </div>
              </div>
            ))}

            <div
              style={{
                padding: "0.85rem 1.25rem",
                backgroundColor: colors.surfaceSubtle,
                borderTop: `1px solid ${colors.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>
                {selfAssessmentSubmitted ? `✓ Self-assessment submitted to manager on ${formatDate(new Date())}.` : "Adjust sliders to update your progress."}
              </span>
              <Button
                variant={selfAssessmentSubmitted ? "secondary" : "primary"}
                size="sm"
                disabled={selfAssessmentSubmitted}
                onClick={() => setSelfAssessmentSubmitted(true)}
                style={{
                  backgroundColor: selfAssessmentSubmitted ? colors.surface : colors.indigoAccent,
                  borderColor: selfAssessmentSubmitted ? colors.border : colors.indigoAccent,
                }}
              >
                {selfAssessmentSubmitted ? "Submitted ✓" : "Submit Self-Assessment"}
              </Button>
            </div>
          </div>
        </div>

        {/* Right: My Leave Requests History */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h2 style={{ fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.indigoPrimary, margin: 0 }}>
              My Leave Requests
            </h2>
            <Button variant="outline" size="sm" onClick={onRequestLeave}>
              + Apply
            </Button>
          </div>

          <DataTable
            columns={leaveColumns}
            data={personalLeaves}
            keyExtractor={(l) => l.id}
            emptyMessage="No personal leave requests found."
          />
        </div>
      </div>
    </div>
  );
};

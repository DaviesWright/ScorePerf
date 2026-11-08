"use client";

import React, { useState } from "react";
import { colors, typography, radii, shadows } from "../../../design-system/tokens";
import { Badge } from "../../../design-system/Badge";
import { Button } from "../../../design-system/Button";
import { Icons } from "../../../design-system/Icons";
import { ModuleViewKey } from "../../shell/AppSidebar";

export type EssWorkflowKey =
  | "time_off"
  | "pay_rewards"
  | "profile_governance"
  | "performance_inputs"
  | "work_schedules"
  | "service_catalog"
  | "learning_lms"
  | "wellbeing_benefits";

interface EssShortcutsHubProps {
  employee: {
    id: number;
    name: string;
    email: string;
    role: string;
    department: string;
    manager: string;
    annualLeaveTotal: number;
    annualLeaveUsed: number;
  };
  onNavigate?: (view: ModuleViewKey) => void;
  onOpenPayslip?: () => void;
  onRequestLeave?: () => void;
  onReportIssue?: () => void;
}

export const EssShortcutsHub: React.FC<EssShortcutsHubProps> = ({
  employee,
  onNavigate,
  onOpenPayslip,
  onRequestLeave,
  onReportIssue,
}) => {
  const [activeWorkflow, setActiveWorkflow] = useState<EssWorkflowKey | null>(null);

  // Workflow 1: Leave state
  const [leaveDaysRequested, setLeaveDaysRequested] = useState<number>(2);
  const [leaveType, setLeaveType] = useState<string>("Annual Leave");
  const [leaveReason, setLeaveReason] = useState<string>("Family holiday & personal recharge");
  const [leaveSubmitted, setLeaveSubmitted] = useState<boolean>(false);

  // Workflow 3: Profile state
  const [phoneNumber, setPhoneNumber] = useState<string>("+233 24 555 0192");
  const [personalEmail, setPersonalEmail] = useState<string>("paa.barnes@bscscoreview.com");
  const [residentialAddress, setResidentialAddress] = useState<string>("48 Independence Avenue, Ridge, Accra");
  const [bankApprovalPending, setBankApprovalPending] = useState<boolean>(false);
  const [profileSaved, setProfileSaved] = useState<boolean>(false);

  // Workflow 4: Wins Journal state
  const [journalEntries, setJournalEntries] = useState<Array<{ id: number; title: string; date: string; category: string }>>([
    { id: 1, title: "Achieved sub-15ms p99 response times on Cloudflare Edge Worker deployment", date: "Nov 03, 2026", category: "Engineering" },
    { id: 2, title: "Finalized H2 BSC metric cascades across Ghana & London engineering practices", date: "Oct 29, 2026", category: "Strategy" },
    { id: 3, title: "Conducted technical architecture review with executive board", date: "Oct 22, 2026", category: "Leadership" },
  ]);
  const [newWinTitle, setNewWinTitle] = useState("");
  const [newWinCategory, setNewWinCategory] = useState("Engineering");
  const [performanceLocked, setPerformanceLocked] = useState(false);

  // Workflow 5: Work Schedule & Attendance
  const [clockedIn, setClockedIn] = useState<boolean>(true);
  const [clockInTime, setClockInTime] = useState<string>("08:42 GMT");
  const [remoteLogged, setRemoteLogged] = useState<boolean>(false);

  // Workflow 6: AI Service Catalog Letter Generator
  const [aiLetterQuery, setAiLetterQuery] = useState<string>("");
  const [selectedLetterType, setSelectedLetterType] = useState<"visa" | "bank" | "tenancy" | "general">("visa");
  const [generatedLetterReady, setGeneratedLetterReady] = useState<boolean>(false);

  // Workflow 7: LMS State
  const [enrolledCourses, setEnrolledCourses] = useState<number[]>([101, 102]);

  // Workflow 8: Well-being Pulse & Wallet
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [pulseSubmitted, setPulseSubmitted] = useState<boolean>(false);
  const [wellnessClaimAmount, setWellnessClaimAmount] = useState<string>("450");
  const [wellnessClaimCategory, setWellnessClaimCategory] = useState<string>("Gym & Fitness");
  const [wellnessClaimSuccess, setWellnessClaimSuccess] = useState<boolean>(false);
  const [wellnessBalance, setWellnessBalance] = useState<number>(2500);

  const remainingLeave = employee.annualLeaveTotal - employee.annualLeaveUsed;

  const shortcutCards: Array<{
    key: EssWorkflowKey;
    title: string;
    subtitle: string;
    badge: string;
    badgeVariant: "success" | "warning" | "info" | "neutral" | "error";
    icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
    accentColor: string;
    accentBg: string;
    highlights: string;
  }> = [
    {
      key: "time_off",
      title: "1. Time Off & Leave",
      subtitle: "Balances, Team Radar & Approvals",
      badge: `${remainingLeave}d Available`,
      badgeVariant: "success",
      icon: Icons.Calendar,
      accentColor: "#10b981",
      accentBg: "rgba(16, 185, 129, 0.08)",
      highlights: "Dynamic accrual (1.75d/mo), blackout dates & Manager → HRBP chain",
    },
    {
      key: "pay_rewards",
      title: "2. Pay & Total Rewards",
      subtitle: "Payslips, Taxes & Rewards Wallet",
      badge: "GH₵28.4k Net",
      badgeVariant: "info",
      icon: Icons.Wallet,
      accentColor: "#6366f1",
      accentBg: "rgba(99, 102, 241, 0.08)",
      highlights: "Total Rewards Wallet (GH₵580k total value), encrypted RBAC & GRA/SSNIT",
    },
    {
      key: "profile_governance",
      title: "3. Personal & Profile Hub",
      subtitle: "Self-Service & Field Permissions",
      badge: "100% Verified",
      badgeVariant: "info",
      icon: Icons.Users,
      accentColor: "#f59e0b",
      accentBg: "rgba(245, 158, 11, 0.08)",
      highlights: "Field-level RBAC: instant contact edits vs admin-approved bank details",
    },
    {
      key: "performance_inputs",
      title: "4. Performance & OKRs",
      subtitle: "Reviews, State Machine & Journal",
      badge: "Self-Review Open",
      badgeVariant: "warning",
      icon: Icons.Target,
      accentColor: "#8b5cf6",
      accentBg: "rgba(139, 92, 246, 0.08)",
      highlights: "Active review cycle, pre-appraisals, wins journal & lock on submission",
    },
    {
      key: "work_schedules",
      title: "5. Attendance & Shifts",
      subtitle: "Geofenced Clock-In & Hybrid Time",
      badge: "Accra Ridge Hub",
      badgeVariant: "info",
      icon: Icons.Clock,
      accentColor: "#06b6d4",
      accentBg: "rgba(6, 182, 212, 0.08)",
      highlights: "Geofenced punch clock, payroll auto-sync, 1-click remote work log",
    },
    {
      key: "service_catalog",
      title: "6. HR Service Catalog",
      subtitle: "Official Letters & Helpdesk Tickets",
      badge: "AI Generator",
      badgeVariant: "info",
      icon: Icons.FileText,
      accentColor: "#ec4899",
      accentBg: "rgba(236, 72, 153, 0.08)",
      highlights: "Instant visa/loan letters on company letterhead with QR verification",
    },
    {
      key: "learning_lms",
      title: "7. Learning & Growth (LMS)",
      subtitle: "Compliance, Certs & T-Shaped Gaps",
      badge: "2 To-Dos Due",
      badgeVariant: "warning",
      icon: Icons.BookOpen,
      accentColor: "#14b8a6",
      accentBg: "rgba(20, 184, 166, 0.08)",
      highlights: "Mandatory compliance sync & skill recommendations from appraisal gaps",
    },
    {
      key: "wellbeing_benefits",
      title: "8. Well-being & Benefits",
      subtitle: "EAP, Pulse & Wellness Wallet",
      badge: `GH₵${wellnessBalance.toLocaleString()} Balance`,
      badgeVariant: "success",
      icon: Icons.Heart,
      accentColor: "#f43f5e",
      accentBg: "rgba(244, 63, 94, 0.08)",
      highlights: "Anonymous emoji daily pulse, 24/7 EAP hotline & wellness reimbursements",
    },
  ];

  return (
    <div style={{ marginBottom: "1.75rem" }}>
      {/* Section Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "0.85rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "22px",
                height: "22px",
                borderRadius: radii.sm,
                backgroundColor: colors.indigoSubtle,
                color: colors.indigoAction,
              }}
            >
              <Icons.Zap size={13} />
            </span>
            <h2
              style={{
                fontSize: typography.sizes.base,
                fontWeight: typography.weights.bold,
                color: colors.indigoPrimary,
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Employee Self-Service (ESS) Shortcut Hub
            </h2>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                padding: "0.15rem 0.5rem",
                borderRadius: radii.full,
                backgroundColor: colors.indigoSubtle,
                color: colors.indigoAccent,
                border: `1px solid ${colors.indigoBorder}`,
              }}
            >
              8 Enterprise Workflows
            </span>
          </div>
          <p
            style={{
              margin: "0.25rem 0 0 0",
              fontSize: typography.sizes.xs,
              color: colors.textSecondary,
            }}
          >
            Direct shortcuts to the 8 core employee workflows with automated approval routing, field-level RBAC, and ScoReview Edge tools.
          </p>
        </div>
      </div>

      {/* 8 Shortcut Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "0.85rem",
        }}
      >
        {shortcutCards.map((card) => {
          const IconComp = card.icon;
          return (
            <div
              key={card.key}
              onClick={() => setActiveWorkflow(card.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setActiveWorkflow(card.key);
                }
              }}
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderLeft: `4px solid ${card.accentColor}`,
                borderRadius: radii.md,
                padding: "1rem 1.15rem",
                cursor: "pointer",
                transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
                boxShadow: shadows.xs,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 16px -4px rgba(30, 27, 75, 0.08)";
                e.currentTarget.style.borderColor = card.accentColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = shadows.xs;
                e.currentTarget.style.borderColor = colors.border;
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.45rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: radii.sm,
                        backgroundColor: card.accentBg,
                        color: card.accentColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconComp size={16} color={card.accentColor} />
                    </div>
                    <span
                      style={{
                        fontSize: typography.sizes.sm,
                        fontWeight: 700,
                        color: colors.indigoPrimary,
                      }}
                    >
                      {card.title}
                    </span>
                  </div>
                  <Badge variant={card.badgeVariant} size="sm">
                    {card.badge}
                  </Badge>
                </div>

                <div
                  style={{
                    fontSize: typography.sizes.xs,
                    fontWeight: 500,
                    color: colors.textSecondary,
                    marginBottom: "0.4rem",
                  }}
                >
                  {card.subtitle}
                </div>

                <div
                  style={{
                    fontSize: "11px",
                    color: colors.textMuted,
                    lineHeight: 1.4,
                  }}
                >
                  {card.highlights}
                </div>
              </div>

              <div
                style={{
                  marginTop: "0.75rem",
                  paddingTop: "0.5rem",
                  borderTop: `1px dashed ${colors.border}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: card.accentColor,
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  Open Shortcut →
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    color: colors.textMuted,
                  }}
                >
                  Click to manage
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE WORKFLOW MODAL FOR THE 8 SHORTCUTS */}
      {/* ========================================================================= */}
      {activeWorkflow && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(6px)",
            zIndex: 160,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.25rem",
            animation: "fadeIn 0.15s ease-out",
          }}
          onClick={() => setActiveWorkflow(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "840px",
              maxHeight: "92vh",
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              boxShadow: shadows.modal,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              border: `1px solid ${colors.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: `1px solid ${colors.border}`,
                backgroundColor: colors.surfaceSubtle,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "32px",
                    height: "32px",
                    borderRadius: radii.md,
                    backgroundColor: colors.indigoSubtle,
                    color: colors.indigoAction,
                  }}
                >
                  {activeWorkflow === "time_off" && <Icons.Calendar size={18} />}
                  {activeWorkflow === "pay_rewards" && <Icons.Wallet size={18} />}
                  {activeWorkflow === "profile_governance" && <Icons.Users size={18} />}
                  {activeWorkflow === "performance_inputs" && <Icons.Target size={18} />}
                  {activeWorkflow === "work_schedules" && <Icons.Clock size={18} />}
                  {activeWorkflow === "service_catalog" && <Icons.FileText size={18} />}
                  {activeWorkflow === "learning_lms" && <Icons.BookOpen size={18} />}
                  {activeWorkflow === "wellbeing_benefits" && <Icons.Heart size={18} />}
                </span>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: typography.sizes.base,
                      fontWeight: 700,
                      color: colors.indigoPrimary,
                    }}
                  >
                    {activeWorkflow === "time_off" && "Requesting & Managing Time Off (Leave)"}
                    {activeWorkflow === "pay_rewards" && "Accessing Pay & Compensation (Total Rewards Wallet)"}
                    {activeWorkflow === "profile_governance" && "Personal & Professional Profile Governance"}
                    {activeWorkflow === "performance_inputs" && "Submitting & Tracking Performance Inputs"}
                    {activeWorkflow === "work_schedules" && "Work Schedules & Attendance (Time Tracking)"}
                    {activeWorkflow === "service_catalog" && "HR Service Catalog & AI Official Documents"}
                    {activeWorkflow === "learning_lms" && "Learning & Development (LMS Integration)"}
                    {activeWorkflow === "wellbeing_benefits" && "Well-being, Benefits & Wellness Wallet"}
                  </h3>
                  <span style={{ fontSize: "11px", color: colors.textMuted }}>
                    Staff ID: SEN-EMP-001 • {employee.name} • {employee.department}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveWorkflow(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: colors.textMuted,
                  padding: "0.4rem",
                  borderRadius: radii.sm,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icons.X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
              {/* =============================================================== */}
              {/* 1. TIME OFF & LEAVE */}
              {/* =============================================================== */}
              {activeWorkflow === "time_off" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* Configuration & Rule Banner */}
                  <div
                    style={{
                      backgroundColor: "rgba(16, 185, 129, 0.08)",
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                      borderRadius: radii.md,
                      padding: "0.85rem 1rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Icons.ShieldCheck size={18} color="#10b981" />
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#065f46" }}>
                          Configuration Rule: Dynamic Accrual & Two-Tier Approval Chain
                        </div>
                        <div style={{ fontSize: "11px", color: "#047857" }}>
                          Accrual: 1.75 days/month • Routing: Line Manager (Kofi Mensah) → HRBP (Dr. Araba Mensah) with automated alerts.
                        </div>
                      </div>
                    </div>
                    <Badge variant="success" size="sm">Active Policy 2026</Badge>
                  </div>

                  {/* Real-time Balances Grid */}
                  <div>
                    <h4 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: colors.textSecondary, marginBottom: "0.6rem" }}>
                      Real-Time Leave Balances
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                      <div style={{ padding: "0.85rem", backgroundColor: colors.surfaceSubtle, borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
                        <div style={{ fontSize: "11px", color: colors.textMuted }}>Annual Leave</div>
                        <div style={{ fontSize: "1.35rem", fontWeight: 700, color: colors.indigoPrimary, marginTop: "0.2rem" }}>
                          {remainingLeave} <span style={{ fontSize: "12px", fontWeight: 400, color: colors.textMuted }}>/ {employee.annualLeaveTotal} Days</span>
                        </div>
                        <div style={{ fontSize: "10px", color: "#10b981", fontWeight: 600, marginTop: "0.2rem" }}>1.75 days accrued monthly</div>
                      </div>

                      <div style={{ padding: "0.85rem", backgroundColor: colors.surfaceSubtle, borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
                        <div style={{ fontSize: "11px", color: colors.textMuted }}>Sick Leave (Full Pay)</div>
                        <div style={{ fontSize: "1.35rem", fontWeight: 700, color: colors.indigoPrimary, marginTop: "0.2rem" }}>
                          10 <span style={{ fontSize: "12px", fontWeight: 400, color: colors.textMuted }}>/ 10 Days</span>
                        </div>
                        <div style={{ fontSize: "10px", color: colors.textMuted, marginTop: "0.2rem" }}>Requires certificate &gt; 2 days</div>
                      </div>

                      <div style={{ padding: "0.85rem", backgroundColor: colors.surfaceSubtle, borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
                        <div style={{ fontSize: "11px", color: colors.textMuted }}>Compassionate Leave</div>
                        <div style={{ fontSize: "1.35rem", fontWeight: 700, color: colors.indigoPrimary, marginTop: "0.2rem" }}>
                          5 <span style={{ fontSize: "12px", fontWeight: 400, color: colors.textMuted }}>/ 5 Days</span>
                        </div>
                        <div style={{ fontSize: "10px", color: colors.textMuted, marginTop: "0.2rem" }}>Immediate family bereavement</div>
                      </div>

                      <div style={{ padding: "0.85rem", backgroundColor: colors.surfaceSubtle, borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
                        <div style={{ fontSize: "11px", color: colors.textMuted }}>Study & Exam Leave</div>
                        <div style={{ fontSize: "1.35rem", fontWeight: 700, color: colors.indigoPrimary, marginTop: "0.2rem" }}>
                          3 <span style={{ fontSize: "12px", fontWeight: 400, color: colors.textMuted }}>/ 3 Days</span>
                        </div>
                        <div style={{ fontSize: "10px", color: colors.textMuted, marginTop: "0.2rem" }}>Accredited qualifications</div>
                      </div>
                    </div>
                  </div>

                  {/* Blackout Dates Guardrail Warning */}
                  <div
                    style={{
                      backgroundColor: "rgba(245, 158, 11, 0.08)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      borderRadius: radii.md,
                      padding: "0.75rem 1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                    }}
                  >
                    <Icons.AlertTriangle size={18} color="#d97706" />
                    <div style={{ fontSize: "11px", color: "#92400e" }}>
                      <strong>Enforced Blackout Window:</strong> Dec 15 - Dec 31, 2026 (Annual Financial Close & Audit). Leave requests during this window require special HR Director sign-off.
                    </div>
                  </div>

                  {/* Team Absence Calendar Preview */}
                  <div>
                    <h4 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: colors.textSecondary, marginBottom: "0.5rem" }}>
                      Team Absence Radar (This Week)
                    </h4>
                    <div style={{ border: `1px solid ${colors.border}`, borderRadius: radii.md, overflow: "hidden" }}>
                      <div style={{ padding: "0.55rem 0.85rem", backgroundColor: colors.surfaceSubtle, display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 600, color: colors.textMuted }}>
                        <span>Team Member</span>
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                      </div>
                      <div style={{ padding: "0.65rem 0.85rem", display: "flex", justifyContent: "space-between", fontSize: "11px", borderTop: `1px solid ${colors.border}`, alignItems: "center" }}>
                        <span style={{ fontWeight: 600 }}>Paa Kwesi Barnes (You)</span>
                        <span style={{ color: "#10b981", fontWeight: 600 }}>In Office</span>
                        <span style={{ color: "#10b981", fontWeight: 600 }}>In Office</span>
                        <span style={{ color: "#06b6d4", fontWeight: 600 }}>Remote</span>
                        <span style={{ color: "#10b981", fontWeight: 600 }}>In Office</span>
                        <span style={{ color: "#10b981", fontWeight: 600 }}>In Office</span>
                      </div>
                      <div style={{ padding: "0.65rem 0.85rem", display: "flex", justifyContent: "space-between", fontSize: "11px", borderTop: `1px solid ${colors.border}`, alignItems: "center", backgroundColor: colors.surfaceSubtle }}>
                        <span style={{ fontWeight: 600 }}>Akua Osei (Principal Consultant)</span>
                        <span style={{ color: "#f59e0b", fontWeight: 600 }}>Annual Leave</span>
                        <span style={{ color: "#f59e0b", fontWeight: 600 }}>Annual Leave</span>
                        <span style={{ color: "#10b981", fontWeight: 600 }}>In Office</span>
                        <span style={{ color: "#10b981", fontWeight: 600 }}>In Office</span>
                        <span style={{ color: "#06b6d4", fontWeight: 600 }}>Remote</span>
                      </div>
                    </div>
                  </div>

                  {/* Submission Form */}
                  <div style={{ border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: "1rem" }}>
                    <h4 style={{ fontSize: "12px", fontWeight: 700, color: colors.indigoPrimary, margin: "0 0 0.75rem 0" }}>
                      Submit Time Off Request
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: 600, color: colors.textSecondary, display: "block", marginBottom: "0.25rem" }}>
                          Leave Category
                        </label>
                        <select
                          value={leaveType}
                          onChange={(e) => setLeaveType(e.target.value)}
                          style={{ width: "100%", padding: "0.45rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: "12px" }}
                        >
                          <option>Annual Leave</option>
                          <option>Sick Leave</option>
                          <option>Compassionate Leave</option>
                          <option>Study & Exam Leave</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: "11px", fontWeight: 600, color: colors.textSecondary, display: "block", marginBottom: "0.25rem" }}>
                          Number of Working Days
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={remainingLeave}
                          value={leaveDaysRequested}
                          onChange={(e) => setLeaveDaysRequested(Number(e.target.value))}
                          style={{ width: "100%", padding: "0.45rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: "12px" }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: "0.75rem" }}>
                      <label style={{ fontSize: "11px", fontWeight: 600, color: colors.textSecondary, display: "block", marginBottom: "0.25rem" }}>
                        Reason & Handover Details
                      </label>
                      <input
                        type="text"
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        placeholder="State your coverage arrangement or reason"
                        style={{ width: "100%", padding: "0.45rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: "12px" }}
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: leaveSubmitted ? "#10b981" : colors.textMuted }}>
                        {leaveSubmitted ? "✓ Request sent to Manager (Kofi Mensah) & HRBP." : `Leaves ${remainingLeave - leaveDaysRequested} days balance upon sign-off.`}
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={leaveSubmitted}
                        onClick={() => {
                          setLeaveSubmitted(true);
                          setTimeout(() => setLeaveSubmitted(false), 3500);
                        }}
                      >
                        {leaveSubmitted ? "Submitted ✓" : "Submit Leave Request"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* =============================================================== */}
              {/* 2. PAY & REWARDS (TOTAL REWARDS WALLET) */}
              {/* =============================================================== */}
              {activeWorkflow === "pay_rewards" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* Security RBAC Notice */}
                  <div
                    style={{
                      backgroundColor: "rgba(99, 102, 241, 0.08)",
                      border: "1px solid rgba(99, 102, 241, 0.25)",
                      borderRadius: radii.md,
                      padding: "0.85rem 1rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Icons.Lock size={18} color="#6366f1" />
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#3730a3" }}>
                          Field-Level RBAC Security & Encrypted Mapping Active
                        </div>
                        <div style={{ fontSize: "11px", color: "#4f46e5" }}>
                          Zero unauthorized peer access. Payroll records are cryptographically pinned to Staff ID: SEN-EMP-001.
                        </div>
                      </div>
                    </div>
                    <Badge variant="info" size="sm">GRA & SSNIT Verified</Badge>
                  </div>

                  {/* ScoReview Edge: Total Rewards Wallet */}
                  <div
                    style={{
                      background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
                      color: "#ffffff",
                      borderRadius: radii.lg,
                      padding: "1.35rem 1.5rem",
                      boxShadow: shadows.md,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#a5b4fc" }}>
                        ScoReview Edge · Total Rewards Wallet
                      </span>
                      <span style={{ fontSize: "11px", padding: "0.2rem 0.6rem", borderRadius: radii.full, backgroundColor: "rgba(255, 255, 255, 0.15)", color: "#ffffff" }}>
                        Annual Comprehensive Value
                      </span>
                    </div>

                    <div style={{ fontSize: "2.1rem", fontWeight: 800, letterSpacing: "-0.02em", color: "#ffffff" }}>
                      GH₵580,100.00 <span style={{ fontSize: "13px", fontWeight: 400, color: "#c7d2fe" }}>Total Employment Value / Year</span>
                    </div>

                    <div style={{ height: "8px", backgroundColor: "rgba(255, 255, 255, 0.2)", borderRadius: radii.full, overflow: "hidden", margin: "1rem 0" }}>
                      <div style={{ width: "72%", height: "100%", backgroundColor: "#38bdf8", float: "left" }} title="Base Salary (72%)" />
                      <div style={{ width: "11%", height: "100%", backgroundColor: "#a855f7", float: "left" }} title="Performance Bonus (11%)" />
                      <div style={{ width: "10%", height: "100%", backgroundColor: "#10b981", float: "left" }} title="Employer Pension 13% (10%)" />
                      <div style={{ width: "7%", height: "100%", backgroundColor: "#f59e0b", float: "left" }} title="Health & Allowances (7%)" />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", fontSize: "11px" }}>
                      <div>
                        <div style={{ color: "#38bdf8", fontWeight: 700 }}>● Base Salary</div>
                        <div style={{ fontWeight: 600 }}>GH₵420,000.00</div>
                      </div>
                      <div>
                        <div style={{ color: "#a855f7", fontWeight: 700 }}>● Performance Bonus (15%)</div>
                        <div style={{ fontWeight: 600 }}>GH₵63,000.00</div>
                      </div>
                      <div>
                        <div style={{ color: "#10b981", fontWeight: 700 }}>● Employer Pension (13%)</div>
                        <div style={{ fontWeight: 600 }}>GH₵54,600.00</div>
                      </div>
                      <div>
                        <div style={{ color: "#f59e0b", fontWeight: 700 }}>● Health & Tech Subsidies</div>
                        <div style={{ fontWeight: 600 }}>GH₵42,500.00</div>
                      </div>
                    </div>
                  </div>

                  {/* Historical Payslips Table */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                      <h4 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: colors.textSecondary, margin: 0 }}>
                        Recent Payslips & Tax Documents
                      </h4>
                      {onOpenPayslip && (
                        <button
                          onClick={onOpenPayslip}
                          style={{
                            background: "none",
                            border: "none",
                            color: colors.indigoAccent,
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Open Detailed Payslip Viewer →
                        </button>
                      )}
                    </div>

                    <div style={{ border: `1px solid ${colors.border}`, borderRadius: radii.md, overflow: "hidden" }}>
                      {[
                        { period: "Nov 2026", gross: "GH₵35,000.00", tax: "GH₵5,250.00", ssnit: "GH₵1,300.00", net: "GH₵28,450.00", date: "28 Nov 2026" },
                        { period: "Oct 2026", gross: "GH₵35,000.00", tax: "GH₵5,250.00", ssnit: "GH₵1,300.00", net: "GH₵28,450.00", date: "28 Oct 2026" },
                        { period: "Sep 2026", gross: "GH₵35,000.00", tax: "GH₵5,250.00", ssnit: "GH₵1,300.00", net: "GH₵28,450.00", date: "28 Sep 2026" },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: "0.75rem 1rem",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderTop: idx > 0 ? `1px solid ${colors.border}` : "none",
                            backgroundColor: idx % 2 === 0 ? colors.surface : colors.surfaceSubtle,
                            fontSize: "12px",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, color: colors.indigoPrimary }}>{item.period} Payslip</div>
                            <div style={{ fontSize: "11px", color: colors.textMuted }}>Paid on {item.date} • Ecobank ••••4892</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 700, color: colors.textPrimary }}>{item.net}</div>
                            <div style={{ fontSize: "10px", color: colors.textMuted }}>Gross: {item.gross}</div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              alert(`Downloading official signed ${item.period} Payslip PDF with GRA Tax Withholding certificate.`);
                            }}
                          >
                            <Icons.Download size={13} />
                            <span>PDF</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* =============================================================== */}
              {/* 3. PROFILE GOVERNANCE */}
              {/* =============================================================== */}
              {activeWorkflow === "profile_governance" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* Permissions Explanation Notice */}
                  <div
                    style={{
                      backgroundColor: "rgba(245, 158, 11, 0.08)",
                      border: "1px solid rgba(245, 158, 11, 0.25)",
                      borderRadius: radii.md,
                      padding: "0.85rem 1rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Icons.ShieldCheck size={18} color="#d97706" />
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#92400e" }}>
                          Configuration Rule: Field-Level Permission Enforced
                        </div>
                        <div style={{ fontSize: "11px", color: "#b45309" }}>
                          Instant Edits: Phone, Address, Emergencies. Admin Approval Required: Bank details & Job Title.
                        </div>
                      </div>
                    </div>
                    <Badge variant="warning" size="sm">Audit Logged</Badge>
                  </div>

                  {/* Instant Edit Fields */}
                  <div style={{ border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <h4 style={{ fontSize: "12px", fontWeight: 700, color: colors.indigoPrimary, margin: 0 }}>
                        Direct Update Fields (Instant Authorization)
                      </h4>
                      <span style={{ fontSize: "10px", color: "#10b981", fontWeight: 700 }}>● Live Auto-Sync</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: 600, color: colors.textSecondary, display: "block", marginBottom: "0.25rem" }}>
                          Mobile Phone
                        </label>
                        <input
                          type="text"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          style={{ width: "100%", padding: "0.45rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: "12px" }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: "11px", fontWeight: 600, color: colors.textSecondary, display: "block", marginBottom: "0.25rem" }}>
                          Personal Email
                        </label>
                        <input
                          type="email"
                          value={personalEmail}
                          onChange={(e) => setPersonalEmail(e.target.value)}
                          style={{ width: "100%", padding: "0.45rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: "12px" }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: "0.75rem" }}>
                      <label style={{ fontSize: "11px", fontWeight: 600, color: colors.textSecondary, display: "block", marginBottom: "0.25rem" }}>
                        Residential Address
                      </label>
                      <input
                        type="text"
                        value={residentialAddress}
                        onChange={(e) => setResidentialAddress(e.target.value)}
                        style={{ width: "100%", padding: "0.45rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: "12px" }}
                      />
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setProfileSaved(true);
                        setTimeout(() => setProfileSaved(false), 3000);
                      }}
                    >
                      {profileSaved ? "Saved Successfully ✓" : "Update Contact Profile"}
                    </Button>
                  </div>

                  {/* Admin Approval Triggered Fields */}
                  <div style={{ border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: "1rem", backgroundColor: colors.surfaceSubtle }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <h4 style={{ fontSize: "12px", fontWeight: 700, color: colors.indigoPrimary, margin: 0 }}>
                        High-Security Fields (Triggers Admin Approval Workflow)
                      </h4>
                      <Badge variant="warning" size="sm">Admin Workflow</Badge>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: 600, color: colors.textSecondary, display: "block", marginBottom: "0.25rem" }}>
                          Payroll Bank Account
                        </label>
                        <input
                          type="text"
                          defaultValue="Ecobank Ghana ••••4892"
                          disabled
                          style={{ width: "100%", padding: "0.45rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: "12px", backgroundColor: "#f3f4f6" }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: "11px", fontWeight: 600, color: colors.textSecondary, display: "block", marginBottom: "0.25rem" }}>
                          Official Job Title
                        </label>
                        <input
                          type="text"
                          defaultValue={employee.role}
                          disabled
                          style={{ width: "100%", padding: "0.45rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: "12px", backgroundColor: "#f3f4f6" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: bankApprovalPending ? "#d97706" : colors.textMuted }}>
                        {bankApprovalPending ? "Approval ticket #HR-BANK-8941 routed to Finance & HR Operations." : "Submitting changes initiates a 2FA prompt and HR verification."}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={bankApprovalPending}
                        onClick={() => {
                          setBankApprovalPending(true);
                        }}
                      >
                        {bankApprovalPending ? "Workflow Active ✓" : "Request Bank Details Change"}
                      </Button>
                    </div>
                  </div>

                  {/* Certifications Vault & Dependents */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div style={{ border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: "0.85rem" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: colors.indigoPrimary, marginBottom: "0.4rem" }}>
                        Verified Certifications & Degrees
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textSecondary }}>● AWS Solutions Architect Professional (2025)</div>
                      <div style={{ fontSize: "11px", color: colors.textSecondary }}>● CFA Institute Charterholder Level 1</div>
                      <button
                        onClick={() => alert("Document upload dialog launched. Select PDF/PNG certification.")}
                        style={{ marginTop: "0.5rem", background: "none", border: "none", color: colors.indigoAccent, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                      >
                        + Upload New Certificate
                      </button>
                    </div>

                    <div style={{ border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: "0.85rem" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: colors.indigoPrimary, marginBottom: "0.4rem" }}>
                        Declared Dependents (Health Sync)
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textSecondary }}>● Ama Barnes (Spouse - Bupa Gold)</div>
                      <div style={{ fontSize: "11px", color: colors.textSecondary }}>● Kweku Barnes (Child, Age 7)</div>
                      <button
                        onClick={() => alert("Dependent declaration form opened. Update beneficiary roster.")}
                        style={{ marginTop: "0.5rem", background: "none", border: "none", color: colors.indigoAccent, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                      >
                        + Declare Dependent
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* =============================================================== */}
              {/* 4. PERFORMANCE INPUTS & WINS JOURNAL */}
              {/* =============================================================== */}
              {activeWorkflow === "performance_inputs" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* State Machine Lock Rule */}
                  <div
                    style={{
                      backgroundColor: "rgba(139, 92, 246, 0.08)",
                      border: "1px solid rgba(139, 92, 246, 0.25)",
                      borderRadius: radii.md,
                      padding: "0.85rem 1rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Icons.Lock size={18} color="#8b5cf6" />
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#5b21b6" }}>
                          Configuration Rule: Review Cycle State Machine Lock
                        </div>
                        <div style={{ fontSize: "11px", color: "#6d28d9" }}>
                          Active: 2026 Annual Cycle (Self-Assessment). Once submitted to &quot;Manager Review&quot;, fields are locked against revisions.
                        </div>
                      </div>
                    </div>
                    <Badge variant="info" size="sm">Cycle Active</Badge>
                  </div>

                  {/* ScoReview Edge: Wins & Accomplishments Journal */}
                  <div style={{ border: `1px solid ${colors.indigoBorder}`, borderRadius: radii.md, padding: "1rem", backgroundColor: colors.surfaceSubtle }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Icons.Sparkles size={16} color={colors.indigoAction} />
                        <h4 style={{ fontSize: "12px", fontWeight: 700, color: colors.indigoPrimary, margin: 0 }}>
                          ScoReview Edge · Quick Wins Journal
                        </h4>
                      </div>
                      <span style={{ fontSize: "10px", color: colors.textMuted }}>Continuous logging prevents recency bias</span>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      <input
                        type="text"
                        placeholder="Log an impactful win, client compliment, or code milestone..."
                        value={newWinTitle}
                        onChange={(e) => setNewWinTitle(e.target.value)}
                        style={{ flex: 1, padding: "0.45rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: "12px" }}
                      />
                      <select
                        value={newWinCategory}
                        onChange={(e) => setNewWinCategory(e.target.value)}
                        style={{ padding: "0.45rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: "12px" }}
                      >
                        <option>Engineering</option>
                        <option>Strategy</option>
                        <option>Leadership</option>
                        <option>Operations</option>
                      </select>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          if (!newWinTitle.trim()) return;
                          setJournalEntries([
                            { id: Date.now(), title: newWinTitle.trim(), date: "Just now", category: newWinCategory },
                            ...journalEntries,
                          ]);
                          setNewWinTitle("");
                        }}
                      >
                        Log Win
                      </Button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      {journalEntries.map((j) => (
                        <div
                          key={j.id}
                          style={{
                            padding: "0.5rem 0.75rem",
                            backgroundColor: colors.surface,
                            borderRadius: radii.sm,
                            border: `1px solid ${colors.border}`,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "11px",
                          }}
                        >
                          <span style={{ color: colors.textPrimary }}>
                            <strong>[{j.category}]</strong> {j.title}
                          </span>
                          <span style={{ color: colors.textMuted, fontSize: "10px", whiteSpace: "nowrap" }}>{j.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Submission and Lock Trigger */}
                  <div style={{ border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: colors.indigoPrimary }}>
                          Lock and Submit Self-Review to Line Manager
                        </div>
                        <div style={{ fontSize: "11px", color: colors.textMuted }}>
                          {performanceLocked ? "Locked and routed to Kofi Mensah." : "Locks your OKR ratings and Journal items into the audit record."}
                        </div>
                      </div>
                      <Button
                        variant={performanceLocked ? "secondary" : "primary"}
                        size="sm"
                        disabled={performanceLocked}
                        onClick={() => setPerformanceLocked(true)}
                      >
                        {performanceLocked ? "Locked & Submitted ✓" : "Submit Self-Review"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* =============================================================== */}
              {/* 5. WORK SCHEDULES & ATTENDANCE */}
              {/* =============================================================== */}
              {activeWorkflow === "work_schedules" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* Geofence & IP Rules */}
                  <div
                    style={{
                      backgroundColor: "rgba(6, 182, 212, 0.08)",
                      border: "1px solid rgba(6, 182, 212, 0.25)",
                      borderRadius: radii.md,
                      padding: "0.85rem 1rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Icons.Globe size={18} color="#06b6d4" />
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#0e7490" }}>
                          Configuration Rule: Geofencing & IP Whitelist Active
                        </div>
                        <div style={{ fontSize: "11px", color: "#0891b2" }}>
                          Accra Ridge Hub (Radius 250m) & London Wall Hub. Approved hours auto-sync to Payroll module.
                        </div>
                      </div>
                    </div>
                    <Badge variant="info" size="sm">Biometric Gate Synced</Badge>
                  </div>

                  {/* Punch Clock & Remote Work Bar */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div style={{ border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: "1rem", backgroundColor: colors.surfaceSubtle }}>
                      <div style={{ fontSize: "11px", color: colors.textMuted, textTransform: "uppercase", fontWeight: 700 }}>
                        Live Punch Console
                      </div>
                      <div style={{ fontSize: "1.4rem", fontWeight: 800, color: clockedIn ? "#10b981" : colors.textPrimary, marginTop: "0.25rem" }}>
                        {clockedIn ? `CLOCKED IN (${clockInTime})` : "CLOCKED OUT"}
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "0.3rem" }}>
                        Geofence: Accra Ridge Hub • IP: 196.223.41.82 (Verified)
                      </div>
                      <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
                        <Button
                          variant={clockedIn ? "outline" : "primary"}
                          size="sm"
                          onClick={() => {
                            if (clockedIn) {
                              setClockedIn(false);
                            } else {
                              setClockedIn(true);
                              setClockInTime("Just now");
                            }
                          }}
                        >
                          {clockedIn ? "Clock Out / Break" : "Clock In Now"}
                        </Button>
                      </div>
                    </div>

                    {/* ScoReview Edge: 1-Click Log Remote Work */}
                    <div style={{ border: `1px solid ${colors.indigoBorder}`, borderRadius: radii.md, padding: "1rem", backgroundColor: colors.indigoSubtle }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: colors.indigoAccent, textTransform: "uppercase", fontWeight: 700 }}>
                          ScoReview Edge · Hybrid Hub
                        </span>
                        <Badge variant="info" size="sm">1-Click WFH</Badge>
                      </div>
                      <div style={{ fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary, marginTop: "0.25rem" }}>
                        Log Remote Work Day
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textSecondary, marginTop: "0.3rem" }}>
                        Instant sync with Slack status and team calendar.
                      </div>
                      <div style={{ marginTop: "0.75rem" }}>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={remoteLogged}
                          onClick={() => {
                            setRemoteLogged(true);
                            setTimeout(() => setRemoteLogged(false), 3500);
                          }}
                        >
                          {remoteLogged ? "Remote Work Day Logged ✓" : "Log Today as Remote"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Unified Calendar Preview */}
                  <div>
                    <h4 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: colors.textSecondary, marginBottom: "0.5rem" }}>
                      Unified Calendar: Shifts, Leave & Public Holidays
                    </h4>
                    <div style={{ border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: "0.85rem", fontSize: "11px", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>● Today (Wednesday)</span>
                        <span style={{ fontWeight: 600, color: "#10b981" }}>09:00 - 17:30 Consulting Shift (Accra Hub)</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>● Tomorrow (Thursday)</span>
                        <span style={{ fontWeight: 600, color: "#06b6d4" }}>09:00 - 17:30 Scheduled Remote Work</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>● Dec 04 (Friday)</span>
                        <span style={{ fontWeight: 600, color: "#8b5cf6" }}>Ghana Farmers&apos; Day (National Public Holiday)</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>● Dec 25 - Dec 26</span>
                        <span style={{ fontWeight: 600, color: "#8b5cf6" }}>Christmas Day & Boxing Day (Office Closed)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* =============================================================== */}
              {/* 6. HR SERVICE CATALOG & AI DOCUMENTS */}
              {/* =============================================================== */}
              {activeWorkflow === "service_catalog" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* ScoReview Edge: AI-Powered Document Search */}
                  <div
                    style={{
                      background: "linear-gradient(135deg, rgba(236, 72, 153, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)",
                      border: "1px solid rgba(236, 72, 153, 0.3)",
                      borderRadius: radii.lg,
                      padding: "1rem 1.25rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.35rem" }}>
                      <Icons.Sparkles size={16} color="#ec4899" />
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#be185d" }}>
                        ScoReview Edge · AI Natural Language Letter Generator
                      </span>
                    </div>
                    <p style={{ margin: "0 0 0.65rem 0", fontSize: "11px", color: colors.textSecondary }}>
                      Type what you need in plain English (e.g. &quot;I need a Schengen visa letter to visit Germany in December&quot;), and the AI instantly generates it on company letterhead with digital signatures.
                    </p>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input
                        type="text"
                        placeholder="e.g. I need an official employment letter for my UK visa application..."
                        value={aiLetterQuery}
                        onChange={(e) => setAiLetterQuery(e.target.value)}
                        style={{ flex: 1, padding: "0.5rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: "12px" }}
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedLetterType("visa");
                          setGeneratedLetterReady(true);
                        }}
                      >
                        Generate Letter
                      </Button>
                    </div>
                  </div>

                  {/* Standard Service Catalog Templates */}
                  <div>
                    <h4 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: colors.textSecondary, marginBottom: "0.6rem" }}>
                      Standard Service Catalog Templates
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      {[
                        { key: "visa", title: "Employment Verification Letter", sub: "For Visas, Embassies & Travel", time: "Instant PDF" },
                        { key: "bank", title: "Salary & Income Certificate", sub: "For Mortgages, Loans & Banks", time: "Instant PDF" },
                        { key: "tenancy", title: "Tenancy & Housing Reference", sub: "For Landlords & Real Estate", time: "Instant PDF" },
                        { key: "general", title: "Raise an HR Service Ticket", sub: "Benefits, Tax & Policy Inquiries", time: "24h SLA" },
                      ].map((item) => (
                        <div
                          key={item.key}
                          onClick={() => {
                            setSelectedLetterType(item.key as typeof selectedLetterType);
                            setGeneratedLetterReady(true);
                          }}
                          style={{
                            padding: "0.85rem",
                            border: `1px solid ${selectedLetterType === item.key && generatedLetterReady ? "#ec4899" : colors.border}`,
                            borderRadius: radii.md,
                            backgroundColor: selectedLetterType === item.key && generatedLetterReady ? "rgba(236, 72, 153, 0.05)" : colors.surfaceSubtle,
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: colors.indigoPrimary }}>{item.title}</span>
                            <Badge variant="neutral" size="sm">{item.time}</Badge>
                          </div>
                          <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "0.2rem" }}>{item.sub}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Generated Document Preview */}
                  {generatedLetterReady && (
                    <div style={{ border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: "1rem", backgroundColor: colors.surface }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${colors.border}`, paddingBottom: "0.5rem", marginBottom: "0.75rem" }}>
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 700, color: colors.indigoPrimary }}>
                            Official Letterhead Preview (Auto-Generated)
                          </div>
                          <div style={{ fontSize: "10px", color: colors.textMuted }}>Digital cryptographic signature applied</div>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            alert("Downloading official generated PDF with Davies Wright & ScoReview corporate letterhead.");
                          }}
                        >
                          <Icons.Download size={13} />
                          <span>Download Signed PDF</span>
                        </Button>
                      </div>

                      <div style={{ fontFamily: "Georgia, serif", fontSize: "11px", color: colors.textPrimary, lineHeight: 1.6, padding: "0.5rem" }}>
                        <div style={{ fontWeight: "bold", fontSize: "13px", color: colors.indigoPrimary, marginBottom: "0.25rem" }}>
                          DAVIES WRIGHT & SCOREVIEW CONSULTING LIMITED
                        </div>
                        <div style={{ fontSize: "10px", color: colors.textMuted, marginBottom: "0.75rem" }}>
                          Accra Ridge Financial Centre, Ghana • London Wall, United Kingdom
                        </div>
                        <p><strong>TO WHOM IT MAY CONCERN</strong></p>
                        <p>
                          This is to certify that <strong>{employee.name}</strong> (Staff ID: SEN-EMP-001) is currently employed with us on a full-time, permanent basis in the role of <strong>{employee.role}</strong> within our <strong>{employee.department}</strong>.
                        </p>
                        <p>
                          {selectedLetterType === "bank"
                            ? "His current annual remuneration package is GH₵420,000.00 Base Gross per annum, paid monthly into his verified Ecobank Ghana account."
                            : "He is authorized to travel for official duties/leave, and his employment will continue upon his scheduled return."}
                        </p>
                        <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                          <div>
                            <div style={{ fontWeight: "bold" }}>Dr. Araba Mensah, SPHRi</div>
                            <div style={{ fontSize: "10px", color: colors.textMuted }}>Group Director of People & Culture</div>
                          </div>
                          <div style={{ textAlign: "right", fontSize: "10px", color: colors.textMuted }}>
                            QR Verification Code: <strong>VER-2026-GH-9018</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* =============================================================== */}
              {/* 7. LEARNING & DEVELOPMENT (LMS) */}
              {/* =============================================================== */}
              {activeWorkflow === "learning_lms" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* Mandatory LMS Sync Notice */}
                  <div
                    style={{
                      backgroundColor: "rgba(20, 184, 166, 0.08)",
                      border: "1px solid rgba(20, 184, 166, 0.25)",
                      borderRadius: radii.md,
                      padding: "0.85rem 1rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Icons.BookOpen size={18} color="#14b8a6" />
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f766e" }}>
                          LMS Integration & Mandatory Compliance Sync
                        </div>
                        <div style={{ fontSize: "11px", color: "#115e59" }}>
                          Admins mandate regulatory modules. Completion syncs automatically to personnel audit files.
                        </div>
                      </div>
                    </div>
                    <Badge variant="warning" size="sm">2 To-Dos Pending</Badge>
                  </div>

                  {/* Mandatory Compliance To-Dos */}
                  <div>
                    <h4 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: colors.textSecondary, marginBottom: "0.6rem" }}>
                      Mandatory Compliance Modules
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                      <div style={{ padding: "0.85rem", border: `1px solid ${colors.border}`, borderRadius: radii.md, backgroundColor: colors.surfaceSubtle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 700, color: colors.indigoPrimary }}>
                            Anti-Bribery, Corruption & Whistleblowing 2026
                          </div>
                          <div style={{ fontSize: "11px", color: colors.textMuted }}>Due in 14 days • 45 minutes • 60% completed</div>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => alert("Resuming Anti-Bribery 2026 module in interactive LMS player.")}
                        >
                          Resume (60%)
                        </Button>
                      </div>

                      <div style={{ padding: "0.85rem", border: `1px solid ${colors.border}`, borderRadius: radii.md, backgroundColor: colors.surfaceSubtle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 700, color: colors.indigoPrimary }}>
                            Data Protection & ISO 27001 Security Hygiene
                          </div>
                          <div style={{ fontSize: "11px", color: "#10b981", fontWeight: 600 }}>Completed on Oct 14, 2026 • Verified Certificate</div>
                        </div>
                        <Badge variant="success" size="sm">Completed ✓</Badge>
                      </div>
                    </div>
                  </div>

                  {/* ScoReview Edge: T-Shaped Competency Gap Recommendations */}
                  <div
                    style={{
                      border: `1px solid rgba(20, 184, 166, 0.3)`,
                      backgroundColor: "rgba(20, 184, 166, 0.05)",
                      borderRadius: radii.md,
                      padding: "1rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.35rem" }}>
                      <Icons.Sparkles size={16} color="#0f766e" />
                      <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#0f766e", margin: 0 }}>
                        ScoReview Edge · T-Shaped Skill Gap Recommendations
                      </h4>
                    </div>
                    <p style={{ margin: "0 0 0.75rem 0", fontSize: "11px", color: colors.textSecondary }}>
                      Synthesized directly from your H1 BSC evaluation competency scores to support your next promotion track.
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <div style={{ padding: "0.75rem", backgroundColor: colors.surface, borderRadius: radii.sm, border: `1px solid ${colors.border}` }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: colors.indigoPrimary }}>
                          Strategic Corporate Finance for Engineering Leaders
                        </div>
                        <div style={{ fontSize: "10px", color: colors.textMuted, margin: "0.2rem 0 0.5rem 0" }}>
                          Fills gap: CapEx financial modeling (BSC Financial pillar)
                        </div>
                        <Button
                          variant={enrolledCourses.includes(201) ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => {
                            setEnrolledCourses([...enrolledCourses, 201]);
                          }}
                        >
                          {enrolledCourses.includes(201) ? "Enrolled ✓" : "Enroll (Free)"}
                        </Button>
                      </div>

                      <div style={{ padding: "0.75rem", backgroundColor: colors.surface, borderRadius: radii.sm, border: `1px solid ${colors.border}` }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: colors.indigoPrimary }}>
                          Executive Cross-Border Stakeholder Influence
                        </div>
                        <div style={{ fontSize: "10px", color: colors.textMuted, margin: "0.2rem 0 0.5rem 0" }}>
                          Fills gap: Multi-jurisdiction communication (London/Accra)
                        </div>
                        <Button
                          variant={enrolledCourses.includes(202) ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => {
                            setEnrolledCourses([...enrolledCourses, 202]);
                          }}
                        >
                          {enrolledCourses.includes(202) ? "Enrolled ✓" : "Enroll (Free)"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* =============================================================== */}
              {/* 8. WELL-BEING, BENEFITS & WELLNESS WALLET */}
              {/* =============================================================== */}
              {activeWorkflow === "wellbeing_benefits" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* Daily Pulse Check-in (Anonymous Aggregation) */}
                  <div
                    style={{
                      border: `1px solid ${colors.border}`,
                      borderRadius: radii.md,
                      padding: "1rem",
                      backgroundColor: colors.surfaceSubtle,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                      <h4 style={{ fontSize: "12px", fontWeight: 700, color: colors.indigoPrimary, margin: 0 }}>
                        Daily Pulse Check-In: &quot;How are you feeling today?&quot;
                      </h4>
                      <span style={{ fontSize: "10px", color: colors.textMuted }}>100% Anonymous Aggregation</span>
                    </div>
                    <p style={{ margin: "0 0 0.75rem 0", fontSize: "11px", color: colors.textSecondary }}>
                      Helps leadership gauge team burnout, stress, and energy levels without attributing responses to individual identities.
                    </p>

                    <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      {[
                        { emoji: "😊", label: "Great" },
                        { emoji: "😌", label: "Good" },
                        { emoji: "😐", label: "Okay" },
                        { emoji: "🥱", label: "Fatigued" },
                        { emoji: "😟", label: "Overwhelmed" },
                      ].map((item) => (
                        <button
                          key={item.label}
                          onClick={() => setSelectedMood(item.label)}
                          style={{
                            flex: 1,
                            padding: "0.6rem 0.4rem",
                            borderRadius: radii.sm,
                            border: `1px solid ${selectedMood === item.label ? colors.indigoAction : colors.border}`,
                            backgroundColor: selectedMood === item.label ? colors.indigoSubtle : colors.surface,
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <span style={{ fontSize: "18px" }}>{item.emoji}</span>
                          <span style={{ fontSize: "10px", fontWeight: selectedMood === item.label ? 700 : 500, color: colors.textPrimary }}>
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: pulseSubmitted ? "#10b981" : colors.textMuted }}>
                        {pulseSubmitted ? "✓ Your response was recorded anonymously in the HR Analytics stream." : "Select an emotion to submit."}
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={!selectedMood || pulseSubmitted}
                        onClick={() => {
                          setPulseSubmitted(true);
                        }}
                      >
                        {pulseSubmitted ? "Recorded ✓" : "Submit Anonymously"}
                      </Button>
                    </div>
                  </div>

                  {/* ScoReview Edge: Wellness Wallet */}
                  <div
                    style={{
                      background: "linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)",
                      border: "1px solid rgba(244, 63, 94, 0.3)",
                      borderRadius: radii.md,
                      padding: "1rem 1.25rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Icons.Wallet size={16} color="#f43f5e" />
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#be123c" }}>
                          ScoReview Edge · Wellness Wallet
                        </span>
                      </div>
                      <Badge variant="success" size="sm">GH₵{wellnessBalance.toLocaleString()} Available</Badge>
                    </div>

                    <p style={{ margin: "0 0 0.75rem 0", fontSize: "11px", color: colors.textSecondary }}>
                      Claim direct reimbursements for gym memberships, mental health apps (Calm, Headspace), running shoes, and ergonomic home office chairs.
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: 600, color: colors.textSecondary, display: "block", marginBottom: "0.25rem" }}>
                          Claim Amount (GH₵)
                        </label>
                        <input
                          type="number"
                          value={wellnessClaimAmount}
                          onChange={(e) => setWellnessClaimAmount(e.target.value)}
                          style={{ width: "100%", padding: "0.45rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: "12px" }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: "11px", fontWeight: 600, color: colors.textSecondary, display: "block", marginBottom: "0.25rem" }}>
                          Category
                        </label>
                        <select
                          value={wellnessClaimCategory}
                          onChange={(e) => setWellnessClaimCategory(e.target.value)}
                          style={{ width: "100%", padding: "0.45rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: "12px" }}
                        >
                          <option>Gym & Fitness Membership</option>
                          <option>Mental Health & Mindfulness Apps</option>
                          <option>Ergonomic Workspace Equipment</option>
                          <option>Nutritional & Wellness Support</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: wellnessClaimSuccess ? "#10b981" : colors.textMuted }}>
                        {wellnessClaimSuccess ? "✓ Claim verified & added to next payroll payout." : "Receipt upload verified via OCR."}
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={wellnessClaimSuccess}
                        onClick={() => {
                          const amt = Number(wellnessClaimAmount) || 0;
                          setWellnessBalance((prev) => Math.max(0, prev - amt));
                          setWellnessClaimSuccess(true);
                          setTimeout(() => setWellnessClaimSuccess(false), 3500);
                        }}
                      >
                        {wellnessClaimSuccess ? "Approved ✓" : "Submit Claim for Payout"}
                      </Button>
                    </div>
                  </div>

                  {/* EAP Hotline & Health Insurance */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div style={{ padding: "0.85rem", border: `1px solid ${colors.border}`, borderRadius: radii.md, backgroundColor: colors.surface }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: colors.indigoPrimary }}>
                        24/7 Confidential EAP Support
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textMuted, margin: "0.2rem 0" }}>
                        Call: <strong>+233 (0) 30 200 9988</strong>
                      </div>
                      <div style={{ fontSize: "10px", color: colors.textSecondary }}>Free mental health & personal counseling</div>
                    </div>

                    <div style={{ padding: "0.85rem", border: `1px solid ${colors.border}`, borderRadius: radii.md, backgroundColor: colors.surface }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: colors.indigoPrimary }}>
                        Bupa International Healthcare
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textMuted, margin: "0.2rem 0" }}>
                        Policy: <strong>BUP-GH-2026-90412</strong>
                      </div>
                      <div style={{ fontSize: "10px", color: colors.textSecondary }}>Gold Executive Comprehensive Cover</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "0.85rem 1.5rem",
                borderTop: `1px solid ${colors.border}`,
                backgroundColor: colors.surfaceSubtle,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {activeWorkflow === "time_off" && onNavigate && (
                  <Button variant="outline" size="sm" onClick={() => { setActiveWorkflow(null); onNavigate("time_and_leave"); }}>
                    Open Full Time & Leave Hub →
                  </Button>
                )}
                {activeWorkflow === "performance_inputs" && onNavigate && (
                  <Button variant="outline" size="sm" onClick={() => { setActiveWorkflow(null); onNavigate("performance_pms"); }}>
                    Open Full PMS Matrix →
                  </Button>
                )}
                {activeWorkflow === "service_catalog" && onNavigate && (
                  <Button variant="outline" size="sm" onClick={() => { setActiveWorkflow(null); onNavigate("helpdesk"); }}>
                    Open Helpdesk Center →
                  </Button>
                )}
                {activeWorkflow === "learning_lms" && onNavigate && (
                  <Button variant="outline" size="sm" onClick={() => { setActiveWorkflow(null); onNavigate("skills_marketplace"); }}>
                    Open Skills Marketplace →
                  </Button>
                )}
                {activeWorkflow === "profile_governance" && onNavigate && (
                  <Button variant="outline" size="sm" onClick={() => { setActiveWorkflow(null); onNavigate("employee_settings"); }}>
                    Open Governance Settings →
                  </Button>
                )}
              </div>

              <Button variant="secondary" size="sm" onClick={() => setActiveWorkflow(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

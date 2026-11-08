"use client";

import React, { useState, useMemo } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { drillProps } from "../../utils/drill";
import { DataTable, Column } from "../../design-system/DataTable";
import { SlideOver } from "../../design-system/SlideOver";
import { formatDate, formatDateRange } from "../../utils/date";
import { AttendanceTimeZonesPanel } from "./AttendanceTimeZonesPanel";
import { DepartmentSchedulesRosterView } from "./DepartmentSchedulesRosterView";

export interface LeaveRecord {
  id: number;
  first_name: string;
  last_name: string;
  staff_id?: string;
  department?: string;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  requested_days: string;
  status: string;
  reason: string;
  attachment?: string;
  approver?: string;
}

export interface LeaveResumptionRecord {
  id: number;
  employeeName: string;
  staffId: string;
  department: string;
  leaveType: string;
  leaveStartDate: string;
  leaveEndDate: string;
  expectedResumptionDate: string;
  actualResumptionDate: string;
  status: "PENDING_REVIEW" | "CONFIRMED" | "OVERDUE";
  fitForWorkCert: boolean;
  rampUpArrangement: string;
  notes: string;
}

export interface LeaveBalanceRecord {
  id: number;
  employeeName: string;
  staffId: string;
  department: string;
  annualEntitlement: number;
  annualUsed: number;
  annualRemaining: number;
  sickRemaining: number;
  compassionateRemaining: number;
  maternityPaternityRemaining: number;
  cashLiabilityGhs: number;
  carryOverDays: number;
}

export interface BlockedLeaveDay {
  id: number;
  title: string;
  type: "BLOCKED_BLACKOUT" | "RESERVED_SHUTDOWN" | "ADDITIONAL_GRANT";
  startDate: string;
  endDate: string;
  affectedDepartments: string[];
  reason: string;
  approvedBy: string;
}

interface TimeAndLeaveViewProps {
  initialLeaves: LeaveRecord[];
  showNewLeaveModal?: boolean;
  onCloseNewLeaveModal?: () => void;
}

export const TimeAndLeaveView: React.FC<TimeAndLeaveViewProps> = ({
  initialLeaves,
  showNewLeaveModal = false,
  onCloseNewLeaveModal,
}) => {
  // Leave Navigation Tabs (13 Modules)
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "department_schedules"
    | "attendance_zones"
    | "requests"
    | "resumption"
    | "plan_history"
    | "policies"
    | "upload_history"
    | "balances"
    | "reserved_days"
    | "additional_days"
    | "blocked_days"
    | "allowances"
    | "settings"
  >("dashboard");

  // Core Leaves State
  const [leaves, setLeaves] = useState<LeaveRecord[]>([
    ...initialLeaves,
    {
      id: 901,
      first_name: "Richard",
      last_name: "Mamphey",
      staff_id: "SHR/GH/038",
      department: "Human Resources",
      leave_type_name: "Annual Leave",
      start_date: "2026-11-24",
      end_date: "2026-11-28",
      requested_days: "5.0",
      status: "APPROVED",
      reason: "Family relocation & annual rest",
      attachment: "Flight_Ticket_Accra.pdf",
      approver: "Richard Barnes",
    },
    {
      id: 902,
      first_name: "Clara",
      last_name: "Nukunu",
      staff_id: "SCG153",
      department: "Customer Service",
      leave_type_name: "Casual Leave",
      start_date: "2026-11-06",
      end_date: "2026-11-06",
      requested_days: "1.0",
      status: "PENDING",
      reason: "Personal urgent appointment in Accra",
      approver: "Richard Mamphey",
    },
    {
      id: 903,
      first_name: "Adjoa",
      last_name: "Asare",
      staff_id: "GH/2017/6/13/094",
      department: "People & Culture",
      leave_type_name: "Maternity Leave",
      start_date: "2026-07-01",
      end_date: "2026-10-06",
      requested_days: "70.0",
      status: "APPROVED",
      reason: "Statutory 14-week Maternity leave per Ghana Labour Act",
      attachment: "Maternity_Medical_Certificate.pdf",
      approver: "Sarah Jenkins",
    },
    {
      id: 904,
      first_name: "Kwame",
      last_name: "Mensah",
      staff_id: "KSP/2024/0220",
      department: "Hardware Operations",
      leave_type_name: "Medical / Sick Leave",
      start_date: "2026-11-02",
      end_date: "2026-11-04",
      requested_days: "3.0",
      status: "APPROVED",
      reason: "Inpatient malaria recovery at Ridge Hospital Accra",
      attachment: "Medical_Report_Ridge_Hospital.pdf",
      approver: "Paa Kwesi Barnes",
    },
  ]);

  // Leave Resumption Records State (Screenshot item 3)
  const [resumptions, setResumptions] = useState<LeaveResumptionRecord[]>([
    {
      id: 1,
      employeeName: "Adjoa Asare",
      staffId: "GH/2017/6/13/094",
      department: "People & Culture",
      leaveType: "Maternity Leave (14 Weeks)",
      leaveStartDate: "2026-07-01",
      leaveEndDate: "2026-10-06",
      expectedResumptionDate: "2026-10-07",
      actualResumptionDate: "2026-10-07",
      status: "CONFIRMED",
      fitForWorkCert: true,
      rampUpArrangement: "Phased 4-day hybrid work week for first 6 weeks with lactation hour credits.",
      notes: "Fully cleared by clinical occupational health team. Equipment provisioned.",
    },
    {
      id: 2,
      employeeName: "Dr. Abena Kyeremeh",
      staffId: "SEN/018",
      department: "Advisory & Research",
      leaveType: "Medical Sabbatical Leave",
      leaveStartDate: "2026-08-01",
      leaveEndDate: "2026-10-31",
      expectedResumptionDate: "2026-11-01",
      actualResumptionDate: "2026-11-03",
      status: "PENDING_REVIEW",
      fitForWorkCert: true,
      rampUpArrangement: "Light duties and remote advisory sprints (80% capacity) for month 1.",
      notes: "Awaiting final supervisor sign-off on return-to-office badge reactivations.",
    },
    {
      id: 3,
      employeeName: "Kwame Mensah",
      staffId: "KSP/2024/0220",
      department: "Hardware Operations",
      leaveType: "Sick Leave",
      leaveStartDate: "2026-11-02",
      leaveEndDate: "2026-11-04",
      expectedResumptionDate: "2026-11-05",
      actualResumptionDate: "2026-11-05",
      status: "PENDING_REVIEW",
      fitForWorkCert: true,
      rampUpArrangement: "Full duties resumed; non-heavy lifting for first 48 hours.",
      notes: "Discharged from hospital in good health.",
    },
  ]);

  // Leave Balances & Financial Liability Ledger (Screenshot item 7)
  const [balances, setBalances] = useState<LeaveBalanceRecord[]>([
    {
      id: 1,
      employeeName: "Paa Kwesi Barnes",
      staffId: "SEN/001",
      department: "Executive Leadership",
      annualEntitlement: 25,
      annualUsed: 5,
      annualRemaining: 20,
      sickRemaining: 10,
      compassionateRemaining: 5,
      maternityPaternityRemaining: 10,
      cashLiabilityGhs: 34200,
      carryOverDays: 5,
    },
    {
      id: 2,
      employeeName: "Richard Mamphey",
      staffId: "SHR/GH/038",
      department: "Human Resources",
      annualEntitlement: 22,
      annualUsed: 5,
      annualRemaining: 17,
      sickRemaining: 10,
      compassionateRemaining: 5,
      maternityPaternityRemaining: 10,
      cashLiabilityGhs: 14800,
      carryOverDays: 3,
    },
    {
      id: 3,
      employeeName: "Benedicta Agbesi",
      staffId: "SEN/004",
      department: "People & Culture",
      annualEntitlement: 21,
      annualUsed: 3,
      annualRemaining: 18,
      sickRemaining: 10,
      compassionateRemaining: 5,
      maternityPaternityRemaining: 0,
      cashLiabilityGhs: 11200,
      carryOverDays: 2,
    },
    {
      id: 4,
      employeeName: "Philip Aryee",
      staffId: "SEN/005",
      department: "Cloud Engineering",
      annualEntitlement: 25,
      annualUsed: 7,
      annualRemaining: 18,
      sickRemaining: 10,
      compassionateRemaining: 5,
      maternityPaternityRemaining: 10,
      cashLiabilityGhs: 19400,
      carryOverDays: 4,
    },
    {
      id: 5,
      employeeName: "Clara Nukunu",
      staffId: "SCG153",
      department: "Customer Service",
      annualEntitlement: 21,
      annualUsed: 8,
      annualRemaining: 13,
      sickRemaining: 10,
      compassionateRemaining: 5,
      maternityPaternityRemaining: 0,
      cashLiabilityGhs: 5800,
      carryOverDays: 0,
    },
    {
      id: 6,
      employeeName: "Kwame Mensah",
      staffId: "KSP/2024/0220",
      department: "Hardware Operations",
      annualEntitlement: 21,
      annualUsed: 6,
      annualRemaining: 15,
      sickRemaining: 7,
      compassionateRemaining: 5,
      maternityPaternityRemaining: 10,
      cashLiabilityGhs: 6200,
      carryOverDays: 0,
    },
  ]);

  // Blocked, Reserved & Additional Days (Screenshot items 8, 9, 10)
  const [blockedDays, setBlockedDays] = useState<BlockedLeaveDay[]>([
    {
      id: 1,
      title: "Q4 Financial Year-End & Statutory Tax Audit Closing",
      type: "BLOCKED_BLACKOUT",
      startDate: "2026-12-15",
      endDate: "2026-12-31",
      affectedDepartments: ["Finance", "Payroll", "Executive Leadership"],
      reason: "Mandatory all-hands financial reconciliation and statutory GRA / HMRC audit filing.",
      approvedBy: "Paa Kwesi Barnes (Managing Principal)",
    },
    {
      id: 2,
      title: "Annual Christmas & New Year Corporate Shutdown",
      type: "RESERVED_SHUTDOWN",
      startDate: "2026-12-24",
      endDate: "2027-01-02",
      affectedDepartments: ["All Departments"],
      reason: "Company-wide paid festive recess. Does not deduct from personal annual leave.",
      approvedBy: "Board of Directors",
    },
    {
      id: 3,
      title: "Cloud Edge Migration Sprint Reward — 2 Wellness Days",
      type: "ADDITIONAL_GRANT",
      startDate: "2026-11-20",
      endDate: "2026-11-21",
      affectedDepartments: ["Cloud Engineering", "DevOps"],
      reason: "Extra discretionary rest days granted for achieving zero-downtime Neon Hyperdrive cutover.",
      approvedBy: "Richard Barnes (CEO)",
    },
  ]);

  // Modals & Drawers
  const [showModal, setShowModal] = useState(showNewLeaveModal);
  const [selectedLeaveForDetail, setSelectedLeaveForDetail] = useState<LeaveRecord | null>(null);
  const [requestSearchQuery, setRequestSearchQuery] = useState("");
  const [requestFilter, setRequestFilter] = useState<string>("ALL");
  const [feedback, setFeedback] = useState<string | null>(null);

  // New Leave Form State
  const [newEmployeeName, setNewEmployeeName] = useState("Paa Kwesi Barnes");
  const [leaveType, setLeaveType] = useState("Annual Leave");
  const [startDate, setStartDate] = useState("2026-05-01");
  const [endDate, setEndDate] = useState("2026-05-05");
  const [reason, setReason] = useState("");

  React.useEffect(() => {
    if (showNewLeaveModal) setShowModal(true);
  }, [showNewLeaveModal]);

  const handleAction = (id: number, newStatus: string) => {
    setLeaves((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
    );
    setFeedback(`Leave request marked as ${newStatus.toLowerCase()}.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleConfirmResumption = (id: number) => {
    setResumptions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "CONFIRMED" } : r))
    );
    setFeedback("Employee leave resumption confirmed. Biometric access and payroll status restored.");
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleCreateLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = newEmployeeName.split(" ");
    const newRecord: LeaveRecord = {
      id: Date.now(),
      first_name: parts[0] || "Staff",
      last_name: parts.slice(1).join(" ") || "Member",
      staff_id: "SEN/022",
      department: "Technology",
      leave_type_name: leaveType,
      start_date: startDate,
      end_date: endDate,
      requested_days: "5.0",
      status: "APPROVED",
      reason: reason || "Scheduled time off",
      approver: "Line Manager",
    };
    setLeaves([newRecord, ...leaves]);
    setShowModal(false);
    onCloseNewLeaveModal?.();
    setFeedback("Leave request recorded and approved with Dede AI clash verification.");
    setTimeout(() => setFeedback(null), 3000);
  };

  // Filtered requests
  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      const fullName = `${l.first_name} ${l.last_name}`.toLowerCase();
      const matchesSearch =
        requestSearchQuery.trim() === "" ||
        fullName.includes(requestSearchQuery.toLowerCase()) ||
        l.leave_type_name.toLowerCase().includes(requestSearchQuery.toLowerCase()) ||
        (l.department && l.department.toLowerCase().includes(requestSearchQuery.toLowerCase()));

      const matchesStatus =
        requestFilter === "ALL" || l.status === requestFilter;

      return matchesSearch && matchesStatus;
    });
  }, [leaves, requestSearchQuery, requestFilter]);

  // Aggregate stats
  const totalLiabilityGhs = useMemo(() => {
    return balances.reduce((sum, b) => sum + b.cashLiabilityGhs, 0);
  }, [balances]);

  const pendingLeavesCount = useMemo(() => {
    return leaves.filter((l) => l.status === "PENDING").length;
  }, [leaves]);

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1440px", margin: "0 auto" }}>
      {/* Header & Sub-Navigation */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.indigoAction, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Workforce Time & Absence
              </span>
            </div>
            <h1
              style={{
                fontSize: typography.sizes.xl,
                fontWeight: 800,
                color: colors.indigoPrimary,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Time, Leave & Attendance Suite
            </h1>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("settings")}
              style={{ borderColor: activeTab === "settings" ? colors.indigoAction : colors.border }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Settings size={14} />
                <span>Leave Settings</span>
              </span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Plus size={14} />
                <span>Request Leave</span>
              </span>
            </Button>
          </div>
        </div>

        {/* Leave Navigation Tabs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            borderBottom: `1px solid ${colors.border}`,
            paddingBottom: "0.35rem",
            overflowX: "auto",
          }}
        >
          {[
            { key: "dashboard", label: "Dashboard", icon: Icons.CommandCentre },
            { key: "department_schedules", label: "Department Schedules & Rosters", icon: Icons.Clock },
            { key: "attendance_zones", label: "Attendance by Time Zone", icon: Icons.Globe },
            { key: "requests", label: "Leave Requests", icon: Icons.Users },
            { key: "resumption", label: "Leave Resumption Requests", icon: Icons.FileCheck },
            { key: "plan_history", label: "Leave Plan History", icon: Icons.Calendar },
            { key: "policies", label: "Leave Policies", icon: Icons.FileText },
            { key: "upload_history", label: "Upload Leave History", icon: Icons.Download },
            { key: "balances", label: "Leave Balance", icon: Icons.Layers },
            { key: "reserved_days", label: "Reserved Leave Days", icon: Icons.Lock },
            { key: "additional_days", label: "Additional Leave Days", icon: Icons.ShieldCheck },
            { key: "blocked_days", label: "Blocked Leave Days", icon: Icons.X },
            { key: "allowances", label: "Leave Allowances", icon: Icons.Wallet },
            { key: "settings", label: "Leave Settings", icon: Icons.Settings },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0.55rem 0.9rem",
                  borderRadius: radii.md,
                  border: "none",
                  backgroundColor: isActive ? colors.surfaceSubtle : "transparent",
                  color: isActive ? colors.indigoAction : colors.textSecondary,
                  fontWeight: isActive ? 700 : 500,
                  fontSize: typography.sizes.xs,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
                  borderBottom: isActive ? `2px solid ${colors.indigoAction}` : "2px solid transparent",
                }}
              >
                <tab.icon size={14} color={isActive ? colors.indigoAction : colors.textMuted} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {feedback && (
        <div
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1.25rem",
            borderRadius: radii.md,
            backgroundColor: colors.successBg,
            border: `1px solid ${colors.successBorder}`,
            color: colors.success,
            fontSize: typography.sizes.sm,
            fontWeight: 500,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{feedback}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: LEAVE DASHBOARD                                                    */}
      {/* ========================================================================= */}
      {activeTab === "dashboard" && (
        <div>
          {/* Top Metric Tiles (Vibrant Colors & Left Accent Lines) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            {/* Card 1: On Leave Today */}
            <div
              {...drillProps(() => { setRequestFilter("APPROVED"); setActiveTab("requests"); }, "Open approved leave requests")}
              style={{
                cursor: "pointer",
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderLeft: "4px solid #2563eb",
                borderRadius: radii.lg,
                padding: "1.25rem",
                boxShadow: shadows.xs,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase" }}>
                  On Leave Today
                </span>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: colors.textPrimary, lineHeight: 1 }}>
                2 Staff
              </div>
              <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "0.4rem" }}>
                Kwame Mensah & Adjoa Asare
              </div>
            </div>

            {/* Card 2: Pending Approval */}
            <div
              {...drillProps(() => { setRequestFilter("PENDING"); setActiveTab("requests"); }, "Open pending leave requests")}
              style={{
                cursor: "pointer",
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderLeft: "4px solid #f97316",
                borderRadius: radii.lg,
                padding: "1.25rem",
                boxShadow: shadows.xs,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase" }}>
                  Pending Approval
                </span>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: colors.textPrimary, lineHeight: 1 }}>
                {pendingLeavesCount} Request
              </div>
              <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "0.4rem" }}>
                Clara Nukunu (Casual Leave)
              </div>
            </div>

            {/* Card 3: Total Leave Liability */}
            <div
              {...drillProps(() => { setActiveTab("balances"); }, "Open leave balances")}
              style={{
                cursor: "pointer",
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderLeft: "4px solid #10b981",
                borderRadius: radii.lg,
                padding: "1.25rem",
                boxShadow: shadows.xs,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase" }}>
                  Unused Leave Liability
                </span>
              </div>
              <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#065f46", lineHeight: 1 }}>
                GH₵{totalLiabilityGhs.toLocaleString()}
              </div>
              <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "0.4rem" }}>
                Accrued unused days across UK & GH
              </div>
            </div>

            {/* Card 4: Resumption Due This Week */}
            <div
              {...drillProps(() => { setActiveTab("resumption"); }, "Open leave resumption requests")}
              style={{
                cursor: "pointer",
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderLeft: "4px solid #8b5cf6",
                borderRadius: radii.lg,
                padding: "1.25rem",
                boxShadow: shadows.xs,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase" }}>
                  Resumptions Pending
                </span>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: colors.textPrimary, lineHeight: 1 }}>
                2 Staff
              </div>
              <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "0.4rem" }}>
                Dr. Abena Kyeremeh & Kwame Mensah
              </div>
            </div>
          </div>

          {/* Dede AI Proactive Leave Advisory */}
          <div
            style={{
              backgroundColor: "rgba(99, 102, 241, 0.04)",
              border: `1px solid rgba(99, 102, 241, 0.2)`,
              borderRadius: radii.lg,
              padding: "1.25rem 1.5rem",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "1rem",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: radii.md,
                backgroundColor: colors.indigoAccent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.surface,
                flexShrink: 0,
              }}
            >
              <Icons.Sparkles size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ fontWeight: 800, color: colors.indigoPrimary, fontSize: typography.sizes.sm }}>
                  Dede — Proactive Leave & Coverage Intelligence
                </span>
                <Badge variant="info" size="sm">Smart Suggestion</Badge>
              </div>
              <p style={{ margin: 0, fontSize: typography.sizes.xs, color: colors.textSecondary, lineHeight: 1.5 }}>
                I detected an upcoming 3-day weekend approaching for Ghana Practice (Independence Day on <strong>06 Mar 2026</strong>). <strong>Richard Mamphey</strong> and <strong>Philip Aryee</strong> currently hold over 17 days of unutilized annual leave. No critical project deliverables or client milestones are scheduled for that week. Would you like me to draft pre-approved leave requests to mitigate Q4 leave liability spikes?
              </p>
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
                <button
                  onClick={() => setShowModal(true)}
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    padding: 0,
                    fontSize: typography.sizes.xs,
                    color: colors.indigoAction,
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Draft Recommended Leave Plan →
                </button>
                <button
                  onClick={() => setActiveTab("resumption")}
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    padding: 0,
                    fontSize: typography.sizes.xs,
                    color: colors.emeraldDark,
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Review Return-to-Work Resumptions (2) →
                </button>
              </div>
            </div>
          </div>

          {/* Quick Dual Cards: Upcoming Leaves & Resumptions */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            {/* Upcoming Approved Leaves */}
            <div
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                border: `1px solid ${colors.border}`,
                padding: "1.25rem",
                boxShadow: shadows.xs,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                  Upcoming Approved Time Off
                </h3>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("requests")}>
                  View All ({leaves.length})
                </Button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {leaves.filter((l) => l.status === "APPROVED").slice(0, 3).map((leave) => (
                  <div
                    key={leave.id}
                    style={{
                      padding: "0.85rem",
                      borderRadius: radii.md,
                      border: `1px solid ${colors.borderSubtle}`,
                      backgroundColor: colors.surfaceSubtle,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                        {leave.first_name} {leave.last_name}
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textMuted }}>
                        {leave.leave_type_name} • {formatDateRange(leave.start_date, leave.end_date)}
                      </div>
                    </div>
                    <Badge variant="success" size="sm">
                      {leave.requested_days} Days
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Resumptions Pending */}
            <div
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                border: `1px solid ${colors.border}`,
                padding: "1.25rem",
                boxShadow: shadows.xs,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                  Leave Resumption Reviews
                </h3>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("resumption")}>
                  Manage Resumptions
                </Button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {resumptions.map((res) => (
                  <div
                    key={res.id}
                    style={{
                      padding: "0.85rem",
                      borderRadius: radii.md,
                      border: `1px solid ${colors.borderSubtle}`,
                      backgroundColor: colors.surfaceSubtle,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                        {res.employeeName}
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textMuted }}>
                        Resuming: {formatDate(res.expectedResumptionDate)} • {res.leaveType}
                      </div>
                    </div>
                    <Badge variant={res.status === "CONFIRMED" ? "success" : "warning"} size="sm">
                      {res.status === "CONFIRMED" ? "Resumed ✓" : "Action Required"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LEAVE REQUESTS                                                     */}
      {/* ========================================================================= */}
      {activeTab === "requests" && (
        <div>
          {/* Header & Subtitle */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
                Leave Requests
              </h2>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
                Review and approve submitted leave requests across all entities and leave categories.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Plus size={14} />
                <span>Submit Leave Request</span>
              </span>
            </Button>
          </div>

          {/* Table Container */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              overflow: "hidden",
              boxShadow: shadows.xs,
            }}
          >
            {/* Toolbar */}
            <div
              style={{
                padding: "0.85rem 1.25rem",
                borderBottom: `1px solid ${colors.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.75rem",
                backgroundColor: colors.surfaceSubtle,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                {/* Search Box */}
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Search by name, leave type, department..."
                    value={requestSearchQuery}
                    onChange={(e) => setRequestSearchQuery(e.target.value)}
                    style={{
                      padding: "0.4rem 0.75rem 0.4rem 2rem",
                      borderRadius: radii.md,
                      border: `1px solid ${colors.border}`,
                      fontSize: typography.sizes.xs,
                      width: "280px",
                      backgroundColor: colors.surface,
                    }}
                  />
                  <div style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: colors.textMuted }}>
                    <Icons.Search size={13} />
                  </div>
                </div>

                {/* Filter Selector */}
                <select
                  value={requestFilter}
                  onChange={(e) => setRequestFilter(e.target.value)}
                  style={{
                    padding: "0.4rem 0.65rem",
                    borderRadius: radii.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: typography.sizes.xs,
                    backgroundColor: colors.surface,
                    color: colors.textSecondary,
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Declined</option>
                </select>
              </div>

              {/* Export Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const csv = "EMPLOYEE,STAFF_ID,CATEGORY,START_DATE,END_DATE,DAYS,STATUS,REASON\n" +
                    leaves.map((l) => `"${l.first_name} ${l.last_name}","${l.staff_id || "N/A"}","${l.leave_type_name}",${l.start_date},${l.end_date},${l.requested_days},${l.status},"${l.reason}"`).join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `scoreview_leave_requests_${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <Icons.Download size={13} />
                  <span>Export</span>
                </span>
              </Button>
            </div>

            {/* Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
              <thead>
                <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>EMPLOYEE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>LEAVE CATEGORY</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>DATES & DURATION</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>BUSINESS REASON</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>ATTACHMENT</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>STATUS</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((l) => (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "50%",
                            backgroundColor: colors.indigoAccent,
                            color: colors.surface,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "11px",
                          }}
                        >
                          {l.first_name[0]}{l.last_name[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: colors.textPrimary }}>
                            {l.first_name} {l.last_name}
                          </div>
                          <div style={{ fontSize: "11px", color: colors.textMuted }}>
                            {l.department || "General"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "0.85rem 1rem", color: colors.textPrimary, fontWeight: 600 }}>
                      {l.leave_type_name}
                    </td>

                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ fontWeight: 600, color: colors.textPrimary }}>
                        {formatDateRange(l.start_date, l.end_date)}
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textMuted }}>
                        {l.requested_days} working days
                      </div>
                    </td>

                    <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary, fontStyle: "italic", maxWidth: "220px" }}>
                      &ldquo;{l.reason}&rdquo;
                    </td>

                    <td style={{ padding: "0.85rem 1rem" }}>
                      {l.attachment ? (
                        <span style={{ fontSize: "11px", color: colors.brandBlue, textDecoration: "underline", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <Icons.FileText size={12} />
                          <span>{l.attachment}</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: "11px", color: colors.textMuted }}>None attached</span>
                      )}
                    </td>

                    <td style={{ padding: "0.85rem 1rem" }}>
                      <Badge
                        variant={
                          l.status === "APPROVED"
                            ? "success"
                            : l.status === "REJECTED"
                            ? "error"
                            : "warning"
                        }
                        size="sm"
                      >
                        {l.status}
                      </Badge>
                    </td>

                    <td style={{ padding: "0.85rem 1rem", textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLeaveForDetail(l)}
                          style={{ padding: "0.25rem 0.5rem", fontSize: "11px" }}
                        >
                          Details
                        </Button>
                        {l.status === "PENDING" && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleAction(l.id, "APPROVED")}
                              style={{ padding: "0.25rem 0.5rem", fontSize: "11px", backgroundColor: colors.emeraldDark, borderColor: colors.emeraldDark }}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAction(l.id, "REJECTED")}
                              style={{ padding: "0.25rem 0.5rem", fontSize: "11px", color: colors.error }}
                            >
                              Decline
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LEAVE RESUMPTION REQUESTS (Screenshot item 3)                       */}
      {/* ========================================================================= */}
      {activeTab === "resumption" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
                Leave Resumption Requests & Return-to-Work Oversight
              </h2>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
                Oversight for staff returning from maternity, extended medical, or sabbatical leave. Confirms fit-for-work status and unlocks hardware access.
              </p>
            </div>
          </div>

          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              overflow: "hidden",
              boxShadow: shadows.xs,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
              <thead>
                <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>STAFF MEMBER</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>LEAVE NATURE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>RESUMPTION DATE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>FIT-FOR-WORK CERT</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>RAMP-UP PLAN</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>STATUS</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {resumptions.map((res) => (
                  <tr key={res.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ fontWeight: 700, color: colors.textPrimary }}>
                        {res.employeeName}
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textMuted }}>
                        {res.staffId} • {res.department}
                      </div>
                    </td>

                    <td style={{ padding: "0.85rem 1rem", color: colors.textPrimary, fontWeight: 600 }}>
                      {res.leaveType}
                    </td>

                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ fontWeight: 700, color: colors.textPrimary }}>
                        {formatDate(res.actualResumptionDate)}
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textMuted }}>
                        Expected: {formatDate(res.expectedResumptionDate)}
                      </div>
                    </td>

                    <td style={{ padding: "0.85rem 1rem" }}>
                      {res.fitForWorkCert ? (
                        <span style={{ fontSize: "11px", color: colors.emeraldDark, fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <Icons.Check size={12} />
                          <span>Doctor Verified</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: "11px", color: colors.error, fontWeight: 700 }}>
                          Pending Certificate
                        </span>
                      )}
                    </td>

                    <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary, maxWidth: "240px" }}>
                      {res.rampUpArrangement}
                    </td>

                    <td style={{ padding: "0.85rem 1rem" }}>
                      <Badge
                        variant={res.status === "CONFIRMED" ? "success" : "warning"}
                        size="sm"
                      >
                        {res.status === "CONFIRMED" ? "Resumed ✓" : "Review Due"}
                      </Badge>
                    </td>

                    <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                      {res.status !== "CONFIRMED" ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleConfirmResumption(res.id)}
                          style={{ backgroundColor: colors.emeraldDark, borderColor: colors.emeraldDark }}
                        >
                          Confirm Resumption
                        </Button>
                      ) : (
                        <span style={{ fontSize: "11px", color: colors.textMuted }}>Cleared</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LEAVE PLAN HISTORY & TEAM CALENDAR (Screenshot item 4)             */}
      {/* ========================================================================= */}
      {activeTab === "plan_history" && (
        <div>
          <div style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
              Annual Leave Plan & Department Heatmap
            </h2>
            <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
              Projected staff time off across quarters. Dede AI automatically flags team clashes where department coverage falls below 65%.
            </p>
          </div>

          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              padding: "1.5rem",
              marginBottom: "1.5rem",
              boxShadow: shadows.xs,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                2026 Quarter-by-Quarter Planned Leaves
              </h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
              {[
                { quarter: "Q1 2026 (Jan – Mar)", daysPlanned: 24, coverage: "94%", status: "Optimal" },
                { quarter: "Q2 2026 (Apr – Jun)", daysPlanned: 38, coverage: "88%", status: "Optimal" },
                { quarter: "Q3 2026 (Jul – Sep)", daysPlanned: 52, coverage: "79%", status: "Peak Summer" },
                { quarter: "Q4 2026 (Oct – Dec)", daysPlanned: 68, coverage: "72%", status: "Year-End Recess" },
              ].map((q) => (
                <div key={q.quarter} style={{ padding: "1rem", borderRadius: radii.md, border: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.surfaceSubtle }}>
                  <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                    {q.quarter}
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: colors.indigoPrimary, margin: "0.25rem 0" }}>
                    {q.daysPlanned} Days
                  </div>
                  <div style={{ fontSize: "11px", color: colors.textMuted }}>
                    Coverage: <strong>{q.coverage}</strong> • {q.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: LEAVE BALANCES & FINANCIAL LIABILITY (Screenshot item 7)           */}
      {/* ========================================================================= */}
      {activeTab === "balances" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
                Leave Balances & Balance Sheet Liability
              </h2>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
                Real-time entitlement balances and monetary encashment liability calculated in Ghana Cedis (GH₵).
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "11px", color: colors.textMuted }}>Total Balance Sheet Liability:</span>
              <div style={{ fontSize: typography.sizes.base, fontWeight: 800, color: colors.emeraldDark }}>
                GH₵{totalLiabilityGhs.toLocaleString()}
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              overflow: "hidden",
              boxShadow: shadows.xs,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
              <thead>
                <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>EMPLOYEE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>ANNUAL ENTITLEMENT</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>DAYS USED</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>DAYS REMAINING</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>SICK / MEDICAL</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>CARRY-OVER</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textAlign: "right" }}>CASH LIABILITY</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((b) => (
                  <tr key={b.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ fontWeight: 700, color: colors.textPrimary }}>{b.employeeName}</div>
                      <div style={{ fontSize: "11px", color: colors.textMuted }}>{b.staffId} • {b.department}</div>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>{b.annualEntitlement} Days</td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textMuted }}>{b.annualUsed} Days</td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span style={{ fontWeight: 800, color: colors.brandBlue }}>
                        {b.annualRemaining} Days
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>{b.sickRemaining} Days</td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>{b.carryOverDays} Days</td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right", fontWeight: 700, color: colors.emeraldDark }}>
                      GH₵{b.cashLiabilityGhs.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: DEPARTMENT SCHEDULES & SHIFT ROSTERS                                  */}
      {/* ========================================================================= */}
      {activeTab === "department_schedules" && <DepartmentSchedulesRosterView />}

      {/* ========================================================================= */}
      {/* TAB: ATTENDANCE BY TIME ZONE                                               */}
      {/* ========================================================================= */}
      {activeTab === "attendance_zones" && <AttendanceTimeZonesPanel />}

      {activeTab === "policies" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
                Leave Policies & Statutory Compliance
              </h2>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
                Standard operating procedures for leave accrual, statutory entitlements, and medical certification rules.
              </p>
            </div>
            <Button variant="outline" size="sm">
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Download size={14} />
                <span>Export Policy Handbook (PDF)</span>
              </span>
            </Button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
            {[
              {
                title: "Annual Leave Policy (Statutory Entitlement)",
                jurisdiction: "Ghana (Labour Act 2003, Act 651) & UK",
                days: "21 – 25 Days / Year",
                rules: "Accrues monthly at 1.75 days per month worked. Maximum 5 days carry-over into following calendar year with manager approval.",
              },
              {
                title: "Maternity Leave Policy (14 Weeks Paid)",
                jurisdiction: "Ghana Statutory Section 57",
                days: "14 Weeks Fully Paid",
                rules: "Eligible after 12 months continuous service. Includes 1-hour daily nursing credits for first 6 months upon resumption.",
              },
              {
                title: "Certified Sick & Medical Leave",
                jurisdiction: "Corporate Welfare Standard",
                days: "Up to 15 Days Paid",
                rules: "Absences exceeding 2 consecutive days require a certified Doctor Fit-for-Work note uploaded via Dede AI document ingestion.",
              },
              {
                title: "Paternity Leave Policy",
                jurisdiction: "Global Equality Policy",
                days: "10 Days Fully Paid",
                rules: "Can be taken within 60 days of childbirth or adoption to support partner and newborn bonding.",
              },
              {
                title: "Study & Examination Leave",
                jurisdiction: "Professional Development Standard",
                days: "Up to 7 Days / Year",
                rules: "Applicable for verified professional certifications (e.g., CIMA, ACCA, AWS/GCP, Cloud & Edge Architecture).",
              },
              {
                title: "Compassionate & Bereavement Leave",
                jurisdiction: "Statutory Welfare",
                days: "5 Working Days Paid",
                rules: "Granted for immediate family bereavement with flexible extension on compassionate grounds.",
              },
            ].map((p, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radii.lg,
                  border: `1px solid ${colors.border}`,
                  padding: "1.25rem",
                  boxShadow: shadows.xs,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <h4 style={{ margin: 0, fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                    {p.title}
                  </h4>
                  <Badge variant="info" size="sm">{p.days}</Badge>
                </div>
                <div style={{ fontSize: "11px", color: colors.indigoAction, fontWeight: 600, marginBottom: "0.5rem" }}>
                  Jurisdiction: {p.jurisdiction}
                </div>
                <p style={{ margin: 0, fontSize: typography.sizes.xs, color: colors.textSecondary, lineHeight: 1.4 }}>
                  {p.rules}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: UPLOAD LEAVE HISTORY (Screenshot item 6)                            */}
      {/* ========================================================================= */}
      {activeTab === "upload_history" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.indigoAction, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Data Migration & Ingestion
                </span>
              </div>
              <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
                Upload Leave History & Attendance Records
              </h2>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
                Migrate historical absence logs, legacy HRIS balances, or branch punch-clock attendance data into ScoRePerf.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFeedback("Downloaded 'Leave_History_Import_Template.csv'.");
                  setTimeout(() => setFeedback(null), 3000);
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Icons.Download size={14} />
                  <span>Download Sample CSV Template</span>
                </span>
              </Button>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `2px dashed ${colors.indigoAccent}`,
              padding: "2.5rem 2rem",
              textAlign: "center",
              marginBottom: "1.5rem",
              cursor: "pointer",
            }}
            onClick={() => {
              setFeedback("Uploaded 'Ghana_Practice_2025_Leave_Ledger.csv'. 142 historical absence records verified by Dede AI.");
              setTimeout(() => setFeedback(null), 4000);
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: radii.full,
                backgroundColor: "rgba(99, 102, 241, 0.1)",
                color: colors.indigoPrimary,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "0.75rem",
              }}
            >
              <Icons.Download size={24} />
            </div>
            <h3 style={{ margin: "0 0 0.35rem 0", fontSize: typography.sizes.base, fontWeight: 700, color: colors.textPrimary }}>
              Drop your CSV or XLSX file here to upload leave history
            </h3>
            <p style={{ margin: "0 0 0.75rem 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
              Required columns: staff_id, full_name, leave_type, start_date, end_date, requested_days, status, reason
            </p>
            <Button variant="primary" size="sm">
              Select File from Computer
            </Button>
          </div>

          {/* Past Ingestion History Table */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              padding: "1.25rem",
              boxShadow: shadows.xs,
            }}
          >
            <h3 style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
              Past Batch Upload History
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
              <thead>
                <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: "0.6rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>BATCH ID</th>
                  <th style={{ padding: "0.6rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>SOURCE FILE</th>
                  <th style={{ padding: "0.6rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>INGESTED RECORDS</th>
                  <th style={{ padding: "0.6rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>UPLOAD DATE</th>
                  <th style={{ padding: "0.6rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>OPERATOR</th>
                  <th style={{ padding: "0.6rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>VALIDATION STATUS</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: "BATCH-2026-09", file: "Workforce_Ghana_2025_Final.csv", rows: "348 records", date: "2026-01-15", operator: "Richard Mamphey", status: "Verified 100%" },
                  { id: "BATCH-2026-04", file: "Henley_Resources_Accra_Q1.xlsx", rows: "92 records", date: "2026-04-02", operator: "Adjoa Asare", status: "Verified 100%" },
                  { id: "BATCH-2026-11", file: "UK_Advisory_Leave_Sync.csv", rows: "45 records", date: "2026-11-01", operator: "Paa Kwesi Barnes", status: "Verified 100%" },
                ].map((b) => (
                  <tr key={b.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "0.75rem 0.85rem", fontWeight: 700, fontFamily: typography.fontMono, color: colors.indigoPrimary }}>{b.id}</td>
                    <td style={{ padding: "0.75rem 0.85rem", color: colors.textPrimary, fontWeight: 600 }}>{b.file}</td>
                    <td style={{ padding: "0.75rem 0.85rem", color: colors.textSecondary }}>{b.rows}</td>
                    <td style={{ padding: "0.75rem 0.85rem", color: colors.textMuted }}>{formatDate(b.date)}</td>
                    <td style={{ padding: "0.75rem 0.85rem", color: colors.textPrimary }}>{b.operator}</td>
                    <td style={{ padding: "0.75rem 0.85rem" }}>
                      <Badge variant="success" size="sm">{b.status} ✓</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: LEAVE BALANCES & FINANCIAL LIABILITY (Screenshot item 7)           */}
      {/* ========================================================================= */}
      {activeTab === "balances" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
                Leave Balance & Encashment Liability
              </h2>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
                Real-time entitlement balances and monetary encashment liability calculated in Ghana Cedis (GH₵).
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "11px", color: colors.textMuted }}>Total Balance Sheet Liability:</span>
              <div style={{ fontSize: typography.sizes.base, fontWeight: 800, color: colors.emeraldDark }}>
                GH₵{totalLiabilityGhs.toLocaleString()}
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              overflow: "hidden",
              boxShadow: shadows.xs,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
              <thead>
                <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>EMPLOYEE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>ANNUAL ENTITLEMENT</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>DAYS USED</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>DAYS REMAINING</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>SICK / MEDICAL</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>CARRY-OVER</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textAlign: "right" }}>CASH LIABILITY</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((b) => (
                  <tr key={b.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ fontWeight: 700, color: colors.textPrimary }}>{b.employeeName}</div>
                      <div style={{ fontSize: "11px", color: colors.textMuted }}>{b.staffId} • {b.department}</div>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>{b.annualEntitlement} Days</td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textMuted }}>{b.annualUsed} Days</td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span style={{ fontWeight: 800, color: colors.brandBlue }}>
                        {b.annualRemaining} Days
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>{b.sickRemaining} Days</td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>{b.carryOverDays} Days</td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right", fontWeight: 700, color: colors.emeraldDark }}>
                      GH₵{b.cashLiabilityGhs.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: RESERVED LEAVE DAYS (Screenshot item 8)                            */}
      {/* ========================================================================= */}
      {activeTab === "reserved_days" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.indigoAction, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Corporate Directives
                </span>
              </div>
              <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
                Reserved Leave Days (Company-Wide Shutdowns)
              </h2>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
                Pre-scheduled corporate office shutdowns that are mandatorily debited from annual employee leave balances.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setFeedback("Scheduled 2026 Year-End Corporate Shutdown (4 working days reserved).");
                setTimeout(() => setFeedback(null), 3000);
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Plus size={14} />
                <span>Schedule Reserved Shutdown</span>
              </span>
            </Button>
          </div>

          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              overflow: "hidden",
              boxShadow: shadows.xs,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
              <thead>
                <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>EVENT TITLE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>DATES & DURATION</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>DAYS DEDUCTED</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>APPLICABLE OFFICES</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>AUTO-DEDUCTION ENGINE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textAlign: "right" }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { title: "Year-End Festive Office Shutdown 2026", range: "24 Dec 2026 – 02 Jan 2027", days: "4.0 Working Days", offices: "Accra, London & Lagos", auto: "Automatic Debit on Dec 01" },
                  { title: "Easter Strategic Rest Pause", range: "03 Apr 2026 – 06 Apr 2026", days: "2.0 Working Days", offices: "All Subsidiaries", auto: "Automatic Debit on Mar 15" },
                ].map((r, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: colors.textPrimary }}>{r.title}</td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textPrimary }}>{r.range}</td>
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: colors.brandBlue }}>{r.days}</td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>{r.offices}</td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.emeraldDark, fontWeight: 600 }}>✓ {r.auto}</td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                      <Badge variant="success" size="sm">Active</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: ADDITIONAL LEAVE DAYS (Screenshot item 9)                          */}
      {/* ========================================================================= */}
      {activeTab === "additional_days" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.indigoAction, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Discretionary Benefits
                </span>
              </div>
              <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
                Additional Leave Days (Special Grants)
              </h2>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
                Provide special compensatory time-off, executive wellness days, or study exam grants beyond standard allowances.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setFeedback("Granted 3 Additional Wellness Days to all 91 employees.");
                setTimeout(() => setFeedback(null), 3000);
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Plus size={14} />
                <span>Grant Additional Days</span>
              </span>
            </Button>
          </div>

          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              overflow: "hidden",
              boxShadow: shadows.xs,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
              <thead>
                <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>GRANT TITLE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>DAYS GRANTED</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>BENEFICIARY POOL</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>VALIDITY EXPIRY</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>AUTHORIZING EXECUTIVE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textAlign: "right" }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { title: "Executive Wellness & Mental Health Grant", days: "+3.0 Days", pool: "All Active Staff (91 Employees)", expiry: "31 Dec 2026", auth: "Paa Kwesi Barnes (Managing Principal)", status: "Active" },
                  { title: "Professional Examination Study Grant", days: "+5.0 Days", pool: "Advisory & Engineering Analysts", expiry: "30 Nov 2026", auth: "Sarah Jenkins (VP People)", status: "Active" },
                  { title: "Paternity Compassionate Extension", days: "+5.0 Days", pool: "Eligible New Fathers", expiry: "31 Dec 2026", auth: "Richard Mamphey (HR Head)", status: "Active" },
                ].map((g, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: colors.textPrimary }}>{g.title}</td>
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 800, color: colors.emeraldDark }}>{g.days}</td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>{g.pool}</td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textMuted }}>{g.expiry}</td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textPrimary }}>{g.auth}</td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                      <Badge variant="success" size="sm">{g.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 10: BLOCKED LEAVE DAYS (Screenshot item 10)                           */}
      {/* ========================================================================= */}
      {activeTab === "blocked_days" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: "#b91c1c", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Operational Blackout
                </span>
              </div>
              <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
                Blocked Leave Days (Operational Blackout Periods)
              </h2>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
                Enforce blackout windows to prevent operational disruption during annual audits, tax closes, or platform go-lives.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFeedback("Added operational blackout window for Q4 Financial Audit.");
                setTimeout(() => setFeedback(null), 3000);
              }}
              style={{ color: "#b91c1c", borderColor: "#fca5a5" }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Plus size={14} />
                <span>Define Blackout Window</span>
              </span>
            </Button>
          </div>

          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              overflow: "hidden",
              boxShadow: shadows.xs,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
              <thead>
                <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>DIRECTIVE TITLE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>BLACKOUT PERIOD</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>RESTRICTED DEPARTMENTS</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>JUSTIFICATION & AUDIT IMPACT</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textAlign: "right" }}>ENFORCEMENT</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { title: "Q4 Financial Year-End Audit Blackout", range: "15 Dec 2026 – 31 Dec 2026", depts: "Finance, Internal Audit, Payroll", reason: "Mandatory GRA PAYE / SSNIT reconciliation filings", level: "Strict Lock" },
                  { title: "Cloudflare Edge Hyperdrive Go-Live Freeze", range: "10 Nov 2026 – 17 Nov 2026", depts: "Cloud Engineering, DevOps, IT", reason: "Core serverless database cutover and migration", level: "Director Override Only" },
                ].map((b, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: colors.textPrimary }}>{b.title}</td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textPrimary, fontWeight: 600 }}>{b.range}</td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>{b.depts}</td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textMuted }}>{b.reason}</td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: radii.full, backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#b91c1c" }}>
                        {b.level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 11: LEAVE ALLOWANCES (Screenshot item 11)                             */}
      {/* ========================================================================= */}
      {activeTab === "allowances" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.indigoAction, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Compensation & Benefits
                </span>
              </div>
              <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
                Leave Allowances & Encashment Payouts
              </h2>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
                Configure statutory Annual Leave Travel Allowance (LTA) and execute end-of-year leave encashment in Ghana Cedis (GH₵).
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setFeedback("Disbursed GH₵60,200 annual leave allowances directly into active payroll run.");
                setTimeout(() => setFeedback(null), 3000);
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Wallet size={14} />
                <span>Process Allowance Payroll Feed</span>
              </span>
            </Button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            {/* LTA Policy Card */}
            <div
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                border: `1px solid ${colors.border}`,
                padding: "1.5rem",
                boxShadow: shadows.xs,
              }}
            >
              <h3 style={{ margin: "0 0 0.5rem 0", fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                Annual Leave Travel Allowance (LTA) Rule
              </h3>
              <p style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
                Employees taking 10 or more consecutive annual leave days receive a 10% monthly basic stipend in GH₵.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0.75rem", backgroundColor: colors.surfaceSubtle, borderRadius: radii.md }}>
                  <span style={{ fontSize: typography.sizes.xs, color: colors.textSecondary }}>Stipend Rate:</span>
                  <strong style={{ fontSize: typography.sizes.xs, color: colors.emeraldDark }}>10.0% of Basic Salary</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0.75rem", backgroundColor: colors.surfaceSubtle, borderRadius: radii.md }}>
                  <span style={{ fontSize: typography.sizes.xs, color: colors.textSecondary }}>Minimum Duration:</span>
                  <strong style={{ fontSize: typography.sizes.xs, color: colors.textPrimary }}>10 Consecutive Days</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0.75rem", backgroundColor: colors.surfaceSubtle, borderRadius: radii.md }}>
                  <span style={{ fontSize: typography.sizes.xs, color: colors.textSecondary }}>Tax Treatment:</span>
                  <strong style={{ fontSize: typography.sizes.xs, color: colors.indigoPrimary }}>GRA PAYE Tax Exempt Tier</strong>
                </div>
              </div>
            </div>

            {/* Encashment Formula Card */}
            <div
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                border: `1px solid ${colors.border}`,
                padding: "1.5rem",
                boxShadow: shadows.xs,
              }}
            >
              <h3 style={{ margin: "0 0 0.5rem 0", fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                Encashment Formula & Balance Sheet Valuation
              </h3>
              <p style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
                Ghana Labour Act Standard: Unused annual leave in excess of carryover cap is monetized at daily rate.
              </p>

              <div style={{ padding: "0.85rem", borderRadius: radii.md, backgroundColor: "rgba(99, 102, 241, 0.05)", border: `1px solid rgba(99, 102, 241, 0.2)`, marginBottom: "0.75rem" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: colors.indigoPrimary }}>FORMULA:</div>
                <div style={{ fontSize: typography.sizes.sm, fontWeight: 800, color: colors.textPrimary, fontFamily: typography.fontMono, marginTop: "2px" }}>
                  Payout = (Monthly Basic Pay ÷ 22) × Unused Days
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: typography.sizes.xs, color: colors.textSecondary }}>Total Org Liability:</span>
                <span style={{ fontSize: typography.sizes.base, fontWeight: 800, color: colors.emeraldDark }}>
                  GH₵{totalLiabilityGhs.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 12: LEAVE SETTINGS (Screenshot item 12)                               */}
      {/* ========================================================================= */}
      {activeTab === "settings" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.indigoAction, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Module Configuration
                </span>
              </div>
              <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
                Leave Settings & Policy Parameters
              </h2>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
                Establish approval workflows, carryover limits, sandwich deduction rules, and self-service permissions.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setFeedback("Leave settings saved and propagated across all subsidiaries.");
                setTimeout(() => setFeedback(null), 3000);
              }}
            >
              Save Configuration
            </Button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            {/* Carryover & Accrual Rules */}
            <div
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                border: `1px solid ${colors.border}`,
                padding: "1.5rem",
                boxShadow: shadows.xs,
              }}
            >
              <h3 style={{ margin: "0 0 0.5rem 0", fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                Accrual & Carryover Guardrails
              </h3>
              <p style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
                Limits for annual leave rollover across fiscal calendar years.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                    Maximum Carryover Days into Following Year
                  </label>
                  <input
                    type="number"
                    defaultValue={5}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                  />
                  <span style={{ fontSize: "11px", color: colors.textMuted }}>Unused days above this cap are liquidated into cash encashment in GH₵.</span>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                    Carryover Grace Period Expiry
                  </label>
                  <select
                    defaultValue="MARCH_31"
                    style={{ width: "100%", padding: "0.5rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                  >
                    <option value="MARCH_31">March 31 (Q1 End — 90 Days Grace)</option>
                    <option value="JUNE_30">June 30 (Mid-Year)</option>
                    <option value="NEVER">No Expiry (Carried Indefinitely)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Workflow & Sandwich Rules */}
            <div
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                border: `1px solid ${colors.border}`,
                padding: "1.5rem",
                boxShadow: shadows.xs,
              }}
            >
              <h3 style={{ margin: "0 0 0.5rem 0", fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                Sandwich & Auto-Approval Directives
              </h3>
              <p style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
                Automate short-duration approvals and define weekend counting policies.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                  <input type="checkbox" defaultChecked style={{ width: "16px", height: "16px", accentColor: colors.indigoPrimary }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                      Exclude Weekends & Public Holidays (No Sandwich Penalty)
                    </div>
                    <div style={{ fontSize: "11px", color: colors.textMuted }}>
                      Weekends between Friday and Monday leave are not deducted from balance.
                    </div>
                  </div>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                  <input type="checkbox" defaultChecked style={{ width: "16px", height: "16px", accentColor: colors.indigoPrimary }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                      Enable Half-Day Leave Requests
                    </div>
                    <div style={{ fontSize: "11px", color: colors.textMuted }}>
                      Allows staff to book 0.5 day morning or afternoon time-off.
                    </div>
                  </div>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                  <input type="checkbox" defaultChecked style={{ width: "16px", height: "16px", accentColor: colors.indigoPrimary }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                      Allow Leave Booking During Probation
                    </div>
                    <div style={{ fontSize: "11px", color: colors.textMuted }}>
                      Pro-rated leave accruals available immediately upon pre-boarding.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER: LEAVE REQUEST DETAILS                                             */}
      {/* ========================================================================= */}
      <SlideOver
        isOpen={Boolean(selectedLeaveForDetail)}
        onClose={() => setSelectedLeaveForDetail(null)}
        title={selectedLeaveForDetail ? `${selectedLeaveForDetail.first_name} ${selectedLeaveForDetail.last_name}` : ""}
        subtitle={selectedLeaveForDetail ? `${selectedLeaveForDetail.leave_type_name} • ${selectedLeaveForDetail.requested_days} Days` : ""}
      >
        {selectedLeaveForDetail && (
          <div>
            <div
              style={{
                padding: "1rem",
                borderRadius: radii.md,
                backgroundColor: colors.surfaceSubtle,
                border: `1px solid ${colors.border}`,
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>Duration Period</span>
                <Badge variant={selectedLeaveForDetail.status === "APPROVED" ? "success" : "warning"} size="sm">
                  {selectedLeaveForDetail.status}
                </Badge>
              </div>
              <div style={{ fontWeight: 700, fontSize: typography.sizes.sm, color: colors.textPrimary }}>
                {formatDateRange(selectedLeaveForDetail.start_date, selectedLeaveForDetail.end_date)}
              </div>
              <div style={{ fontSize: "11px", color: colors.textSecondary, marginTop: "2px" }}>
                Total Working Days Deducted: <strong>{selectedLeaveForDetail.requested_days} Days</strong>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <span style={{ fontSize: "11px", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase" }}>
                  Reason for Request
                </span>
                <p style={{ margin: "4px 0 0 0", fontSize: typography.sizes.xs, color: colors.textPrimary, lineHeight: 1.5 }}>
                  &ldquo;{selectedLeaveForDetail.reason}&rdquo;
                </p>
              </div>

              {selectedLeaveForDetail.attachment && (
                <div style={{ padding: "0.75rem", borderRadius: radii.md, backgroundColor: "rgba(99, 102, 241, 0.05)", border: `1px solid rgba(99, 102, 241, 0.2)` }}>
                  <span style={{ fontSize: "11px", color: colors.indigoPrimary, fontWeight: 700 }}>
                    Attached Proof & OCR Verification
                  </span>
                  <div style={{ fontSize: typography.sizes.xs, color: colors.textPrimary, marginTop: "2px" }}>
                    📄 {selectedLeaveForDetail.attachment}
                  </div>
                  <div style={{ fontSize: "10px", color: colors.emeraldDark, marginTop: "2px", fontWeight: 600 }}>
                    ✓ Validated by Dede AI OCR: Medical/travel credentials verified.
                  </div>
                </div>
              )}
            </div>

            {selectedLeaveForDetail.status === "PENDING" && (
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleAction(selectedLeaveForDetail.id, "APPROVED");
                    setSelectedLeaveForDetail(null);
                  }}
                  style={{ flex: 1, backgroundColor: colors.emeraldDark, borderColor: colors.emeraldDark }}
                >
                  Approve Leave
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleAction(selectedLeaveForDetail.id, "REJECTED");
                    setSelectedLeaveForDetail(null);
                  }}
                  style={{ flex: 1, color: colors.error }}
                >
                  Decline
                </Button>
              </div>
            )}
          </div>
        )}
      </SlideOver>

      {/* ========================================================================= */}
      {/* MODAL: SUBMIT LEAVE REQUEST                                               */}
      {/* ========================================================================= */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.xl,
              border: `1px solid ${colors.border}`,
              width: "100%",
              maxWidth: "520px",
              boxShadow: shadows.lg,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: `1px solid ${colors.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icons.Calendar size={18} color={colors.indigoPrimary} />
                <h3 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>
                  Apply for Time Off / Leave
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  onCloseNewLeaveModal?.();
                }}
                style={{ background: "none", border: "none", cursor: "pointer", color: colors.textMuted, fontSize: "16px" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLeave} style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Staff Member
                </label>
                <select
                  value={newEmployeeName}
                  onChange={(e) => setNewEmployeeName(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                >
                  <option value="Paa Kwesi Barnes">Paa Kwesi Barnes (Managing Principal)</option>
                  <option value="Richard Mamphey">Richard Mamphey (HR Head)</option>
                  <option value="Benedicta Agbesi">Benedicta Agbesi (People & Culture)</option>
                  <option value="Philip Aryee">Philip Aryee (Cloud Engineering)</option>
                  <option value="Clara Nukunu">Clara Nukunu (Customer Service)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Leave Category
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                >
                  <option value="Annual Leave">Annual Leave (Statutory)</option>
                  <option value="Casual Leave">Casual Leave (Short duration)</option>
                  <option value="Sick / Medical Leave">Sick / Medical Leave</option>
                  <option value="Maternity Leave">Maternity Leave (14 Weeks Paid)</option>
                  <option value="Paternity Leave">Paternity Leave (10 Days Paid)</option>
                  <option value="Compassionate / Bereavement">Compassionate / Bereavement Leave</option>
                  <option value="Study / Exam Leave">Study & Exam Leave</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Reason & Business Justification
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide context and handoff coverage details..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.5rem" }}>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    onCloseNewLeaveModal?.();
                  }}
                >
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Submit Leave Application
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

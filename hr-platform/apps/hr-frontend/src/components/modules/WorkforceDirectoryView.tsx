"use client";

import React, { useState, useMemo } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { DataTable, Column } from "../../design-system/DataTable";
import { SlideOver } from "../../design-system/SlideOver";
import { formatDate, formatDateRange } from "../../utils/date";

export interface EmployeeRecord {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  department_name?: string;
  team_name?: string;
  staff_id?: string;
  job_title?: string;
  subsidiary?: string;
  join_date?: string;
  age?: number;
  contract_type?: string;
}

export interface AssetRecord {
  id: number;
  name: string;
  asset_code: string;
  category_name: string;
  status: string;
  employee_id?: number;
  first_name?: string;
  last_name?: string;
}

export interface EmployeeGroupSquad {
  id: number;
  name: string;
  type: "AGILE_SQUAD" | "CROSS_FUNCTIONAL" | "COMMITTEE";
  leadName: string;
  memberCount: number;
  currentMission: string;
  activeSprint: string;
}

export interface ContractRecord {
  id: number;
  employeeName: string;
  staffId: string;
  contractType: "Permanent" | "Fixed-Term" | "Independent Contractor" | "Executive Retainer";
  startDate: string;
  endDate: string;
  daysToExpiry: number;
  salaryBand: string;
  status: "ACTIVE" | "RENEWAL_DUE" | "EXPIRING_SOON";
}

export interface ProfileChangeRequest {
  id: number;
  employeeName: string;
  staffId: string;
  department: string;
  fieldChanged: string;
  previousValue: string;
  requestedValue: string;
  reason: string;
  status: "PENDING_HR" | "APPROVED" | "REJECTED";
  submittedDate: string;
}

export interface RedeploymentRecord {
  id: number;
  employeeName: string;
  staffId: string;
  currentDepartment: string;
  newDepartment: string;
  currentRole: string;
  newRole: string;
  effectiveDate: string;
  type: "PROMOTION_TRANSFER" | "GEOGRAPHIC_RELOCATION" | "CROSS_PRACTICE_ROTATION";
  status: "IN_PROGRESS" | "COMPLETED";
  approver: string;
}

interface WorkforceDirectoryViewProps {
  employees: EmployeeRecord[];
  assets: AssetRecord[];
  selectedInitialEmployee?: EmployeeRecord | null;
  onEmployeeCreated?: (emp: EmployeeRecord) => void;
  onNavigateToSettings?: () => void;
  onNavigateToWorkflows?: () => void;
}

export const WorkforceDirectoryView: React.FC<WorkforceDirectoryViewProps> = ({
  employees,
  assets,
  selectedInitialEmployee = null,
  onEmployeeCreated,
  onNavigateToSettings,
  onNavigateToWorkflows,
}) => {
  // Sub-Navigation Tabs matching HRIS Menu
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "employees"
    | "squads"
    | "contracts"
    | "requests"
    | "redeployment"
    | "schedules"
    | "audit"
  >("overview");

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedTeam, setSelectedTeam] = useState("ALL");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(selectedInitialEmployee);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<"overview" | "assets" | "performance" | "contracts">("overview");
  const [feedback, setFeedback] = useState<string | null>(null);

  // New Employee Form State
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("consultant");
  const [newDept, setNewDept] = useState("Cloud & Edge Engineering");
  const [newTeam, setNewTeam] = useState("Hyperdrive Edge Performance Squad");
  const [newContractType, setNewContractType] = useState("Permanent");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Employee Groups & Squads State
  const [squads, setSquads] = useState<EmployeeGroupSquad[]>([
    {
      id: 1,
      name: "Hyperdrive Edge Performance Squad",
      type: "AGILE_SQUAD",
      leadName: "Philip Aryee",
      memberCount: 6,
      currentMission: "Zero-latency database connection pooling for multi-region African queries.",
      activeSprint: "Sprint 42 (London & Accra edge)",
    },
    {
      id: 2,
      name: "West Africa Talent Onboarding Taskforce",
      type: "CROSS_FUNCTIONAL",
      leadName: "Benedicta Agbesi",
      memberCount: 5,
      currentMission: "Day -14 automated zero-touch contract generation & Ghana Card KYC.",
      activeSprint: "H2 Ramp-up Sprint",
    },
    {
      id: 3,
      name: "Corporate Information Security Committee (ISO 27001)",
      type: "COMMITTEE",
      leadName: "Paa Kwesi Barnes",
      memberCount: 8,
      currentMission: "Annex A 93/93 control enforcement, zero-trust hardware fleet provisioning.",
      activeSprint: "Quarterly Audit",
    },
    {
      id: 4,
      name: "Customer Success & Service Quality Guild",
      type: "CROSS_FUNCTIONAL",
      leadName: "Doreen Wesley",
      memberCount: 9,
      currentMission: "Sub-4 minute first touch ticket resolution across enterprise clients.",
      activeSprint: "NPS Growth Cycle",
    },
  ]);

  // Employment Contracts State
  const [contracts, setContracts] = useState<ContractRecord[]>([
    {
      id: 1,
      employeeName: "Paa Kwesi Barnes",
      staffId: "SEN/001",
      contractType: "Permanent",
      startDate: "2020-01-01",
      endDate: "2030-12-31",
      daysToExpiry: 1518,
      salaryBand: "GH₵38,000 / mo",
      status: "ACTIVE",
    },
    {
      id: 2,
      employeeName: "Richard Amoah",
      staffId: "SHR/GH/038",
      contractType: "Permanent",
      startDate: "2021-03-01",
      endDate: "2027-02-28",
      daysToExpiry: 482,
      salaryBand: "GH₵24,500 / mo",
      status: "ACTIVE",
    },
    {
      id: 3,
      employeeName: "Benedicta Agbesi",
      staffId: "SEN/004",
      contractType: "Fixed-Term",
      startDate: "2025-11-01",
      endDate: "2026-11-30",
      daysToExpiry: 27,
      salaryBand: "GH₵16,200 / mo",
      status: "RENEWAL_DUE",
    },
    {
      id: 4,
      employeeName: "Kwesi Osei",
      staffId: "SEN/009",
      contractType: "Independent Contractor",
      startDate: "2026-05-01",
      endDate: "2026-11-15",
      daysToExpiry: 12,
      salaryBand: "GH₵18,000 / mo",
      status: "EXPIRING_SOON",
    },
    {
      id: 5,
      employeeName: "Philip Aryee",
      staffId: "SEN/005",
      contractType: "Permanent",
      startDate: "2022-06-15",
      endDate: "2028-06-14",
      daysToExpiry: 588,
      salaryBand: "GH₵28,000 / mo",
      status: "ACTIVE",
    },
  ]);

  // Profile Update Requests State (Screenshot item 4)
  const [profileRequests, setProfileRequests] = useState<ProfileChangeRequest[]>([
    {
      id: 101,
      employeeName: "Doreen Wesley",
      staffId: "SCG153",
      department: "Customer Service",
      fieldChanged: "Emergency Contact / Next of Kin",
      previousValue: "Grace Wesley (Mother) - +233 24 000 0000",
      requestedValue: "Michael Wesley (Spouse) - +233 20 888 9999",
      reason: "Recent marriage statutory registration",
      status: "PENDING_HR",
      submittedDate: "2026-11-02",
    },
    {
      id: 102,
      employeeName: "Kwame Mensah",
      staffId: "KSP/2024/0220",
      department: "Hardware Operations",
      fieldChanged: "Bank Account & PFM Pension Scheme",
      previousValue: "Stanbic Bank Ghana (Acc: 9040001248)",
      requestedValue: "GCB Bank Ltd (Acc: 1020005541)",
      reason: "Consolidated mortgage payment facility",
      status: "PENDING_HR",
      submittedDate: "2026-10-30",
    },
  ]);

  // Redeployment Records State (Screenshot item 5: "Total Redeployments: 2")
  const [redeployments, setRedeployments] = useState<RedeploymentRecord[]>([
    {
      id: 1,
      employeeName: "Dr. Abena Kyeremeh",
      staffId: "SEN/018",
      currentDepartment: "People & Culture",
      newDepartment: "Strategic Advisory & Research",
      currentRole: "Lead Researcher",
      newRole: "Senior Principal Consultant",
      effectiveDate: "2026-11-01",
      type: "PROMOTION_TRANSFER",
      status: "COMPLETED",
      approver: "Richard Barnes (CEO)",
    },
    {
      id: 2,
      employeeName: "Kwesi Osei",
      staffId: "SEN/009",
      currentDepartment: "Accra Engineering Hub",
      newDepartment: "London Cloud Architecture Practice",
      currentRole: "Cloud Engineer",
      newRole: "Senior DevOps Architect",
      effectiveDate: "2026-11-15",
      type: "GEOGRAPHIC_RELOCATION",
      status: "IN_PROGRESS",
      approver: "Paa Kwesi Barnes (Managing Principal)",
    },
  ]);

  // Map employee ID to asset
  const employeeAssetMap = useMemo(() => {
    const map = new Map<number, AssetRecord>();
    assets.forEach((a) => {
      if (a.employee_id) map.set(a.employee_id, a);
    });
    return map;
  }, [assets]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department_name) set.add(e.department_name);
    });
    return ["ALL", ...Array.from(set)];
  }, [employees]);

  // Unique teams / squads for filter
  const teams = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.team_name) set.add(e.team_name);
    });
    squads.forEach((s) => set.add(s.name));
    return ["ALL", ...Array.from(set)];
  }, [employees, squads]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const empTeam = e.team_name || "General Workforce Squad";
      const matchesSearch =
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        e.email.toLowerCase().includes(search.toLowerCase()) ||
        e.role.toLowerCase().includes(search.toLowerCase()) ||
        empTeam.toLowerCase().includes(search.toLowerCase()) ||
        (e.staff_id && e.staff_id.toLowerCase().includes(search.toLowerCase()));

      const matchesDept = selectedDept === "ALL" || e.department_name === selectedDept;
      const matchesTeam = selectedTeam === "ALL" || empTeam === selectedTeam;

      return matchesSearch && matchesDept && matchesTeam;
    });
  }, [employees, search, selectedDept, selectedTeam]);

  const handleApproveProfileRequest = (id: number) => {
    setProfileRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "APPROVED" } : r))
    );
    setFeedback("Profile update request approved and committed to master HRIS records.");
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleRejectProfileRequest = (id: number) => {
    setProfileRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "REJECTED" } : r))
    );
    setFeedback("Profile update request declined.");
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName || !newLastName || !newEmail) return;

    setIsSubmitting(true);
    try {
      const newEmp: EmployeeRecord = {
        id: Date.now(),
        first_name: newFirstName,
        last_name: newLastName,
        email: newEmail,
        role: newRole,
        is_active: true,
        department_name: newDept,
        team_name: newTeam,
        staff_id: `SEN-2026-${String(employees.length + 1).padStart(4, "0")}`,
        contract_type: newContractType,
        join_date: new Date().toISOString().slice(0, 10),
        age: 26,
      };

      onEmployeeCreated?.(newEmp);
      setShowAddModal(false);
      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
      setFeedback(`Employee ${newFirstName} ${newLastName} enrolled with auto-generated ID ${newEmp.staff_id}.`);
      setTimeout(() => setFeedback(null), 3500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAsset = selectedEmployee ? employeeAssetMap.get(selectedEmployee.id) : null;

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1440px", margin: "0 auto" }}>
      {/* Header & Sub-Navigation */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.indigoAction, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Human Resources Information System (HRIS)
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
              HRIS Manager & Workforce Directory
            </h1>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToSettings?.()}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Settings size={14} />
                <span>Employee Settings (13 Modules)</span>
              </span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Plus size={14} />
                <span>Add an Employee</span>
              </span>
            </Button>
          </div>
        </div>

        {/* HRIS Sub-Navigation Tabs */}
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
            { key: "overview", label: "Overview", icon: Icons.CommandCentre },
            { key: "employees", label: "Employee List", icon: Icons.Users, badge: `${employees.length}` },
            { key: "squads", label: "Groups / Squads", icon: Icons.Layers, badge: `${squads.length}` },
            { key: "contracts", label: "Contracts", icon: Icons.FileText, badge: `${contracts.filter((c) => c.status !== "ACTIVE").length}` },
            { key: "requests", label: "Profile Update Requests", icon: Icons.FileCheck, badge: `${profileRequests.filter((r) => r.status === "PENDING_HR").length}` },
            { key: "redeployment", label: "Redeployment", icon: Icons.TrendingUp, badge: `${redeployments.length}` },
            { key: "schedules", label: "Department Schedules", icon: Icons.Calendar },
            { key: "audit", label: "Audit Log", icon: Icons.ShieldCheck },
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
                {tab.badge && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "0.1rem 0.4rem",
                      borderRadius: radii.full,
                      backgroundColor: isActive ? colors.indigoAccent : colors.borderSubtle,
                      color: isActive ? colors.surface : colors.textMuted,
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
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
      {/* TAB 1: HRIS OVERVIEW & HERO BANNER (Screenshot)                           */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div>
          {/* Welcome Hero Banner (Screenshot) */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.xl,
              border: `1px solid ${colors.border}`,
              padding: "2rem 2.5rem",
              marginBottom: "1.5rem",
              boxShadow: shadows.xs,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "linear-gradient(135deg, rgba(238, 242, 255, 0.6) 0%, rgba(255, 255, 255, 0.95) 100%)",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 800,
                  color: colors.indigoPrimary,
                  letterSpacing: "-0.02em",
                  margin: "0 0 0.4rem 0",
                }}
              >
                Welcome to your HRIS Manager
              </h2>
              <p style={{ fontSize: typography.sizes.sm, color: colors.textSecondary, margin: "0 0 1.25rem 0" }}>
                Manage employees and their information across Ghana Practice & UK Advisory.
              </p>

              {/* Action Pills from Screenshot */}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {[
                  { label: "Add an employee", onClick: () => setShowAddModal(true) },
                  { label: "Active employees", onClick: () => setActiveTab("employees") },
                  { label: "Approve profile update requests", onClick: () => setActiveTab("requests") },
                  { label: "Manage approval workflows", onClick: () => (onNavigateToWorkflows ? onNavigateToWorkflows() : onNavigateToSettings?.()) },
                  { label: "Publish an announcement", onClick: () => setFeedback("Announcement broadcast drafted in Dede AI Daily Brief.") },
                  { label: "View redeployments", onClick: () => setActiveTab("redeployment") },
                ].map((pill, idx) => (
                  <button
                    key={idx}
                    onClick={pill.onClick}
                    style={{
                      padding: "0.45rem 0.9rem",
                      borderRadius: radii.full,
                      border: `1px solid ${colors.border}`,
                      backgroundColor: colors.surface,
                      color: colors.indigoPrimary,
                      fontSize: typography.sizes.xs,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
                      boxShadow: shadows.xs,
                    }}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Decorative Persona Badge */}
            <div
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: shadows.md,
                flexShrink: 0,
              }}
            >
              <Icons.Users size={56} />
            </div>
          </div>

          {/* Top 4 Metrics Cards: each one drills into the tab that holds the underlying records */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
            {[
              { icon: <Icons.Users size={24} />, value: "91", label: "Total Employees", tab: "employees" as const },
              { icon: <Icons.TrendingUp size={24} />, value: "2", label: "Total Redeployments", tab: "redeployment" as const },
              { icon: <Icons.Calendar size={24} />, value: "25 Years", label: "Employees Average Age", tab: "employees" as const },
              { icon: <Icons.ShieldCheck size={24} />, value: "7 yrs 4 d", label: "Employees Ave. LoS", tab: "employees" as const },
            ].map((m) => (
              <button
                key={m.label}
                type="button"
                onClick={() => setActiveTab(m.tab)}
                title={`Open ${m.tab === "employees" ? "the employee directory" : "redeployments"}`}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radii.lg,
                  border: `1px solid ${colors.border}`,
                  padding: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  boxShadow: shadows.xs,
                  cursor: "pointer",
                  textAlign: "left",
                  font: "inherit",
                  transition: "border-color 0.15s ease, transform 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.indigoAction;
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(16, 185, 129, 0.15)",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {m.icon}
                </div>
                <div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color: colors.textPrimary, lineHeight: 1 }}>{m.value}</div>
                  <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: "4px" }}>{m.label}</div>
                  <div style={{ fontSize: "11px", color: colors.indigoAction, fontWeight: 600, marginTop: "4px" }}>View records →</div>
                </div>
              </button>
            ))}
          </div>

          {/* Dede AI Headcount & Mobility Briefing */}
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
                  Dede — Workforce Mobility & Statutory Census
                </span>
              </div>
              <p style={{ margin: 0, fontSize: typography.sizes.xs, color: colors.textSecondary, lineHeight: 1.5 }}>
                Current workforce headcount stands at <strong>91 staff</strong> across London HQ and Accra Practice. <strong>100% of Ghanaian employees</strong> possess validated Ghana Card PINs and verified SSNIT pension accounts. <strong>2 internal redeployments</strong> are active this quarter, cutting external recruitment costs by <strong>GH₵85,000</strong>.
              </p>
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
                <button
                  onClick={() => setActiveTab("employees")}
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
                  Browse Employee Directory ({employees.length}) →
                </button>
                <button
                  onClick={() => setActiveTab("contracts")}
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
                  Review Contracts Due for Renewal (2) →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EMPLOYEE LIST (Full Workforce Directory)                           */}
      {/* ========================================================================= */}
      {activeTab === "employees" && (
        <div>
          {/* Filter and Search Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              marginBottom: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, maxWidth: "600px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.md,
                  padding: "0.4rem 0.75rem",
                  flex: 1,
                }}
              >
                <Icons.Search size={15} color={colors.textMuted} />
                <input
                  type="text"
                  placeholder="Filter by name, email, role, or Staff ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    border: "none",
                    outline: "none",
                    width: "100%",
                    fontSize: typography.sizes.sm,
                    color: colors.textPrimary,
                    backgroundColor: "transparent",
                  }}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    style={{ background: "none", border: "none", color: colors.textMuted, cursor: "pointer", padding: 0 }}
                  >
                    <Icons.X size={14} />
                  </button>
                )}
              </div>

              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                style={{
                  padding: "0.45rem 0.85rem",
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.surface,
                  fontSize: typography.sizes.sm,
                  color: colors.textPrimary,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept === "ALL" ? "All Practices" : dept}
                  </option>
                ))}
              </select>

              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                style={{
                  padding: "0.45rem 0.85rem",
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.surface,
                  fontSize: typography.sizes.sm,
                  color: colors.textPrimary,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {teams.map((t) => (
                  <option key={t} value={t}>
                    {t === "ALL" ? "All Teams / Squads" : t}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const csv = "STAFF_ID,NAME,EMAIL,ROLE,DEPARTMENT,TEAM,STATUS\n" +
                    filteredEmployees.map((e) => `"${e.staff_id || "SEN-N/A"}","${e.first_name} ${e.last_name}","${e.email}","${e.role}","${e.department_name || "General"}","${e.team_name || "General Workforce Squad"}","${e.is_active ? "Active" : "On Leave"}"`).join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `scoreview_workforce_${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <Icons.Download size={13} />
                  <span>Export CSV</span>
                </span>
              </Button>
              <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>
                Showing <span style={{ fontWeight: 600, color: colors.textPrimary }}>{filteredEmployees.length}</span> of {employees.length} employees
              </div>
            </div>
          </div>

          {/* Directory Table */}
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
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>PRACTICE / DEPARTMENT</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>TEAM / SQUAD</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>CORPORATE ROLE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>ALLOCATED HARDWARE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>STATUS</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textAlign: "right" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => {
                  const asset = employeeAssetMap.get(emp.id);
                  return (
                    <tr
                      key={emp.id}
                      style={{ borderBottom: `1px solid ${colors.borderSubtle}`, cursor: "pointer" }}
                      onClick={() => setSelectedEmployee(emp)}
                    >
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              backgroundColor: colors.indigoAccent,
                              color: "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "12px",
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {emp.first_name[0]}{emp.last_name[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: typography.weights.semibold, color: colors.textPrimary }}>
                              {emp.first_name} {emp.last_name}
                            </div>
                            <div style={{ fontSize: "11px", color: colors.textMuted }}>
                              {emp.staff_id || `SEN-${String(emp.id).padStart(4, "0")}`} • {emp.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>
                        {emp.department_name || "General Advisory"}
                      </td>

                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.2rem 0.55rem",
                            borderRadius: radii.full,
                            backgroundColor: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            color: "#1d4ed8",
                            fontSize: "11px",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Icons.Layers size={11} color="#2563eb" />
                          <span>{emp.team_name || "General Workforce Squad"}</span>
                        </span>
                      </td>

                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, padding: "0.15rem 0.45rem", borderRadius: radii.sm, backgroundColor: colors.surfaceSubtle, color: colors.textPrimary }}>
                          {emp.role.replace("_", " ").toUpperCase()}
                        </span>
                      </td>

                      <td style={{ padding: "0.85rem 1rem" }}>
                        {asset ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span style={{ fontFamily: typography.fontMono, fontSize: "11px", color: colors.textPrimary }}>
                              {asset.asset_code}
                            </span>
                            <span style={{ fontSize: "11px", color: colors.textMuted }}>
                              • {asset.name}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: "11px", color: colors.textMuted }}>Unassigned</span>
                        )}
                      </td>

                      <td style={{ padding: "0.85rem 1rem" }}>
                        <Badge variant={emp.is_active ? "success" : "neutral"} size="sm" dot>
                          {emp.is_active ? "Active" : "On Leave"}
                        </Badge>
                      </td>

                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                        <span style={{ fontSize: "11px", color: colors.brandBlue, fontWeight: 600 }}>
                          Profile →
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: EMPLOYEE GROUPS / SQUADS (Screenshot item 2b)                      */}
      {/* ========================================================================= */}
      {activeTab === "squads" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
                Employee Groups & Cross-Functional Squads
              </h2>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
                Agile delivery squads, practice chapters, and statutory governance committees across the enterprise.
              </p>
            </div>
            <Button variant="primary" size="sm">
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Plus size={14} />
                <span>Form New Squad</span>
              </span>
            </Button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            {squads.map((squad) => (
              <div
                key={squad.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radii.lg,
                  border: `1px solid ${colors.border}`,
                  padding: "1.25rem",
                  boxShadow: shadows.xs,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <h3 style={{ margin: 0, fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                    {squad.name}
                  </h3>
                </div>
                <div style={{ fontSize: "11px", color: colors.textMuted, marginBottom: "0.75rem" }}>
                  Lead: <strong>{squad.leadName}</strong> • {squad.memberCount} Team Members
                </div>
                <p style={{ margin: "0 0 0.75rem 0", fontSize: typography.sizes.xs, color: colors.textSecondary, lineHeight: 1.4 }}>
                  {squad.currentMission}
                </p>
                <div style={{ fontSize: "11px", color: colors.brandBlue, fontWeight: 600 }}>
                  Active Focus: {squad.activeSprint}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CONTRACTS (Screenshot item 3)                                      */}
      {/* ========================================================================= */}
      {activeTab === "contracts" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
                Employment Contracts & Expiry Management
              </h2>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
                Track contract types, statutory compensation bands in GH₵, and 30-day expiry renewal alerts.
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
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>CONTRACT TYPE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>TERM PERIOD</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>COMPENSATION BAND</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>STATUS</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ fontWeight: 700, color: colors.textPrimary }}>{c.employeeName}</div>
                      <div style={{ fontSize: "11px", color: colors.textMuted }}>{c.staffId}</div>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textPrimary, fontWeight: 600 }}>{c.contractType}</td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>
                      {formatDateRange(c.startDate, c.endDate)} ({c.daysToExpiry} days left)
                    </td>
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: colors.emeraldDark }}>{c.salaryBand}</td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <Badge
                        variant={c.status === "ACTIVE" ? "success" : c.status === "RENEWAL_DUE" ? "warning" : "error"}
                        size="sm"
                      >
                        {c.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                      {c.status !== "ACTIVE" && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setContracts((prev) => prev.map((item) => (item.id === c.id ? { ...item, status: "ACTIVE", daysToExpiry: 365 } : item)));
                            setFeedback(`Contract extension for ${c.employeeName} finalized.`);
                          }}
                        >
                          Extend Contract
                        </Button>
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
      {/* TAB 5: PROFILE UPDATE REQUESTS (Screenshot item 4)                        */}
      {/* ========================================================================= */}
      {activeTab === "requests" && (
        <div>
          <div style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
              Employee Profile Update Requests
            </h2>
            <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
              Approve self-service changes to statutory KYC, next of kin, and banking details submitted by personnel.
            </p>
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
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>FIELD CHANGED</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>PREVIOUS VALUE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>REQUESTED VALUE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>STATUS</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {profileRequests.map((req) => (
                  <tr key={req.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ fontWeight: 700, color: colors.textPrimary }}>{req.employeeName}</div>
                      <div style={{ fontSize: "11px", color: colors.textMuted }}>{req.staffId} • {req.department}</div>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: colors.indigoPrimary }}>{req.fieldChanged}</td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textMuted, textDecoration: "line-through" }}>{req.previousValue}</td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.emeraldDark, fontWeight: 600 }}>{req.requestedValue}</td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <Badge variant={req.status === "APPROVED" ? "success" : req.status === "REJECTED" ? "error" : "warning"} size="sm">
                        {req.status === "PENDING_HR" ? "Pending HR Signoff" : req.status}
                      </Badge>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                      {req.status === "PENDING_HR" && (
                        <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                          <Button variant="primary" size="sm" onClick={() => handleApproveProfileRequest(req.id)} style={{ backgroundColor: colors.emeraldDark, borderColor: colors.emeraldDark }}>
                            Approve
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleRejectProfileRequest(req.id)} style={{ color: colors.error }}>
                            Decline
                          </Button>
                        </div>
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
      {/* TAB 6: REDEPLOYMENT (Screenshot item 5)                                   */}
      {/* ========================================================================= */}
      {activeTab === "redeployment" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
                Internal Redeployments & Talent Mobility
              </h2>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
                Seamless cross-entity transfers between Ghana Practice and UK Advisory, rotations, and internal promotions.
              </p>
            </div>
            <Button variant="primary" size="sm">
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Plus size={14} />
                <span>Initiate Redeployment</span>
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
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>STAFF MEMBER</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>FROM PRACTICE / ROLE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>TO PRACTICE / ROLE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>EFFECTIVE DATE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {redeployments.map((r) => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ fontWeight: 700, color: colors.textPrimary }}>{r.employeeName}</div>
                      <div style={{ fontSize: "11px", color: colors.textMuted }}>{r.staffId}</div>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textMuted }}>
                      {r.currentDepartment} • {r.currentRole}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: colors.indigoPrimary }}>
                      {r.newDepartment} • {r.newRole}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textPrimary, fontWeight: 600 }}>
                      {formatDate(r.effectiveDate)}
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <Badge variant={r.status === "COMPLETED" ? "success" : "warning"} size="sm">
                        {r.status.replace("_", " ")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: DEPARTMENT SCHEDULES & AUDIT LOG                                   */}
      {/* ========================================================================= */}
      {(activeTab === "schedules" || activeTab === "audit") && (
        <div
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            border: `1px solid ${colors.border}`,
            padding: "2rem",
            textAlign: "center",
            boxShadow: shadows.xs,
          }}
        >
          <h3 style={{ margin: "0 0 0.5rem 0", fontSize: typography.sizes.base, fontWeight: 700, color: colors.textPrimary }}>
            {activeTab === "schedules" ? "Department Schedules & Shift Rosters" : "HRIS Immutable Compliance Audit Trail"}
          </h3>
          <p style={{ margin: "0 0 1.25rem 0", fontSize: typography.sizes.xs, color: colors.textMuted, maxWidth: "480px", marginInline: "auto" }}>
            {activeTab === "schedules"
              ? "Department rotas, on-call schedules, and hybrid desk allocations are synchronized with biometric gate access in Accra and London."
              : "Every employee contract change, role promotion, and banking update is signed and logged with SOC2 / ISO 27001 cryptographic tamper-proof hashes."}
          </p>
          <Button variant="primary" size="sm" onClick={() => setFeedback("Schedule synchronization confirmed.")}>
            Synchronize Biometrics
          </Button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SLIDE-OVER: DEEP EMPLOYEE HCM PROFILE                                     */}
      {/* ========================================================================= */}
      <SlideOver
        isOpen={Boolean(selectedEmployee)}
        onClose={() => setSelectedEmployee(null)}
        title={selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : ""}
        subtitle={selectedEmployee ? `${selectedEmployee.department_name || "General Advisory"} • ${selectedEmployee.role.replace("_", " ").toUpperCase()}` : ""}
      >
        {selectedEmployee && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Drawer Tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid ${colors.border}`, gap: "1.25rem" }}>
              {[
                { id: "overview", label: "Overview" },
                { id: "assets", label: "Hardware and Fleet" },
                { id: "performance", label: "Performance" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDrawerTab(tab.id as typeof activeDrawerTab)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: "0.5rem 0",
                    borderBottom: activeDrawerTab === tab.id ? `2px solid ${colors.brandBlue}` : "2px solid transparent",
                    color: activeDrawerTab === tab.id ? colors.brandBlue : colors.textMuted,
                    fontWeight: activeDrawerTab === tab.id ? typography.weights.semibold : typography.weights.regular,
                    fontSize: typography.sizes.sm,
                    cursor: "pointer",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Overview Drawer Tab */}
            {activeDrawerTab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ backgroundColor: colors.surfaceSubtle, padding: "1rem", borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted, marginBottom: "0.25rem" }}>Staff Identification</div>
                  <div style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                    {selectedEmployee.staff_id || `SEN-${String(selectedEmployee.id).padStart(4, "0")}`}
                  </div>
                  <div style={{ fontSize: "11px", color: colors.textSecondary, marginTop: "2px" }}>
                    Official Email: {selectedEmployee.email}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div style={{ backgroundColor: colors.surfaceSubtle, padding: "0.75rem", borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
                    <div style={{ fontSize: "11px", color: colors.textMuted }}>Contract Type</div>
                    <div style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary, marginTop: "2px" }}>
                      {selectedEmployee.contract_type || "Permanent"}
                    </div>
                  </div>
                  <div style={{ backgroundColor: colors.surfaceSubtle, padding: "0.75rem", borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
                    <div style={{ fontSize: "11px", color: colors.textMuted }}>Practice Entity</div>
                    <div style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary, marginTop: "2px" }}>
                      Ghana Hub Practice
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: colors.surfaceSubtle, padding: "0.75rem 1rem", borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: "11px", color: colors.textMuted, marginBottom: "0.25rem" }}>Assigned Team / Squad</div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.25rem 0.6rem", borderRadius: radii.full, backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", fontSize: "12px", fontWeight: 700 }}>
                    <Icons.Layers size={13} color="#2563eb" />
                    <span>{selectedEmployee.team_name || "General Workforce Squad"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Hardware Fleet Drawer Tab */}
            {activeDrawerTab === "assets" && (
              <div>
                {selectedAsset ? (
                  <div style={{ backgroundColor: colors.surfaceSubtle, padding: "1rem", borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
                    <Badge variant="success" size="sm">Provisioned</Badge>
                    <div style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, marginTop: "0.5rem" }}>
                      {selectedAsset.name}
                    </div>
                    <div style={{ fontSize: "11px", color: colors.textMuted, fontFamily: typography.fontMono, marginTop: "2px" }}>
                      Asset Code: {selectedAsset.asset_code} • Category: {selectedAsset.category_name}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "2rem", color: colors.textMuted, fontSize: typography.sizes.xs }}>
                    No hardware assets currently provisioned to this employee.
                  </div>
                )}
              </div>
            )}

            {/* Performance Drawer Tab */}
            {activeDrawerTab === "performance" && (
              <div style={{ backgroundColor: colors.surfaceSubtle, padding: "1rem", borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: "11px", color: colors.textMuted }}>Q1 Performance Rating</span>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: colors.emeraldDark, marginTop: "2px" }}>
                  4.8 / 5.0 (Star Talent)
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: typography.sizes.xs, color: colors.textSecondary }}>
                  100% OKR and BSC alignment with zero cycle scoring distortions.
                </p>
              </div>
            )}
          </div>
        )}
      </SlideOver>

      {/* ========================================================================= */}
      {/* MODAL: ADD AN EMPLOYEE                                                    */}
      {/* ========================================================================= */}
      {showAddModal && (
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
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icons.Users size={18} color={colors.indigoPrimary} />
                <h3 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>
                  Enroll New Employee (HRIS)
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: colors.textMuted, fontSize: "16px" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                    First Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kwame"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mensah"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Corporate Email
                </label>
                <input
                  type="email"
                  placeholder="kwame.mensah@consultech.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                    Practice / Department
                  </label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                  >
                    <option value="Cloud & Edge Engineering">Cloud & Edge Engineering</option>
                    <option value="Enterprise Advisory">Enterprise Advisory</option>
                    <option value="People & Culture">People & Culture</option>
                    <option value="Hardware Operations">Hardware Operations</option>
                    <option value="Customer Service">Customer Service</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                    Assigned Team / Squad
                  </label>
                  <select
                    value={newTeam}
                    onChange={(e) => setNewTeam(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                  >
                    <option value="Hyperdrive Edge Performance Squad">Hyperdrive Edge Performance Squad</option>
                    <option value="West Africa Talent Onboarding Taskforce">West Africa Talent Onboarding Taskforce</option>
                    <option value="Corporate Information Security Committee">Corporate Information Security Committee</option>
                    <option value="Customer Success & Service Quality Guild">Customer Success & Service Quality Guild</option>
                    <option value="People Operations Team">People Operations Team</option>
                    <option value="Executive Committee">Executive Committee</option>
                    <option value="Solutions Delivery Squad">Solutions Delivery Squad</option>
                    <option value="Workforce Logistics & Facilities Squad">Workforce Logistics & Facilities Squad</option>
                    <option value="Corporate Governance & Audit Committee">Corporate Governance & Audit Committee</option>
                    <option value="General Workforce Squad">General Workforce Squad</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Contract Type
                </label>
                <select
                  value={newContractType}
                  onChange={(e) => setNewContractType(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                >
                  <option value="Permanent">Permanent</option>
                  <option value="Fixed-Term">Fixed-Term</option>
                  <option value="Independent Contractor">Independent Contractor</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.5rem" }}>
                <Button variant="outline" size="sm" type="button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Enrolling..." : "Enroll Employee"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

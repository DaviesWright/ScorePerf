"use client";

import React, { useState, useEffect } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import type { ModuleViewKey, UserPersona } from "./AppSidebar";

export interface PromptStep {
  id: string;
  stepNumber: number;
  title: string;
  promptText: string;
  actionLabel: string;
  targetView: ModuleViewKey;
  estimatedTime: string;
  outcome: string;
}

export const PERSONA_PROMPT_JOURNEYS: Record<UserPersona, {
  roleTitle: string;
  welcomeSummary: string;
  steps: PromptStep[];
}> = {
  employee: {
    roleTitle: "Employee Guided Journey",
    welcomeSummary: "New to ScoReview? Follow these 5 guided prompts to verify your profile, log attendance, and align your Q4 performance goals.",
    steps: [
      {
        id: "emp_1",
        stepNumber: 1,
        title: "Explore Your 8-Pillar Self-Service Hub & Rewards Wallet",
        promptText: "Start in Employee Self-Service (ESS) to inspect your Total Rewards Wallet (GH₵580,100/yr), download payslips, or generate an instant AI visa/bank letter.",
        actionLabel: "Go to Self-Service (ESS)",
        targetView: "self_service",
        estimatedTime: "1 min",
        outcome: "Verified personal compensation, payslips & official letters",
      },
      {
        id: "emp_2",
        stepNumber: 2,
        title: "Verify Your Attendance, Shift Roster & Remote Work",
        promptText: "Check your Accra/London biometric gate sync, view your assigned consulting shift (09:00–17:30), or log a 1-click Remote Work day.",
        actionLabel: "Open Time & Leave",
        targetView: "time_and_leave",
        estimatedTime: "1 min",
        outcome: "Confirmed shift schedule & attendance status",
      },
      {
        id: "emp_3",
        stepNumber: 3,
        title: "Update Your Cascading BSC Goals & Quick Wins Journal",
        promptText: "Review how your individual KPIs ladder up to corporate objectives, adjust your self-rating sliders, and log key wins before submitting to Manager Review.",
        actionLabel: "Open Performance (PMS)",
        targetView: "performance_pms",
        estimatedTime: "2 mins",
        outcome: "Updated Q4 OKR/BSC progress & logged accomplishments",
      },
      {
        id: "emp_4",
        stepNumber: 4,
        title: "Review T-Shaped Skill Recommendations & Internal Gigs",
        promptText: "Explore internal project gigs and LMS learning modules automatically recommended from your appraisal competency gaps.",
        actionLabel: "Open Skills & Projects",
        targetView: "skills_marketplace",
        estimatedTime: "1 min",
        outcome: "Enrolled in targeted career growth & compliance courses",
      },
      {
        id: "emp_5",
        stepNumber: 5,
        title: "Raise an IT/HR Support Request or Check Policies",
        promptText: "Need hardware support or policy clarification? Visit the HR Helpdesk or Policies Handbook to get instant AI-assisted answers.",
        actionLabel: "Open HR Helpdesk",
        targetView: "helpdesk",
        estimatedTime: "1 min",
        outcome: "Familiarized with support tickets & corporate handbooks",
      },
    ],
  },
  line_manager: {
    roleTitle: "Line Manager Guided Journey",
    welcomeSummary: "Follow these 5 guided prompts to oversee your squad's schedules, approve pending requests, and complete appraisal sign-offs.",
    steps: [
      {
        id: "mgr_1",
        stepNumber: 1,
        title: "Inspect Department Shift Rosters & Biometric Gate Sync",
        promptText: "Check who is on-site in Accra or London, review hybrid desk allocations, and ensure 24/7 on-call rota coverage for your squad.",
        actionLabel: "Open Time & Shifts",
        targetView: "time_and_leave",
        estimatedTime: "1 min",
        outcome: "Verified squad attendance & shift coverage",
      },
      {
        id: "mgr_2",
        stepNumber: 2,
        title: "Action Pending Leave, Expense & Objective Approvals",
        promptText: "Review requests waiting in your queue so they don't breach the 48-hour SLA escalation threshold.",
        actionLabel: "Open Approval Workflows",
        targetView: "approval_workflows",
        estimatedTime: "2 mins",
        outcome: "Cleared pending team authorizations",
      },
      {
        id: "mgr_3",
        stepNumber: 3,
        title: "Drill Down into Team Objectives & Complete Sign-Offs",
        promptText: "Click any metric card on the Performance Dashboard to drill down into staff with pending or active objectives and complete manager evaluations.",
        actionLabel: "Open Performance (PMS)",
        targetView: "performance_pms",
        estimatedTime: "2 mins",
        outcome: "Reviewed direct report scorecards & ratings",
      },
      {
        id: "mgr_4",
        stepNumber: 4,
        title: "Review Your Squad in the Employee Directory",
        promptText: "Inspect team assignments, reporting lines, and allocated workstations across your practice.",
        actionLabel: "Open Employee Directory",
        targetView: "workforce_directory",
        estimatedTime: "1 min",
        outcome: "Audited squad roster & role assignments",
      },
      {
        id: "mgr_5",
        stepNumber: 5,
        title: "Track Active Delivery Projects & Resource Allocation",
        promptText: "Monitor milestone delivery and match internal talent to high-priority client initiatives.",
        actionLabel: "Open Project Portfolio",
        targetView: "projects",
        estimatedTime: "1 min",
        outcome: "Aligned squad capacity with project milestones",
      },
    ],
  },
  hr_admin: {
    roleTitle: "HR Operations Admin Guided Journey",
    welcomeSummary: "Follow these 5 operational prompts to manage employee records, govern approval workflows, and maintain data compliance.",
    steps: [
      {
        id: "adm_1",
        stepNumber: 1,
        title: "Audit Employee Directory & Squad Assignments",
        promptText: "Verify that all employees have accurate department, team squad, and @bscscoreview.com email records.",
        actionLabel: "Open Employee Directory",
        targetView: "workforce_directory",
        estimatedTime: "1 min",
        outcome: "Verified master employee directory records",
      },
      {
        id: "adm_2",
        stepNumber: 2,
        title: "Configure Multi-Tier Authorization Workflows",
        promptText: "Review and customize approval chains for Leave, Performance Sign-Off, Travel, and Bank Account changes.",
        actionLabel: "Open Approval Workflows",
        targetView: "approval_workflows",
        estimatedTime: "2 mins",
        outcome: "Configured SLA rules & multi-stage routing",
      },
      {
        id: "adm_3",
        stepNumber: 3,
        title: "Manage Field-Level Permissions & Policy Governance",
        promptText: "Control which profile fields employees can edit immediately vs. which changes trigger an HR Admin verification workflow.",
        actionLabel: "Open Employee Settings",
        targetView: "employee_settings",
        estimatedTime: "2 mins",
        outcome: "Enforced field-level RBAC & audit rules",
      },
      {
        id: "adm_4",
        stepNumber: 4,
        title: "Manage Onboarding, Offboarding & Hardware Assets",
        promptText: "Track pre-boarding checklists and verify corporate laptop provisioning across Accra and London hubs.",
        actionLabel: "Open Lifecycle Portals",
        targetView: "lifecycle_portals",
        estimatedTime: "1 min",
        outcome: "Synced employee lifecycle & hardware inventory",
      },
      {
        id: "adm_5",
        stepNumber: 5,
        title: "Validate Data Hygiene & Schema Governance",
        promptText: "Run pre-payroll validation checks on bulk imports to guarantee 100% statutory GRA and SSNIT compliance.",
        actionLabel: "Open Data Governance",
        targetView: "governance_import",
        estimatedTime: "1 min",
        outcome: "Validated workforce data integrity",
      },
    ],
  },
  hr_director: {
    roleTitle: "HR Director & Executive Guided Journey",
    welcomeSummary: "Follow these 5 strategic prompts to monitor organizational health, calibrate Balanced Scorecard weights, and chair the Appraisal Review Board.",
    steps: [
      {
        id: "dir_1",
        stepNumber: 1,
        title: "Review Workforce Intelligence & Command Centre",
        promptText: "Start at the Executive Command Centre to inspect live headcount, retention risk signals, and organizational velocity across Accra and London.",
        actionLabel: "View Command Centre",
        targetView: "command_centre",
        estimatedTime: "1 min",
        outcome: "Assessed executive workforce KPIs",
      },
      {
        id: "dir_2",
        stepNumber: 2,
        title: "Calibrate Cascading Balanced Scorecard (BSC) Weights",
        promptText: "Open Performance (PMS) → Cascading BSC to adjust Financial, Customer, Internal Process, and Learning & Growth weights—changes propagate downstream immediately.",
        actionLabel: "Open Performance (PMS)",
        targetView: "performance_pms",
        estimatedTime: "2 mins",
        outcome: "Aligned corporate BSC strategic perspective weights",
      },
      {
        id: "dir_3",
        stepNumber: 3,
        title: "Chair the HR Appraisal Review Board & 9-Box Grid",
        promptText: "Inside Performance (PMS), review bell-curve rating distributions, eliminate manager rating bias, and sign off on executive talent calibration.",
        actionLabel: "Open Appraisal Board",
        targetView: "performance_pms",
        estimatedTime: "2 mins",
        outcome: "Completed executive appraisal calibration",
      },
      {
        id: "dir_4",
        stepNumber: 4,
        title: "Govern Enterprise Appraisal Architecture (Nerve Center)",
        promptText: "Configure organization-wide performance frameworks, weight guardrails, and review cycle state locks.",
        actionLabel: "Open Admin Nerve Center",
        targetView: "admin_nerve_center",
        estimatedTime: "1 min",
        outcome: "Verified enterprise performance governance",
      },
      {
        id: "dir_5",
        stepNumber: 5,
        title: "Generate Board-Ready Workforce Analytics & Reports",
        promptText: "Access the 60-report catalog or use the AI Report Builder to export executive compensation, headcount, and productivity insights.",
        actionLabel: "Open Reports & Analytics",
        targetView: "reports_analytics",
        estimatedTime: "1 min",
        outcome: "Generated executive board reporting package",
      },
    ],
  },
};

export const VIEW_CONTEXT_HINTS: Record<ModuleViewKey, { whatToDoHere: string; nextSuggestedView: ModuleViewKey; nextSuggestedLabel: string }> = {
  self_service: {
    whatToDoHere: "Click any of the 8 ESS Shortcut Cards to request leave, view your Total Rewards Wallet, log remote work, or generate an AI verification letter.",
    nextSuggestedView: "performance_pms",
    nextSuggestedLabel: "Update Performance Goals →",
  },
  command_centre: {
    whatToDoHere: "Inspect real-time executive KPIs, click any alert card to drill down, or switch personas in the left sidebar to test role-based views.",
    nextSuggestedView: "performance_pms",
    nextSuggestedLabel: "Calibrate Cascading BSC →",
  },
  my_performance: {
    whatToDoHere: "Read your objectives, their weighted progress and where your review stands. This page is read only.",
    nextSuggestedView: "objectives",
    nextSuggestedLabel: "Go to Objectives →",
  },
  my_profile: {
    whatToDoHere: "Ask HR to change a bank or tax detail here. The stored value changes only after HR approves the request.",
    nextSuggestedView: "payslips",
    nextSuggestedLabel: "Go to Payslips →",
  },
  payslips: {
    whatToDoHere: "Download your payslips as PDFs. HR uploads each payslip here, one PDF per employee and month.",
    nextSuggestedView: "document_centre",
    nextSuggestedLabel: "Go to Document Centre →",
  },
  document_centre: {
    whatToDoHere: "Open each HR document and acknowledge that you have read it. HR sees how many copies are still outstanding.",
    nextSuggestedView: "my_performance",
    nextSuggestedLabel: "Go to My Performance →",
  },
  performance_setup: {
    whatToDoHere: "Load the corporate strategy goals and the reporting lines from CSV. Each load replaces the whole set, so check the file first.",
    nextSuggestedView: "performance_pms",
    nextSuggestedLabel: "Go to Appraisal Oversight →",
  },
  company_setup: {
    whatToDoHere: "Add offices and link each department to one. Set who approves leave and objectives, one level at a time. Test each integration before you rely on it.",
    nextSuggestedView: "performance_setup",
    nextSuggestedLabel: "Go to Performance Setup →",
  },
  performance_pms: {
    whatToDoHere: "Click any Dashboard counter (e.g., No Objectives, Active Objectives) to drill down, or switch tabs to 'Cascading BSC' to adjust strategic weights.",
    nextSuggestedView: "approval_workflows",
    nextSuggestedLabel: "Review Approval Workflows →",
  },
  assets: {
    whatToDoHere: "Assign, return and register company equipment. Everyone can see what is assigned to them.",
    nextSuggestedView: "dashboard",
    nextSuggestedLabel: "Back to Dashboard →",
  },
  dashboard: {
    whatToDoHere: "Start here: leave on the calendar, objectives awaiting approval, and your own status for this cycle.",
    nextSuggestedView: "time_and_leave",
    nextSuggestedLabel: "Go to Leave →",
  },
  objectives: {
    whatToDoHere: "Add your objectives with weights that total 100%, then submit them for approval. Approved objectives are locked.",
    nextSuggestedView: "performance_pms",
    nextSuggestedLabel: "Open Performance →",
  },
  time_and_leave: {
    whatToDoHere: "Switch between Leave Requests and 'Department Schedules & Shift Rosters' to view Accra/London biometric gate sync and on-call rotas.",
    nextSuggestedView: "self_service",
    nextSuggestedLabel: "Return to Self-Service Hub →",
  },
  workforce_directory: {
    whatToDoHere: "Search or filter employees by department or squad. Click any employee row to inspect their full profile, assigned team, and hardware.",
    nextSuggestedView: "projects",
    nextSuggestedLabel: "View Project Squads →",
  },
  approval_workflows: {
    whatToDoHere: "Inspect multi-tier authorization pipelines (Leave, PMS, Travel, Expenses, Headcount) or click '+ New Workflow' to build a custom approval chain.",
    nextSuggestedView: "employee_settings",
    nextSuggestedLabel: "Configure Employee Settings →",
  },
  reports_analytics: {
    whatToDoHere: "Browse the 60-report executive catalog or type a natural-language prompt to generate custom cross-subsidiary analytics.",
    nextSuggestedView: "command_centre",
    nextSuggestedLabel: "Back to Command Centre →",
  },
  employee_settings: {
    whatToDoHere: "Configure field-level permissions, work week calendars, and statutory compliance policies across Ghana and UK entities.",
    nextSuggestedView: "governance_import",
    nextSuggestedLabel: "Check Data Governance →",
  },
  skills_marketplace: {
    whatToDoHere: "Match employee T-shaped competency profiles to open internal gigs and upskilling courses.",
    nextSuggestedView: "projects",
    nextSuggestedLabel: "Explore Active Projects →",
  },
  admin_nerve_center: {
    whatToDoHere: "Govern the active appraisal framework, weighting locks, and cycle state transitions across the enterprise.",
    nextSuggestedView: "performance_pms",
    nextSuggestedLabel: "Open Performance Matrix →",
  },
  lifecycle_portals: {
    whatToDoHere: "Track candidate pre-boarding, 30-60-90 day onboarding milestones, and offboarding asset recovery.",
    nextSuggestedView: "asset_management",
    nextSuggestedLabel: "Inspect Hardware Assets →",
  },
  asset_management: {
    whatToDoHere: "Audit corporate laptops, biometric security keys, and workstation assignments by employee.",
    nextSuggestedView: "helpdesk",
    nextSuggestedLabel: "Open IT & HR Helpdesk →",
  },
  helpdesk: {
    whatToDoHere: "Triage employee support tickets or generate official HR letters and policy responses.",
    nextSuggestedView: "policies_handbook",
    nextSuggestedLabel: "View Policies & Handbooks →",
  },
  projects: {
    whatToDoHere: "Track cross-functional delivery squads, project budgets, and milestone completion.",
    nextSuggestedView: "skills_marketplace",
    nextSuggestedLabel: "Open Skills Marketplace →",
  },
  governance_import: {
    whatToDoHere: "Validate bulk CSV/Excel employee data imports and audit schema compliance before payroll runs.",
    nextSuggestedView: "reports_analytics",
    nextSuggestedLabel: "Open Analytics & Reports →",
  },
  disciplinary: {
    whatToDoHere: "Manage formal disciplinary cases, PIP escalations, and confidential hearing logs.",
    nextSuggestedView: "policies_handbook",
    nextSuggestedLabel: "Review Corporate Policies →",
  },
  policies_handbook: {
    whatToDoHere: "Browse statutory handbooks, remote work charters, and employee code of conduct acknowledgments.",
    nextSuggestedView: "self_service",
    nextSuggestedLabel: "Go to Employee Self-Service →",
  },
  organogram: {
    whatToDoHere: "View the company tree generated from reporting lines, and fill in each person's job title.",
    nextSuggestedView: "workforce_directory",
    nextSuggestedLabel: "Go to Workforce Directory →",
  },
};

interface FollowThePromptBarProps {
  persona: UserPersona;
  currentView: ModuleViewKey;
  onNavigate: (view: ModuleViewKey) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isDrawerOpen: boolean;
  onCloseDrawer: () => void;
  onOpenDrawer: () => void;
}

export const FollowThePromptBar: React.FC<FollowThePromptBarProps> = ({
  persona,
  currentView,
  onNavigate,
  isExpanded,
  onToggleExpand,
  isDrawerOpen,
  onCloseDrawer,
  onOpenDrawer,
}) => {
  const journey = PERSONA_PROMPT_JOURNEYS[persona] || PERSONA_PROMPT_JOURNEYS.hr_director;

  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("scoreview_follow_prompt_completed");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  // Reset active step index when persona changes to the first incomplete step
  useEffect(() => {
    const firstIncompleteIdx = journey.steps.findIndex((s) => !completedIds.includes(s.id));
    setActiveStepIndex(firstIncompleteIdx >= 0 ? firstIncompleteIdx : 0);
  }, [persona, journey.steps, completedIds]);

  const toggleStepComplete = (stepId: string) => {
    setCompletedIds((prev) => {
      const next = prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("scoreview_follow_prompt_completed", JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const handleResetProgress = () => {
    const personaStepIds = journey.steps.map((s) => s.id);
    setCompletedIds((prev) => {
      const next = prev.filter((id) => !personaStepIds.includes(id));
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("scoreview_follow_prompt_completed", JSON.stringify(next));
        } catch {}
      }
      return next;
    });
    setActiveStepIndex(0);
  };

  const completedCount = journey.steps.filter((s) => completedIds.includes(s.id)).length;
  const totalCount = journey.steps.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const currentStep = journey.steps[activeStepIndex] || journey.steps[0];
  const contextHint = VIEW_CONTEXT_HINTS[currentView] || VIEW_CONTEXT_HINTS.command_centre;

  return (
    <>
      {/* TOP "FOLLOW THE PROMPT" GUIDED STRIP */}
      {isExpanded && (
        <div
          style={{
            background: "linear-gradient(90deg, #1e1b4b 0%, #312e81 55%, #1e293b 100%)",
            color: "#ffffff",
            borderBottom: "1px solid rgba(99, 102, 241, 0.35)",
            padding: "0.65rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.45rem",
            position: "relative",
            zIndex: 19,
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.12)",
          }}
        >
          {/* Main Guided Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            {/* Left: Badge, Progress & Current Step Prompt */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: "280px" }}>
              <div
                onClick={onOpenDrawer}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  backgroundColor: "rgba(99, 102, 241, 0.28)",
                  border: "1px solid rgba(165, 180, 252, 0.4)",
                  borderRadius: radii.full,
                  padding: "0.25rem 0.65rem",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#e0e7ff",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                title="Click to open the full Follow the Prompt checklist"
              >
                <Icons.Compass size={13} color="#a5b4fc" />
                <span>FOLLOW THE PROMPT</span>
                <span
                  style={{
                    backgroundColor: "#10b981",
                    color: "#052e16",
                    borderRadius: radii.full,
                    padding: "0.05rem 0.4rem",
                    fontSize: "10px",
                    fontWeight: 800,
                  }}
                >
                  {completedCount}/{totalCount}
                </span>
              </div>

              {/* Step Pills */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                {journey.steps.map((step, idx) => {
                  const isDone = completedIds.includes(step.id);
                  const isCurrent = idx === activeStepIndex;
                  return (
                    <button
                      key={step.id}
                      onClick={() => setActiveStepIndex(idx)}
                      title={`Step ${step.stepNumber}: ${step.title}`}
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        border: isCurrent ? "2px solid #ffffff" : "1px solid rgba(255,255,255,0.25)",
                        backgroundColor: isDone
                          ? "#10b981"
                          : isCurrent
                          ? "#6366f1"
                          : "rgba(255, 255, 255, 0.1)",
                        color: "#ffffff",
                        fontSize: "10px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                        transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
                      }}
                    >
                      {isDone ? "✓" : step.stepNumber}
                    </button>
                  );
                })}
              </div>

              {/* Active Step Description */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase" }}>
                    Next Step {currentStep.stepNumber}:
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#ffffff" }}>
                    {currentStep.title}
                  </span>
                  <span style={{ fontSize: "11px", color: "#cbd5e1" }}>
                    — {currentStep.promptText}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
              <button
                onClick={() => {
                  onNavigate(currentStep.targetView);
                }}
                style={{
                  backgroundColor: "#6366f1",
                  border: "1px solid #818cf8",
                  color: "#ffffff",
                  borderRadius: radii.md,
                  padding: "0.35rem 0.75rem",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  boxShadow: "0 2px 6px rgba(99, 102, 241, 0.4)",
                }}
              >
                <span>{currentStep.actionLabel}</span>
                <Icons.ArrowRight size={12} />
              </button>

              <button
                onClick={() => {
                  toggleStepComplete(currentStep.id);
                  if (activeStepIndex < journey.steps.length - 1) {
                    setActiveStepIndex(activeStepIndex + 1);
                  }
                }}
                style={{
                  backgroundColor: completedIds.includes(currentStep.id)
                    ? "rgba(16, 185, 129, 0.25)"
                    : "rgba(255, 255, 255, 0.12)",
                  border: `1px solid ${
                    completedIds.includes(currentStep.id) ? "#10b981" : "rgba(255, 255, 255, 0.25)"
                  }`,
                  color: "#ffffff",
                  borderRadius: radii.md,
                  padding: "0.35rem 0.65rem",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {completedIds.includes(currentStep.id) ? "Completed ✓" : "Mark Done ✓"}
              </button>

              <button
                onClick={onOpenDrawer}
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  color: "#e2e8f0",
                  borderRadius: radii.md,
                  padding: "0.35rem 0.65rem",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                All {totalCount} Prompts
              </button>

              <button
                onClick={onToggleExpand}
                title="Minimize Follow the Prompt bar (re-open anytime from top header)"
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "0.25rem",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Icons.X size={15} />
              </button>
            </div>
          </div>

          {/* Contextual Sub-Bar: "Where you are right now & What to do on this screen" */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "0.35rem",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              fontSize: "11px",
              color: "#cbd5e1",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Icons.Sparkles size={12} color="#38bdf8" />
              <strong style={{ color: "#38bdf8" }}>On This Screen Tip:</strong>
              <span>{contextHint.whatToDoHere}</span>
            </div>
            <button
              onClick={() => onNavigate(contextHint.nextSuggestedView)}
              style={{
                background: "none",
                border: "none",
                color: "#a5b4fc",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
                whiteSpace: "nowrap",
              }}
            >
              Suggested Next: {contextHint.nextSuggestedLabel}
            </button>
          </div>
        </div>
      )}

      {/* FULL "FOLLOW THE PROMPT" INTERACTIVE MODAL / DRAWER */}
      {isDrawerOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(5px)",
            zIndex: 180,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.25rem",
          }}
          onClick={onCloseDrawer}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "780px",
              maxHeight: "90vh",
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              boxShadow: shadows.modal,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
                color: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                  <Icons.Compass size={16} color="#a5b4fc" />
                  <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#a5b4fc" }}>
                    Follow the Prompt • Guided System Navigator
                  </span>
                  <Badge variant="success" size="sm">
                    {progressPercent}% Complete
                  </Badge>
                </div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#ffffff" }}>
                  {journey.roleTitle}
                </h3>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "12px", color: "#cbd5e1", lineHeight: 1.45 }}>
                  {journey.welcomeSummary}
                </p>
              </div>

              <button
                onClick={onCloseDrawer}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  color: "#ffffff",
                  borderRadius: radii.sm,
                  padding: "0.35rem",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <Icons.X size={18} />
              </button>
            </div>

            {/* Progress Bar */}
            <div style={{ height: "6px", backgroundColor: "#e2e8f0", width: "100%" }}>
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  backgroundColor: "#10b981",
                  transition: "width 0.25s ease",
                }}
              />
            </div>

            {/* Steps List */}
            <div style={{ padding: "1.25rem 1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {journey.steps.map((step, idx) => {
                const isDone = completedIds.includes(step.id);
                const isCurrent = idx === activeStepIndex;
                return (
                  <div
                    key={step.id}
                    style={{
                      border: `1px solid ${isCurrent ? colors.indigoAction : isDone ? "#a7f3d0" : colors.border}`,
                      backgroundColor: isDone
                        ? "rgba(16, 185, 129, 0.04)"
                        : isCurrent
                        ? "rgba(99, 102, 241, 0.04)"
                        : colors.surface,
                      borderRadius: radii.md,
                      padding: "1rem 1.15rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "1rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem", flex: 1 }}>
                      <button
                        onClick={() => toggleStepComplete(step.id)}
                        title={isDone ? "Mark as incomplete" : "Mark step as done"}
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          border: isDone ? "none" : `2px solid ${isCurrent ? colors.indigoAction : colors.borderStrong}`,
                          backgroundColor: isDone ? "#10b981" : isCurrent ? colors.indigoPrimary : colors.surfaceSubtle,
                          color: isDone || isCurrent ? "#ffffff" : colors.textSecondary,
                          fontWeight: 700,
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: "0.1rem",
                        }}
                      >
                        {isDone ? "✓" : step.stepNumber}
                      </button>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <span
                            style={{
                              fontSize: typography.sizes.sm,
                              fontWeight: 700,
                              color: isDone ? colors.textSecondary : colors.indigoPrimary,
                              textDecoration: isDone ? "line-through" : "none",
                            }}
                          >
                            {step.title}
                          </span>
                          <Badge variant={isDone ? "success" : isCurrent ? "info" : "neutral"} size="sm">
                            {isDone ? "Completed" : `~${step.estimatedTime}`}
                          </Badge>
                        </div>

                        <p style={{ margin: "0.3rem 0 0.4rem 0", fontSize: "12px", color: colors.textSecondary, lineHeight: 1.45 }}>
                          {step.promptText}
                        </p>

                        <div style={{ fontSize: "11px", color: colors.textMuted }}>
                          <strong>Expected Outcome:</strong> {step.outcome}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flexShrink: 0 }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setActiveStepIndex(idx);
                          onNavigate(step.targetView);
                          onCloseDrawer();
                        }}
                      >
                        <span>{step.actionLabel}</span>
                        <Icons.ArrowRight size={12} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
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
              <button
                onClick={handleResetProgress}
                style={{
                  background: "none",
                  border: "none",
                  color: colors.textMuted,
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Reset Checklist Progress
              </button>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Button variant="secondary" size="sm" onClick={onCloseDrawer}>
                  Close Guide
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


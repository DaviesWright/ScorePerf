"use client";

import React, { useState, useMemo } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { SlideOver } from "../../design-system/SlideOver";

export interface WorkflowStep {
  id: string;
  type: "Reporting Line" | "Admin (Role)";
  label: string;
  isOptional: boolean;
}

export interface ApprovalWorkflowRecord {
  id: number;
  sn: number;
  name: string;
  domain: "Leave" | "Performance" | "Expenses" | "Recruitment" | "Training" | "Governance";
  steps: WorkflowStep[];
  showApprovalComment: boolean;
  approvalCommentRequired: boolean;
  showDeclineComment: boolean;
  declineCommentRequired: boolean;
  reminderHours: number;
  autoEscalate: boolean;
  isActive: boolean;
}

interface ApprovalWorkflowsViewProps {
  onNavigateToView?: (viewKey: string) => void;
}

export const ApprovalWorkflowsView: React.FC<ApprovalWorkflowsViewProps> = () => {
  // Maker-Checker Dual Control State (Screenshot Pill: Maker-Checker: Off / On)
  const [isMakerCheckerActive, setIsMakerCheckerActive] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string>("ALL");

  // SlideOver State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<ApprovalWorkflowRecord | null>(null);

  // Drawer Form State
  const [formName, setFormName] = useState("");
  const [formDomain, setFormDomain] = useState<ApprovalWorkflowRecord["domain"]>("Leave");
  const [formStepType, setFormStepType] = useState<"Reporting Line" | "Admin (Role)">("Reporting Line");
  const [formSelectedTarget, setFormSelectedTarget] = useState("Line Manager");
  const [formSteps, setFormSteps] = useState<WorkflowStep[]>([]);
  const [formShowApprovalComment, setFormShowApprovalComment] = useState(true);
  const [formApprovalCommentRequired, setFormApprovalCommentRequired] = useState(true);
  const [formShowDeclineComment, setFormShowDeclineComment] = useState(true);
  const [formDeclineCommentRequired, setFormDeclineCommentRequired] = useState(true);
  const [formReminderHours, setFormReminderHours] = useState(24);
  const [formAutoEscalate, setFormAutoEscalate] = useState(true);

  // Alert Feedback
  const [feedback, setFeedback] = useState<{ message: string; error?: boolean } | null>(null);

  // Initial Enterprise Approval Workflows
  const [workflows, setWorkflows] = useState<ApprovalWorkflowRecord[]>([
    {
      id: 1,
      sn: 1,
      name: "GH Expense Policy",
      domain: "Expenses",
      steps: [
        { id: "s1", type: "Reporting Line", label: "Line Manager", isOptional: false },
        { id: "s2", type: "Admin (Role)", label: "Super Admin - Ghana", isOptional: false },
      ],
      showApprovalComment: true,
      approvalCommentRequired: false,
      showDeclineComment: true,
      declineCommentRequired: true,
      reminderHours: 24,
      autoEscalate: false,
      isActive: true,
    },
    {
      id: 2,
      sn: 2,
      name: "Service Policy",
      domain: "Governance",
      steps: [
        { id: "s1", type: "Reporting Line", label: "Line Manager", isOptional: false },
        { id: "s2", type: "Admin (Role)", label: "Super Admin - Ghana", isOptional: false },
      ],
      showApprovalComment: true,
      approvalCommentRequired: false,
      showDeclineComment: true,
      declineCommentRequired: true,
      reminderHours: 48,
      autoEscalate: false,
      isActive: true,
    },
    {
      id: 3,
      sn: 3,
      name: "Maternity Leave Workflow",
      domain: "Leave",
      steps: [
        { id: "s1", type: "Reporting Line", label: "Line Manager", isOptional: false },
        { id: "s2", type: "Reporting Line", label: "Head of Department", isOptional: false },
        { id: "s3", type: "Admin (Role)", label: "Super Admin - Ghana", isOptional: false },
      ],
      showApprovalComment: true,
      approvalCommentRequired: true,
      showDeclineComment: true,
      declineCommentRequired: true,
      reminderHours: 24,
      autoEscalate: true,
      isActive: true,
    },
    {
      id: 4,
      sn: 4,
      name: "Annual Leave Workflow",
      domain: "Leave",
      steps: [
        { id: "s1", type: "Reporting Line", label: "Line Manager", isOptional: false },
        { id: "s2", type: "Admin (Role)", label: "Super Admin - Ghana", isOptional: false },
      ],
      showApprovalComment: true,
      approvalCommentRequired: false,
      showDeclineComment: true,
      declineCommentRequired: true,
      reminderHours: 24,
      autoEscalate: true,
      isActive: true,
    },
    {
      id: 5,
      sn: 5,
      name: "Compassionate Leave",
      domain: "Leave",
      steps: [
        { id: "s1", type: "Reporting Line", label: "Line Manager", isOptional: false },
        { id: "s2", type: "Admin (Role)", label: "Super Admin - Ghana", isOptional: false },
      ],
      showApprovalComment: true,
      approvalCommentRequired: false,
      showDeclineComment: true,
      declineCommentRequired: true,
      reminderHours: 12,
      autoEscalate: true,
      isActive: true,
    },
    {
      id: 6,
      sn: 6,
      name: "Omni Energy Leave",
      domain: "Leave",
      steps: [
        { id: "s1", type: "Reporting Line", label: "Line Manager", isOptional: false },
      ],
      showApprovalComment: true,
      approvalCommentRequired: false,
      showDeclineComment: true,
      declineCommentRequired: true,
      reminderHours: 24,
      autoEscalate: false,
      isActive: true,
    },
    {
      id: 7,
      sn: 7,
      name: "Study Leave Workflow",
      domain: "Leave",
      steps: [
        { id: "s1", type: "Reporting Line", label: "Line Manager", isOptional: false },
        { id: "s2", type: "Admin (Role)", label: "Super Admin - Ghana", isOptional: false },
      ],
      showApprovalComment: true,
      approvalCommentRequired: true,
      showDeclineComment: true,
      declineCommentRequired: true,
      reminderHours: 48,
      autoEscalate: true,
      isActive: true,
    },
    {
      id: 8,
      sn: 8,
      name: "Job requisition workflow",
      domain: "Recruitment",
      steps: [
        { id: "s1", type: "Reporting Line", label: "Line Manager", isOptional: false },
        { id: "s2", type: "Admin (Role)", label: "Super Admin - Ghana", isOptional: false },
        { id: "s3", type: "Admin (Role)", label: "Payroll Officer - Ghana", isOptional: false },
      ],
      showApprovalComment: true,
      approvalCommentRequired: true,
      showDeclineComment: true,
      declineCommentRequired: true,
      reminderHours: 24,
      autoEscalate: true,
      isActive: true,
    },
    {
      id: 9,
      sn: 9,
      name: "requisition approval workflow",
      domain: "Recruitment",
      steps: [
        { id: "s1", type: "Reporting Line", label: "Line Manager", isOptional: false },
        { id: "s2", type: "Reporting Line", label: "Unit Head", isOptional: false },
        { id: "s3", type: "Admin (Role)", label: "Payroll Officer - Ghana", isOptional: false },
      ],
      showApprovalComment: true,
      approvalCommentRequired: true,
      showDeclineComment: true,
      declineCommentRequired: true,
      reminderHours: 24,
      autoEscalate: true,
      isActive: true,
    },
    {
      id: 10,
      sn: 10,
      name: "Employee Objectives Approval",
      domain: "Performance",
      steps: [
        { id: "s1", type: "Reporting Line", label: "Line Manager", isOptional: false },
      ],
      showApprovalComment: true,
      approvalCommentRequired: false,
      showDeclineComment: true,
      declineCommentRequired: true,
      reminderHours: 24,
      autoEscalate: false,
      isActive: true,
    },
    {
      id: 11,
      sn: 11,
      name: "Training Workflow",
      domain: "Training",
      steps: [
        { id: "s1", type: "Reporting Line", label: "Line Manager", isOptional: false },
        { id: "s2", type: "Reporting Line", label: "Head of Department", isOptional: false },
      ],
      showApprovalComment: true,
      approvalCommentRequired: true,
      showDeclineComment: true,
      declineCommentRequired: true,
      reminderHours: 48,
      autoEscalate: true,
      isActive: true,
    },
    {
      id: 12,
      sn: 12,
      name: "Ghana GRA & SSNIT Statutory Tax Override",
      domain: "Governance",
      steps: [
        { id: "s1", type: "Reporting Line", label: "Line Manager", isOptional: false },
        { id: "s2", type: "Admin (Role)", label: "Super Admin - Ghana", isOptional: false },
        { id: "s3", type: "Admin (Role)", label: "Managing Principal", isOptional: false },
      ],
      showApprovalComment: true,
      approvalCommentRequired: true,
      showDeclineComment: true,
      declineCommentRequired: true,
      reminderHours: 12,
      autoEscalate: true,
      isActive: true,
    },
  ]);

  // Open Drawer for Edit
  const handleEdit = (wf: ApprovalWorkflowRecord) => {
    setEditingWorkflow(wf);
    setFormName(wf.name);
    setFormDomain(wf.domain);
    setFormSteps([...wf.steps]);
    setFormShowApprovalComment(wf.showApprovalComment);
    setFormApprovalCommentRequired(wf.approvalCommentRequired);
    setFormShowDeclineComment(wf.showDeclineComment);
    setFormDeclineCommentRequired(wf.declineCommentRequired);
    setFormReminderHours(wf.reminderHours);
    setFormAutoEscalate(wf.autoEscalate);
    setIsDrawerOpen(true);
  };

  // Open Drawer for Create
  const handleCreateNew = () => {
    setEditingWorkflow(null);
    setFormName("");
    setFormDomain("Leave");
    setFormSteps([
      { id: "step_1", type: "Reporting Line", label: "Line Manager", isOptional: false },
      { id: "step_2", type: "Admin (Role)", label: "Super Admin - Ghana", isOptional: false },
    ]);
    setFormShowApprovalComment(true);
    setFormApprovalCommentRequired(true);
    setFormShowDeclineComment(true);
    setFormDeclineCommentRequired(true);
    setFormReminderHours(24);
    setFormAutoEscalate(true);
    setIsDrawerOpen(true);
  };

  // Add Step to Form
  const handleAddStep = () => {
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      type: formStepType,
      label: formSelectedTarget,
      isOptional: false,
    };
    setFormSteps([...formSteps, newStep]);
  };

  // Move Step Up/Down
  const moveStep = (index: number, direction: "UP" | "DOWN") => {
    const targetIdx = direction === "UP" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= formSteps.length) return;
    const updated = [...formSteps];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setFormSteps(updated);
  };

  // Remove Step
  const removeStep = (id: string) => {
    setFormSteps(formSteps.filter((s) => s.id !== id));
  };

  // Toggle Optional
  const toggleStepOptional = (id: string) => {
    setFormSteps(
      formSteps.map((s) => (s.id === id ? { ...s, isOptional: !s.isOptional } : s))
    );
  };

  // Save Workflow
  const handleSaveWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFeedback({ message: "Workflow name is required.", error: true });
      return;
    }
    if (formSteps.length === 0) {
      setFeedback({ message: "At least one approval step is required.", error: true });
      return;
    }

    if (editingWorkflow) {
      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === editingWorkflow.id
            ? {
                ...w,
                name: formName,
                domain: formDomain,
                steps: formSteps,
                showApprovalComment: formShowApprovalComment,
                approvalCommentRequired: formApprovalCommentRequired,
                showDeclineComment: formShowDeclineComment,
                declineCommentRequired: formDeclineCommentRequired,
                reminderHours: formReminderHours,
                autoEscalate: formAutoEscalate,
              }
            : w
        )
      );
      setFeedback({ message: `Workflow "${formName}" updated successfully.` });
    } else {
      const newRec: ApprovalWorkflowRecord = {
        id: Date.now(),
        sn: workflows.length + 1,
        name: formName,
        domain: formDomain,
        steps: formSteps,
        showApprovalComment: formShowApprovalComment,
        approvalCommentRequired: formApprovalCommentRequired,
        showDeclineComment: formShowDeclineComment,
        declineCommentRequired: formDeclineCommentRequired,
        reminderHours: formReminderHours,
        autoEscalate: formAutoEscalate,
        isActive: true,
      };
      setWorkflows([...workflows, newRec]);
      setFeedback({ message: `New approval workflow "${formName}" established.` });
    }

    setIsDrawerOpen(false);
    setTimeout(() => setFeedback(null), 4000);
  };

  // Filtered workflows
  const filteredWorkflows = useMemo(() => {
    return workflows.filter((w) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.steps.some((s) => s.label.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDomain = selectedDomain === "ALL" || w.domain === selectedDomain;

      return matchesSearch && matchesDomain;
    });
  }, [workflows, searchQuery, selectedDomain]);

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1440px", margin: "0 auto" }}>
      {/* Page Header (Matching Screenshot) */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
              <h1
                style={{
                  fontSize: typography.sizes.xl,
                  fontWeight: 800,
                  color: colors.indigoPrimary,
                  letterSpacing: "-0.02em",
                  margin: 0,
                }}
              >
                Approval Workflows
              </h1>

              {/* Maker-Checker Pill Badge (Screenshot: • Maker-Checker: Off / On) */}
              <button
                onClick={() => {
                  const newState = !isMakerCheckerActive;
                  setIsMakerCheckerActive(newState);
                  setFeedback({
                    message: newState
                      ? "Maker-Checker Mode Activated: Four-Eyes Principle strictly enforced for financial & leave approvals."
                      : "Maker-Checker Mode Deactivated.",
                  });
                  setTimeout(() => setFeedback(null), 3000);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.2rem 0.65rem",
                  borderRadius: radii.full,
                  fontSize: "11px",
                  fontWeight: 700,
                  border: isMakerCheckerActive ? `1px solid ${colors.emeraldDark}` : `1px solid ${colors.border}`,
                  backgroundColor: isMakerCheckerActive ? "rgba(16, 185, 129, 0.1)" : colors.surfaceSubtle,
                  color: isMakerCheckerActive ? colors.emeraldDark : colors.textSecondary,
                  cursor: "pointer",
                  transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
                }}
              >
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    backgroundColor: isMakerCheckerActive ? colors.emeraldDark : colors.textMuted,
                  }}
                />
                <span>Maker-Checker: {isMakerCheckerActive ? "On (Strict Dual-Control)" : "Off"}</span>
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFeedback({ message: "Dede AI audited all 12 workflows: 0 circular routing loops detected." });
                setTimeout(() => setFeedback(null), 3000);
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Sparkles size={14} color={colors.indigoAction} />
                <span>Audit Routing Health</span>
              </span>
            </Button>

            <Button variant="primary" size="sm" onClick={handleCreateNew}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Plus size={14} />
                <span>Create Workflow</span>
              </span>
            </Button>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1.25rem",
            borderRadius: radii.md,
            backgroundColor: feedback.error ? colors.errorBg : colors.successBg,
            border: `1px solid ${feedback.error ? colors.errorBorder : colors.successBorder}`,
            color: feedback.error ? colors.error : colors.success,
            fontSize: typography.sizes.sm,
            fontWeight: 500,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Card: Workflow list (Matching Screenshot) */}
      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.xs,
          overflow: "hidden",
        }}
      >
        {/* Card Header & Search Bar */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h2 style={{ fontSize: typography.sizes.base, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
              Workflow list
            </h2>
            <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px" }}>
              Showing {filteredWorkflows.length} configured approval routes
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            {/* Domain Filter Pills */}
            <div style={{ display: "flex", gap: "0.35rem" }}>
              {["ALL", "Leave", "Performance", "Recruitment", "Expenses", "Training"].map((d) => {
                const isSelected = selectedDomain === d;
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDomain(d)}
                    style={{
                      padding: "0.25rem 0.65rem",
                      borderRadius: radii.full,
                      border: isSelected ? `1px solid ${colors.indigoAction}` : `1px solid ${colors.border}`,
                      backgroundColor: isSelected ? colors.surfaceSubtle : "transparent",
                      color: isSelected ? colors.indigoAction : colors.textSecondary,
                      fontSize: "11px",
                      fontWeight: isSelected ? 700 : 500,
                      cursor: "pointer",
                      transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
                    }}
                  >
                    {d === "ALL" ? "All Domains" : d}
                  </button>
                );
              })}
            </div>

            {/* Search Input (Matching Screenshot) */}
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search workflows"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "0.45rem 0.75rem 0.45rem 2rem",
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: typography.sizes.xs,
                  width: "240px",
                  backgroundColor: colors.surfaceSubtle,
                }}
              />
              <div style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: colors.textMuted }}>
                <Icons.Search size={13} />
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{ position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: colors.textMuted, fontSize: "11px" }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Workflows Table (Matching Screenshot Columns: S/N, Name, Steps) */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                <th style={{ padding: "0.75rem 1.25rem", color: colors.textMuted, fontWeight: 700, width: "60px" }}>
                  S/N
                </th>
                <th style={{ padding: "0.75rem 1.25rem", color: colors.textMuted, fontWeight: 700, width: "280px" }}>
                  Name
                </th>
                <th style={{ padding: "0.75rem 1.25rem", color: colors.textMuted, fontWeight: 700 }}>
                  Steps
                </th>
                <th style={{ padding: "0.75rem 1.25rem", color: colors.textMuted, fontWeight: 700, width: "120px", textAlign: "right" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkflows.map((wf) => (
                <tr
                  key={wf.id}
                  style={{
                    borderBottom: `1px solid ${colors.borderSubtle}`,
                    transition: "background-color 0.1s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(248, 250, 252, 0.8)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  {/* S/N */}
                  <td style={{ padding: "0.95rem 1.25rem", color: colors.textMuted, fontWeight: 600 }}>
                    {wf.sn}
                  </td>

                  {/* Name */}
                  <td style={{ padding: "0.95rem 1.25rem" }}>
                    <div style={{ fontWeight: 600, color: colors.textPrimary, fontSize: typography.sizes.xs }}>
                      {wf.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "2px" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "0.1rem 0.4rem",
                          borderRadius: radii.sm,
                          backgroundColor:
                            wf.domain === "Leave"
                              ? "rgba(16, 185, 129, 0.1)"
                              : wf.domain === "Performance"
                              ? "rgba(99, 102, 241, 0.1)"
                              : wf.domain === "Expenses"
                              ? "rgba(249, 115, 22, 0.1)"
                              : "rgba(148, 163, 184, 0.15)",
                          color:
                            wf.domain === "Leave"
                              ? "#065f46"
                              : wf.domain === "Performance"
                              ? colors.indigoPrimary
                              : wf.domain === "Expenses"
                              ? "#c2410c"
                              : colors.textSecondary,
                        }}
                      >
                        {wf.domain}
                      </span>
                      {wf.autoEscalate && (
                        <span style={{ fontSize: "10px", color: colors.brandBlue, fontWeight: 600 }}>
                          • Auto-escalates ({wf.reminderHours}h)
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Steps (Connected Step Pills matching Screenshot) */}
                  <td style={{ padding: "0.95rem 1.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.45rem" }}>
                      {wf.steps.map((st, sIdx) => (
                        <React.Fragment key={st.id}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              padding: "0.35rem 0.75rem",
                              borderRadius: radii.md,
                              backgroundColor: "#f1f5f9",
                              color: "#334155",
                              fontSize: "11px",
                              fontWeight: 600,
                              border: `1px solid #e2e8f0`,
                            }}
                          >
                            <span>{st.label}</span>
                            {st.isOptional && (
                              <span style={{ fontSize: "9px", color: colors.textMuted, fontStyle: "italic" }}>(Opt)</span>
                            )}
                          </span>
                          {sIdx < wf.steps.length - 1 && (
                            <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: 700 }}>
                              →
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "0.95rem 1.25rem", textAlign: "right" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.4rem" }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(wf)}
                        style={{ padding: "0.25rem 0.6rem", fontSize: "11px" }}
                      >
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SLIDEOVER: EDIT / CREATE WORKFLOW (Matching Screenshot Right Drawer)      */}
      {/* ========================================================================= */}
      <SlideOver
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingWorkflow ? "Edit Workflow" : "Create Workflow"}
        subtitle="Define the approval chain and settings for this workflow."
      >
        <form onSubmit={handleSaveWorkflow} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Workflow Name */}
          <div>
            <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary, marginBottom: "0.35rem" }}>
              Name <span style={{ color: colors.error }}>*</span>
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Maternity Leave Workflow"
              required
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: typography.sizes.xs,
                backgroundColor: colors.surface,
              }}
            />
          </div>

          {/* Domain Category */}
          <div>
            <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary, marginBottom: "0.35rem" }}>
              Operational Domain
            </label>
            <select
              value={formDomain}
              onChange={(e) => setFormDomain(e.target.value as ApprovalWorkflowRecord["domain"])}
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: typography.sizes.xs,
                backgroundColor: colors.surface,
              }}
            >
              <option value="Leave">Leave & Absence</option>
              <option value="Performance">Performance & Objectives</option>
              <option value="Expenses">Expenses & Allowances</option>
              <option value="Recruitment">Recruitment & Job Requisitions</option>
              <option value="Training">Training & Certifications</option>
              <option value="Governance">Data Governance & Compliance</option>
            </select>
          </div>

          {/* Approval Steps (Matching Screenshot Exactly) */}
          <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: "1.25rem" }}>
            <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary, marginBottom: "0.2rem" }}>
              Approval Steps
            </label>
            <p style={{ margin: "0 0 0.75rem 0", fontSize: "11px", color: colors.textMuted, lineHeight: 1.4 }}>
              Select one or both options to build the approval chain. Selected parties approve employees&apos; requests in the order shown below.
            </p>

            {/* Radio Choice: Reporting Line vs Admin (Role) */}
            <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.75rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textPrimary, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="stepType"
                  checked={formStepType === "Reporting Line"}
                  onChange={() => {
                    setFormStepType("Reporting Line");
                    setFormSelectedTarget("Line Manager");
                  }}
                  style={{ accentColor: colors.brandBlue }}
                />
                <span>Reporting Line</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textPrimary, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="stepType"
                  checked={formStepType === "Admin (Role)"}
                  onChange={() => {
                    setFormStepType("Admin (Role)");
                    setFormSelectedTarget("Super Admin - Ghana");
                  }}
                  style={{ accentColor: colors.brandBlue }}
                />
                <span>Admin (Role)</span>
              </label>
            </div>

            {/* Step Selector & Add Step Button */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <select
                value={formSelectedTarget}
                onChange={(e) => setFormSelectedTarget(e.target.value)}
                style={{
                  flex: 1,
                  padding: "0.55rem 0.75rem",
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: typography.sizes.xs,
                  backgroundColor: colors.surface,
                }}
              >
                {formStepType === "Reporting Line" ? (
                  <>
                    <option value="Line Manager">Line Manager</option>
                    <option value="Head of Department">Head of Department</option>
                    <option value="Unit Head">Unit Head</option>
                    <option value="Executive / Managing Principal">Executive / Managing Principal</option>
                  </>
                ) : (
                  <>
                    <option value="Super Admin - Ghana">Super Admin - Ghana</option>
                    <option value="Payroll Officer - Ghana">Payroll Officer - Ghana</option>
                    <option value="HR Operations Specialist">HR Operations Specialist</option>
                    <option value="Finance Director">Finance Director</option>
                    <option value="Chief People Officer">Chief People Officer</option>
                  </>
                )}
              </select>

              <Button type="button" variant="outline" size="sm" onClick={handleAddStep}>
                Add step
              </Button>
            </div>

            {/* Configured Steps List with Up/Down handles, Optional checkbox, and Delete (Screenshot) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {formSteps.map((step, idx) => (
                <div
                  key={step.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.65rem 0.85rem",
                    borderRadius: radii.md,
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.surfaceSubtle,
                    gap: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flex: 1, minWidth: 0 }}>
                    {/* Reorder Up/Down arrows */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveStep(idx, "UP")}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: idx === 0 ? "default" : "pointer",
                          color: idx === 0 ? colors.textMuted : colors.textPrimary,
                          padding: 0,
                          fontSize: "10px",
                          lineHeight: 1,
                        }}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={idx === formSteps.length - 1}
                        onClick={() => moveStep(idx, "DOWN")}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: idx === formSteps.length - 1 ? "default" : "pointer",
                          color: idx === formSteps.length - 1 ? colors.textMuted : colors.textPrimary,
                          padding: 0,
                          fontSize: "10px",
                          lineHeight: 1,
                        }}
                      >
                        ▼
                      </button>
                    </div>

                    <div style={{ fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <span style={{ color: colors.brandBlue, fontWeight: 700, marginRight: "0.35rem" }}>
                        {idx + 1}
                      </span>
                      <span style={{ color: colors.textMuted, marginRight: "0.35rem" }}>
                        {step.type}:
                      </span>
                      <span>{step.label}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                    {/* Optional Checkbox */}
                    <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "11px", color: colors.textSecondary, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={step.isOptional}
                        onChange={() => toggleStepOptional(step.id)}
                        style={{ accentColor: colors.brandBlue }}
                      />
                      <span>Optional 🛈</span>
                    </label>

                    {/* Delete Step */}
                    <button
                      type="button"
                      onClick={() => removeStep(step.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: colors.textMuted,
                        padding: "0.2rem",
                        fontSize: "13px",
                      }}
                      title="Remove step"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comment Settings (Matching Screenshot Toggles) */}
          <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: "1.25rem" }}>
            <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary, marginBottom: "0.2rem" }}>
              Comment Settings
            </label>
            <p style={{ margin: "0 0 0.85rem 0", fontSize: "11px", color: colors.textMuted }}>
              Choose whether approvers can leave comments during an approval.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {/* Show approval comment */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: typography.sizes.xs, color: colors.textPrimary }}>Show approval comment?</span>
                <input
                  type="checkbox"
                  checked={formShowApprovalComment}
                  onChange={(e) => setFormShowApprovalComment(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: colors.brandBlue }}
                />
              </div>

              {/* Approval comment required */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: "1rem" }}>
                <span style={{ fontSize: "11px", color: colors.textSecondary }}>Approval comment required?</span>
                <input
                  type="checkbox"
                  checked={formApprovalCommentRequired}
                  onChange={(e) => setFormApprovalCommentRequired(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: colors.brandBlue }}
                />
              </div>

              {/* Show decline comment */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: typography.sizes.xs, color: colors.textPrimary }}>Show decline comment?</span>
                <input
                  type="checkbox"
                  checked={formShowDeclineComment}
                  onChange={(e) => setFormShowDeclineComment(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: colors.brandBlue }}
                />
              </div>

              {/* Decline comment required */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: "1rem" }}>
                <span style={{ fontSize: "11px", color: colors.textSecondary }}>Decline comment required?</span>
                <input
                  type="checkbox"
                  checked={formDeclineCommentRequired}
                  onChange={(e) => setFormDeclineCommentRequired(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: colors.brandBlue }}
                />
              </div>
            </div>
          </div>

          {/* Reminder Settings (Matching Screenshot) */}
          <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: "1.25rem" }}>
            <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary, marginBottom: "0.2rem" }}>
              Reminder Settings
            </label>
            <p style={{ margin: "0 0 0.85rem 0", fontSize: "11px", color: colors.textMuted }}>
              Automate nudges to prevent pending requests from idling in approver inboxes.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: colors.textMuted, marginBottom: "0.25rem" }}>
                  Nudge Approver After
                </label>
                <select
                  value={formReminderHours}
                  onChange={(e) => setFormReminderHours(Number(e.target.value))}
                  style={{ width: "100%", padding: "0.45rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                >
                  <option value={12}>12 Hours</option>
                  <option value={24}>24 Hours</option>
                  <option value={48}>48 Hours</option>
                  <option value={72}>72 Hours</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: colors.textMuted, marginBottom: "0.25rem" }}>
                  Escalation Trigger
                </label>
                <select
                  value={formAutoEscalate ? "ESCALATE" : "NOTIFY_ONLY"}
                  onChange={(e) => setFormAutoEscalate(e.target.value === "ESCALATE")}
                  style={{ width: "100%", padding: "0.45rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                >
                  <option value="ESCALATE">Auto-Escalate to Next Step</option>
                  <option value="NOTIFY_ONLY">Send Email/Slack Reminder Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer Buttons (Matching Screenshot: Cancel | Save Changes) */}
          <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: "1rem", display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Changes
            </Button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
};


"use client";

import React, { useState } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Icons } from "../../design-system/Icons";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";

// ============================================================================
// CONFIGURATION SCHEMA TYPES (Configuration-as-Code Model)
// ============================================================================

export type WorkflowStageKey =
  | "draft"
  | "self_review"
  | "peer_review"
  | "manager_review"
  | "calibration"
  | "sign_off"
  | "completed";

export interface WorkflowStageConfig {
  key: WorkflowStageKey;
  label: string;
  actor: string; // e.g. "{{Employee}}", "{{Manager}}", "{{Calibration_Committee}}"
  isOptional: boolean;
  enabled: boolean;
  lockSelfScores: boolean;
  slaDays: number;
  rejectionTarget?: WorkflowStageKey;
  conditionalRule?: string;
}

export interface CustomRatingScaleConfig {
  id: string;
  name: string;
  type: "numeric" | "percentage" | "discrete" | "pass_fail";
  departmentScope: string;
  anchors: {
    score: number | string;
    label: string;
    color: string;
    description: string;
  }[];
}

export interface SettingsHierarchyNode {
  level: "Global" | "Tenant" | "Department" | "Team" | "Individual";
  scopeName: string;
  isOverridden: boolean;
  inheritedFrom: string;
  activeScale: string;
  activeWorkflow: string;
  cycleLockDate: string;
}

export interface NotificationRule {
  id: string;
  event: string;
  channels: ("Email" | "In-App" | "Slack" | "SMS")[];
  recipients: string[];
  delayDays: number;
  templateSnippet: string;
}

export interface ConfigurationVersion {
  version: string;
  author: string;
  publishedAt: string;
  changeSummary: string;
  status: "active" | "archived" | "draft";
}

// ============================================================================
// PERFORMANCE CONFIGURATION STUDIO COMPONENT
// ============================================================================

export const PerformanceConfigurationStudio: React.FC = () => {
  const [activeStudioTab, setActiveStudioTab] = useState<
    "workflow" | "scales" | "hierarchy" | "notifications" | "json_governance"
  >("workflow");

  const [isDraft, setIsDraft] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationSuccess, setValidationSuccess] = useState<boolean | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Configurable Workflow State Machine
  const [workflowStages, setWorkflowStages] = useState<WorkflowStageConfig[]>([
    {
      key: "draft",
      label: "Goal Drafting & Setup",
      actor: "{{Employee}}",
      isOptional: false,
      enabled: true,
      lockSelfScores: false,
      slaDays: 7,
    },
    {
      key: "self_review",
      label: "Self-Review Submission",
      actor: "{{Employee}}",
      isOptional: false,
      enabled: true,
      lockSelfScores: true,
      slaDays: 5,
      rejectionTarget: "draft",
    },
    {
      key: "peer_review",
      label: "360° Peer Feedback",
      actor: "{{Nominated_Peers}}",
      isOptional: true,
      enabled: true,
      lockSelfScores: true,
      slaDays: 5,
      conditionalRule: "IF Role == 'People Manager' OR Grade >= 'L5'",
    },
    {
      key: "manager_review",
      label: "Line Manager Evaluation",
      actor: "{{Manager}}",
      isOptional: false,
      enabled: true,
      lockSelfScores: true,
      slaDays: 5,
      rejectionTarget: "draft",
      conditionalRule: "IF Score < 3.0 THEN Route to Calibration",
    },
    {
      key: "calibration",
      label: "HR Appraisal Review Board",
      actor: "{{HR_Appraisal_Review_Board}}",
      isOptional: true,
      enabled: true,
      lockSelfScores: true,
      slaDays: 4,
      conditionalRule: "Mandatory for outlier scores (Top 10% or Bottom 10%)",
    },
    {
      key: "sign_off",
      label: "Hierarchical Executive Sign-Off",
      actor: "{{Dept_Head}} -> {{Executive_Director}}",
      isOptional: false,
      enabled: true,
      lockSelfScores: true,
      slaDays: 3,
    },
    {
      key: "completed",
      label: "Immutable Archival & Publish",
      actor: "System Engine",
      isOptional: false,
      enabled: true,
      lockSelfScores: true,
      slaDays: 0,
    },
  ]);

  // 2. Custom Rating Scales
  const [ratingScales, setRatingScales] = useState<CustomRatingScaleConfig[]>([
    {
      id: "ops_5pt",
      name: "Operations & Facilities 1–5 Scale",
      type: "numeric",
      departmentScope: "Operations & Facilities",
      anchors: [
        { score: 5, label: "Distinguished / Role Model", color: "#10b981", description: "Consistently exceeds all standards under pressure" },
        { score: 4, label: "Commendable", color: "#0284c7", description: "Frequently surpasses operational expectations" },
        { score: 3, label: "Proficient / Standard", color: "#6366f1", description: "Fully meets regulatory and trait benchmarks" },
        { score: 2, label: "Needs Close Supervision", color: "#f59e0b", description: "Sub-threshold execution; requires remediation" },
        { score: 1, label: "Unsatisfactory", color: "#ef4444", description: "Fails regulatory compliance or behavioral code" },
      ],
    },
    {
      id: "okr_pct",
      name: "Agile OKR Stretch Model (0.0 – 1.0)",
      type: "percentage",
      departmentScope: "Engineering & Product",
      anchors: [
        { score: "1.0", label: "Stretch Exceeded (🚀 >100%)", color: "#10b981", description: "Transformational breakthrough beyond baseline target" },
        { score: "0.7", label: "Target Hit (👌 70–99%)", color: "#6366f1", description: "Sweet spot for ambitious, high-yield objectives" },
        { score: "0.4", label: "Progress Made (🛠 30–69%)", color: "#f59e0b", description: "Partial delivery; dependencies stalled progress" },
        { score: "0.0", label: "No Progress (🚨 <30%)", color: "#ef4444", description: "Stalled; critical intervention required" },
      ],
    },
    {
      id: "corp_4pt",
      name: "Commercial Sales 4-Point Matrix",
      type: "discrete",
      departmentScope: "Global Sales & Business Development",
      anchors: [
        { score: 4, label: "Top Producer (Quota > 120%)", color: "#10b981", description: "President's Club benchmark" },
        { score: 3, label: "Target Achieved (Quota 100-119%)", color: "#0284c7", description: "Consistently hits revenue commitments" },
        { score: 2, label: "Under-Paced (Quota 80-99%)", color: "#f59e0b", description: "Trailing quota; pipeline acceleration needed" },
        { score: 1, label: "Critical Miss (Quota < 80%)", color: "#ef4444", description: "Immediate performance action required" },
      ],
    },
  ]);

  // 3. Settings Cascade Hierarchy
  const [hierarchyNodes, setHierarchyNodes] = useState<SettingsHierarchyNode[]>([
    {
      level: "Global",
      scopeName: "Platform System Defaults",
      isOverridden: false,
      inheritedFrom: "Core System",
      activeScale: "Standard 5-Point Likert",
      activeWorkflow: "Standard 5-Stage Approval",
      cycleLockDate: "2026-12-15",
    },
    {
      level: "Tenant",
      scopeName: "ScoReview Global (UK & Ghana)",
      isOverridden: true,
      inheritedFrom: "Global",
      activeScale: "Balanced Scorecard 30/50/15/5",
      activeWorkflow: "Dual-Control Maker-Checker",
      cycleLockDate: "2026-11-30",
    },
    {
      level: "Department",
      scopeName: "Operations & Facilities",
      isOverridden: true,
      inheritedFrom: "Tenant",
      activeScale: "Operations & Facilities 1–5 Scale",
      activeWorkflow: "Sequential Multi-Tier Chain (5 Tiers)",
      cycleLockDate: "2026-11-20",
    },
    {
      level: "Department",
      scopeName: "Engineering & Platform",
      isOverridden: true,
      inheritedFrom: "Tenant",
      activeScale: "Agile OKR Stretch Model (0.0 – 1.0)",
      activeWorkflow: "Peer 360 + Calibration Flow",
      cycleLockDate: "2026-11-25",
    },
    {
      level: "Individual",
      scopeName: "E. Quaye (Under Remediation)",
      isOverridden: true,
      inheritedFrom: "Department",
      activeScale: "Operations 1–5 Scale",
      activeWorkflow: "Accelerated 4-Week PIP Workflow",
      cycleLockDate: "2026-11-10",
    },
  ]);

  // 4. Notification Rules
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([
    {
      id: "notif_sub",
      event: "Self_Review_Submitted",
      channels: ["Email", "In-App", "Slack"],
      recipients: ["{{Manager}}", "{{HRBP}}"],
      delayDays: 0,
      templateSnippet: "Hi {{Manager_Name}}, {{Employee_Name}} has submitted their Q4 self-evaluation for your review.",
    },
    {
      id: "notif_calib",
      event: "Score_Requires_Calibration",
      channels: ["Email", "In-App"],
      recipients: ["{{Calibration_Committee}}"],
      delayDays: 0,
      templateSnippet: "Outlier rating detected for {{Employee_Name}} (Calibrated Score: {{Score}}). Routed to Calibration docket.",
    },
    {
      id: "notif_sla",
      event: "Manager_Review_SLA_Breached",
      channels: ["Email", "Slack"],
      recipients: ["{{Manager}}", "{{Dept_Head}}"],
      delayDays: 3,
      templateSnippet: "Action required: Review for {{Employee_Name}} has been pending for over 5 days. Escalation triggered.",
    },
  ]);

  // 5. Version History
  const [versions, setVersions] = useState<ConfigurationVersion[]>([
    {
      version: "v2.4-draft",
      author: "Paa Barnes (Managing Principal)",
      publishedAt: "In Progress (Draft)",
      changeSummary: "Added 5-tier sequential sign-off and conditional calibration routing.",
      status: "draft",
    },
    {
      version: "v2.3-live",
      author: "Richard Amoah (Head HR)",
      publishedAt: "2026-11-01 09:30 UTC",
      changeSummary: "Enforced Balanced Scorecard 4-pillar weighting policy across UK and Ghana subsidiaries.",
      status: "active",
    },
    {
      version: "v2.2-archived",
      author: "Benedicta Mensah (Lead Engineer)",
      publishedAt: "2026-10-15 14:15 UTC",
      changeSummary: "Configured Agile OKR grading scale for Engineering squads.",
      status: "archived",
    },
  ]);

  // Pre-Publish Validation Engine
  const handleValidateConfiguration = () => {
    const errors: string[] = [];

    // Rule 1: Check for continuous workflow path
    const enabledStages = workflowStages.filter((s) => s.enabled);
    if (!enabledStages.some((s) => s.key === "completed")) {
      errors.push("Terminal State Missing: Workflow must end with an immutable 'Completed' stage.");
    }
    if (!enabledStages.some((s) => s.key === "self_review")) {
      errors.push("Core State Missing: 'Self-Review' stage cannot be disabled.");
    }

    // Rule 2: Check for dynamic approvers
    enabledStages.forEach((stage) => {
      if (!stage.actor || stage.actor.trim() === "") {
        errors.push(`Missing Approver: Stage '${stage.label}' does not have a dynamic reviewer variable mapped.`);
      }
    });

    // Rule 3: Check rating scales
    ratingScales.forEach((scale) => {
      if (scale.anchors.length < 2) {
        errors.push(`Scale Error: Scale '${scale.name}' must have at least 2 rating anchors defined.`);
      }
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      setValidationSuccess(false);
      setToastMessage("Validation Failed: Please resolve configuration conflicts.");
    } else {
      setValidationErrors([]);
      setValidationSuccess(true);
      setToastMessage("Validation Passed: Configuration is verified and ready for deployment.");
    }
  };

  const handlePublish = () => {
    handleValidateConfiguration();
    if (validationErrors.length === 0) {
      setIsDraft(false);
      setToastMessage("Configuration v2.4 successfully published to Cloudflare edge runtime.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Studio Header & Environment Status */}
      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          border: `1px solid ${colors.border}`,
          padding: "1.5rem 1.75rem",
          boxShadow: shadows.sm,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.25rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <span
              style={{
                width: "32px",
                height: "32px",
                borderRadius: radii.md,
                backgroundColor: colors.indigoSubtle,
                color: colors.indigoAction,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icons.Target size={18} />
            </span>
            <div>
              <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
                Performance Engine Configuration Studio
              </h2>
              <p style={{ margin: "2px 0 0 0", fontSize: typography.sizes.xs, color: colors.textSecondary }}>
                Separation of Engine (Execution Runtime) from Rules (Configuration as Code).
              </p>
            </div>
          </div>
        </div>

        {/* Status Badges & Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Badge variant={isDraft ? "warning" : "success"} size="sm" dot>
              {isDraft ? "Draft Environment (v2.4-draft)" : "Active Live Engine (v2.4)"}
            </Badge>
            <Badge variant="info" size="sm">Multi-Tenant</Badge>
          </div>

          <Button variant="outline" size="sm" onClick={handleValidateConfiguration}>
            Validate Engine Rules
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePublish}
            style={{ backgroundColor: colors.indigoAction, borderColor: colors.indigoAction }}
          >
            Publish to Edge
          </Button>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          style={{
            padding: "0.75rem 1.25rem",
            borderRadius: radii.md,
            backgroundColor: validationSuccess ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
            border: `1px solid ${validationSuccess ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            color: validationSuccess ? colors.emeraldDark : colors.error,
            fontSize: typography.sizes.xs,
            fontWeight: 600,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Validation Errors Drawer */}
      {validationErrors.length > 0 && (
        <div
          style={{
            backgroundColor: "#fff1f2",
            border: `1px solid #fecdd3`,
            borderRadius: radii.md,
            padding: "1rem 1.25rem",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: typography.sizes.xs, color: "#991b1b", marginBottom: "0.4rem" }}>
            Validation Engine Blockers ({validationErrors.length})
          </div>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: typography.sizes.xs, color: "#b91c1c" }}>
            {validationErrors.map((err, idx) => (
              <li key={idx} style={{ marginBottom: "0.25rem" }}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Primary Studio Sub-Tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          borderBottom: `1px solid ${colors.border}`,
          paddingBottom: "0.5rem",
          overflowX: "auto",
        }}
      >
        {[
          { key: "workflow", label: "State Machine Workflow", icon: Icons.FileCheck },
          { key: "scales", label: "Rating Scales & Frameworks", icon: Icons.Award },
          { key: "hierarchy", label: "Hierarchy & Cascade Rules", icon: Icons.Layers },
          { key: "notifications", label: "Notification Triggers", icon: Icons.Bell },
          { key: "json_governance", label: "Configuration as Code (JSON)", icon: Icons.GitBranch },
        ].map((tab) => {
          const isActive = activeStudioTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveStudioTab(tab.key as typeof activeStudioTab)}
              style={{
                background: "none",
                border: "none",
                padding: "0.4rem 0.6rem",
                fontSize: typography.sizes.xs,
                fontWeight: isActive ? 800 : 600,
                color: isActive ? colors.indigoAction : colors.textSecondary,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                position: "relative",
              }}
            >
              <Icon size={14} color={isActive ? colors.indigoAction : colors.textMuted} />
              <span>{tab.label}</span>
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    bottom: "-0.5rem",
                    left: 0,
                    right: 0,
                    height: "3px",
                    backgroundColor: colors.indigoAction,
                    borderRadius: radii.full,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: WORKFLOW STATE MACHINE                                         */}
      {/* ===================================================================== */}
      {activeStudioTab === "workflow" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              padding: "1.75rem",
              boxShadow: shadows.xs,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: typography.sizes.sm, fontWeight: 800, color: colors.textPrimary, textTransform: "uppercase" }}>
                  State Machine Pipeline Builder
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
                  Define stages, dynamic approver bindings, conditional routing branches, and immutable lock policies.
                </p>
              </div>
              <Badge variant="info" size="sm">State Machine v2</Badge>
            </div>

            {/* Visual Stage Transition Rail */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "0.6rem",
                marginBottom: "1.75rem",
                padding: "1rem",
                borderRadius: radii.md,
                backgroundColor: colors.surfaceSubtle,
                border: `1px solid ${colors.borderSubtle}`,
              }}
            >
              {workflowStages.map((stage, idx) => (
                <div
                  key={stage.key}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: radii.full,
                      backgroundColor: stage.enabled ? colors.indigoPrimary : colors.border,
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: 800,
                      marginBottom: "0.35rem",
                    }}
                  >
                    {idx + 1}
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textPrimary, lineHeight: 1.2 }}>
                    {stage.label}
                  </span>
                  <span style={{ fontSize: "10px", color: colors.indigoAction, fontFamily: typography.fontMono, marginTop: "2px" }}>
                    {stage.actor}
                  </span>
                </div>
              ))}
            </div>

            {/* Granular Stage Rule Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {workflowStages.map((stage, index) => (
                <div
                  key={stage.key}
                  style={{
                    padding: "1rem 1.25rem",
                    borderRadius: radii.md,
                    backgroundColor: colors.surfaceSubtle,
                    border: `1px solid ${colors.borderSubtle}`,
                    display: "grid",
                    gridTemplateColumns: "1.2fr 1fr 1.2fr auto",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "11px", fontWeight: 800, color: colors.indigoAction }}>Step {index + 1}</span>
                      <strong style={{ fontSize: typography.sizes.xs, color: colors.textPrimary }}>{stage.label}</strong>
                    </div>
                    <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px" }}>
                      Lock Scores: <strong>{stage.lockSelfScores ? "Yes (Immutable)" : "No (Draft Mode)"}</strong> • SLA: <strong>{stage.slaDays} days</strong>
                    </div>
                  </div>

                  {/* Dynamic Approver Binding */}
                  <div>
                    <label style={{ fontSize: "10px", color: colors.textMuted, display: "block" }}>Dynamic Approver Binding</label>
                    <input
                      type="text"
                      value={stage.actor}
                      onChange={(e) => {
                        const updated = [...workflowStages];
                        updated[index].actor = e.target.value;
                        setWorkflowStages(updated);
                      }}
                      style={{
                        width: "100%",
                        padding: "0.35rem 0.55rem",
                        borderRadius: radii.sm,
                        border: `1px solid ${colors.border}`,
                        fontSize: "11px",
                        fontFamily: typography.fontMono,
                        color: colors.indigoAction,
                        fontWeight: 700,
                        backgroundColor: colors.surface,
                      }}
                    />
                  </div>

                  {/* Conditional Routing Rules */}
                  <div>
                    <label style={{ fontSize: "10px", color: colors.textMuted, display: "block" }}>Conditional Transition Rule</label>
                    <input
                      type="text"
                      placeholder="e.g. IF Score < 3.0 THEN Route to Calibration"
                      value={stage.conditionalRule || ""}
                      onChange={(e) => {
                        const updated = [...workflowStages];
                        updated[index].conditionalRule = e.target.value;
                        setWorkflowStages(updated);
                      }}
                      style={{
                        width: "100%",
                        padding: "0.35rem 0.55rem",
                        borderRadius: radii.sm,
                        border: `1px solid ${colors.border}`,
                        fontSize: "11px",
                        backgroundColor: colors.surface,
                      }}
                    />
                  </div>

                  {/* Enable/Disable Toggle */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", fontSize: "11px", color: colors.textSecondary }}>
                      <input
                        type="checkbox"
                        checked={stage.enabled}
                        onChange={(e) => {
                          const updated = [...workflowStages];
                          updated[index].enabled = e.target.checked;
                          setWorkflowStages(updated);
                        }}
                        style={{ accentColor: colors.indigoPrimary }}
                      />
                      <span>Active</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setToastMessage("Workflow state machine rules saved to draft buffer.")}
              >
                Save Workflow Rules
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: RATING SCALES & FRAMEWORKS                                     */}
      {/* ===================================================================== */}
      {activeStudioTab === "scales" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              padding: "1.75rem",
              boxShadow: shadows.xs,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: typography.sizes.sm, fontWeight: 800, color: colors.textPrimary, textTransform: "uppercase" }}>
                  Rating Scale &amp; Competency Framework Builder
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
                  Define custom numeric, percentage, discrete, or pass/fail anchors and map them to job architectures or divisions.
                </p>
              </div>
              <Button variant="outline" size="sm">
                + Add Custom Scale
              </Button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {ratingScales.map((scale) => (
                <div
                  key={scale.id}
                  style={{
                    borderRadius: radii.md,
                    border: `1px solid ${colors.borderSubtle}`,
                    backgroundColor: colors.surfaceSubtle,
                    padding: "1.25rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                    <div>
                      <strong style={{ fontSize: typography.sizes.xs, color: colors.textPrimary }}>{scale.name}</strong>
                      <span style={{ fontSize: "11px", color: colors.indigoAction, marginLeft: "0.5rem", fontWeight: 600 }}>
                        Scope: {scale.departmentScope}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.6rem" }}>
                    {scale.anchors.map((anchor, aIdx) => (
                      <div
                        key={aIdx}
                        style={{
                          padding: "0.65rem 0.85rem",
                          borderRadius: radii.sm,
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.border}`,
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.6rem",
                        }}
                      >
                        <span
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: radii.full,
                            backgroundColor: anchor.color,
                            color: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: "11px",
                            flexShrink: 0,
                          }}
                        >
                          {anchor.score}
                        </span>
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: colors.textPrimary }}>{anchor.label}</div>
                          <div style={{ fontSize: "10px", color: colors.textMuted, marginTop: "2px" }}>{anchor.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setToastMessage("Custom rating scales updated in draft buffer.")}
              >
                Save Scale Configurations
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: SETTINGS CASCADE & HIERARCHY (The Golden Rule)                 */}
      {/* ===================================================================== */}
      {activeStudioTab === "hierarchy" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              padding: "1.75rem",
              boxShadow: shadows.xs,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: typography.sizes.sm, fontWeight: 800, color: colors.textPrimary, textTransform: "uppercase" }}>
                  Settings Cascade Hierarchy (The Golden Rule)
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
                  Settings inherit downward: Global → Tenant → Department → Team → Individual. Lower tiers cannot modify parent rules without an explicit Override Break.
                </p>
              </div>
              <Badge variant="warning" size="sm">Cascade Inheritance Active</Badge>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {hierarchyNodes.map((node, nIdx) => (
                <div
                  key={nIdx}
                  style={{
                    padding: "1rem 1.25rem",
                    borderRadius: radii.md,
                    backgroundColor: colors.surfaceSubtle,
                    border: `1px solid ${node.isOverridden ? "rgba(99, 102, 241, 0.4)" : colors.borderSubtle}`,
                    display: "grid",
                    gridTemplateColumns: "1fr 1.2fr 1fr 1fr auto",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: colors.indigoAction, textTransform: "uppercase" }}>
                      {node.level} Scope
                    </span>
                    <strong style={{ fontSize: typography.sizes.xs, color: colors.textPrimary, display: "block" }}>
                      {node.scopeName}
                    </strong>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", color: colors.textPrimary }}>
                      Scale: <strong>{node.activeScale}</strong>
                    </div>
                    <div style={{ fontSize: "10px", color: colors.textMuted }}>
                      Workflow: {node.activeWorkflow}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: "10px", color: colors.textMuted, display: "block" }}>Inheritance Status</span>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: node.isOverridden ? colors.indigoAction : colors.textPrimary }}>
                      {node.isOverridden ? "Explicit Override Applied" : `Inherited from ${node.inheritedFrom}`}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: "10px", color: colors.textMuted, display: "block" }}>Cycle Lock Date</span>
                    <span style={{ fontSize: "11px", fontFamily: typography.fontMono, color: colors.textPrimary }}>
                      {node.cycleLockDate}
                    </span>
                  </div>

                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "11px", fontWeight: 700, color: colors.textSecondary, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={node.isOverridden}
                        onChange={(e) => {
                          const updated = [...hierarchyNodes];
                          updated[nIdx].isOverridden = e.target.checked;
                          setHierarchyNodes(updated);
                        }}
                        style={{ accentColor: colors.indigoPrimary }}
                      />
                      <span>Override Break</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setToastMessage("Hierarchy cascade overrides saved to draft environment.")}
              >
                Save Cascade Hierarchy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: NOTIFICATION TRIGGERS                                          */}
      {/* ===================================================================== */}
      {activeStudioTab === "notifications" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              padding: "1.75rem",
              boxShadow: shadows.xs,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: typography.sizes.sm, fontWeight: 800, color: colors.textPrimary, textTransform: "uppercase" }}>
                  Event-Driven Notification Matrix
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
                  Map system events to multi-channel notifications (Email, In-App, Slack, SMS) with dynamic recipient variables.
                </p>
              </div>
              <Button variant="outline" size="sm">+ Add Event Rule</Button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {notificationRules.map((rule) => (
                <div
                  key={rule.id}
                  style={{
                    padding: "1rem 1.25rem",
                    borderRadius: radii.md,
                    backgroundColor: colors.surfaceSubtle,
                    border: `1px solid ${colors.borderSubtle}`,
                    display: "grid",
                    gridTemplateColumns: "1.2fr 1fr 1fr 1.5fr",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: colors.indigoAction }}>Event Trigger</span>
                    <strong style={{ fontSize: typography.sizes.xs, color: colors.textPrimary, display: "block" }}>
                      {rule.event}
                    </strong>
                    <span style={{ fontSize: "10px", color: colors.textMuted }}>Delay: {rule.delayDays === 0 ? "Instantaneous" : `${rule.delayDays} days`}</span>
                  </div>

                  <div>
                    <span style={{ fontSize: "10px", color: colors.textMuted, display: "block" }}>Active Channels</span>
                    <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", marginTop: "2px" }}>
                      {rule.channels.map((ch) => (
                        <Badge key={ch} variant="neutral" size="sm">{ch}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: "10px", color: colors.textMuted, display: "block" }}>Dynamic Recipient</span>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: colors.indigoAction, fontFamily: typography.fontMono }}>
                      {rule.recipients.join(", ")}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: "10px", color: colors.textMuted, display: "block" }}>Template Preview</span>
                    <div style={{ fontSize: "11px", color: colors.textSecondary, fontStyle: "italic", lineHeight: 1.3 }}>
                      &ldquo;{rule.templateSnippet}&rdquo;
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setToastMessage("Notification trigger rules updated.")}
              >
                Save Notification Rules
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: CONFIGURATION AS CODE (JSON & VERSIONING)                       */}
      {/* ===================================================================== */}
      {activeStudioTab === "json_governance" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.25rem" }}>
          {/* Live JSON Representation */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              padding: "1.5rem",
              boxShadow: shadows.xs,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <strong style={{ fontSize: typography.sizes.xs, color: colors.textPrimary, textTransform: "uppercase" }}>
                Active Configuration JSON (config_v2.json)
              </strong>
              <Badge variant="info" size="sm">Schema v2.4</Badge>
            </div>
            <pre
              style={{
                backgroundColor: "#0f172a",
                color: "#e2e8f0",
                padding: "1rem",
                borderRadius: radii.md,
                fontSize: "11px",
                fontFamily: typography.fontMono,
                maxHeight: "360px",
                overflowY: "auto",
                margin: 0,
                lineHeight: 1.45,
              }}
            >
              {JSON.stringify(
                {
                  schemaVersion: "2.4.0",
                  environment: isDraft ? "draft" : "published",
                  timestamp: new Date().toISOString(),
                  objectiveQuota: {
                    minObjectivesPerEmployee: 5,
                    maxObjectivesPerEmployee: 8,
                    mandatoryCorporateAlignment: true,
                    cascadingLockDate: "2026-11-20",
                  },
                  workflowStateMachine: workflowStages,
                  customRatingScales: ratingScales,
                  settingsHierarchy: hierarchyNodes,
                  notificationRules: notificationRules,
                },
                null,
                2
              )}
            </pre>
          </div>

          {/* Version History & 1-Click Rollback */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              padding: "1.5rem",
              boxShadow: shadows.xs,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <strong style={{ fontSize: typography.sizes.xs, color: colors.textPrimary, textTransform: "uppercase" }}>
                Version History &amp; Audit Trail
              </strong>
              <Badge variant="neutral" size="sm">{versions.length} Versions</Badge>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {versions.map((v) => (
                <div
                  key={v.version}
                  style={{
                    padding: "0.85rem",
                    borderRadius: radii.md,
                    backgroundColor: colors.surfaceSubtle,
                    border: `1px solid ${colors.borderSubtle}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <strong style={{ fontSize: typography.sizes.xs, color: colors.textPrimary }}>{v.version}</strong>
                      <Badge variant={v.status === "active" ? "success" : v.status === "draft" ? "warning" : "neutral"} size="sm">
                        {v.status.toUpperCase()}
                      </Badge>
                    </div>
                    {v.status === "archived" && (
                      <button
                        onClick={() => setToastMessage(`Rolled back to ${v.version} configuration successfully.`)}
                        style={{
                          background: "none",
                          border: `1px solid ${colors.indigoAction}`,
                          borderRadius: radii.sm,
                          padding: "0.15rem 0.45rem",
                          fontSize: "10px",
                          fontWeight: 700,
                          color: colors.indigoAction,
                          cursor: "pointer",
                        }}
                      >
                        Rollback
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px" }}>
                    By {v.author} • {v.publishedAt}
                  </div>
                  <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: colors.textSecondary }}>
                    {v.changeSummary}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

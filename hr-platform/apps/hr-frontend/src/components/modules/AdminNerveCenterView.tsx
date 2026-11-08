"use client";

import React, { useState } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { drillProps } from "../../utils/drill";

export const AdminNerveCenterView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<"manager_digest" | "builder" | "change_hub" | "compliance" | "wallet">("manager_digest");

  // Manager Digest Pending Action Items State
  const [pendingApprovals, setPendingApprovals] = useState([
    { id: 1, type: "Objective Request", staff: "Clara Nukunu (SCG153)", role: "Customer Service Exec", action: "Review OKRs", urgency: "High", time: "2 hours ago" },
    { id: 2, type: "Leave Request", staff: "Adjoa Asare (GH/094)", role: "HR Analytics Specialist", action: "Annual Leave (3 days)", urgency: "Normal", time: "5 hours ago" },
    { id: 3, type: "Probation Review", staff: "Kwame Mensah (KSP/0220)", role: "Assembly Worker", action: "Probation Ends in 8 Days", urgency: "Action Due", time: "Today" },
    { id: 4, type: "1-on-1 Check-in", staff: "Philip Aryee (SEN-005)", role: "Senior Cloud Consultant", action: "Sprint Pulse Due", urgency: "Today 3:00 PM", time: "Scheduled" },
  ]);

  // IF/THEN Event Automation Rules (Workflow Engine)
  const [automationRules, setAutomationRules] = useState([
    {
      id: "RULE-001",
      name: "Promotion & Salary Adjustment Cascade",
      trigger: "IF Employee Status changes to 'PROMOTED'",
      condition: "AND Seniority Level >= Senior Consultant",
      action: "THEN Trigger Maker-Checker Salary Adjustment Workflow & Send Executive Congrats Email",
      active: true,
    },
    {
      id: "RULE-002",
      name: "Automatic Underperformance PIP Provisioning",
      trigger: "IF Cycle Appraisal Score < 2.5 / 5.0",
      condition: "AND Framework is 'Balanced Scorecard' OR 'OKR'",
      action: "THEN Auto-provision 8-Week Structured PIP & Alert People & Culture Business Partner",
      active: true,
    },
    {
      id: "RULE-003",
      name: "Statutory Leave Resumption Unfreeze",
      trigger: "IF Leave Resumption Request is APPROVED",
      condition: "AND Leave Type is 'Maternity' OR 'Study' OR 'Medical'",
      action: "THEN Restore Hardware Biometric Access & Update Payroll Status from Absent to Active",
      active: true,
    },
  ]);

  // Change Management Hub Pulse State
  const [changeFatigueScore, setChangeFatigueScore] = useState<number>(32); // 32% fatigue (healthy)
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  // Visual Workflow Builder Nodes
  const [workflowNodes, setWorkflowNodes] = useState([
    { id: 1, type: "TRIGGER", title: "Leave Request Submitted", desc: "Duration > 3 consecutive business days", active: true },
    { id: 2, type: "CONDITION", title: "Team Absence Overlap Check", desc: "Ensure >85% practice staffing remains active", active: true },
    { id: 3, type: "APPROVAL", title: "Direct Line Manager Sign-off", desc: "48-hour SLA before escalation", active: true },
    { id: 4, type: "ACTION", title: "Sync Biometric & Attendance Shift", desc: "Update hardware badge access for absent dates", active: true },
    { id: 5, type: "NOTIFY", title: "Send Slack Notification to Team", desc: "Notify practice channel of upcoming coverage", active: true },
  ]);

  // Compliance Alerts
  const [complianceAlerts] = useState([
    {
      id: "GH-2026-01",
      region: "Ghana (West Africa Hub)",
      law: "Ghana Labour Act (Act 651) Amendment",
      date: "Effective May 2026",
      summary: "Statutory paid maternity leave extended from 12 weeks to 14 weeks.",
      impact: "Maternity Leave Policy flagged for automatic revision.",
      severity: "warning",
      flagged: true,
    },
    {
      id: "UK-2026-02",
      region: "United Kingdom (London HQ)",
      law: "Statutory Sick Pay (SSP) Reform 2026",
      date: "Effective April 2026",
      summary: "Removal of the 3-day waiting period; day-one eligibility enforced.",
      impact: "All 45 UK consulting contracts compliant with day-one sick allowance.",
      severity: "success",
      flagged: false,
    },
  ]);

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
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
            Admin Nerve Center & Total Rewards
          </h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button
            variant={activeSection === "manager_digest" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveSection("manager_digest")}
          >
            Manager&apos;s Daily Digest ({pendingApprovals.length})
          </Button>
          <Button
            variant={activeSection === "builder" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveSection("builder")}
          >
            IF/THEN Automator (3)
          </Button>
          <Button
            variant={activeSection === "change_hub" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveSection("change_hub")}
          >
            Change Management Hub
          </Button>
          <Button
            variant={activeSection === "compliance" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveSection("compliance")}
          >
            Compliance Radar
          </Button>
          <Button
            variant={activeSection === "wallet" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveSection("wallet")}
          >
            Total Rewards Wallet
          </Button>
        </div>
      </div>

      {feedbackSuccess && (
        <div style={{ marginBottom: "1rem", padding: "0.5rem 1rem", borderRadius: radii.md, backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", fontSize: typography.sizes.xs, fontWeight: 600 }}>
          ✓ {feedbackSuccess}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 0: MANAGER'S DAILY DIGEST                                         */}
      {/* ========================================================================= */}
      {activeSection === "manager_digest" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Header Banner */}
          <div
            style={{
              padding: "1rem 1.25rem",
              borderRadius: radii.lg,
              backgroundColor: colors.indigoSubtle,
              border: `1px solid ${colors.indigoBorder}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icons.Briefcase size={18} color={colors.indigoAction} />
                <h2 style={{ fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary, margin: 0 }}>
                  The Manager&apos;s Daily Digest: Single Pane of Glass
                </h2>
              </div>
              <p style={{ fontSize: typography.sizes.xs, color: colors.indigoPrimary, margin: "0.25rem 0 0 0" }}>
                Aggregates all pending reviews, probation end alerts, and leave overlap risks into a zero-fatigue 1-click dashboard.
              </p>
            </div>
            <Badge variant="success" size="sm">Dede Smart Triage Active</Badge>
          </div>

          {/* 4 Summary Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
            {[
              { label: "Pending Approvals", count: 2, sub: "OKRs & Leave Requests", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
              { label: "Upcoming Probation Ends", count: 1, sub: "K. Mensah (8 days left)", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
              { label: "Team Overlap Alert", count: 0, sub: "Practice Staffing > 85%", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
              { label: "1-on-1 Pulse Scheduled", count: 1, sub: "Today at 3:00 PM", color: "#9333ea", bg: "#faf5ff", border: "#e9d5ff" },
            ].map((card, idx) => (
              <div key={idx} {...drillProps(() => document.getElementById("digest-pending-table")?.scrollIntoView({ behavior: "smooth", block: "start" }), `Show the pending tasks behind ${card.label}`)} style={{ padding: "1rem", borderRadius: radii.md, backgroundColor: card.bg, border: `1px solid ${card.border}`, cursor: "pointer" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: card.color, textTransform: "uppercase" }}>{card.label}</span>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: card.color, marginTop: "0.25rem" }}>{card.count}</div>
                <span style={{ fontSize: "11px", color: colors.textMuted }}>{card.sub}</span>
              </div>
            ))}
          </div>

          {/* Pending Tasks Interactive Table */}
          <div
            id="digest-pending-table"
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              padding: "1.25rem 1.5rem",
              boxShadow: shadows.xs,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                High-Priority Operational Actions Due Today
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPendingApprovals([]);
                  setFeedbackSuccess("All pending items reviewed and approved in 1-click via Dede batch triage.");
                  setTimeout(() => setFeedbackSuccess(null), 4000);
                }}
              >
                ✓ 1-Click Fast-Track All
              </Button>
            </div>

            {pendingApprovals.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: colors.textMuted, fontSize: typography.sizes.xs }}>
                🎉 You&apos;re completely caught up! Zero pending approvals or probation milestones.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {pendingApprovals.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      padding: "0.85rem 1rem",
                      borderRadius: radii.md,
                      backgroundColor: colors.surfaceSubtle,
                      border: `1px solid ${colors.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: colors.indigoAction }}>{task.type}</span>
                        <Badge variant={task.urgency === "High" ? "error" : "warning"} size="sm">{task.urgency}</Badge>
                        <span style={{ fontSize: "11px", color: colors.textMuted }}>{task.time}</span>
                      </div>
                      <div style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary }}>
                        {task.staff} — <span style={{ fontWeight: 500, color: colors.textSecondary }}>{task.role}</span>
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px" }}>
                        Action: <strong>{task.action}</strong>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setPendingApprovals((prev) => prev.filter((p) => p.id !== task.id));
                          setFeedbackSuccess(`Completed: ${task.type} for ${task.staff}`);
                          setTimeout(() => setFeedbackSuccess(null), 3000);
                        }}
                      >
                        Approve ✓
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION: CHANGE MANAGEMENT HUB & FATIGUE MONITOR                          */}
      {/* ========================================================================= */}
      {activeSection === "change_hub" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Header Banner */}
          <div
            style={{
              padding: "1rem 1.25rem",
              borderRadius: radii.lg,
              backgroundColor: colors.indigoSubtle,
              border: `1px solid ${colors.indigoBorder}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icons.Activity size={18} color={colors.indigoAction} />
                <h2 style={{ fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary, margin: 0 }}>
                  Change Management Hub &amp; Employee Fatigue Monitor
                </h2>
              </div>
              <p style={{ fontSize: typography.sizes.xs, color: colors.indigoPrimary, margin: "0.25rem 0 0 0" }}>
                Prevent workforce change exhaustion. Track organizational change fatigue via continuous pulse feedback and provide proactive change navigation playbooks.
              </p>
            </div>
            <Badge variant="success" size="sm">Fatigue Index: {changeFatigueScore}% (Healthy)</Badge>
          </div>

          {/* Change Fatigue Real-Time Gauge */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              padding: "1.5rem",
              boxShadow: shadows.xs,
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: "1.5rem",
            }}
          >
            <div>
              <h3 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, margin: "0 0 0.5rem 0" }}>
                Real-Time Organizational Fatigue Meter
              </h3>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textMuted, margin: "0 0 1rem 0" }}>
                Calculated from weekly 1-click micro-polls, shift changes, and recent operational restructure announcements.
              </p>

              {/* Progress Bar */}
              <div style={{ height: "12px", borderRadius: radii.full, backgroundColor: "#e2e8f0", overflow: "hidden", marginBottom: "0.75rem" }}>
                <div
                  style={{
                    width: `${changeFatigueScore}%`,
                    height: "100%",
                    backgroundColor: changeFatigueScore < 40 ? "#16a34a" : changeFatigueScore < 70 ? "#d97706" : "#dc2626",
                    transition: "background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease, opacity 0.3s ease",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 600 }}>
                <span style={{ color: "#16a34a" }}>🟢 0-40%: Resilient &amp; Adaptable</span>
                <span style={{ color: "#d97706" }}>🟡 41-70%: Cognitive Strain</span>
                <span style={{ color: "#dc2626" }}>🔴 71-100%: Change Exhaustion</span>
              </div>
            </div>

            {/* Quick Micro-Poll Trigger */}
            <div style={{ padding: "1rem", backgroundColor: colors.surfaceSubtle, borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: colors.indigoAction, textTransform: "uppercase" }}>
                Simulate Employee Change Pulse:
              </div>
              <p style={{ margin: "0.25rem 0 0.75rem 0", fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                &quot;How well does your team understand the new Q1 Pan-African Hybrid Work Directive?&quot;
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setChangeFatigueScore((prev) => Math.max(10, prev - 5));
                    setFeedbackSuccess("Pulse recorded: +1 Positive Adaptability response.");
                    setTimeout(() => setFeedbackSuccess(null), 3000);
                  }}
                >
                  👍 Clear &amp; Supported (-5% Fatigue)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setChangeFatigueScore((prev) => Math.min(95, prev + 8));
                    setFeedbackSuccess("Pulse recorded: +1 Workload Strain response.");
                    setTimeout(() => setFeedbackSuccess(null), 3000);
                  }}
                >
                  ⚡ Need Guidance (+8% Fatigue)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: Total Rewards Wallet (Apple Wallet standard) */}
      {activeSection === "wallet" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>
                Total Annual Compensation (Beyond Basic Payslips)
              </span>
              <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: colors.textPrimary, margin: "0.2rem 0" }}>
                GH₵450,000 <span style={{ fontSize: "13px", fontWeight: 400, color: colors.textMuted }}>Total Package Value (GHS)</span>
              </h2>
            </div>
            <Badge variant="success" size="sm">Executive Tier 1 Compensation</Badge>
          </div>

          {/* Apple Wallet Style Card Stack */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            {/* Card 1: Base Salary */}
            <div
              style={{
                backgroundColor: "#0f172a",
                color: "#ffffff",
                borderRadius: radii.lg,
                padding: "1.25rem",
                boxShadow: shadows.md,
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "150px",
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8" }}>Base Guaranteed</span>
                <Icons.Wallet size={16} color="#38bdf8" />
              </div>
              <div>
                <div style={{ fontSize: "1.625rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  GH₵300,000
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "0.2rem" }}>
                  Monthly Gross: GH₵25,000 • Paid 28th
                </div>
              </div>
              <span style={{ fontSize: "10px", color: "#38bdf8" }}>SENRAB SALARY TIER 1</span>
            </div>

            {/* Card 2: Performance Bonus */}
            <div
              style={{
                backgroundColor: "#1e1b4b",
                color: "#ffffff",
                borderRadius: radii.lg,
                padding: "1.25rem",
                boxShadow: shadows.md,
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "150px",
                background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#c7d2fe" }}>Target Bonus</span>
                <Icons.Target size={16} color="#818cf8" />
              </div>
              <div>
                <div style={{ fontSize: "1.625rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  GH₵60,000
                </div>
                <div style={{ fontSize: "11px", color: "#c7d2fe", marginTop: "0.2rem" }}>
                  20% On-Target • Paid against OKR score
                </div>
              </div>
              <span style={{ fontSize: "10px", color: "#818cf8" }}>ANNUAL PMS BONUS POOL</span>
            </div>

            {/* Card 3: Equity / Phantom Share */}
            <div
              style={{
                backgroundColor: "#064e3b",
                color: "#ffffff",
                borderRadius: radii.lg,
                padding: "1.25rem",
                boxShadow: shadows.md,
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "150px",
                background: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#a7f3d0" }}>Equity & Shares</span>
                <Icons.Sparkles size={16} color="#34d399" />
              </div>
              <div>
                <div style={{ fontSize: "1.625rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  GH₵65,000
                </div>
                <div style={{ fontSize: "11px", color: "#a7f3d0", marginTop: "0.2rem" }}>
                  50% Vested • 4-Year Schedule
                </div>
              </div>
              <span style={{ fontSize: "10px", color: "#34d399" }}>PARTNER PHANTOM POOL</span>
            </div>

            {/* Card 4: Health & Wellness */}
            <div
              style={{
                backgroundColor: "#18181b",
                color: "#ffffff",
                borderRadius: radii.lg,
                padding: "1.25rem",
                boxShadow: shadows.md,
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "150px",
                background: "linear-gradient(135deg, #18181b 0%, #27272a 100%)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#a1a1aa" }}>Health & Benefits</span>
                <Icons.LifeBuoy size={16} color="#fb7185" />
              </div>
              <div>
                <div style={{ fontSize: "1.625rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  GH₵15,000
                </div>
                <div style={{ fontSize: "11px", color: "#a1a1aa", marginTop: "0.2rem" }}>
                  Metropolitan Private Health + Dental
                </div>
              </div>
              <span style={{ fontSize: "10px", color: "#fb7185" }}>COMPREHENSIVE GHANA CARE</span>
            </div>

            {/* Card 5: Learning Stipend */}
            <div
              style={{
                backgroundColor: "#431407",
                color: "#ffffff",
                borderRadius: radii.lg,
                padding: "1.25rem",
                boxShadow: shadows.md,
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "150px",
                background: "linear-gradient(135deg, #431407 0%, #7c2d12 100%)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#fed7aa" }}>Learning Stipend</span>
                <Icons.BookOpen size={16} color="#fb923c" />
              </div>
              <div>
                <div style={{ fontSize: "1.625rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  GH₵10,000
                </div>
                <div style={{ fontSize: "11px", color: "#fed7aa", marginTop: "0.2rem" }}>
                  Annual Executive Training Budget
                </div>
              </div>
              <span style={{ fontSize: "10px", color: "#fb923c" }}>PROFESSIONAL CPD FUND</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Visual Workflow Builder & Zapier-like Event Automator */}
      {activeSection === "builder" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Top Banner: Event-Driven Automation Rules */}
          <div
            style={{
              padding: "1rem 1.25rem",
              borderRadius: radii.lg,
              backgroundColor: colors.indigoSubtle,
              border: `1px solid ${colors.indigoBorder}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icons.Zap size={18} color={colors.indigoAction} />
                <h2 style={{ fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary, margin: 0 }}>
                  Event Automation Engine (IF / THEN Life Event Rules)
                </h2>
              </div>
              <p style={{ fontSize: typography.sizes.xs, color: colors.indigoPrimary, margin: "0.25rem 0 0 0" }}>
                Create automated lifecycle triggers that listen for workforce events and execute multi-system business actions with zero manual IT involvement.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setFeedbackSuccess("New IF/THEN Life Event Automation Rule provisioned in Sandbox.");
                setTimeout(() => setFeedbackSuccess(null), 3000);
              }}
            >
              + Create IF/THEN Rule
            </Button>
          </div>

          {/* Active IF/THEN Automation Rule Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {automationRules.map((rule) => (
              <div
                key={rule.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  padding: "1.1rem 1.25rem",
                  boxShadow: shadows.xs,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ flex: 1, marginRight: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted }}>{rule.id}</span>
                    <strong style={{ fontSize: typography.sizes.sm, color: colors.textPrimary }}>{rule.name}</strong>
                    <Badge variant="success" size="sm">Active Rule</Badge>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.45rem", fontSize: typography.sizes.xs }}>
                    <span style={{ padding: "0.2rem 0.5rem", borderRadius: radii.sm, backgroundColor: "#eff6ff", color: "#1e40af", fontWeight: 700, border: "1px solid #bfdbfe" }}>
                      ⚡ {rule.trigger}
                    </span>
                    <span style={{ color: colors.textMuted, fontWeight: 700 }}>➔</span>
                    <span style={{ padding: "0.2rem 0.5rem", borderRadius: radii.sm, backgroundColor: "#fef3c7", color: "#92400e", fontWeight: 600, border: "1px solid #fde68a" }}>
                      🔍 {rule.condition}
                    </span>
                    <span style={{ color: colors.textMuted, fontWeight: 700 }}>➔</span>
                    <span style={{ padding: "0.2rem 0.5rem", borderRadius: radii.sm, backgroundColor: "#f0fdf4", color: "#166534", fontWeight: 700, border: "1px solid #bbf7d0" }}>
                      🚀 {rule.action}
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFeedbackSuccess(`Rule ${rule.id} tested successfully with mock employee event.`);
                    setTimeout(() => setFeedbackSuccess(null), 3000);
                  }}
                >
                  Test Rule ⚡
                </Button>
              </div>
            ))}
          </div>

          <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.textPrimary, margin: 0 }}>
                  Visual Approval Chain: Standard Leave &amp; Shift Workflow
                </h3>
                <p style={{ fontSize: typography.sizes.xs, color: colors.textMuted, margin: "0.2rem 0 0 0" }}>
                  Drag-and-drop or toggle multi-step approval automation across Line Managers and HR Directors without code.
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => alert("New approval node added to pipeline.")}>
                + Add Approval Node
              </Button>
            </div>

          {/* Node Flow Chain */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "800px" }}>
            {workflowNodes.map((node, idx) => (
              <div
                key={node.id}
                style={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.md,
                  padding: "1rem 1.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: colors.brandBlueSubtle,
                      color: colors.brandBlue,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "12px",
                    }}
                  >
                    0{idx + 1}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontWeight: typography.weights.semibold, color: colors.textPrimary, fontSize: typography.sizes.sm }}>
                        {node.title}
                      </span>
                      <Badge variant="neutral" size="sm">{node.type}</Badge>
                    </div>
                    <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: "0.15rem" }}>
                      {node.desc}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Badge variant="success" size="sm" dot>Active</Badge>
                  <Button variant="ghost" size="sm" onClick={() => alert(`Configuring node: ${node.title}`)}>
                    Configure
                  </Button>
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      )}

      {/* SECTION 3: Global Compliance Radar */}
      {activeSection === "compliance" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.textPrimary, margin: 0 }}>
                Global Labor Law & Compliance Radar
              </h3>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textMuted, margin: "0.2rem 0 0 0" }}>
                Real-time regulatory tracking across all active operating jurisdictions (UK London HQ & Ghana West Africa Hub).
              </p>
            </div>
            <Badge variant="warning" size="sm">1 Policy Action Required</Badge>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {complianceAlerts.map((a) => (
              <div
                key={a.id}
                style={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${a.flagged ? "#fde68a" : colors.border}`,
                  borderRadius: radii.md,
                  padding: "1.25rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontWeight: typography.weights.bold, color: colors.textPrimary, fontSize: typography.sizes.sm }}>
                        {a.law}
                      </span>
                      <Badge variant={a.flagged ? "warning" : "success"} size="sm">
                        {a.region}
                      </Badge>
                    </div>
                    <span style={{ fontSize: "11px", color: colors.textMuted }}>
                      Directive ID: {a.id} • {a.date}
                    </span>
                  </div>
                  {a.flagged ? (
                    <Button variant="primary" size="sm" onClick={() => alert("Auto-updating Maternity Leave Policy to 14 weeks statutory maternity leave.")}>
                      Update Policy Automatically
                    </Button>
                  ) : (
                    <Badge variant="success" size="sm" dot>Compliant</Badge>
                  )}
                </div>

                <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0.5rem 0", lineHeight: 1.5 }}>
                  {a.summary}
                </p>
                <div style={{ fontSize: "11px", color: a.flagged ? "#b45309" : "#15803d", fontWeight: 500 }}>
                  Impact: {a.impact}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


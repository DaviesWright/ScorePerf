"use client";

import React, { useState } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { formatDate } from "../../utils/date";

export interface MyObjective {
  id: number;
  title: string;
  framework: "BSC" | "OKR";
  perspective: "Financial" | "Customer" | "Internal Process" | "Learning & Growth";
  weight: number;
  target: string;
  progress: number;
  status: "Draft" | "Approved" | "In Review";
}

export interface AlignedTask {
  id: number;
  title: string;
  alignedObjective: string;
  dueDate: string;
  completed: boolean;
  priority: "High" | "Medium" | "Low";
}

export interface HistoricalAppraisal {
  id: number;
  cycleTitle: string;
  period: string;
  framework: "BSC" | "OKR" | "MBO";
  selfRating: number;
  selfComments: string;
  supervisorRating: number;
  supervisorComments: string;
  calibratedScore: number;
  completedDate: string;
}

interface MyPerformanceScreenProps {
  user?: { id: string; persona: string; name?: string };
  realSession?: boolean;
}

export const MyPerformanceScreen: React.FC<MyPerformanceScreenProps> = () => {
  const [activeTab, setActiveTab] = useState<"self_review" | "objectives" | "aligned_tasks" | "history">("self_review");

  // Active Cycle State
  const activeCycle = {
    title: "2026 Q2 Performance Appraisal (West Africa Hub)",
    framework: "BSC",
    startDate: "2026-04-01",
    endDate: "2026-06-30",
    supervisor: "Sarah Jenkins (Managing Director)",
  };

  // Self-Appraisal Form State (Mandatory Comments!)
  const [selfRating, setSelfRating] = useState<number>(4.5);
  const [selfComments, setSelfComments] = useState<string>(
    "Delivered all 4 core infrastructure milestones for our Pan-African deployment with zero clinical/operational disruption. Maintained 99.98% platform reliability and reduced onboarding latency by 45%."
  );
  const [keyAchievements, setKeyAchievements] = useState<string>(
    "1. Completed sub-15ms edge latency architecture.\n2. Closed all high-priority audit items for ISO-27001.\n3. Mentored 3 junior systems engineers across Accra and London."
  );
  const [selfSubmitted, setSelfSubmitted] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Objectives State
  const [objectives, setObjectives] = useState<MyObjective[]>([
    {
      id: 1,
      title: "Deliver SaaS edge data architecture with sub-15ms p99 latency",
      framework: "BSC",
      perspective: "Internal Process",
      weight: 35,
      target: "Production benchmark sign-off across UK & Accra",
      progress: 95,
      status: "Approved",
    },
    {
      id: 2,
      title: "Zero critical security incidents and complete ISO-27001 review",
      framework: "BSC",
      perspective: "Customer",
      weight: 25,
      target: "100% compliance audit clearance",
      progress: 100,
      status: "Approved",
    },
    {
      id: 3,
      title: "Coach and upskill 3 engineering associates on distributed architecture",
      framework: "BSC",
      perspective: "Learning & Growth",
      weight: 20,
      target: "Bi-weekly 1-on-1 development sessions",
      progress: 80,
      status: "Approved",
    },
    {
      id: 4,
      title: "Achieve 98% on-time milestone delivery for Pan-African clients",
      framework: "BSC",
      perspective: "Financial",
      weight: 20,
      target: "Target delivery SLA compliance",
      progress: 88,
      status: "Approved",
    },
  ]);

  // Aligned Tasks State
  const [tasks, setTasks] = useState<AlignedTask[]>([
    {
      id: 1,
      title: "Deploy Cloudflare Worker orchestration with distributed KV cache",
      alignedObjective: "Deliver SaaS edge data architecture",
      dueDate: "2026-06-10",
      completed: true,
      priority: "High",
    },
    {
      id: 2,
      title: "Complete ISO-27001 evidence pack for People & Tech Governance",
      alignedObjective: "Zero critical security incidents and complete ISO-27001 review",
      dueDate: "2026-06-15",
      completed: true,
      priority: "High",
    },
    {
      id: 3,
      title: "Host sprint retrospective and knowledge-transfer workshop for Accra Hub",
      alignedObjective: "Coach and upskill 3 engineering associates",
      dueDate: "2026-06-25",
      completed: false,
      priority: "Medium",
    },
  ]);

  // Historical Appraisals State
  const history: HistoricalAppraisal[] = [
    {
      id: 201,
      cycleTitle: "2025 Q4 Annual Performance Appraisal",
      period: "2025-10-01 → 2025-12-31",
      framework: "BSC",
      selfRating: 4.6,
      selfComments: "Exceeded annual target in multi-region infrastructure delivery.",
      supervisorRating: 4.8,
      supervisorComments: "Outstanding delivery. Kwame has demonstrated exemplary leadership across the Pan-African hub.",
      calibratedScore: 94,
      completedDate: "2026-01-15",
    },
    {
      id: 202,
      cycleTitle: "2025 Q2 Mid-Year Review",
      period: "2025-04-01 → 2025-06-30",
      framework: "OKR",
      selfRating: 4.2,
      selfComments: "Achieved 100% on cloud architecture key results; slight delay on hiring sprint.",
      supervisorRating: 4.4,
      supervisorComments: "Consistently strong analytical outputs and great collaboration with regional teams.",
      calibratedScore: 88,
      completedDate: "2025-07-12",
    },
    {
      id: 203,
      cycleTitle: "2024 Annual Talent & Performance Cycle",
      period: "2024-01-01 → 2024-12-31",
      framework: "MBO",
      selfRating: 4.4,
      selfComments: "Completed all target objectives on time and under budget.",
      supervisorRating: 4.5,
      supervisorComments: "Dependable performer, strongly recommended for senior leadership track.",
      calibratedScore: 90,
      completedDate: "2025-01-18",
    },
  ];

  // Propose New Objective Modal
  const [showAddObjModal, setShowAddObjModal] = useState(false);
  const [newObjTitle, setNewObjTitle] = useState("");
  const [newObjPerspective, setNewObjPerspective] = useState<MyObjective["perspective"]>("Internal Process");
  const [newObjWeight, setNewObjWeight] = useState<number>(20);
  const [newObjTarget, setNewObjTarget] = useState("");

  const handleSelfAppraisalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selfComments.trim()) {
      alert("Self-Appraisal comments are MANDATORY before submitting your appraisal.");
      return;
    }
    setSelfSubmitted(true);
    setStatusMessage("Self-Appraisal submitted successfully. Your comments are now visible to your supervisor for review.");
    setTimeout(() => setStatusMessage(null), 6000);
  };

  const handleAddObjective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjTitle.trim()) return;

    const newObj: MyObjective = {
      id: Date.now(),
      title: newObjTitle,
      framework: "BSC",
      perspective: newObjPerspective,
      weight: newObjWeight,
      target: newObjTarget || "Defined KPI target",
      progress: 0,
      status: "Draft",
    };

    setObjectives([...objectives, newObj]);
    setShowAddObjModal(false);
    setNewObjTitle("");
    setNewObjTarget("");
    setStatusMessage("New objective proposed. Awaiting Line Manager approval.");
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const toggleTask = (taskId: number) => {
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)));
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1140px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header Banner */}
      <div
        style={{
          padding: "1.25rem 1.5rem",
          borderRadius: radii.lg,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.xs,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Icons.Target size={20} color={colors.indigoAction} />
            <h1 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
              My Performance
            </h1>
            <Badge variant="bsc" size="sm">Active: {activeCycle.framework}</Badge>
          </div>
          <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.35rem 0 0 0" }}>
            Your dedicated space for setting objectives, completing self-appraisals with mandatory comments, and tracking review history.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button variant="outline" size="sm" onClick={() => setShowAddObjModal(true)}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Icons.Plus size={14} />
              <span>Propose Objective</span>
            </span>
          </Button>
          <Button variant="primary" size="sm" onClick={() => setActiveTab("self_review")}>
            <span>Active Appraisal Cycle</span>
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: radii.md, backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", fontSize: typography.sizes.xs, fontWeight: 600 }}>
          ✓ {statusMessage}
        </div>
      )}

      {/* Tab Navigation Menu */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: `1px solid ${colors.borderSubtle}`, paddingBottom: "0.5rem" }}>
        {[
          { key: "self_review", label: "Take Appraisal (Self-Review)", icon: Icons.FileText },
          { key: "objectives", label: `My Objectives (${objectives.length})`, icon: Icons.Target },
          { key: "aligned_tasks", label: `Aligned Tasks (${tasks.length})`, icon: Icons.FileCheck },
          { key: "history", label: `Appraisal History (${history.length})`, icon: Icons.Clock },
        ].map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <tab.icon size={14} />
              <span>{tab.label}</span>
            </span>
          </Button>
        ))}
      </div>

      {/* TAB 1: TAKE APPRAISAL (SELF-REVIEW WITH MANDATORY COMMENTS) */}
      {activeTab === "self_review" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Active Cycle Context Box */}
          <div
            style={{
              padding: "1rem 1.25rem",
              borderRadius: radii.md,
              backgroundColor: colors.indigoSubtle,
              border: `1px solid ${colors.indigoBorder}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: colors.indigoAction, textTransform: "uppercase" }}>
                Active Appraisal Cycle
              </div>
              <div style={{ fontSize: typography.sizes.base, fontWeight: 800, color: colors.indigoPrimary, marginTop: "0.2rem" }}>
                {activeCycle.title}
              </div>
              <div style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: "0.25rem" }}>
                Period: {formatDate(activeCycle.startDate)} &rarr; {formatDate(activeCycle.endDate)} • Reviewer: <strong>{activeCycle.supervisor}</strong>
              </div>
            </div>
            <div>
              <Badge variant={selfSubmitted ? "success" : "warning"} size="md">
                {selfSubmitted ? "Self-Appraisal Submitted ✓ (Visible to Supervisor)" : "Self-Appraisal Pending"}
              </Badge>
            </div>
          </div>

          {/* Self-Review Form */}
          <div style={{ backgroundColor: colors.surface, borderRadius: radii.lg, border: `1px solid ${colors.border}`, padding: "1.5rem", boxShadow: shadows.xs }}>
            <h2 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, margin: "0 0 1rem 0" }}>
              Employee Self-Assessment Form
            </h2>

            <form onSubmit={handleSelfAppraisalSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary, marginBottom: "0.4rem" }}>
                  Overall Self-Rating: <span style={{ color: colors.indigoAction, fontSize: typography.sizes.base }}>{selfRating} / 5.0</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.1"
                  value={selfRating}
                  onChange={(e) => setSelfRating(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: colors.indigoAction }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: colors.textMuted, marginTop: "0.2rem" }}>
                  <span>1.0 (Needs Improvement)</span>
                  <span>3.0 (Meets Expectations)</span>
                  <span>5.0 (Role Model / Exceeded)</span>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary, marginBottom: "0.3rem" }}>
                  Employee Self-Appraisal Comments * (MANDATORY)
                </label>
                <p style={{ fontSize: "11px", color: colors.textMuted, margin: "0 0 0.4rem 0" }}>
                  Per ScoreviewHR governance, your detailed comments are required. They will be reviewed directly by your supervisor ({activeCycle.supervisor}), who must also comment before scoring your evaluation.
                </p>
                <textarea
                  rows={4}
                  value={selfComments}
                  onChange={(e) => setSelfComments(e.target.value)}
                  placeholder="Elaborate on your deliverables, challenges overcome, and overall performance contribution (mandatory)..."
                  style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary, marginBottom: "0.3rem" }}>
                  Key Achievements &amp; Milestones (Optional Reference)
                </label>
                <textarea
                  rows={3}
                  value={keyAchievements}
                  onChange={(e) => setKeyAchievements(e.target.value)}
                  placeholder="Bullet points of verified milestones..."
                  style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${colors.borderSubtle}`, paddingTop: "1rem" }}>
                <span style={{ fontSize: "11px", color: colors.textMuted }}>
                  🔒 Locked to single {activeCycle.framework} framework for FY2026.
                </span>
                <Button variant="primary" size="sm" type="submit">
                  {selfSubmitted ? "Update & Re-Submit Self-Appraisal" : "Submit Self-Appraisal to Supervisor"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: MY OBJECTIVES */}
      {activeTab === "objectives" && (
        <div style={{ backgroundColor: colors.surface, borderRadius: radii.lg, border: `1px solid ${colors.border}`, overflow: "hidden", boxShadow: shadows.xs }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${colors.borderSubtle}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
              Current Cycle Objectives ({activeCycle.title})
            </h2>
            <Button variant="outline" size="sm" onClick={() => setShowAddObjModal(true)}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Plus size={14} />
                <span>Propose Objective</span>
              </span>
            </Button>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
            <thead>
              <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>OBJECTIVE TITLE</th>
                <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>PERSPECTIVE</th>
                <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>WEIGHT</th>
                <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>TARGET</th>
                <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>STATUS</th>
                <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>PROGRESS</th>
              </tr>
            </thead>
            <tbody>
              {objectives.map((obj) => (
                <tr key={obj.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                  <td style={{ padding: "0.85rem 1rem" }}>
                    <div style={{ fontWeight: 700, color: colors.textPrimary }}>{obj.title}</div>
                  </td>
                  <td style={{ padding: "0.85rem 1rem" }}>
                    <Badge variant="neutral" size="sm">{obj.perspective}</Badge>
                  </td>
                  <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: colors.indigoPrimary }}>
                    {obj.weight}%
                  </td>
                  <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>
                    {obj.target}
                  </td>
                  <td style={{ padding: "0.85rem 1rem" }}>
                    <Badge variant={obj.status === "Approved" ? "success" : "neutral"} size="sm">
                      {obj.status}
                    </Badge>
                  </td>
                  <td style={{ padding: "0.85rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={obj.progress}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setObjectives(objectives.map((o) => (o.id === obj.id ? { ...o, progress: val } : o)));
                        }}
                        style={{ width: "90px", accentColor: colors.indigoAction }}
                      />
                      <span style={{ fontWeight: 700, minWidth: "35px" }}>{obj.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: ALIGNED TASKS & KEY RESULTS */}
      {activeTab === "aligned_tasks" && (
        <div style={{ backgroundColor: colors.surface, borderRadius: radii.lg, border: `1px solid ${colors.border}`, padding: "1.25rem", boxShadow: shadows.xs }}>
          <div style={{ marginBottom: "1rem" }}>
            <h2 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
              Tasks Attached to Active Appraisal Objectives
            </h2>
            <p style={{ fontSize: "11px", color: colors.textMuted, margin: "0.2rem 0 0 0" }}>
              Tactical execution items directly aligned to your scored cycle deliverables.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {tasks.map((t) => (
              <div
                key={t.id}
                style={{
                  padding: "0.85rem 1rem",
                  borderRadius: radii.md,
                  backgroundColor: t.completed ? "#f0fdf4" : colors.surfaceSubtle,
                  border: `1px solid ${t.completed ? "#bbf7d0" : colors.border}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <input
                    type="checkbox"
                    checked={t.completed}
                    onChange={() => toggleTask(t.id)}
                    style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: colors.emeraldDark }}
                  />
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: typography.sizes.xs,
                        color: colors.textPrimary,
                        textDecoration: t.completed ? "line-through" : "none",
                      }}
                    >
                      {t.title}
                    </div>
                    <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "0.15rem" }}>
                      Aligned To: <em>{t.alignedObjective}</em> • Due: {formatDate(t.dueDate)}
                    </div>
                  </div>
                </div>

                <Badge variant={t.completed ? "success" : t.priority === "High" ? "warning" : "neutral"} size="sm">
                  {t.completed ? "Completed ✓" : `Priority: ${t.priority}`}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: APPRAISAL HISTORY & PAST RATINGS */}
      {activeTab === "history" && (
        <div style={{ backgroundColor: colors.surface, borderRadius: radii.lg, border: `1px solid ${colors.border}`, overflow: "hidden", boxShadow: shadows.xs }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${colors.borderSubtle}` }}>
            <h2 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
              Past Performance Appraisals &amp; Review Archive
            </h2>
            <p style={{ fontSize: "11px", color: colors.textMuted, margin: "0.2rem 0 0 0" }}>
              Historical appraisals, calibrated final scores, and supervisor comments across completed cycles.
            </p>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
            <thead>
              <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>CYCLE &amp; PERIOD</th>
                <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>FRAMEWORK</th>
                <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>SELF RATING</th>
                <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>SUPERVISOR COMMENTS</th>
                <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>CALIBRATED SCORE</th>
                <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                  <td style={{ padding: "0.85rem 1rem" }}>
                    <div style={{ fontWeight: 700, color: colors.textPrimary }}>{h.cycleTitle}</div>
                    <div style={{ fontSize: "11px", color: colors.textMuted }}>{h.period}</div>
                  </td>
                  <td style={{ padding: "0.85rem 1rem" }}>
                    <Badge variant="bsc" size="sm">{h.framework}</Badge>
                  </td>
                  <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: colors.brandBlue }}>
                    {h.selfRating} / 5.0
                  </td>
                  <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary, fontStyle: "italic", maxWidth: "260px" }}>
                    &ldquo;{h.supervisorComments}&rdquo;
                  </td>
                  <td style={{ padding: "0.85rem 1rem" }}>
                    <div style={{ fontSize: typography.sizes.sm, fontWeight: 800, color: colors.emeraldDark }}>
                      {h.calibratedScore} / 100
                    </div>
                  </td>
                  <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                    <Button variant="outline" size="sm" onClick={() => alert(`Downloading signed appraisal PDF for ${h.cycleTitle}...`)}>
                      Download PDF
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Propose Objective Modal */}
      {showAddObjModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
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
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              maxWidth: "500px",
              width: "100%",
              boxShadow: shadows.lg,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: `1px solid ${colors.borderSubtle}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: colors.surfaceSubtle,
              }}
            >
              <h3 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.indigoPrimary, margin: 0 }}>
                Propose New Objective
              </h3>
              <button
                type="button"
                onClick={() => setShowAddObjModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: colors.textMuted }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddObjective} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Objective Title
                </label>
                <input
                  type="text"
                  value={newObjTitle}
                  onChange={(e) => setNewObjTitle(e.target.value)}
                  placeholder="e.g. Lead pan-African architecture resilience test"
                  style={{ width: "100%", padding: "0.55rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                    Perspective
                  </label>
                  <select
                    value={newObjPerspective}
                    onChange={(e) => setNewObjPerspective(e.target.value as MyObjective["perspective"])}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                  >
                    <option value="Financial">Financial</option>
                    <option value="Customer">Customer</option>
                    <option value="Internal Process">Internal Process</option>
                    <option value="Learning & Growth">Learning & Growth</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                    Weight (%)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={newObjWeight}
                    onChange={(e) => setNewObjWeight(parseInt(e.target.value))}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Target &amp; Success Metric
                </label>
                <input
                  type="text"
                  value={newObjTarget}
                  onChange={(e) => setNewObjTarget(e.target.value)}
                  placeholder="e.g. 100% test completion with zero latency regression"
                  style={{ width: "100%", padding: "0.55rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <Button variant="outline" size="sm" type="button" onClick={() => setShowAddObjModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Submit for Approval
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

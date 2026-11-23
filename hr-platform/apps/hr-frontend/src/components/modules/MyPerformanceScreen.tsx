"use client";

import React, { useEffect, useState } from "react";
import { useViewState } from "../../lib/useViewState";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { formatDate } from "../../utils/date";
import { downloadAppraisalReport } from "../../utils/pdfGenerator";
import {
  SKILL_CATEGORIES,
  SKILLS_TAXONOMY,
  INITIAL_MY_SKILL_ASSESSMENTS,
  ROLE_SKILL_PROFILES,
  ALIGNED_GIGS,
  getProficiencyLabel,
  ProficiencyLevelNumber,
  EmployeeSkillAssessmentRecord,
} from "../../data/skillsFramework";
import { SkillBadge, SkillRating, GapBar } from "../../design-system/SkillsComponents";

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

export interface AssignedReviewTask {
  id: string;
  revieweeName: string;
  revieweeTitle: string;
  revieweeDepartment: string;
  type: "Peer Review" | "Upward Review";
  cycleTitle: string;
  dueDate: string;
  status: "Pending" | "Submitted";
  submittedDate?: string;
  ratings: Record<string, number>;
  comments: Record<string, string>;
}

interface MyPerformanceScreenProps {
  user?: { id: string; persona: string; name?: string };
  realSession?: boolean;
}

export const MyPerformanceScreen: React.FC<MyPerformanceScreenProps> = ({ realSession = false }) => {
  const [activeTab, setActiveTab] = useViewState<
    "self_review" | "my_skills" | "objectives" | "my_cascade" | "assigned_reviews" | "aligned_tasks" | "history"
  >("MyPerformanceScreen:activeTab", "self_review");

  // ESS My Skills & Gap Analysis State (§4, §5, §10)
  const [skillAssessments, setSkillAssessments] = useState<EmployeeSkillAssessmentRecord[]>(
    INITIAL_MY_SKILL_ASSESSMENTS
  );
  const [essGapBaseline, setEssGapBaseline] = useState<
    "my_role" | "target_role" | "previous_cycle" | "gig_requirements"
  >("my_role");
  const [essSelectedGigId, setEssSelectedGigId] = useState<string>(ALIGNED_GIGS[1].id);

  // Cycle Phase Lifecycle: controlled by HR Admin / HR Director via localStorage ('scoreview_appraisal_period_open')
  const [isAppraisalPeriodOpen, setIsAppraisalPeriodOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("scoreview_appraisal_period_open") === "true";
    } catch {
      return false;
    }
  });
  const [cyclePhase, setCyclePhase] = useState<"Open" | "In Review" | "Calibration" | "Closed">(
    isAppraisalPeriodOpen ? "In Review" : "Closed",
  );

  useEffect(() => {
    const syncPeriod = () => {
      try {
        const open = localStorage.getItem("scoreview_appraisal_period_open") === "true";
        setIsAppraisalPeriodOpen(open);
        setCyclePhase(open ? "In Review" : "Closed");
      } catch { }
    };
    window.addEventListener("scoreview:appraisal-period-changed", syncPeriod);
    window.addEventListener("storage", syncPeriod);
    return () => {
      window.removeEventListener("scoreview:appraisal-period-changed", syncPeriod);
      window.removeEventListener("storage", syncPeriod);
    };
  }, []);

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
  const [liveGoalsSynced, setLiveGoalsSynced] = useState<boolean>(false);

  useEffect(() => {
    if (!realSession) return;
    let cancelled = false;
    fetch("/api/hr/performance/goals?mine=1", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { results?: Array<Record<string, unknown>> } | null) => {
        if (cancelled || !data?.results) return;
        setLiveGoalsSynced(true);
        if (data.results.length > 0) {
          setObjectives(
            data.results.map((g, idx) => ({
              id: idx + 1,
              title: String(g.title ?? "Untitled Goal"),
              framework: (g.framework === "OKR" ? "OKR" : "BSC") as "BSC" | "OKR",
              perspective: (g.perspective_code === "FINANCIAL"
                ? "Financial"
                : g.perspective_code === "CUSTOMER"
                ? "Customer"
                : g.perspective_code === "LEARNING_GROWTH"
                ? "Learning & Growth"
                : "Internal Process") as MyObjective["perspective"],
              weight: Number(g.weight_pct ?? 25),
              target: String(g.description ?? "Cycle target"),
              progress: Number(g.progress_pct ?? 0),
              status:
                g.status === "ACTIVE" || g.status === "COMPLETED"
                  ? "Approved"
                  : g.status === "PENDING_APPROVAL"
                  ? "In Review"
                  : "Draft",
            })),
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [realSession]);

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

  // Assigned Peer & Upward Reviews (FR-PERF-017, FR-PERF-027)
  const [assignedReviews, setAssignedReviews] = useState<AssignedReviewTask[]>([
    {
      id: "REV-PEER-101",
      revieweeName: "Abena Osei",
      revieweeTitle: "Senior Mobile Engineer",
      revieweeDepartment: "FinTech Engineering Squad",
      type: "Peer Review",
      cycleTitle: "2026 Q2 Performance Appraisal",
      dueDate: "2026-06-25",
      status: "Pending",
      ratings: { collaboration: 4.5, technicalRigor: 4.8 },
      comments: { feedback: "" },
    },
    {
      id: "REV-UPWARD-202",
      revieweeName: "Sarah Jenkins",
      revieweeTitle: "Engineering Director",
      revieweeDepartment: "Technology Advisory & Cloud Solutions",
      type: "Upward Review",
      cycleTitle: "2026 Q2 Performance Appraisal",
      dueDate: "2026-06-20",
      status: "Submitted",
      submittedDate: "2026-06-14",
      ratings: { leadershipClarity: 5.0, psychologicalSafety: 4.9 },
      comments: { feedback: "Sarah provides exceptional strategic clarity and removes operational blockers quickly." },
    },
  ]);

  // Selected Peer Review in Edit Modal/Drawer
  const [activeReviewTask, setActiveReviewTask] = useState<AssignedReviewTask | null>(null);
  const [peerCollabRating, setPeerCollabRating] = useState<number>(4.5);
  const [peerTechRating, setPeerTechRating] = useState<number>(4.8);
  const [peerFeedbackText, setPeerFeedbackText] = useState<string>("");

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
    if (!isAppraisalPeriodOpen) {
      alert("Self-appraisal is locked (view-only) until HR Admin / HR Director opens the appraisal period.");
      return;
    }
    if (!selfComments.trim()) {
      alert("Self-Appraisal comments are MANDATORY before submitting your appraisal.");
      return;
    }
    setSelfSubmitted(true);
    try {
      localStorage.setItem(
        "scoreview_my_appraisal_state",
        JSON.stringify({ selfRating, selfComments, keyAchievements, selfSubmitted: true, objectives }),
      );
    } catch { }
    setStatusMessage("Self-Appraisal submitted and saved. Your comments are now visible to your supervisor for review.");
    setTimeout(() => setStatusMessage(null), 6000);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("scoreview_my_appraisal_state");
      if (saved) {
        const p = JSON.parse(saved) as {
          selfRating?: number;
          selfComments?: string;
          keyAchievements?: string;
          selfSubmitted?: boolean;
          objectives?: MyObjective[];
        };
        if (typeof p.selfRating === "number") setSelfRating(p.selfRating);
        if (typeof p.selfComments === "string") setSelfComments(p.selfComments);
        if (typeof p.keyAchievements === "string") setKeyAchievements(p.keyAchievements);
        if (typeof p.selfSubmitted === "boolean") setSelfSubmitted(p.selfSubmitted);
        if (Array.isArray(p.objectives) && p.objectives.length > 0) setObjectives(p.objectives);
      }
    } catch { }
  }, []);

  const handleAddObjective = (e: React.FormEvent) => {
    e.preventDefault();
    if (cyclePhase === "In Review" || cyclePhase === "Calibration" || cyclePhase === "Closed") {
      alert(`Objectives are locked because appraisal cycle is in '${cyclePhase}' phase. Edits are restricted.`);
      return;
    }
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

  const submitPeerReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReviewTask) return;
    if (!peerFeedbackText.trim()) {
      alert("Written feedback comments are mandatory for peer evaluation.");
      return;
    }

    setAssignedReviews(
      assignedReviews.map((r) =>
        r.id === activeReviewTask.id
          ? {
            ...r,
            status: "Submitted",
            submittedDate: new Date().toISOString().split("T")[0],
            ratings: { collaboration: peerCollabRating, technicalRigor: peerTechRating },
            comments: { feedback: peerFeedbackText },
          }
          : r
      )
    );

    setActiveReviewTask(null);
    setPeerFeedbackText("");
    setStatusMessage(`Peer review for ${activeReviewTask.revieweeName} submitted successfully and securely recorded.`);
    setTimeout(() => setStatusMessage(null), 5000);
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
            <Badge variant="bsc" size="sm">Framework: {activeCycle.framework}</Badge>
            <Badge variant={cyclePhase === "Open" ? "neutral" : cyclePhase === "In Review" ? "warning" : "success"} size="sm">
              Phase: {cyclePhase}
            </Badge>
          </div>
          <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.35rem 0 0 0" }}>
            Your dedicated workspace for setting objectives, completing self-assessments with mandatory comments, and tracking review history.
          </p>
        </div>

        {/* Phase Simulation Selector & Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "11px", color: colors.textMuted }}>
            <span>Cycle Phase:</span>
            <select
              value={cyclePhase}
              onChange={(e) => setCyclePhase(e.target.value as typeof cyclePhase)}
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "0.25rem 0.5rem",
                borderRadius: radii.sm,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.surfaceSubtle,
                color: colors.textPrimary,
                cursor: "pointer",
              }}
            >
              <option value="Open">Open (Goal Creation Active)</option>
              <option value="In Review">In Review (Goals Locked)</option>
              <option value="Calibration">Calibration (Scoring Locked)</option>
              <option value="Closed">Closed (Archived)</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={!isAppraisalPeriodOpen}
            onClick={() => {
              if (!isAppraisalPeriodOpen) return;
              setShowAddObjModal(true);
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              {!isAppraisalPeriodOpen ? <Icons.Lock size={13} color="#94a3b8" /> : <Icons.Plus size={14} />}
              <span>{!isAppraisalPeriodOpen ? "Objectives View-Only (Closed)" : "Propose Objective"}</span>
            </span>
          </Button>
          <Button variant="primary" size="sm" onClick={() => setActiveTab("self_review")}>
            <span>Active Appraisal</span>
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: radii.md, backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", fontSize: typography.sizes.xs, fontWeight: 600 }}>
          ✓ {statusMessage}
        </div>
      )}

      {/* Tab Navigation Menu */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: `1px solid ${colors.borderSubtle}`, paddingBottom: "0.5rem", overflowX: "auto" }}>
        {[
          { key: "self_review", label: "Take Appraisal (Self-Review)", icon: Icons.FileText },
          { key: "my_skills", label: "My Skills (20)", icon: Icons.Award },
          { key: "objectives", label: `My Objectives (${objectives.length})`, icon: Icons.Target },
          { key: "my_cascade", label: "My Cascade (Alignment)", icon: Icons.GitBranch },
          { key: "assigned_reviews", label: `Assigned Reviews (${assignedReviews.length})`, icon: Icons.Users },
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
                Active Appraisal Cycle • Phase: {cyclePhase}
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
            {!isAppraisalPeriodOpen && (
              <div
                role="status"
                style={{
                  marginBottom: "1rem",
                  padding: "0.75rem 1rem",
                  borderRadius: radii.md,
                  backgroundColor: "#fffbeb",
                  border: "1px solid #fde68a",
                  color: "#92400e",
                  fontSize: typography.sizes.xs,
                  fontWeight: 600,
                }}
              >
                Appraisal period is currently closed by HR (View-Only Mode). Self-appraisal and objective edits remain locked until the HR Director / HR Admin opens the appraisal window.
              </div>
            )}
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
                  disabled={!isAppraisalPeriodOpen}
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
                  disabled={!isAppraisalPeriodOpen}
                  value={selfComments}
                  onChange={(e) => setSelfComments(e.target.value)}
                  placeholder="Elaborate on your deliverables, challenges overcome, and overall performance contribution (mandatory)..."
                  style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs, backgroundColor: isAppraisalPeriodOpen ? colors.surface : colors.surfaceSubtle }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary, marginBottom: "0.3rem" }}>
                  Key Achievements &amp; Milestones (Optional Reference)
                </label>
                <textarea
                  rows={3}
                  disabled={!isAppraisalPeriodOpen}
                  value={keyAchievements}
                  onChange={(e) => setKeyAchievements(e.target.value)}
                  placeholder="Bullet points of verified milestones..."
                  style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs, backgroundColor: isAppraisalPeriodOpen ? colors.surface : colors.surfaceSubtle }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${colors.borderSubtle}`, paddingTop: "1rem" }}>
                <span style={{ fontSize: "11px", color: colors.textMuted }}>
                  🔒 Locked to single {activeCycle.framework} framework for FY2026.
                </span>
                <Button variant="primary" size="sm" type="submit" disabled={!isAppraisalPeriodOpen}>
                  {!isAppraisalPeriodOpen
                    ? "View-Only (Appraisal Period Closed)"
                    : selfSubmitted
                    ? "Update & Re-Submit Self-Appraisal"
                    : "Submit Self-Appraisal to Supervisor"}
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
            <div>
              <h2 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                Current Cycle Objectives ({activeCycle.title})
              </h2>
              {cyclePhase === "In Review" && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "11px", color: "#b45309", marginTop: "0.25rem" }}>
                  <Icons.Lock size={12} color="#b45309" />
                  <strong>Objectives Locked:</strong> Review phase is active. Objectives cannot be edited or added.
                </span>
              )}
            </div>

            <Button
              variant={!isAppraisalPeriodOpen ? "secondary" : "outline"}
              size="sm"
              disabled={!isAppraisalPeriodOpen}
              onClick={() => {
                if (!isAppraisalPeriodOpen) return;
                setShowAddObjModal(true);
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                {!isAppraisalPeriodOpen ? <Icons.Lock size={13} color="#94a3b8" /> : <Icons.Plus size={14} />}
                <span>{!isAppraisalPeriodOpen ? "Objectives View-Only (Closed)" : "Propose Objective"}</span>
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
                        disabled={cyclePhase === "In Review" || cyclePhase === "Closed"}
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

      {/* TAB: MY SKILLS — SELF-RATING & GAP ANALYSIS (Addendum v1.2 §4, §5, §10) */}
      {activeTab === "my_skills" && (() => {
        const resolveReq = (code: string): number | null => {
          if (essGapBaseline === "gig_requirements") {
            const gig = ALIGNED_GIGS.find((g) => g.id === essSelectedGigId) || ALIGNED_GIGS[0];
            const found = gig.requiredSkills.find((r) => r.skillCode === code);
            return found ? found.minLevel : null;
          }
          return ROLE_SKILL_PROFILES[essGapBaseline]?.levels[code] ?? null;
        };

        const rows = SKILLS_TAXONOMY.map((sk) => {
          const rec = skillAssessments.find((a) => a.skillCode === sk.code);
          const req = resolveReq(sk.code);
          const finalLvl = rec?.finalRating ?? rec?.selfRating ?? null;
          const gap = req !== null && finalLvl !== null ? Number((req - finalLvl).toFixed(1)) : null;
          return { skill: sk, rec, req, finalLvl, gap };
        });

        const deficits = [...rows].filter((r) => r.gap !== null && r.gap > 0).sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0)).slice(0, 3);
        const strengths = [...rows].filter((r) => r.gap !== null && r.gap < 0).sort((a, b) => (a.gap ?? 0) - (b.gap ?? 0)).slice(0, 3);

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Gap Analysis Selector Bar (§5.1, §5.3) */}
            <div
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                padding: "1rem 1.25rem",
                boxShadow: shadows.xs,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div>
                <div style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                  My Skills &amp; Gap Analysis Selector (20 Skills · 5 Categories · 1–5 Scale)
                </div>
                <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>
                  Rate your own proficiency (ESS personal scope) and compare against your role profile, target role, prior cycle, or open gigs.
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                <select
                  aria-label="Gap analysis comparison baseline"
                  value={essGapBaseline}
                  onChange={(e) => setEssGapBaseline(e.target.value as typeof essGapBaseline)}
                  style={{
                    height: "38px",
                    padding: "0 0.75rem",
                    borderRadius: radii.md,
                    border: `1px solid ${colors.borderStrong}`,
                    fontSize: typography.sizes.xs,
                    fontWeight: 600,
                    backgroundColor: colors.surface,
                  }}
                >
                  <option value="my_role">Baseline: My Role Profile (Default)</option>
                  <option value="target_role">Baseline: Target Role Profile</option>
                  <option value="previous_cycle">Baseline: Previous Cycle</option>
                  <option value="gig_requirements">Baseline: Gig Requirements</option>
                </select>

                {essGapBaseline === "gig_requirements" && (
                  <select
                    aria-label="Target Gig for Gap Comparison"
                    value={essSelectedGigId}
                    onChange={(e) => setEssSelectedGigId(e.target.value)}
                    style={{
                      height: "38px",
                      padding: "0 0.75rem",
                      borderRadius: radii.md,
                      border: `1px solid ${colors.indigoAction}`,
                      fontSize: typography.sizes.xs,
                      fontWeight: 600,
                      backgroundColor: colors.indigoSubtle,
                      color: colors.indigoPrimary,
                    }}
                  >
                    {ALIGNED_GIGS.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.id}: {g.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Focus Areas: Top 3 Deficits & Top 3 Strengths + Add as Development Goal CTA (§5.3, TC-SKILL-14) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1rem" }}>
              <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: "1rem" }}>
                <div style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary, marginBottom: "0.5rem" }}>
                  Focus Areas — Top 3 Deficits (Required &minus; Final &gt; 0)
                </div>
                {deficits.length === 0 ? (
                  <div style={{ fontSize: typography.sizes.xs, color: colors.success }}>
                    ✓ All required skills meet or exceed the selected baseline.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {deficits.map((d) => (
                      <div
                        key={d.skill.code}
                        style={{
                          padding: "0.6rem 0.75rem",
                          borderRadius: radii.sm,
                          backgroundColor: colors.warningBg,
                          border: `1px solid ${colors.warningBorder}`,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <SkillBadge code={d.skill.code} name={d.skill.name} />
                          <span style={{ fontSize: "11px", fontWeight: 700, color: colors.warning }}>
                            &minus;{d.gap} lvl
                          </span>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            const newGoal: MyObjective = {
                              id: Date.now(),
                              title: `Develop ${d.skill.code} ${d.skill.name} from L${d.finalLvl ?? 1} to required L${d.req}`,
                              framework: "BSC",
                              perspective: "Learning & Growth",
                              weight: 15,
                              target: `Achieve Level ${d.req} (${getProficiencyLabel(d.req)}) in next cycle`,
                              progress: 0,
                              status: "Draft",
                            };
                            setObjectives((prev) => [newGoal, ...prev]);
                            setStatusMessage(
                              `Added skill deficit "${d.skill.code} ${d.skill.name}" as a Draft Learning & Growth goal in My Objectives.`
                            );
                            setTimeout(() => setStatusMessage(null), 5000);
                          }}
                        >
                          + Add as development goal
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: "1rem" }}>
                <div style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary, marginBottom: "0.5rem" }}>
                  Top 3 Strengths — Surpluses (Gig Board Matching Signals)
                </div>
                {strengths.length === 0 ? (
                  <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>
                    No skill surpluses against this stretch baseline.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {strengths.map((s) => (
                      <div
                        key={s.skill.code}
                        style={{
                          padding: "0.6rem 0.75rem",
                          borderRadius: radii.sm,
                          backgroundColor: colors.frameworkBscBg,
                          border: `1px solid ${colors.frameworkBscBorder}`,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <SkillBadge code={s.skill.code} name={s.skill.name} level={s.finalLvl} />
                        <span style={{ fontSize: "11px", fontWeight: 700, color: colors.frameworkBsc }}>
                          +{Math.abs(s.gap || 0)} lvl Surplus
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 5 Categories × 4 Skills Self-Assessment & Gap Table */}
            {SKILL_CATEGORIES.map((cat) => {
              const catRows = rows.filter((r) => r.skill.categoryCode === cat.code);
              return (
                <div
                  key={cat.id}
                  style={{
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radii.md,
                    overflow: "hidden",
                    boxShadow: shadows.xs,
                  }}
                >
                  <div
                    style={{
                      padding: "0.85rem 1.25rem",
                      backgroundColor: colors.surfaceSubtle,
                      borderBottom: `1px solid ${colors.border}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                      {cat.name} ({cat.code})
                    </span>
                    <Badge variant="neutral" size="sm">4 Skills</Badge>
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, textAlign: "left" }}>
                        <th style={{ padding: "0.65rem 1rem", color: colors.textSecondary }}>SKILL</th>
                        <th style={{ padding: "0.65rem 1rem", color: colors.textSecondary }}>MY SELF-RATING (1–5)</th>
                        <th style={{ padding: "0.65rem 1rem", color: colors.textSecondary }}>REQUIRED</th>
                        <th style={{ padding: "0.65rem 1rem", color: colors.textSecondary }}>GAP VS BASELINE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catRows.map((r) => (
                        <tr key={r.skill.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <div style={{ fontWeight: 600, color: colors.textPrimary }}>
                              <span style={{ color: colors.indigoAction, marginRight: "6px" }}>{r.skill.code}</span>
                              {r.skill.name}
                            </div>
                            <div style={{ fontSize: "11px", color: colors.textMuted }}>{r.skill.description}</div>
                          </td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <SkillRating
                              compact
                              value={r.rec?.selfRating ?? null}
                              onChange={(lvl: ProficiencyLevelNumber) => {
                                setSkillAssessments((prev) =>
                                  prev.map((a) =>
                                    a.skillCode === r.skill.code
                                      ? { ...a, selfRating: lvl, finalRating: a.managerRating ?? lvl }
                                      : a
                                  )
                                );
                                setStatusMessage(
                                  `Updated self-rating for ${r.skill.code} ${r.skill.name} to Level ${lvl}.`
                                );
                                setTimeout(() => setStatusMessage(null), 3500);
                              }}
                            />
                          </td>
                          <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                            {r.req !== null ? getProficiencyLabel(r.req) : "Not required"}
                          </td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <GapBar requiredLevel={r.req} finalRating={r.finalLvl} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* TAB 3: MY CASCADE (ALIGNMENT) - FR-PERF-014 */}
      {activeTab === "my_cascade" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* FR-PERF-014 Rule Notice */}
          <div
            style={{
              padding: "0.85rem 1.25rem",
              borderRadius: radii.md,
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
            }}
          >
            <Icons.ShieldCheck size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#15803d" }}>
                Objective Alignment Cascade
              </div>
              <div style={{ fontSize: "11.5px", color: "#166534", marginTop: "2px", lineHeight: "1.4" }}>
                In ESS, you see <strong>only your own objectives and the direct parent chain</strong> they attach to (My OKR &rarr; Department OKR &rarr; Company OKR). Sibling objectives owned by peers and other departments are strictly isolated to Manager Console and HR Console.
              </div>
            </div>
          </div>

          {/* Upward Cascade View */}
          <div style={{ backgroundColor: colors.surface, borderRadius: radii.lg, border: `1px solid ${colors.border}`, padding: "1.5rem", boxShadow: shadows.xs }}>
            <h3 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, margin: "0 0 1.25rem 0" }}>
              My Upward Alignment Hierarchy
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Level 1: Company Strategic OKR */}
              <div
                style={{
                  padding: "1.1rem 1.25rem",
                  borderRadius: radii.md,
                  backgroundColor: "#f8fafc",
                  border: `1px solid ${colors.border}`,
                  borderLeft: `4px solid ${colors.indigoAction}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: colors.indigoAction, textTransform: "uppercase" }}>
                    LEVEL 1: COMPANY STRATEGIC OBJECTIVE (PARENT)
                  </span>
                  <Badge variant="okr" size="sm">Corporate OKR</Badge>
                </div>
                <div style={{ fontSize: typography.sizes.sm, fontWeight: 800, color: colors.indigoPrimary, marginTop: "0.3rem" }}>
                  Expand Pan-African Cloud Infrastructure &amp; Regional Service Reliability
                </div>
                <div style={{ fontSize: "11.5px", color: colors.textSecondary, marginTop: "0.25rem" }}>
                  Owner: Executive Leadership • Target: 99.98% platform reliability across West Africa Hub
                </div>
              </div>

              {/* Connecting Connector Icon */}
              <div style={{ display: "flex", justifyContent: "center", color: colors.indigoAction }}>
                <Icons.ChevronDown size={20} />
              </div>

              {/* Level 2: Department / Squad OKR */}
              <div
                style={{
                  padding: "1.1rem 1.25rem",
                  borderRadius: radii.md,
                  backgroundColor: "#f8fafc",
                  border: `1px solid ${colors.border}`,
                  borderLeft: `4px solid ${colors.brandBlue}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: colors.brandBlue, textTransform: "uppercase" }}>
                    LEVEL 2: DEPARTMENT SQUAD OBJECTIVE (MID-PARENT)
                  </span>
                  <Badge variant="neutral" size="sm">Platform Engineering</Badge>
                </div>
                <div style={{ fontSize: typography.sizes.sm, fontWeight: 800, color: colors.textPrimary, marginTop: "0.3rem" }}>
                  Deploy Edge Architecture with Sub-15ms p99 Latency &amp; ISO-27001 Compliance
                </div>
                <div style={{ fontSize: "11.5px", color: colors.textSecondary, marginTop: "0.25rem" }}>
                  Owner: Sarah Jenkins (Managing Director) • Target: Zero edge downtime and 100% audit clearance
                </div>
              </div>

              {/* Connecting Connector Icon */}
              <div style={{ display: "flex", justifyContent: "center", color: colors.indigoAction }}>
                <Icons.ChevronDown size={20} />
              </div>

              {/* Level 3: Individual Objective (Mine) */}
              <div
                style={{
                  padding: "1.1rem 1.25rem",
                  borderRadius: radii.md,
                  backgroundColor: colors.indigoSubtle,
                  border: `1.5px solid ${colors.indigoBorder}`,
                  borderLeft: `4px solid ${colors.emeraldDark}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: colors.emeraldDark, textTransform: "uppercase" }}>
                    LEVEL 3: MY INDIVIDUAL DELIVERABLE (CHILD)
                  </span>
                  <Badge variant="success" size="sm">My Objective (35% Weight)</Badge>
                </div>
                <div style={{ fontSize: typography.sizes.sm, fontWeight: 800, color: colors.indigoPrimary, marginTop: "0.3rem" }}>
                  Deliver SaaS edge data architecture with sub-15ms p99 latency
                </div>
                <div style={{ fontSize: "11.5px", color: colors.textSecondary, marginTop: "0.25rem" }}>
                  Owner: Kwame Barnes (You) • Progress: <strong>95%</strong> • Status: Approved
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ASSIGNED PEER & UPWARD REVIEWS - FR-PERF-017, FR-PERF-027 */}
      {activeTab === "assigned_reviews" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* FR-PERF-027 Rule Notice */}
          <div
            style={{
              padding: "0.85rem 1.25rem",
              borderRadius: radii.md,
              backgroundColor: "#fef3c7",
              border: "1px solid #fde68a",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
            }}
          >
            <Icons.ShieldCheck size={18} color="#b45309" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#92400e" }}>
                Assigned Peer & Upward Reviews
              </div>
              <div style={{ fontSize: "11.5px", color: "#78350f", marginTop: "2px", lineHeight: "1.4" }}>
                As an assigned reviewer, you evaluate the colleague solely on the assigned questions below. In compliance with governance standards, <strong>the reviewee’s personal goals, self-appraisal score, and historical ratings are strictly withheld</strong> to guarantee impartial assessment.
              </div>
            </div>
          </div>

          {/* Assigned Review Tasks Table */}
          <div style={{ backgroundColor: colors.surface, borderRadius: radii.lg, border: `1px solid ${colors.border}`, overflow: "hidden", boxShadow: shadows.xs }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${colors.borderSubtle}` }}>
              <h3 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                My Assigned Review Responsibilities
              </h3>
              <p style={{ fontSize: "11px", color: colors.textMuted, margin: "0.2rem 0 0 0" }}>
                Colleagues who have requested or been assigned for your feedback in this appraisal cycle.
              </p>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
              <thead>
                <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>COLLEAGUE / REVIEWEE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>REVIEW TYPE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>CYCLE &amp; DUE DATE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>STATUS</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {assignedReviews.map((rev) => (
                  <tr key={rev.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ fontWeight: 700, color: colors.textPrimary }}>{rev.revieweeName}</div>
                      <div style={{ fontSize: "11px", color: colors.textMuted }}>
                        {rev.revieweeTitle} • {rev.revieweeDepartment}
                      </div>
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <Badge variant={rev.type === "Peer Review" ? "neutral" : "info"} size="sm">
                        {rev.type}
                      </Badge>
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div>{rev.cycleTitle}</div>
                      <div style={{ fontSize: "11px", color: colors.textMuted }}>Due: {formatDate(rev.dueDate)}</div>
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <Badge variant={rev.status === "Submitted" ? "success" : "warning"} size="sm">
                        {rev.status === "Submitted" ? `Submitted (${rev.submittedDate})` : "Pending Action"}
                      </Badge>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                      <Button
                        variant={rev.status === "Submitted" ? "outline" : "primary"}
                        size="sm"
                        onClick={() => {
                          setActiveReviewTask(rev);
                          setPeerFeedbackText(rev.comments?.feedback || "");
                        }}
                      >
                        {rev.status === "Submitted" ? "View Submission" : "Complete Review"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ALIGNED TASKS & KEY RESULTS */}
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

      {/* TAB 6: APPRAISAL HISTORY & PAST RATINGS */}
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        downloadAppraisalReport({
                          cycleTitle: h.cycleTitle,
                          period: h.period,
                          framework: h.framework,
                          selfRating: h.selfRating,
                          supervisorComments: h.supervisorComments,
                          calibratedScore: h.calibratedScore,
                          employeeName: "Paa Kwesi Barnes",
                          employeeId: "GH/SC-OPS/7821",
                          department: "Technology Advisory & Cloud Solutions",
                          role: "Lead Enterprise Architect",
                          supervisorName: "Jemima Richards (Head of People & Strategy)",
                        })
                      }
                    >
                      <Icons.Download size={13} style={{ marginRight: 4 }} />
                      Download PDF
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: MY SKILLS — SELF-RATING & GAP ANALYSIS (Addendum v1.2 §4, §5, §10) */}
      {activeTab === "my_skills" && (() => {
        const resolveReq = (code: string): number | null => {
          if (essGapBaseline === "gig_requirements") {
            const gig = ALIGNED_GIGS.find((g) => g.id === essSelectedGigId) || ALIGNED_GIGS[0];
            const found = gig.requiredSkills.find((r) => r.skillCode === code);
            return found ? found.minLevel : null;
          }
          return ROLE_SKILL_PROFILES[essGapBaseline]?.levels[code] ?? null;
        };

        const rows = SKILLS_TAXONOMY.map((sk) => {
          const rec = skillAssessments.find((a) => a.skillCode === sk.code);
          const req = resolveReq(sk.code);
          const finalLvl = rec?.finalRating ?? rec?.selfRating ?? null;
          const gap = req !== null && finalLvl !== null ? Number((req - finalLvl).toFixed(1)) : null;
          return { skill: sk, rec, req, finalLvl, gap };
        });

        const deficits = [...rows].filter((r) => r.gap !== null && r.gap > 0).sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0)).slice(0, 3);
        const strengths = [...rows].filter((r) => r.gap !== null && r.gap < 0).sort((a, b) => (a.gap ?? 0) - (b.gap ?? 0)).slice(0, 3);

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Gap Analysis Selector Bar (§5.1, §5.3) */}
            <div
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                padding: "1rem 1.25rem",
                boxShadow: shadows.xs,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div>
                <div style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                  My Skills &amp; Gap Analysis Selector (20 Skills · 5 Categories · 1–5 Scale)
                </div>
                <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>
                  Rate your own proficiency (ESS personal scope) and compare against your role profile, target role, prior cycle, or open gigs.
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                <select
                  aria-label="Gap analysis comparison baseline"
                  value={essGapBaseline}
                  onChange={(e) => setEssGapBaseline(e.target.value as typeof essGapBaseline)}
                  style={{
                    height: "38px",
                    padding: "0 0.75rem",
                    borderRadius: radii.md,
                    border: `1px solid ${colors.borderStrong}`,
                    fontSize: typography.sizes.xs,
                    fontWeight: 600,
                    backgroundColor: colors.surface,
                  }}
                >
                  <option value="my_role">Baseline: My Role Profile (Default)</option>
                  <option value="target_role">Baseline: Target Role Profile</option>
                  <option value="previous_cycle">Baseline: Previous Cycle</option>
                  <option value="gig_requirements">Baseline: Gig Requirements</option>
                </select>

                {essGapBaseline === "gig_requirements" && (
                  <select
                    aria-label="Target Gig for Gap Comparison"
                    value={essSelectedGigId}
                    onChange={(e) => setEssSelectedGigId(e.target.value)}
                    style={{
                      height: "38px",
                      padding: "0 0.75rem",
                      borderRadius: radii.md,
                      border: `1px solid ${colors.indigoAction}`,
                      fontSize: typography.sizes.xs,
                      fontWeight: 600,
                      backgroundColor: colors.indigoSubtle,
                      color: colors.indigoPrimary,
                    }}
                  >
                    {ALIGNED_GIGS.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.id}: {g.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Focus Areas: Top 3 Deficits & Top 3 Strengths + Add as Development Goal CTA (§5.3, TC-SKILL-14) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1rem" }}>
              <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: "1rem" }}>
                <div style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary, marginBottom: "0.5rem" }}>
                  Focus Areas — Top 3 Deficits (Required &minus; Final &gt; 0)
                </div>
                {deficits.length === 0 ? (
                  <div style={{ fontSize: typography.sizes.xs, color: colors.success }}>
                    ✓ All required skills meet or exceed the selected baseline.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {deficits.map((d) => (
                      <div
                        key={d.skill.code}
                        style={{
                          padding: "0.6rem 0.75rem",
                          borderRadius: radii.sm,
                          backgroundColor: colors.warningBg,
                          border: `1px solid ${colors.warningBorder}`,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <SkillBadge code={d.skill.code} name={d.skill.name} />
                          <span style={{ fontSize: "11px", fontWeight: 700, color: colors.warning }}>
                            &minus;{d.gap} lvl
                          </span>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            const newGoal: MyObjective = {
                              id: Date.now(),
                              title: `Develop ${d.skill.code} ${d.skill.name} from L${d.finalLvl ?? 1} to required L${d.req}`,
                              framework: "BSC",
                              perspective: "Learning & Growth",
                              weight: 15,
                              target: `Achieve Level ${d.req} (${getProficiencyLabel(d.req)}) in next cycle`,
                              progress: 0,
                              status: "Draft",
                            };
                            setObjectives((prev) => [newGoal, ...prev]);
                            setStatusMessage(
                              `Added skill deficit "${d.skill.code} ${d.skill.name}" as a Draft Learning & Growth goal in My Objectives.`
                            );
                            setTimeout(() => setStatusMessage(null), 5000);
                          }}
                        >
                          + Add as development goal
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: "1rem" }}>
                <div style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary, marginBottom: "0.5rem" }}>
                  Top 3 Strengths — Surpluses (Gig Board Matching Signals)
                </div>
                {strengths.length === 0 ? (
                  <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>
                    No skill surpluses against this stretch baseline.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {strengths.map((s) => (
                      <div
                        key={s.skill.code}
                        style={{
                          padding: "0.6rem 0.75rem",
                          borderRadius: radii.sm,
                          backgroundColor: colors.frameworkBscBg,
                          border: `1px solid ${colors.frameworkBscBorder}`,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <SkillBadge code={s.skill.code} name={s.skill.name} level={s.finalLvl} />
                        <span style={{ fontSize: "11px", fontWeight: 700, color: colors.frameworkBsc }}>
                          +{Math.abs(s.gap || 0)} lvl Surplus
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 5 Categories × 4 Skills Self-Assessment & Gap Table */}
            {SKILL_CATEGORIES.map((cat) => {
              const catRows = rows.filter((r) => r.skill.categoryCode === cat.code);
              return (
                <div
                  key={cat.id}
                  style={{
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radii.md,
                    overflow: "hidden",
                    boxShadow: shadows.xs,
                  }}
                >
                  <div
                    style={{
                      padding: "0.85rem 1.25rem",
                      backgroundColor: colors.surfaceSubtle,
                      borderBottom: `1px solid ${colors.border}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                      {cat.name} ({cat.code})
                    </span>
                    <Badge variant="neutral" size="sm">4 Skills</Badge>
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, textAlign: "left" }}>
                        <th style={{ padding: "0.65rem 1rem", color: colors.textSecondary }}>SKILL</th>
                        <th style={{ padding: "0.65rem 1rem", color: colors.textSecondary }}>MY SELF-RATING (1–5)</th>
                        <th style={{ padding: "0.65rem 1rem", color: colors.textSecondary }}>REQUIRED</th>
                        <th style={{ padding: "0.65rem 1rem", color: colors.textSecondary }}>GAP VS BASELINE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catRows.map((r) => (
                        <tr key={r.skill.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <div style={{ fontWeight: 600, color: colors.textPrimary }}>
                              <span style={{ color: colors.indigoAction, marginRight: "6px" }}>{r.skill.code}</span>
                              {r.skill.name}
                            </div>
                            <div style={{ fontSize: "11px", color: colors.textMuted }}>{r.skill.description}</div>
                          </td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <SkillRating
                              compact
                              value={r.rec?.selfRating ?? null}
                              onChange={(lvl: ProficiencyLevelNumber) => {
                                setSkillAssessments((prev) =>
                                  prev.map((a) =>
                                    a.skillCode === r.skill.code
                                      ? { ...a, selfRating: lvl, finalRating: a.managerRating ?? lvl }
                                      : a
                                  )
                                );
                                setStatusMessage(
                                  `Updated self-rating for ${r.skill.code} ${r.skill.name} to Level ${lvl}.`
                                );
                                setTimeout(() => setStatusMessage(null), 3500);
                              }}
                            />
                          </td>
                          <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                            {r.req !== null ? getProficiencyLabel(r.req) : "Not required"}
                          </td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <GapBar requiredLevel={r.req} finalRating={r.finalLvl} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Complete Peer Review Modal (Task-Scoped Form) */}
      {activeReviewTask && (
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
              maxWidth: "580px",
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
              <div>
                <h3 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.indigoPrimary, margin: 0 }}>
                  {activeReviewTask.type}: {activeReviewTask.revieweeName}
                </h3>
                <span style={{ fontSize: "11px", color: colors.textMuted }}>
                  {activeReviewTask.revieweeTitle} • {activeReviewTask.revieweeDepartment}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveReviewTask(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: colors.textMuted }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitPeerReview} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ padding: "0.6rem 0.85rem", borderRadius: radii.sm, backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", fontSize: "11px", color: "#1e40af" }}>
                🔒 <strong>Strict Review Boundary:</strong> You are evaluating this colleague on observable collaboration and execution. Their self-rating, individual goals, and ratings history are not exposed.
              </div>

              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary, marginBottom: "0.3rem" }}>
                  1. Cross-Functional Collaboration &amp; Communication ({peerCollabRating} / 5.0)
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.1"
                  value={peerCollabRating}
                  disabled={activeReviewTask.status === "Submitted"}
                  onChange={(e) => setPeerCollabRating(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: colors.indigoAction }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary, marginBottom: "0.3rem" }}>
                  2. Technical Rigor &amp; Delivery SLA Compliance ({peerTechRating} / 5.0)
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.1"
                  value={peerTechRating}
                  disabled={activeReviewTask.status === "Submitted"}
                  onChange={(e) => setPeerTechRating(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: colors.indigoAction }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary, marginBottom: "0.3rem" }}>
                  3. Constructive Feedback &amp; Key Strengths (Mandatory)
                </label>
                <textarea
                  rows={4}
                  value={peerFeedbackText}
                  disabled={activeReviewTask.status === "Submitted"}
                  onChange={(e) => setPeerFeedbackText(e.target.value)}
                  placeholder="Provide specific, actionable feedback regarding collaboration, technical quality, or team impact..."
                  style={{ width: "100%", padding: "0.6rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <Button variant="outline" size="sm" type="button" onClick={() => setActiveReviewTask(null)}>
                  Close
                </Button>
                {activeReviewTask.status !== "Submitted" && (
                  <Button variant="primary" size="sm" type="submit">
                    Submit Peer Evaluation
                  </Button>
                )}
              </div>
            </form>
          </div>
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

"use client";

import React, { useState } from "react";
import { colors, typography, radii, shadows, space, text } from "../../design-system/tokens";
import { Badge, frameworkVariant } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { formatDate } from "../../utils/date";
import {
  SKILL_CATEGORIES,
  SKILLS_TAXONOMY,
  SKILL_PROFICIENCY_SCALE,
  INITIAL_MY_SKILL_ASSESSMENTS,
  ROLE_SKILL_PROFILES,
  ALIGNED_GIGS,
  computeGigFit,
  getProficiencyLabel,
  SkillRecord,
  SkillCategoryCode,
  ProficiencyLevelNumber,
  GapBaselineKey,
  EmployeeSkillAssessmentRecord,
  AlignedGigRecord,
} from "../../data/skillsFramework";
import {
  SkillBadge,
  SkillRating,
  GapBar,
  CategoryHeatmap,
  CategoryHeatmapRow,
} from "../../design-system/SkillsComponents";

interface DevelopmentGoalDraft {
  id: string;
  skillCode: string;
  skillName: string;
  title: string;
  framework: "BSC" | "OKR" | "MBO";
  createdAt: string;
}

export const SkillsMarketplaceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "gap_analysis" | "my_skills" | "gigs" | "framework" | "team_heatmap"
  >("gap_analysis");

  // Shared 20-skill taxonomy state (descriptions & role required levels editable; structure immutable per VAL-SKILL-001)
  const [skills, setSkills] = useState<SkillRecord[]>(SKILLS_TAXONOMY);
  const [assessments, setAssessments] = useState<EmployeeSkillAssessmentRecord[]>(
    INITIAL_MY_SKILL_ASSESSMENTS
  );
  const [roleProfiles, setRoleProfiles] = useState(ROLE_SKILL_PROFILES);

  // Gap Analysis Selector state (§5.1: default on load = My Role Profile)
  const [selectedBaseline, setSelectedBaseline] = useState<GapBaselineKey>("my_role");
  const [selectedGigForBaseline, setSelectedGigForBaseline] = useState<string>(ALIGNED_GIGS[1].id);
  const [categoryFilter, setCategoryFilter] = useState<SkillCategoryCode | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Gigs & Reverse Link Post-Gig Prompt (§6.3, FR-SKILL-016)
  const [gigs, setGigs] = useState<AlignedGigRecord[]>(ALIGNED_GIGS);
  const [simulateStaleDate, setSimulateStaleDate] = useState<boolean>(false);
  const [postGigPromptGig, setPostGigPromptGig] = useState<AlignedGigRecord | null>(null);

  // Development Goals drafted from Skill Deficits (§5.3, FR-SKILL-010, TC-SKILL-14)
  const [draftGoals, setDraftGoals] = useState<DevelopmentGoalDraft[]>([]);
  const [nextCycleFramework, setNextCycleFramework] = useState<"BSC" | "OKR" | "MBO">("BSC");

  // HR Calibration Override Modal (VAL-SKILL-005, TC-SKILL-05: mandatory justification)
  const [calibratingSkill, setCalibratingSkill] = useState<SkillRecord | null>(null);
  const [calibratedLevel, setCalibratedLevel] = useState<ProficiencyLevelNumber>(4);
  const [calibrationJustification, setCalibrationJustification] = useState<string>("");
  const [calibrationError, setCalibrationError] = useState<string | null>(null);

  // Edit Skill Description / Role Level Modal (VAL-SKILL-001)
  const [editingSkill, setEditingSkill] = useState<SkillRecord | null>(null);
  const [editDescription, setEditDescription] = useState<string>("");
  const [editRoleReqLevel, setEditRoleReqLevel] = useState<number | null>(4);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Resolve required level for a skill code under the active baseline (§5.1, VAL-SKILL-006)
  const getRequiredLevelForSkill = (skillCode: string): number | null => {
    if (selectedBaseline === "gig_requirements") {
      const gig = gigs.find((g) => g.id === selectedGigForBaseline) || gigs[0];
      const req = gig.requiredSkills.find((r) => r.skillCode === skillCode);
      return req ? req.minLevel : null; // null => "Not required" (VAL-SKILL-006)
    }
    return roleProfiles[selectedBaseline]?.levels[skillCode] ?? null;
  };

  // Compute per-skill gap rows
  const skillGapRows = skills.map((sk) => {
    const rec = assessments.find((a) => a.skillCode === sk.code);
    const finalRating = rec?.finalRating ?? null;
    const selfRating = rec?.selfRating ?? null;
    const managerRating = rec?.managerRating ?? null;
    const requiredLevel = getRequiredLevelForSkill(sk.code);
    const gap =
      requiredLevel !== null && finalRating !== null
        ? Number((requiredLevel - finalRating).toFixed(1))
        : null;
    return {
      skill: sk,
      assessment: rec,
      requiredLevel,
      selfRating,
      managerRating,
      finalRating,
      gap,
    };
  });

  // Top 3 Deficits (gap > 0) and Top 3 Strengths (gap < 0) (§5.3, FR-SKILL-010)
  const topDeficits = [...skillGapRows]
    .filter((r) => r.gap !== null && r.gap > 0)
    .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))
    .slice(0, 3);

  const topStrengths = [...skillGapRows]
    .filter((r) => r.gap !== null && r.gap < 0)
    .sort((a, b) => (a.gap ?? 0) - (b.gap ?? 0))
    .slice(0, 3);

  // Category-level summary (5 rows, FR-SKILL-009)
  const categorySummaries = SKILL_CATEGORIES.map((cat) => {
    const rows = skillGapRows.filter(
      (r) => r.skill.categoryCode === cat.code && r.requiredLevel !== null && r.finalRating !== null
    );
    const avgReq =
      rows.length > 0
        ? Number((rows.reduce((s, r) => s + (r.requiredLevel || 0), 0) / rows.length).toFixed(2))
        : null;
    const avgActual =
      rows.length > 0
        ? Number((rows.reduce((s, r) => s + (r.finalRating || 0), 0) / rows.length).toFixed(2))
        : null;
    const avgGap =
      avgReq !== null && avgActual !== null ? Number((avgReq - avgActual).toFixed(2)) : null;

    return {
      category: cat,
      assessedCount: rows.length,
      avgReq,
      avgActual,
      avgGap,
    };
  });

  // Handle employee self-rating update (FR-SKILL-005, TC-SKILL-03)
  const handleUpdateSelfRating = (skillCode: string, level: ProficiencyLevelNumber) => {
    setAssessments((prev) =>
      prev.map((a) =>
        a.skillCode === skillCode
          ? {
              ...a,
              selfRating: level,
              finalRating: a.managerRating ?? level,
              assessedAt: "2026-11-17",
            }
          : a
      )
    );
    const sk = skills.find((s) => s.code === skillCode);
    showToast(`Saved self-rating for ${skillCode} ${sk?.name}: Level ${level} (${getProficiencyLabel(level)}).`);
  };

  const handleUpdateEvidenceNote = (skillCode: string, note: string) => {
    setAssessments((prev) =>
      prev.map((a) => (a.skillCode === skillCode ? { ...a, evidenceNote: note } : a))
    );
  };

  // Add deficit as a draft development goal in next cycle (FR-SKILL-010, TC-SKILL-14)
  const handleAddAsDevelopmentGoal = (skill: SkillRecord, requiredLevel: number, actualLevel: number | null) => {
    const existing = draftGoals.find((g) => g.skillCode === skill.code);
    if (existing) {
      showToast(`Development goal for ${skill.code} ${skill.name} is already queued for next cycle.`);
      return;
    }
    const draft: DevelopmentGoalDraft = {
      id: `DEV-GOAL-${skill.code}`,
      skillCode: skill.code,
      skillName: skill.name,
      title: `Advance ${skill.code} ${skill.name} from L${actualLevel ?? 1} to L${requiredLevel} (${getProficiencyLabel(requiredLevel)})`,
      framework: nextCycleFramework,
      createdAt: "2026-11-17",
    };
    setDraftGoals((prev) => [draft, ...prev]);
    showToast(
      `Draft ${nextCycleFramework} development goal created for next cycle: "${draft.title}"`
    );
  };

  // Save HR Calibration adjustment with mandatory justification (VAL-SKILL-005, TC-SKILL-05)
  const handleSaveCalibration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calibratingSkill) return;
    if (!calibrationJustification.trim() || calibrationJustification.trim().length < 10) {
      setCalibrationError(
        "Justification is mandatory (minimum 10 characters) to adjust a final skill rating during calibration."
      );
      return;
    }
    setAssessments((prev) =>
      prev.map((a) =>
        a.skillCode === calibratingSkill.code
          ? {
              ...a,
              finalRating: calibratedLevel,
              calibrationJustification: calibrationJustification.trim(),
              assessedAt: "2026-11-17",
              assessedBy: "HR Calibration Committee",
            }
          : a
      )
    );
    showToast(
      `Calibrated final rating for ${calibratingSkill.code} ${calibratingSkill.name} to Level ${calibratedLevel} (Audit-logged).`
    );
    setCalibratingSkill(null);
    setCalibrationJustification("");
    setCalibrationError(null);
  };

  // Save Skill Description & Role Profile level (VAL-SKILL-001)
  const handleSaveSkillMetadata = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill) return;
    setSkills((prev) =>
      prev.map((s) => (s.code === editingSkill.code ? { ...s, description: editDescription } : s))
    );
    setRoleProfiles((prev) => ({
      ...prev,
      my_role: {
        ...prev.my_role,
        levels: {
          ...prev.my_role.levels,
          [editingSkill.code]: editRoleReqLevel,
        },
      },
    }));
    showToast(
      `Updated description and required role profile level for ${editingSkill.code} ${editingSkill.name}.`
    );
    setEditingSkill(null);
  };

  // Team & Company Aggregate Heatmap rows (§10, FR-SKILL-011)
  const heatmapRows: CategoryHeatmapRow[] = [
    {
      id: "SQUAD-EDGE",
      label: "Cloud & Edge Engineering Squad (18 Staff)",
      subtitle: "Aggregate squad mean — individual peer ratings withheld",
      categoryAverages: { TECH: 4.5, EXEC: 3.9, PPL: 3.8, LEAD: 3.5, PERS: 4.4 },
    },
    {
      id: "SQUAD-FINTECH",
      label: "FinTech & Payments Product Squad (24 Staff)",
      subtitle: "Aggregate squad mean",
      categoryAverages: { TECH: 4.2, EXEC: 4.1, PPL: 4.0, LEAD: 3.4, PERS: 4.3 },
    },
    {
      id: "SQUAD-ADVISORY",
      label: "Enterprise Advisory & People Strategy (21 Staff)",
      subtitle: "Aggregate squad mean",
      categoryAverages: { TECH: 3.6, EXEC: 4.2, PPL: 4.6, LEAD: 4.3, PERS: 4.5 },
    },
    {
      id: "SQUAD-OPS",
      label: "Regional Operations & Compliance (28 Staff)",
      subtitle: "Aggregate squad mean",
      categoryAverages: { TECH: 3.4, EXEC: 4.4, PPL: 4.1, LEAD: 3.7, PERS: 4.6 },
    },
  ];

  return (
    <div style={{ padding: `${space[5]} ${space[6]}`, maxWidth: "1280px", margin: "0 auto" }}>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: space[4],
          marginBottom: space[5],
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: space[2], flexWrap: "wrap" }}>
            <Icons.Compass size={24} color={colors.indigoAction} />
            <h1
              style={{
                fontSize: text.h1.fontSize,
                fontWeight: text.h1.fontWeight,
                lineHeight: text.h1.lineHeight,
                color: colors.textPrimary,
                margin: 0,
              }}
            >
              Skills &amp; Gig Board
            </h1>
            <Badge variant="info" size="sm">
              20 Skills · 5 Categories · 5-Level Scale
            </Badge>
            <Badge variant={frameworkVariant(nextCycleFramework)} size="sm">
              {nextCycleFramework}
            </Badge>
          </div>
          <p
            style={{
              fontSize: text.body.fontSize,
              color: colors.textSecondary,
              margin: `${space[1]} 0 0 0`,
            }}
          >
            Twenty skills, five categories, one 5-level proficiency scale — rated in Performance, gap-analyzed against a selectable baseline, and used as the matching currency on the Gig Board.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: space[2], flexWrap: "wrap" }}>
          {[
            { key: "gap_analysis", label: "Skill Gap Analysis", icon: Icons.Crosshair },
            { key: "my_skills", label: "My Skills (Self-Rating)", icon: Icons.Award },
            { key: "gigs", label: `Internal Gig Board (${gigs.length})`, icon: Icons.Briefcase },
            { key: "framework", label: "Skills Framework (20)", icon: Icons.Layers },
            { key: "team_heatmap", label: "Aggregate Skill Heatmap", icon: Icons.BarChart },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "primary" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
            >
              <span style={{ display: "flex", alignItems: "center", gap: space[1] }}>
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Toast Banner */}
      {toastMessage && (
        <div
          role="status"
          style={{
            marginBottom: space[4],
            padding: `${space[3]} ${space[4]}`,
            borderRadius: radii.md,
            backgroundColor: colors.successBg,
            border: `1px solid ${colors.successBorder}`,
            color: colors.success,
            fontSize: text.bodyStrong.fontSize,
            fontWeight: text.bodyStrong.fontWeight,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>✓ {toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            style={{
              background: "none",
              border: "none",
              color: colors.success,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: SKILL GAP ANALYSIS WITH 6 SELECTABLE BASELINES (§5)                */}
      {/* ========================================================================= */}
      {activeTab === "gap_analysis" && (
        <div style={{ display: "flex", flexDirection: "column", gap: space[5] }}>
          {/* §5.1 Gap Analysis Baseline Selector Card */}
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              padding: space[4],
              boxShadow: shadows.sm,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: space[4],
              }}
            >
              <div style={{ flex: "1 1 360px" }}>
                <label
                  htmlFor="gap-baseline-select"
                  style={{
                    display: "block",
                    fontSize: text.small.fontSize,
                    fontWeight: 600,
                    color: colors.textSecondary,
                    marginBottom: space[1],
                    textTransform: "uppercase",
                  }}
                >
                  Comparison Baseline Selector
                </label>
                <select
                  id="gap-baseline-select"
                  value={selectedBaseline}
                  onChange={(e) => setSelectedBaseline(e.target.value as GapBaselineKey)}
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: `0 ${space[3]}`,
                    borderRadius: radii.md,
                    border: `1px solid ${colors.borderStrong}`,
                    fontSize: text.bodyStrong.fontSize,
                    fontWeight: 600,
                    color: colors.textPrimary,
                    backgroundColor: colors.surface,
                    cursor: "pointer",
                  }}
                >
                  <option value="my_role">My Role Profile (Default) — Lead Enterprise Architect</option>
                  <option value="target_role">Target Role Profile — Practice Director / VP Engineering</option>
                  <option value="team_benchmark">Team Benchmark — Platform Engineering Median (Aggregate Only)</option>
                  <option value="company_benchmark">Company Benchmark — Org-Wide Median (HR Console Scope)</option>
                  <option value="previous_cycle">Previous Cycle — FY2025 Q4 Final Ratings</option>
                  <option value="gig_requirements">Gig Requirements — Specific Open Internal Gig</option>
                </select>
                <div style={{ fontSize: text.small.fontSize, color: colors.textMuted, marginTop: space[1] }}>
                  {selectedBaseline === "gig_requirements"
                    ? "Comparing your verified final skill ratings against the selected gig's minimum required levels."
                    : roleProfiles[selectedBaseline]?.subtitle}
                </div>
              </div>

              {/* Conditional Secondary Gig Selector when baseline === 'gig_requirements' */}
              {selectedBaseline === "gig_requirements" && (
                <div style={{ flex: "1 1 320px" }}>
                  <label
                    htmlFor="gig-baseline-picker"
                    style={{
                      display: "block",
                      fontSize: text.small.fontSize,
                      fontWeight: 600,
                      color: colors.textSecondary,
                      marginBottom: space[1],
                      textTransform: "uppercase",
                    }}
                  >
                    Target Open Gig
                  </label>
                  <select
                    id="gig-baseline-picker"
                    value={selectedGigForBaseline}
                    onChange={(e) => setSelectedGigForBaseline(e.target.value)}
                    style={{
                      width: "100%",
                      height: "40px",
                      padding: `0 ${space[3]}`,
                      borderRadius: radii.md,
                      border: `1px solid ${colors.indigoAction}`,
                      fontSize: text.body.fontSize,
                      fontWeight: 600,
                      color: colors.indigoPrimary,
                      backgroundColor: colors.indigoSubtle,
                      cursor: "pointer",
                    }}
                  >
                    {gigs.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.id}: {g.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Next-Cycle Framework Selector for "Add as development goal" CTA */}
              <div style={{ minWidth: "200px" }}>
                <label
                  htmlFor="next-cycle-fw"
                  style={{
                    display: "block",
                    fontSize: text.small.fontSize,
                    fontWeight: 600,
                    color: colors.textSecondary,
                    marginBottom: space[1],
                    textTransform: "uppercase",
                  }}
                >
                  Next Cycle Goal Target
                </label>
                <select
                  id="next-cycle-fw"
                  value={nextCycleFramework}
                  onChange={(e) => setNextCycleFramework(e.target.value as "BSC" | "OKR" | "MBO")}
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: `0 ${space[3]}`,
                    borderRadius: radii.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: text.body.fontSize,
                    backgroundColor: colors.surfaceSubtle,
                    color: colors.textPrimary,
                  }}
                >
                  <option value="BSC">BSC Draft Goal</option>
                  <option value="OKR">OKR Draft Objective</option>
                  <option value="MBO">MBO Draft Objective</option>
                </select>
              </div>
            </div>
          </div>

          {/* §5.3 Focus Areas Panel: Top 3 Deficits & Top 3 Strengths + Add as Development Goal CTA */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: space[4] }}>
            {/* Top 3 Deficits */}
            <div
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                padding: space[4],
                boxShadow: shadows.sm,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: space[3] }}>
                <div>
                  <h2 style={{ fontSize: text.h3.fontSize, fontWeight: text.h3.fontWeight, color: colors.textPrimary, margin: 0 }}>
                    Priority Focus Areas (Top 3 Skill Deficits)
                  </h2>
                  <span style={{ fontSize: text.small.fontSize, color: colors.textMuted }}>
                    Largest positive gaps (required &minus; final &gt; 0) — push directly to next cycle&apos;s goals
                  </span>
                </div>
                <Badge variant="warning" size="sm">Development Focus</Badge>
              </div>

              {topDeficits.length === 0 ? (
                <div style={{ padding: space[4], backgroundColor: colors.successBg, borderRadius: radii.sm, color: colors.success, fontSize: text.body.fontSize }}>
                  ✓ Zero skill deficits against this baseline. All required levels are met or exceeded.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
                  {topDeficits.map((item) => {
                    const alreadyDrafted = draftGoals.some((d) => d.skillCode === item.skill.code);
                    return (
                      <div
                        key={item.skill.code}
                        style={{
                          padding: space[3],
                          borderRadius: radii.sm,
                          backgroundColor: colors.warningBg,
                          border: `1px solid ${colors.warningBorder}`,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: space[3],
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                            <SkillBadge code={item.skill.code} name={item.skill.name} />
                            <span style={{ fontSize: text.micro.fontSize, fontWeight: 700, color: colors.warning, fontVariantNumeric: "tabular-nums" }}>
                              Gap: &minus;{item.gap} lvl (Actual L{item.finalRating} vs Req L{item.requiredLevel})
                            </span>
                          </div>
                          <div style={{ fontSize: text.small.fontSize, color: colors.textSecondary, marginTop: space[1] }}>
                            {item.skill.categoryName}
                          </div>
                        </div>

                        <Button
                          variant={alreadyDrafted ? "secondary" : "primary"}
                          size="sm"
                          disabled={alreadyDrafted}
                          onClick={() =>
                            handleAddAsDevelopmentGoal(item.skill, item.requiredLevel ?? 4, item.finalRating)
                          }
                        >
                          {alreadyDrafted ? `Added to ${nextCycleFramework} ✓` : "+ Add as development goal"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top 3 Strengths (Surpluses) */}
            <div
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                padding: space[4],
                boxShadow: shadows.sm,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: space[3] }}>
                <div>
                  <h2 style={{ fontSize: text.h3.fontSize, fontWeight: text.h3.fontWeight, color: colors.textPrimary, margin: 0 }}>
                    Verified Strengths (Top 3 Skill Surpluses)
                  </h2>
                  <span style={{ fontSize: text.small.fontSize, color: colors.textMuted }}>
                    Skills exceeding baseline requirement (gap &lt; 0) — prime signals for Internal Gigs
                  </span>
                </div>
                <Badge variant="success" size="sm">Gig Matching Signals</Badge>
              </div>

              {topStrengths.length === 0 ? (
                <div style={{ padding: space[4], backgroundColor: colors.surfaceSubtle, borderRadius: radii.sm, color: colors.textSecondary, fontSize: text.body.fontSize }}>
                  No surpluses above the selected baseline (e.g., Target Role stretches all requirements).
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
                  {topStrengths.map((item) => (
                    <div
                      key={item.skill.code}
                      style={{
                        padding: space[3],
                        borderRadius: radii.sm,
                        backgroundColor: colors.frameworkBscBg,
                        border: `1px solid ${colors.frameworkBscBorder}`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: space[3],
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                          <SkillBadge code={item.skill.code} name={item.skill.name} />
                          <span style={{ fontSize: text.micro.fontSize, fontWeight: 700, color: colors.frameworkBsc, fontVariantNumeric: "tabular-nums" }}>
                            Surplus: +{Math.abs(item.gap || 0)} lvl (Actual L{item.finalRating} vs Req L{item.requiredLevel})
                          </span>
                        </div>
                        <div style={{ fontSize: text.small.fontSize, color: colors.textSecondary, marginTop: space[1] }}>
                          {item.skill.categoryName}
                        </div>
                      </div>

                      <Button variant="outline" size="sm" onClick={() => setActiveTab("gigs")}>
                        Match to Gigs &rarr;
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Queued Next-Cycle Development Goals (when user clicks "Add as development goal") */}
          {draftGoals.length > 0 && (
            <div
              style={{
                backgroundColor: colors.indigoSubtle,
                border: `1px solid ${colors.indigoBorder}`,
                borderRadius: radii.md,
                padding: space[4],
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: space[2] }}>
                <span style={{ fontSize: text.bodyStrong.fontSize, fontWeight: 600, color: colors.indigoPrimary }}>
                  Queued Next-Cycle Development Goals ({draftGoals.length})
                </span>
                <Badge variant={frameworkVariant(nextCycleFramework)} size="sm">
                  {nextCycleFramework}
                </Badge>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
                {draftGoals.map((dg) => (
                  <div
                    key={dg.id}
                    style={{
                      padding: `${space[2]} ${space[3]}`,
                      backgroundColor: colors.surface,
                      borderRadius: radii.sm,
                      border: `1px solid ${colors.border}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: text.body.fontSize,
                    }}
                  >
                    <span>
                      <strong>[{dg.skillCode}]</strong> {dg.title}
                    </span>
                    <Badge variant="success" size="sm">Drafted for Next Cycle</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* §5.2 & FR-SKILL-009: 5-Category Average Gap Summary Row */}
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              padding: space[4],
              boxShadow: shadows.sm,
            }}
          >
            <h2 style={{ fontSize: text.h3.fontSize, fontWeight: text.h3.fontWeight, color: colors.textPrimary, margin: `0 0 ${space[3]} 0` }}>
              Category-Level Gap Summary
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: space[3] }}>
              {categorySummaries.map((cs) => {
                const hasData = cs.avgGap !== null;
                const isDeficit = (cs.avgGap ?? 0) > 0;
                const isSurplus = (cs.avgGap ?? 0) < 0;
                return (
                  <div
                    key={cs.category.code}
                    style={{
                      padding: space[3],
                      borderRadius: radii.sm,
                      backgroundColor: colors.surfaceSubtle,
                      border: `1px solid ${colors.border}`,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: text.micro.fontSize, fontWeight: 700, color: colors.indigoAction }}>
                        {cs.category.code}
                      </span>
                      <span
                        style={{
                          fontSize: text.micro.fontSize,
                          fontWeight: 600,
                          color: !hasData
                            ? colors.textMuted
                            : isDeficit
                            ? colors.warning
                            : isSurplus
                            ? colors.frameworkBsc
                            : colors.success,
                        }}
                      >
                        {!hasData
                          ? "Not required"
                          : isDeficit
                          ? `Avg Gap: −${cs.avgGap}`
                          : isSurplus
                          ? `Avg Surplus: +${Math.abs(cs.avgGap || 0)}`
                          : "Avg: Met (0.0)"}
                      </span>
                    </div>
                    <div style={{ fontSize: text.bodyStrong.fontSize, fontWeight: 600, color: colors.textPrimary, marginTop: space[1] }}>
                      {cs.category.name}
                    </div>
                    <div style={{ fontSize: text.small.fontSize, color: colors.textSecondary, marginTop: space[1] }}>
                      {hasData
                        ? `Required Avg: ${cs.avgReq} · Final Avg: ${cs.avgActual}`
                        : "No skills in this category required by selected baseline"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per-Skill Gap Analysis Table Grouped by 5 Categories */}
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              overflow: "hidden",
              boxShadow: shadows.sm,
            }}
          >
            <div
              style={{
                padding: space[4],
                borderBottom: `1px solid ${colors.borderSubtle}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: space[3],
              }}
            >
              <div>
                <h2 style={{ fontSize: text.h3.fontSize, fontWeight: text.h3.fontWeight, color: colors.textPrimary, margin: 0 }}>
                  Per-Skill Gap Breakdown (20 Skills · 1–5 Proficiency Scale)
                </h2>
                <span style={{ fontSize: text.small.fontSize, color: colors.textMuted }}>
                  Formula: gap = required_level &minus; final_rating (Deficit &gt; 0, Met = 0, Surplus &lt; 0)
                </span>
              </div>

              <div style={{ display: "flex", gap: space[2], alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Filter skill by code or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    height: "36px",
                    padding: `0 ${space[3]}`,
                    borderRadius: radii.sm,
                    border: `1px solid ${colors.border}`,
                    fontSize: text.body.fontSize,
                  }}
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as SkillCategoryCode | "ALL")}
                  style={{
                    height: "36px",
                    padding: `0 ${space[3]}`,
                    borderRadius: radii.sm,
                    border: `1px solid ${colors.border}`,
                    fontSize: text.body.fontSize,
                    backgroundColor: colors.surface,
                  }}
                >
                  <option value="ALL">All 5 Categories (20 Skills)</option>
                  {SKILL_CATEGORIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: text.body.fontSize,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: space[3], fontSize: text.small.fontSize, fontWeight: 600, color: colors.textSecondary }}>SKILL</th>
                  <th style={{ padding: space[3], fontSize: text.small.fontSize, fontWeight: 600, color: colors.textSecondary }}>CATEGORY</th>
                  <th style={{ padding: space[3], fontSize: text.small.fontSize, fontWeight: 600, color: colors.textSecondary }}>REQUIRED</th>
                  <th style={{ padding: space[3], fontSize: text.small.fontSize, fontWeight: 600, color: colors.textSecondary }}>FINAL RATING</th>
                  <th style={{ padding: space[3], fontSize: text.small.fontSize, fontWeight: 600, color: colors.textSecondary }}>PROFICIENCY GAP</th>
                  <th style={{ padding: space[3], fontSize: text.small.fontSize, fontWeight: 600, color: colors.textSecondary, textAlign: "right" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {skillGapRows
                  .filter((r) => categoryFilter === "ALL" || r.skill.categoryCode === categoryFilter)
                  .filter(
                    (r) =>
                      !searchQuery.trim() ||
                      r.skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      r.skill.code.includes(searchQuery.trim())
                  )
                  .map((row) => (
                    <tr key={row.skill.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                      <td style={{ padding: space[3] }}>
                        <div style={{ fontWeight: 600, color: colors.textPrimary }}>
                          <span style={{ color: colors.indigoAction, marginRight: space[1] }}>{row.skill.code}</span>
                          {row.skill.name}
                        </div>
                        <div style={{ fontSize: text.small.fontSize, color: colors.textMuted, marginTop: "2px" }}>
                          {row.skill.description}
                        </div>
                      </td>
                      <td style={{ padding: space[3] }}>
                        <Badge variant="neutral" size="sm">
                          {row.skill.categoryCode}
                        </Badge>
                      </td>
                      <td style={{ padding: space[3], fontWeight: 600, color: colors.textPrimary }}>
                        {row.requiredLevel !== null ? getProficiencyLabel(row.requiredLevel) : "Not required"}
                      </td>
                      <td style={{ padding: space[3], fontWeight: 600, color: colors.indigoPrimary }}>
                        {getProficiencyLabel(row.finalRating)}
                      </td>
                      <td style={{ padding: space[3] }}>
                        <GapBar requiredLevel={row.requiredLevel} finalRating={row.finalRating} />
                      </td>
                      <td style={{ padding: space[3], textAlign: "right" }}>
                        {row.gap !== null && row.gap > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleAddAsDevelopmentGoal(row.skill, row.requiredLevel ?? 4, row.finalRating)
                            }
                          >
                            + Development Goal
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCalibratingSkill(row.skill);
                              setCalibratedLevel((row.finalRating as ProficiencyLevelNumber) || 4);
                              setCalibrationJustification(row.assessment?.calibrationJustification || "");
                              setCalibrationError(null);
                            }}
                          >
                            Calibrate
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
      {/* TAB 2: MY SKILLS — SELF-RATING & EVIDENCE NOTES (§4, FR-SKILL-005)        */}
      {/* ========================================================================= */}
      {activeTab === "my_skills" && (
        <div style={{ display: "flex", flexDirection: "column", gap: space[5] }}>
          {/* Proficiency Scale Legend Banner (§3) */}
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              padding: space[4],
              boxShadow: shadows.sm,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: space[3] }}>
              <div>
                <h2 style={{ fontSize: text.h3.fontSize, fontWeight: text.h3.fontWeight, color: colors.textPrimary, margin: 0 }}>
                  Shared 5-Level Skill Proficiency Scale
                </h2>
                <span style={{ fontSize: text.small.fontSize, color: colors.textMuted }}>
                  Rate your own proficiency across all 20 skills (1–5) and attach verifiable evidence notes.
                </span>
              </div>
              <Badge variant="info" size="sm">ESS Personal Scope Only</Badge>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: space[3] }}>
              {SKILL_PROFICIENCY_SCALE.map((s) => (
                <div
                  key={s.level}
                  style={{
                    padding: space[3],
                    borderRadius: radii.sm,
                    backgroundColor: colors.surfaceSubtle,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div style={{ fontSize: text.bodyStrong.fontSize, fontWeight: 600, color: colors.indigoPrimary }}>
                    Level {s.level} · {s.label}
                  </div>
                  <div style={{ fontSize: text.small.fontSize, color: colors.textSecondary, marginTop: "2px" }}>
                    {s.descriptor}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5 Category Sections with 4 Skills each */}
          {SKILL_CATEGORIES.map((cat) => {
            const catSkills = skills.filter((s) => s.categoryCode === cat.code);
            return (
              <div
                key={cat.id}
                style={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.md,
                  overflow: "hidden",
                  boxShadow: shadows.sm,
                }}
              >
                <div
                  style={{
                    padding: space[4],
                    backgroundColor: colors.surfaceSubtle,
                    borderBottom: `1px solid ${colors.border}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: text.h3.fontSize, fontWeight: text.h3.fontWeight, color: colors.textPrimary, margin: 0 }}>
                      {cat.name} ({cat.code})
                    </h3>
                    <span style={{ fontSize: text.small.fontSize, color: colors.textSecondary }}>{cat.description}</span>
                  </div>
                  <Badge variant="neutral" size="sm">4 Skills</Badge>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  {catSkills.map((sk) => {
                    const rec = assessments.find((a) => a.skillCode === sk.code);
                    return (
                      <div
                        key={sk.id}
                        style={{
                          padding: space[4],
                          borderBottom: `1px solid ${colors.borderSubtle}`,
                          display: "grid",
                          gridTemplateColumns: "1.1fr 1.3fr 1fr",
                          gap: space[4],
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: colors.textPrimary }}>
                            <span style={{ color: colors.indigoAction, marginRight: space[1] }}>{sk.code}</span>
                            {sk.name}
                          </div>
                          <div style={{ fontSize: text.small.fontSize, color: colors.textMuted, marginTop: "2px" }}>
                            {sk.description}
                          </div>
                          <div style={{ fontSize: text.micro.fontSize, color: colors.textSecondary, marginTop: space[1] }}>
                            Manager Rating: <strong>{getProficiencyLabel(rec?.managerRating)}</strong> · Final:{" "}
                            <strong>{getProficiencyLabel(rec?.finalRating)}</strong>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: text.micro.fontSize, fontWeight: 600, color: colors.textMuted, marginBottom: space[1] }}>
                            MY SELF-RATING (1–5)
                          </div>
                          <SkillRating
                            value={rec?.selfRating ?? null}
                            onChange={(lvl) => handleUpdateSelfRating(sk.code, lvl)}
                            ariaLabel={`Self rating for ${sk.code} ${sk.name}`}
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: text.micro.fontSize,
                              fontWeight: 600,
                              color: colors.textMuted,
                              marginBottom: space[1],
                            }}
                          >
                            EVIDENCE NOTE
                          </label>
                          <input
                            type="text"
                            value={rec?.evidenceNote || ""}
                            onChange={(e) => handleUpdateEvidenceNote(sk.code, e.target.value)}
                            placeholder="Add deliverable or metric evidence..."
                            style={{
                              width: "100%",
                              height: "36px",
                              padding: `0 ${space[2]}`,
                              borderRadius: radii.sm,
                              border: `1px solid ${colors.border}`,
                              fontSize: text.small.fontSize,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: INTERNAL GIG BOARD ALIGNED TO 20-SKILL TAXONOMY (§6)               */}
      {/* ========================================================================= */}
      {activeTab === "gigs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: space[5] }}>
          {/* Shared Data Contract & Freshness Header (§6.1, §6.4) */}
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              padding: space[4],
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: space[3],
            }}
          >
            <div>
              <div style={{ fontSize: text.bodyStrong.fontSize, fontWeight: 600, color: colors.textPrimary }}>
                Shared 20-Skill Matching Engine
              </div>
              <div style={{ fontSize: text.small.fontSize, color: colors.textSecondary }}>
                Gig fit is computed directly from your latest verified <code>final_rating</code> against each gig&apos;s required skill codes (1.1–5.4). Only your own fit is displayed in ESS.
              </div>
            </div>

            
          </div>

          {/* Gig Cards Grid (§4.3 Card Anatomy) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))", gap: space[4] }}>
            {gigs.map((gig) => {
              const fit = computeGigFit(
                gig,
                assessments,
                simulateStaleDate ? "2027-09-01" : "2026-11-17"
              );

              const fitBadgeVariant =
                fit.tier === "Strong fit"
                  ? "success"
                  : fit.tier === "Partial fit"
                  ? "warning"
                  : "info";

              return (
                <div
                  key={gig.id}
                  style={{
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radii.md,
                    boxShadow: shadows.sm,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  {/* Card Header Row (space-4) */}
                  <div
                    style={{
                      padding: space[4],
                      borderBottom: `1px solid ${colors.borderSubtle}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: space[2],
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                      <Badge variant="neutral" size="sm">{gig.practice}</Badge>
                      <Badge variant={fitBadgeVariant} size="sm">
                        {fit.tier} ({fit.metCount}/{fit.totalRequired} Skills Met)
                      </Badge>
                    </div>

                    {fit.isStale ? (
                      <Badge variant="error" size="sm">
                        Stale Rating (&gt;12m · As of {formatDate(fit.asOfDate)})
                      </Badge>
                    ) : (
                      <span style={{ fontSize: text.micro.fontSize, color: colors.textMuted, fontVariantNumeric: "tabular-nums" }}>
                        Based on H1 2026 review ({formatDate(fit.asOfDate)})
                      </span>
                    )}
                  </div>

                  {/* Card Body (space-4) */}
                  <div style={{ padding: space[4] }}>
                    <h3 style={{ fontSize: text.h3.fontSize, fontWeight: text.h3.fontWeight, color: colors.textPrimary, margin: `0 0 ${space[1]} 0` }}>
                      {gig.title}
                    </h3>
                    <div style={{ fontSize: text.small.fontSize, color: colors.textSecondary, marginBottom: space[3] }}>
                      Lead: <strong>{gig.lead}</strong> · {gig.duration} ({gig.workload})
                    </div>

                    {/* Required Skills from the 20-Skill Taxonomy */}
                    <div style={{ fontSize: text.micro.fontSize, fontWeight: 600, color: colors.textMuted, marginBottom: space[2], textTransform: "uppercase" }}>
                      Required Skills &amp; Minimum Proficiency Levels
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: space[2], marginBottom: space[3] }}>
                      {gig.requiredSkills.map((req) => {
                        const sk = skills.find((s) => s.code === req.skillCode);
                        const myRec = assessments.find((a) => a.skillCode === req.skillCode);
                        const myLvl = myRec?.finalRating ?? null;
                        const met = myLvl !== null && myLvl >= req.minLevel;
                        return (
                          <div
                            key={req.skillCode}
                            style={{
                              padding: "4px 10px",
                              borderRadius: radii.sm,
                              backgroundColor: met ? colors.successBg : colors.warningBg,
                              border: `1px solid ${met ? colors.successBorder : colors.warningBorder}`,
                              fontSize: text.micro.fontSize,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            <strong>{req.skillCode}</strong> {sk?.name} · Req L{req.minLevel} / Mine:{" "}
                            <strong>{myLvl ? `L${myLvl}` : "Unassessed"}</strong> {met ? "✓" : `(&minus;${req.minLevel - (myLvl || 0)})`}
                          </div>
                        );
                      })}
                    </div>

                    {fit.deficits.length > 0 && (
                      <div style={{ fontSize: text.small.fontSize, color: colors.warning }}>
                        Skill gap flagged:{" "}
                        {fit.deficits.map((d) => `${d.skillCode} ${d.skillName} (−${d.deficit} lvl)`).join(", ")}
                      </div>
                    )}
                  </div>

                  {/* Card Footer Row (space-3) */}
                  <div
                    style={{
                      padding: `${space[3]} ${space[4]}`,
                      borderTop: `1px solid ${colors.borderSubtle}`,
                      backgroundColor: colors.surfaceSubtle,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: space[2],
                    }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedBaseline("gig_requirements");
                        setSelectedGigForBaseline(gig.id);
                        setActiveTab("gap_analysis");
                      }}
                    >
                      Compare in Gap Selector &rarr;
                    </Button>

                    <div style={{ display: "flex", gap: space[2] }}>
                      {gig.applied && !gig.completed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPostGigPromptGig(gig)}
                        >
                          Mark Gig Completed
                        </Button>
                      )}
                      <Button
                        variant={gig.applied ? "secondary" : "primary"}
                        size="sm"
                        disabled={gig.applied}
                        onClick={() => {
                          setGigs((prev) =>
                            prev.map((g) => (g.id === gig.id ? { ...g, applied: true } : g))
                          );
                          showToast(`Applied for "${gig.title}". Your verified skill profile was attached.`);
                        }}
                      >
                        {gig.completed ? "Completed ✓" : gig.applied ? "Applied ✓" : "Apply for Gig"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SYSTEM-SEEDED 20-SKILL TAXONOMY (§2, VAL-SKILL-001, TC-SKILL-02)   */}
      {/* ========================================================================= */}
      {activeTab === "framework" && (
        <div
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radii.md,
            overflow: "hidden",
            boxShadow: shadows.sm,
          }}
        >
          <div
            style={{
              padding: space[4],
              borderBottom: `1px solid ${colors.borderSubtle}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: space[3],
            }}
          >
            <div>
              <h2 style={{ fontSize: text.h3.fontSize, fontWeight: text.h3.fontWeight, color: colors.textPrimary, margin: 0 }}>
                Canonical Skills Framework (20 Skills · 5 Categories · 4 per Category)
              </h2>
              <span style={{ fontSize: text.small.fontSize, color: colors.textMuted }}>
                Standardized 20-skill framework across 5 categories. Authorized HR administrators may customize descriptions and role target levels.
              </span>
            </div>
            <Badge variant="neutral" size="sm">20 Skills · 5 Categories</Badge>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: text.body.fontSize, fontVariantNumeric: "tabular-nums" }}>
            <thead>
              <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, fontWeight: 600, color: colors.textSecondary, width: "80px" }}>CODE</th>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, fontWeight: 600, color: colors.textSecondary }}>SKILL NAME &amp; OBSERVABLE DESCRIPTOR</th>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, fontWeight: 600, color: colors.textSecondary }}>CATEGORY</th>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, fontWeight: 600, color: colors.textSecondary }}>ROLE REQ LEVEL</th>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, fontWeight: 600, color: colors.textSecondary, textAlign: "right" }}>CONFIGURE</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((sk) => {
                const reqLvl = roleProfiles.my_role.levels[sk.code];
                return (
                  <tr key={sk.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: space[3], fontWeight: 700, color: colors.indigoAction }}>{sk.code}</td>
                    <td style={{ padding: space[3] }}>
                      <div style={{ fontWeight: 600, color: colors.textPrimary }}>{sk.name}</div>
                      <div style={{ fontSize: text.small.fontSize, color: colors.textMuted, marginTop: "2px" }}>
                        {sk.description}
                      </div>
                    </td>
                    <td style={{ padding: space[3] }}>
                      <Badge variant="neutral" size="sm">
                        {sk.categoryCode} · {sk.categoryName.replace(/^\d+\.\s*/, "")}
                      </Badge>
                    </td>
                    <td style={{ padding: space[3], fontWeight: 600 }}>
                      {reqLvl ? getProficiencyLabel(reqLvl) : "Not required"}
                    </td>
                    <td style={{ padding: space[3], textAlign: "right" }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingSkill(sk);
                          setEditDescription(sk.description);
                          setEditRoleReqLevel(reqLvl ?? 4);
                        }}
                      >
                        Edit Role Profile
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: AGGREGATE SKILL HEATMAP (§10, §11.4, FR-SKILL-011)                 */}
      {/* ========================================================================= */}
      {activeTab === "team_heatmap" && (
        <div
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radii.md,
            padding: space[4],
            boxShadow: shadows.sm,
          }}
        >
          <div style={{ marginBottom: space[4] }}>
            <h2 style={{ fontSize: text.h3.fontSize, fontWeight: text.h3.fontWeight, color: colors.textPrimary, margin: 0 }}>
              5-Category Aggregate Skill Heatmap
            </h2>
            <p style={{ fontSize: text.small.fontSize, color: colors.textSecondary, margin: `${space[1]} 0 0 0` }}>
              Displays aggregate squad proficiency averages across the 5 canonical categories. Individual peer ratings are never exposed in ESS.
            </p>
          </div>

          <CategoryHeatmap rows={heatmapRows} caption="Organizational 5-Category Skill Heatmap" />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: POST-GIG REVERSE LINK SKILL UPDATE PROMPT (§6.3, TC-SKILL-15)    */}
      {/* ========================================================================= */}
      {postGigPromptGig && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="post-gig-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: space[4],
          }}
        >
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              maxWidth: "560px",
              width: "100%",
              boxShadow: shadows.modal,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: space[4], borderBottom: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.surfaceSubtle }}>
              <h3 id="post-gig-modal-title" style={{ fontSize: text.h3.fontSize, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
                Did this gig develop any skills? Update your self-rating for review.
              </h3>
              <span style={{ fontSize: text.small.fontSize, color: colors.textMuted }}>
                Completed Gig: {postGigPromptGig.title}
              </span>
            </div>

            <div style={{ padding: space[4], display: "flex", flexDirection: "column", gap: space[3] }}>
              {postGigPromptGig.requiredSkills.map((req) => {
                const sk = skills.find((s) => s.code === req.skillCode);
                const rec = assessments.find((a) => a.skillCode === req.skillCode);
                return (
                  <div
                    key={req.skillCode}
                    style={{
                      padding: space[3],
                      borderRadius: radii.sm,
                      border: `1px solid ${colors.border}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: space[2],
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: text.body.fontSize }}>
                        {req.skillCode} {sk?.name}
                      </div>
                      <div style={{ fontSize: text.micro.fontSize, color: colors.textMuted }}>
                        Current Self-Rating: {getProficiencyLabel(rec?.selfRating)}
                      </div>
                    </div>
                    <SkillRating
                      compact
                      value={rec?.selfRating ?? null}
                      onChange={(lvl) => handleUpdateSelfRating(req.skillCode, lvl)}
                    />
                  </div>
                );
              })}
            </div>

            <div
              style={{
                padding: space[4],
                borderTop: `1px solid ${colors.borderSubtle}`,
                display: "flex",
                justifyContent: "flex-end",
                gap: space[2],
              }}
            >
              <Button variant="outline" size="sm" onClick={() => setPostGigPromptGig(null)}>
                Skip for Now
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setGigs((prev) =>
                    prev.map((g) => (g.id === postGigPromptGig.id ? { ...g, completed: true } : g))
                  );
                  showToast(`Gig "${postGigPromptGig.title}" marked complete and self-ratings queued for next review.`);
                  setPostGigPromptGig(null);
                }}
              >
                Save Updated Self-Ratings
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: HR CALIBRATION FINAL RATING ADJUSTMENT (VAL-SKILL-005, TC-SKILL-05) */}
      {/* ========================================================================= */}
      {calibratingSkill && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: space[4],
          }}
        >
          <form
            onSubmit={handleSaveCalibration}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              maxWidth: "520px",
              width: "100%",
              boxShadow: shadows.modal,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: space[4], borderBottom: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.surfaceSubtle }}>
              <h3 style={{ fontSize: text.h3.fontSize, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
                Calibrate Final Skill Rating: {calibratingSkill.code} {calibratingSkill.name}
              </h3>
              <span style={{ fontSize: text.small.fontSize, color: colors.textMuted }}>
                Adjusting a final skill rating during calibration requires a documented justification.
              </span>
            </div>

            <div style={{ padding: space[4], display: "flex", flexDirection: "column", gap: space[3] }}>
              <div>
                <label style={{ display: "block", fontSize: text.small.fontSize, fontWeight: 600, marginBottom: space[1] }}>
                  Calibrated Final Proficiency Level (1–5)
                </label>
                <SkillRating value={calibratedLevel} onChange={setCalibratedLevel} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: text.small.fontSize, fontWeight: 600, marginBottom: space[1] }}>
                  Calibration Justification * (Mandatory)
                </label>
                <textarea
                  rows={3}
                  value={calibrationJustification}
                  onChange={(e) => {
                    setCalibrationJustification(e.target.value);
                    if (calibrationError) setCalibrationError(null);
                  }}
                  placeholder="Document calibration committee evidence for adjusting this skill rating..."
                  style={{
                    width: "100%",
                    padding: space[2],
                    borderRadius: radii.sm,
                    border: `1px solid ${calibrationError ? colors.error : colors.border}`,
                    fontSize: text.body.fontSize,
                  }}
                />
                {calibrationError && (
                  <div role="alert" style={{ color: colors.error, fontSize: text.small.fontSize, marginTop: space[1], fontWeight: 600 }}>
                    {calibrationError}
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: space[4], borderTop: `1px solid ${colors.borderSubtle}`, display: "flex", justifyContent: "flex-end", gap: space[2] }}>
              <Button variant="outline" size="sm" type="button" onClick={() => setCalibratingSkill(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Save Calibrated Rating
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT SKILL DESCRIPTION & ROLE REQUIRED LEVEL (VAL-SKILL-001)     */}
      {/* ========================================================================= */}
      {editingSkill && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: space[4],
          }}
        >
          <form
            onSubmit={handleSaveSkillMetadata}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              maxWidth: "500px",
              width: "100%",
              boxShadow: shadows.modal,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: space[4], borderBottom: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.surfaceSubtle }}>
              <h3 style={{ fontSize: text.h3.fontSize, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
                Configure {editingSkill.code} {editingSkill.name}
              </h3>
              <span style={{ fontSize: text.small.fontSize, color: colors.textMuted }}>
                Category: {editingSkill.categoryName} (System-Seeded v1)
              </span>
            </div>

            <div style={{ padding: space[4], display: "flex", flexDirection: "column", gap: space[3] }}>
              <div>
                <label style={{ display: "block", fontSize: text.small.fontSize, fontWeight: 600, marginBottom: space[1] }}>
                  Skill Behavioral Descriptor
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  style={{
                    width: "100%",
                    padding: space[2],
                    borderRadius: radii.sm,
                    border: `1px solid ${colors.border}`,
                    fontSize: text.body.fontSize,
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: text.small.fontSize, fontWeight: 600, marginBottom: space[1] }}>
                  Required Level for Role Profile (1–5 or Not Required)
                </label>
                <select
                  value={editRoleReqLevel === null ? "null" : String(editRoleReqLevel)}
                  onChange={(e) =>
                    setEditRoleReqLevel(e.target.value === "null" ? null : Number(e.target.value))
                  }
                  style={{
                    width: "100%",
                    height: "38px",
                    padding: `0 ${space[2]}`,
                    borderRadius: radii.sm,
                    border: `1px solid ${colors.border}`,
                    fontSize: text.body.fontSize,
                  }}
                >
                  <option value="null">Not required for this role</option>
                  {SKILL_PROFICIENCY_SCALE.map((s) => (
                    <option key={s.level} value={s.level}>
                      Level {s.level} — {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ padding: space[4], borderTop: `1px solid ${colors.borderSubtle}`, display: "flex", justifyContent: "flex-end", gap: space[2] }}>
              <Button variant="outline" size="sm" type="button" onClick={() => setEditingSkill(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Save Configuration
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

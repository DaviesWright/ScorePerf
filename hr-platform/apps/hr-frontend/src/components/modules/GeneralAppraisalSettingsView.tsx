"use client";

import React, { useState, useEffect } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Icons } from "../../design-system/Icons";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";

export interface GeneralAppraisalSettingsState {
  // Core Toggles
  seeBehaviouralCoreValueTotalScore: boolean;
  showFinalScoreOnAppraisalReport: boolean;
  seeFinalScoreOnAppraisalReportsPage: boolean;
  viewAppraisalReportDuringAppraisal: boolean;
  notifyAfterCountersigningEvaluated: boolean;
  lineManagersCanRejectSelfAppraisal: boolean;
  lineManagersSeeSurveyResponsesWhileReviewing: boolean;
  supervisorsRevealAfterArcReview: boolean;
  seeExceptionalAchievementsOnReportsPage: boolean;
  stateExceptionalAchievementsDuringAppraisals: boolean;
  lineManagersVerifyExceptionalAchievements: boolean;
  adminVerifyExceptionalAchievementsOutsideAppraisal: boolean;
  stateExceptionalAchievementsDuringReviews: boolean;
  seeNineBoxMatrixPositionOnReportsPage: boolean;
  scribesCanExportAppraisalReports: boolean;
  requireScoreAllObjectivesDuringAppraisals: boolean;
  requireScoreBehaviouralCoreValuesDuringAppraisals: boolean;
  lineManagersInputCommentWhenRevealingScore: boolean;
  seeAverageAppraisalScoreOnEssPage: boolean;
  nineBoxMatrixEnabled: boolean;
  participantsCanEditAnsweredSurvey: boolean;
  concealWeightOfCoreValuesDuringAppraisal: boolean;
  scoresCanExceed100PercentWhenExceedingTargets: boolean;
  enableMaximumAllowedScore: boolean;
  maximumAllowedScoreThreshold: number;
  hideCoreValueAndObjectiveBreakdownFromReport: boolean;

  // Percentage Scores
  percentageScoresShowDuringPerformanceReview: boolean;

  // Employee Information
  employeeInfoToDisplay: {
    employeeName: boolean;
    payGroup: boolean;
    timeOnPayGroup: boolean;
    disciplinaryHistory: boolean;
    employeeId: boolean;
    payGrade: boolean;
    timeOnPayGrade: boolean;
    department: boolean;
    jobRole: boolean;
    lastPromotionDate: boolean;
    timeOnJobRole: boolean;
    lengthOfService: boolean;
    confirmationDate: boolean;
  };

  // Recommendations
  recommendations: {
    displaySupervisorRecommendationToSubordinates: boolean;
    displaySupervisorCommentsToSubordinates: boolean;
    displayConcurrerRecommendationToSubordinates: boolean;
    displayConcurrerCommentsToSubordinates: boolean;
    displayDirectorRecommendationToSubordinates: boolean;
    displayDirectorCommentsToSubordinates: boolean;
    displayHodRecommendationToSubordinates: boolean;
    displayHodCommentsToSubordinates: boolean;
    displayAdminRecommendationToSubordinates: boolean;
    displayAdminCommentsToSubordinates: boolean;
    displayArcRecommendationToEmployees: boolean;
    displayArcCommentsToEmployees: boolean;
    displaySubordinateCommentsToLineManagers: boolean;
    displayPeerCommentsToEmployees: boolean;
    displayArcInfoToEmployees: boolean;
  };

  // Matrix Reviewer
  allowChangeMatrixReviewer: boolean;
  matrixReviewerRoles: {
    admin: boolean;
    supervisor: boolean;
    employee: boolean;
  };
  enableMatrixAppraisals: boolean;

  // Additional Appraisal Remark
  enableAdditionalRemarkForSupervisor: boolean;

  // Appraisal Calibration
  enableAppraisalCalibration: boolean;

  // Others
  notifyEmployeesWhenCycleCreated: boolean;
  decimalPointSelection: "0" | "1" | "2";
  coreValueAppraisalCommentsTiming: "Extreme Ratings" | "All Ratings" | "Not Required" | "Disabled";
  coreValueReviewCommentsTiming: "Extreme Ratings" | "All Ratings" | "Not Required" | "Disabled";
  enableDailyReportsDuringAppraisal: boolean;
}

export const DEFAULT_GENERAL_APPRAISAL_SETTINGS: GeneralAppraisalSettingsState = {
  seeBehaviouralCoreValueTotalScore: true,
  showFinalScoreOnAppraisalReport: true,
  seeFinalScoreOnAppraisalReportsPage: true,
  viewAppraisalReportDuringAppraisal: true,
  notifyAfterCountersigningEvaluated: true,
  lineManagersCanRejectSelfAppraisal: true,
  lineManagersSeeSurveyResponsesWhileReviewing: true,
  supervisorsRevealAfterArcReview: true,
  seeExceptionalAchievementsOnReportsPage: true,
  stateExceptionalAchievementsDuringAppraisals: true,
  lineManagersVerifyExceptionalAchievements: true,
  adminVerifyExceptionalAchievementsOutsideAppraisal: true,
  stateExceptionalAchievementsDuringReviews: true,
  seeNineBoxMatrixPositionOnReportsPage: true,
  scribesCanExportAppraisalReports: true,
  requireScoreAllObjectivesDuringAppraisals: true,
  requireScoreBehaviouralCoreValuesDuringAppraisals: true,
  lineManagersInputCommentWhenRevealingScore: true,
  seeAverageAppraisalScoreOnEssPage: true,
  nineBoxMatrixEnabled: true,
  participantsCanEditAnsweredSurvey: true,
  concealWeightOfCoreValuesDuringAppraisal: true,
  scoresCanExceed100PercentWhenExceedingTargets: true,
  enableMaximumAllowedScore: true,
  maximumAllowedScoreThreshold: 200,
  hideCoreValueAndObjectiveBreakdownFromReport: true,

  percentageScoresShowDuringPerformanceReview: true,

  employeeInfoToDisplay: {
    employeeName: true,
    payGroup: true,
    timeOnPayGroup: true,
    disciplinaryHistory: true,
    employeeId: true,
    payGrade: true,
    timeOnPayGrade: true,
    department: true,
    jobRole: true,
    lastPromotionDate: true,
    timeOnJobRole: true,
    lengthOfService: true,
    confirmationDate: true,
  },

  recommendations: {
    displaySupervisorRecommendationToSubordinates: true,
    displaySupervisorCommentsToSubordinates: true,
    displayConcurrerRecommendationToSubordinates: true,
    displayConcurrerCommentsToSubordinates: true,
    displayDirectorRecommendationToSubordinates: true,
    displayDirectorCommentsToSubordinates: true,
    displayHodRecommendationToSubordinates: true,
    displayHodCommentsToSubordinates: true,
    displayAdminRecommendationToSubordinates: true,
    displayAdminCommentsToSubordinates: true,
    displayArcRecommendationToEmployees: true,
    displayArcCommentsToEmployees: true,
    displaySubordinateCommentsToLineManagers: true,
    displayPeerCommentsToEmployees: true,
    displayArcInfoToEmployees: true,
  },

  allowChangeMatrixReviewer: true,
  matrixReviewerRoles: {
    admin: true,
    supervisor: true,
    employee: true,
  },
  enableMatrixAppraisals: true,

  enableAdditionalRemarkForSupervisor: true,
  enableAppraisalCalibration: true,

  notifyEmployeesWhenCycleCreated: true,
  decimalPointSelection: "0",
  coreValueAppraisalCommentsTiming: "All Ratings",
  coreValueReviewCommentsTiming: "All Ratings",
  enableDailyReportsDuringAppraisal: true,
};

const STORAGE_KEY = "scoreview_general_appraisal_settings";

export const GeneralAppraisalSettingsView: React.FC = () => {
  const [settings, setSettings] = useState<GeneralAppraisalSettingsState>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return { ...DEFAULT_GENERAL_APPRAISAL_SETTINGS, ...JSON.parse(saved) };
        } catch {
          // ignore error
        }
      }
    }
    return DEFAULT_GENERAL_APPRAISAL_SETTINGS;
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
    setToastMessage("General appraisal settings saved and broadcasted to active cycle engine.");
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleReset = () => {
    if (confirm("Reset all general appraisal settings to standard system defaults?")) {
      setSettings(DEFAULT_GENERAL_APPRAISAL_SETTINGS);
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
      }
      setToastMessage("Settings reset to defaults.");
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const toggleCoreSetting = (key: keyof GeneralAppraisalSettingsState) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleEmployeeInfo = (key: keyof GeneralAppraisalSettingsState["employeeInfoToDisplay"]) => {
    setSettings((prev) => ({
      ...prev,
      employeeInfoToDisplay: {
        ...prev.employeeInfoToDisplay,
        [key]: !prev.employeeInfoToDisplay[key],
      },
    }));
  };

  const toggleRecommendation = (key: keyof GeneralAppraisalSettingsState["recommendations"]) => {
    setSettings((prev) => ({
      ...prev,
      recommendations: {
        ...prev.recommendations,
        [key]: !prev.recommendations[key],
      },
    }));
  };

  const setAllEmployeeInfo = (enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      employeeInfoToDisplay: Object.keys(prev.employeeInfoToDisplay).reduce((acc, k) => {
        acc[k as keyof GeneralAppraisalSettingsState["employeeInfoToDisplay"]] = enabled;
        return acc;
      }, {} as GeneralAppraisalSettingsState["employeeInfoToDisplay"]),
    }));
  };

  const setAllRecommendations = (enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      recommendations: Object.keys(prev.recommendations).reduce((acc, k) => {
        acc[k as keyof GeneralAppraisalSettingsState["recommendations"]] = enabled;
        return acc;
      }, {} as GeneralAppraisalSettingsState["recommendations"]),
    }));
  };

  // Section style constants
  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    border: `1px solid ${colors.border}`,
    padding: "1.5rem",
    boxShadow: shadows.xs,
    marginBottom: "1.5rem",
  };

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: typography.sizes.sm,
    fontWeight: 800,
    color: colors.indigoPrimary,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: "0.35rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  const infoBoxStyle: React.CSSProperties = {
    padding: "0.75rem 1rem",
    borderRadius: radii.md,
    backgroundColor: "rgba(99, 102, 241, 0.05)",
    border: `1px solid rgba(99, 102, 241, 0.2)`,
    display: "flex",
    gap: "0.6rem",
    alignItems: "flex-start",
    fontSize: "12px",
    color: colors.textSecondary,
    lineHeight: 1.5,
    margin: "0.75rem 0",
  };

  const itemRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.6rem 0",
    borderBottom: `1px solid ${colors.borderSubtle}`,
    fontSize: typography.sizes.xs,
    color: colors.textPrimary,
  };

  const checkboxLabelStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    cursor: "pointer",
    userSelect: "none",
    flex: 1,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Top Banner & Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "0.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
              General Appraisal Settings
            </h2>
            <Badge variant="info" size="sm">Cycle-Wide Policy</Badge>
          </div>
          <p style={{ margin: 0, fontSize: typography.sizes.xs, color: colors.textMuted }}>
            Manage universal scoring requirements, rater visibility rules, employee report information, recommendation disclosures, and calibration thresholds.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} style={{ backgroundColor: colors.indigoAction }}>
            <Icons.Check size={14} />
            Save Appraisal Settings
          </Button>
        </div>
      </div>

      {toastMessage && (
        <div
          role="status"
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "#ecfdf5",
            border: "1px solid #10b981",
            borderRadius: radii.md,
            color: "#065f46",
            fontSize: typography.sizes.xs,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Icons.Check size={16} />
          {toastMessage}
        </div>
      )}

      {/* 1. CORE GENERAL APPRAISAL TOGGLES */}
      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <span>General Appraisal Core Parameters</span>
          <span style={{ fontSize: "11px", fontWeight: 600, color: colors.textMuted, textTransform: "none" }}>
            25 Policies Active
          </span>
        </div>
        <p style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
          Master operational switches governing employee visibility, rater workflows, achievement capture, and scoring boundaries.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 2rem" }}>
          {/* Column 1 */}
          <div>
            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.seeBehaviouralCoreValueTotalScore}
                  onChange={() => toggleCoreSetting("seeBehaviouralCoreValueTotalScore")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Employees can see the total score of their behavioural/core value assessment.</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.showFinalScoreOnAppraisalReport}
                  onChange={() => toggleCoreSetting("showFinalScoreOnAppraisalReport")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span style={{ fontWeight: 600 }}>Show final score on appraisal report</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.seeFinalScoreOnAppraisalReportsPage}
                  onChange={() => toggleCoreSetting("seeFinalScoreOnAppraisalReportsPage")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Employees can see their final score on their appraisal reports page.</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.viewAppraisalReportDuringAppraisal}
                  onChange={() => toggleCoreSetting("viewAppraisalReportDuringAppraisal")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Employees can view their appraisal report during an appraisal.</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.notifyAfterCountersigningEvaluated}
                  onChange={() => toggleCoreSetting("notifyAfterCountersigningEvaluated")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Employees are notified after the countersigning officer has evaluated their appraisals.</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.lineManagersCanRejectSelfAppraisal}
                  onChange={() => toggleCoreSetting("lineManagersCanRejectSelfAppraisal")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Line managers can reject an employees self-appraisal.</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.lineManagersSeeSurveyResponsesWhileReviewing}
                  onChange={() => toggleCoreSetting("lineManagersSeeSurveyResponsesWhileReviewing")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Line managers can see the survey responses of an employee while reviewing their appraisals.</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.supervisorsRevealAfterArcReview}
                  onChange={() => toggleCoreSetting("supervisorsRevealAfterArcReview")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Supervisors reveal appraisal evaluations to employees after ARC's review.</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.seeExceptionalAchievementsOnReportsPage}
                  onChange={() => toggleCoreSetting("seeExceptionalAchievementsOnReportsPage")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Employees can see their exceptional achievements on their appraisal reports page.</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.stateExceptionalAchievementsDuringAppraisals}
                  onChange={() => toggleCoreSetting("stateExceptionalAchievementsDuringAppraisals")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Employees and line managers state exceptional achievements during appraisals.</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.lineManagersVerifyExceptionalAchievements}
                  onChange={() => toggleCoreSetting("lineManagersVerifyExceptionalAchievements")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Line managers should verify exceptional achievements given by the employee, peers or subordinate during appraisals/performance review.</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.adminVerifyExceptionalAchievementsOutsideAppraisal}
                  onChange={() => toggleCoreSetting("adminVerifyExceptionalAchievementsOutsideAppraisal")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Admin can verify exceptional achievement given to an employee outside of an appraisal.</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.stateExceptionalAchievementsDuringReviews}
                  onChange={() => toggleCoreSetting("stateExceptionalAchievementsDuringReviews")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Employees and line managers state exceptional achievements during performance reviews.</span>
              </label>
            </div>
          </div>

          {/* Column 2 */}
          <div>
            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.seeNineBoxMatrixPositionOnReportsPage}
                  onChange={() => toggleCoreSetting("seeNineBoxMatrixPositionOnReportsPage")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Employees can see their nine-box matrix position on their appraisal reports page.</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.scribesCanExportAppraisalReports}
                  onChange={() => toggleCoreSetting("scribesCanExportAppraisalReports")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Scribes can export appraisal reports.</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.requireScoreAllObjectivesDuringAppraisals}
                  onChange={() => toggleCoreSetting("requireScoreAllObjectivesDuringAppraisals")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span style={{ fontWeight: 600 }}>Employees are required to score all their objectives during appraisals.</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.requireScoreBehaviouralCoreValuesDuringAppraisals}
                  onChange={() => toggleCoreSetting("requireScoreBehaviouralCoreValuesDuringAppraisals")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span style={{ fontWeight: 600 }}>Employees are required to score their behavioural/core values during appraisals.</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.lineManagersInputCommentWhenRevealingScore}
                  onChange={() => toggleCoreSetting("lineManagersInputCommentWhenRevealingScore")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Line managers input a comment when revealing an employee's appraisal score.</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.seeAverageAppraisalScoreOnEssPage}
                  onChange={() => toggleCoreSetting("seeAverageAppraisalScoreOnEssPage")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Employees can see their average appraisal score on the ESS appraisal page.</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.nineBoxMatrixEnabled}
                  onChange={() => toggleCoreSetting("nineBoxMatrixEnabled")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span style={{ fontWeight: 600 }}>The nine-box matrix is enabled.</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.participantsCanEditAnsweredSurvey}
                  onChange={() => toggleCoreSetting("participantsCanEditAnsweredSurvey")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Participants in an appraisal can edit answered survey</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.concealWeightOfCoreValuesDuringAppraisal}
                  onChange={() => toggleCoreSetting("concealWeightOfCoreValuesDuringAppraisal")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Conceal the weight of core values for employees during appraisal</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.scoresCanExceed100PercentWhenExceedingTargets}
                  onChange={() => toggleCoreSetting("scoresCanExceed100PercentWhenExceedingTargets")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Employee’s appraisal scores can go above 100% when they exceed targets.</span>
              </label>
            </div>

            {/* Threshold container */}
            <div style={{ ...itemRowStyle, flexDirection: "column", alignItems: "flex-start", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <label style={checkboxLabelStyle}>
                  <input
                    type="checkbox"
                    checked={settings.enableMaximumAllowedScore}
                    onChange={() => toggleCoreSetting("enableMaximumAllowedScore")}
                    style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                  />
                  <span style={{ fontWeight: 700 }}>Enable maximum allowed score (%)</span>
                </label>
              </div>

              {settings.enableMaximumAllowedScore && (
                <div style={{ paddingLeft: "1.75rem", display: "flex", alignItems: "center", gap: "0.75rem", width: "100%" }}>
                  <span style={{ fontSize: "11px", color: colors.textSecondary, fontWeight: 600 }}>Threshold value:</span>
                  <input
                    type="number"
                    min="100"
                    max="500"
                    value={settings.maximumAllowedScoreThreshold}
                    onChange={(e) => setSettings({ ...settings, maximumAllowedScoreThreshold: Number(e.target.value) || 200 })}
                    style={{
                      width: "80px",
                      padding: "0.25rem 0.5rem",
                      borderRadius: radii.sm,
                      border: `1px solid ${colors.border}`,
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  />
                  <span style={{ fontSize: "11px", color: colors.textMuted }}>%</span>
                </div>
              )}
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.hideCoreValueAndObjectiveBreakdownFromReport}
                  onChange={() => toggleCoreSetting("hideCoreValueAndObjectiveBreakdownFromReport")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Hide Core value/Behavioural and objective breakdown from appraisal report.</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PERCENTAGE SCORES */}
      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <span>Percentage Scores</span>
        </div>
        <div style={itemRowStyle}>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={settings.percentageScoresShowDuringPerformanceReview}
              onChange={() => toggleCoreSetting("percentageScoresShowDuringPerformanceReview")}
              style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
            />
            <span style={{ fontWeight: 700 }}>Percentage scores can show during a performance review</span>
          </label>
        </div>
        <div style={infoBoxStyle}>
          <Icons.Info size={16} color={colors.indigoPrimary} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            When percentage scores are enabled, numerical percentages will be displayed alongside ratings for objectives, core values, and skills (if applicable) during performance reviews.
          </span>
        </div>
      </div>

      {/* 3. EMPLOYEE INFORMATION */}
      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <span>Employee Information</span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => setAllEmployeeInfo(true)}
              style={{ background: "none", border: "none", color: colors.indigoAction, cursor: "pointer", fontSize: "11px", fontWeight: 700 }}
            >
              Select All
            </button>
            <span style={{ color: colors.border }}>|</span>
            <button
              type="button"
              onClick={() => setAllEmployeeInfo(false)}
              style={{ background: "none", border: "none", color: colors.textMuted, cursor: "pointer", fontSize: "11px", fontWeight: 600 }}
            >
              Clear
            </button>
          </div>
        </div>
        <p style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
          Select the employee information to be displayed on the appraisal report page
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.6rem 1.25rem" }}>
          {[
            { key: "employeeName", label: "Employee’s name" },
            { key: "payGroup", label: "Pay group" },
            { key: "timeOnPayGroup", label: "Time on pay group" },
            { key: "disciplinaryHistory", label: "Disciplinary history" },
            { key: "employeeId", label: "Employee ID" },
            { key: "payGrade", label: "Pay grade" },
            { key: "timeOnPayGrade", label: "Time on pay grade" },
            { key: "department", label: "Department" },
            { key: "jobRole", label: "Job role" },
            { key: "lastPromotionDate", label: "Last promotion date" },
            { key: "timeOnJobRole", label: "Time on job role" },
            { key: "lengthOfService", label: "Length of service" },
            { key: "confirmationDate", label: "Confirmation date" },
          ].map((item) => (
            <label
              key={item.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: typography.sizes.xs,
                color: colors.textPrimary,
                cursor: "pointer",
                padding: "0.35rem 0.5rem",
                borderRadius: radii.sm,
                backgroundColor: settings.employeeInfoToDisplay[item.key as keyof GeneralAppraisalSettingsState["employeeInfoToDisplay"]] ? "#f8fafc" : "transparent",
              }}
            >
              <input
                type="checkbox"
                checked={settings.employeeInfoToDisplay[item.key as keyof GeneralAppraisalSettingsState["employeeInfoToDisplay"]]}
                onChange={() => toggleEmployeeInfo(item.key as keyof GeneralAppraisalSettingsState["employeeInfoToDisplay"])}
                style={{ width: 15, height: 15, accentColor: colors.indigoAction, cursor: "pointer" }}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 4. RECOMMENDATIONS & REMARKS */}
      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <span>Recommendations</span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => setAllRecommendations(true)}
              style={{ background: "none", border: "none", color: colors.indigoAction, cursor: "pointer", fontSize: "11px", fontWeight: 700 }}
            >
              Enable All
            </button>
            <span style={{ color: colors.border }}>|</span>
            <button
              type="button"
              onClick={() => setAllRecommendations(false)}
              style={{ background: "none", border: "none", color: colors.textMuted, cursor: "pointer", fontSize: "11px", fontWeight: 600 }}
            >
              Disable All
            </button>
          </div>
        </div>
        <p style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
          Control multi-tier review visibility and disclosure permissions across reviewers, supervisors, directors, and the Appraisal Review Committee (ARC).
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 2rem" }}>
          <div>
            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.recommendations.displaySupervisorRecommendationToSubordinates}
                  onChange={() => toggleRecommendation("displaySupervisorRecommendationToSubordinates")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Display supervisor/reviewer’s recommendation to their subordinates</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.recommendations.displaySupervisorCommentsToSubordinates}
                  onChange={() => toggleRecommendation("displaySupervisorCommentsToSubordinates")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Display supervisor/reviewer’s comments to their subordinates</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.recommendations.displayConcurrerRecommendationToSubordinates}
                  onChange={() => toggleRecommendation("displayConcurrerRecommendationToSubordinates")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Display concurrer’s recommendation to their subordinates</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.recommendations.displayConcurrerCommentsToSubordinates}
                  onChange={() => toggleRecommendation("displayConcurrerCommentsToSubordinates")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Display concurrer’s comments to their subordinates</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.recommendations.displayDirectorRecommendationToSubordinates}
                  onChange={() => toggleRecommendation("displayDirectorRecommendationToSubordinates")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Display director’s recommendation to their subordinates</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.recommendations.displayDirectorCommentsToSubordinates}
                  onChange={() => toggleRecommendation("displayDirectorCommentsToSubordinates")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Display director’s comments to their subordinates</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.recommendations.displayHodRecommendationToSubordinates}
                  onChange={() => toggleRecommendation("displayHodRecommendationToSubordinates")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Display HOD's recommendation to their subordinates</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.recommendations.displayHodCommentsToSubordinates}
                  onChange={() => toggleRecommendation("displayHodCommentsToSubordinates")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Display HOD's comments to their subordinates</span>
              </label>
            </div>
          </div>

          <div>
            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.recommendations.displayAdminRecommendationToSubordinates}
                  onChange={() => toggleRecommendation("displayAdminRecommendationToSubordinates")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Display admin's recommendation to their subordinates</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.recommendations.displayAdminCommentsToSubordinates}
                  onChange={() => toggleRecommendation("displayAdminCommentsToSubordinates")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Display admin's comments to their subordinates</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.recommendations.displayArcRecommendationToEmployees}
                  onChange={() => toggleRecommendation("displayArcRecommendationToEmployees")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Display ARC’s recommendation to employees</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.recommendations.displayArcCommentsToEmployees}
                  onChange={() => toggleRecommendation("displayArcCommentsToEmployees")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Display ARC’s comments to employees</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.recommendations.displaySubordinateCommentsToLineManagers}
                  onChange={() => toggleRecommendation("displaySubordinateCommentsToLineManagers")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Display subordinate’s comments to their line manager/supervisors</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.recommendations.displayPeerCommentsToEmployees}
                  onChange={() => toggleRecommendation("displayPeerCommentsToEmployees")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Display peer’s comments to employee’s</span>
              </label>
            </div>

            <div style={itemRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.recommendations.displayArcInfoToEmployees}
                  onChange={() => toggleRecommendation("displayArcInfoToEmployees")}
                  style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>Display ARC's information to employees</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 5. MATRIX REVIEWER & MATRIX APPRAISALS */}
      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <span>Matrix Reviewer & Matrix Appraisals</span>
        </div>

        <div style={{ ...itemRowStyle, flexDirection: "column", alignItems: "flex-start", gap: "0.6rem" }}>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={settings.allowChangeMatrixReviewer}
              onChange={() => toggleCoreSetting("allowChangeMatrixReviewer")}
              style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
            />
            <span style={{ fontWeight: 700 }}>Allow admins, supervisors, or employees to change the matrix reviewer for active objectives or ongoing appraisals</span>
          </label>

          {settings.allowChangeMatrixReviewer && (
            <div style={{ paddingLeft: "1.75rem", display: "flex", flexDirection: "column", gap: "0.4rem", width: "100%" }}>
              <span style={{ fontSize: "11px", color: colors.textSecondary, fontWeight: 600 }}>
                Select the role(s) allowed to change the matrix reviewer:
              </span>
              <div style={{ display: "flex", gap: "1.5rem" }}>
                {(["admin", "supervisor", "employee"] as const).map((roleKey) => (
                  <label key={roleKey} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: typography.sizes.xs, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={settings.matrixReviewerRoles[roleKey]}
                      onChange={() =>
                        setSettings({
                          ...settings,
                          matrixReviewerRoles: {
                            ...settings.matrixReviewerRoles,
                            [roleKey]: !settings.matrixReviewerRoles[roleKey],
                          },
                        })
                      }
                      style={{ width: 14, height: 14, accentColor: colors.indigoAction, cursor: "pointer" }}
                    />
                    <span style={{ textTransform: "capitalize" }}>{roleKey}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: `1px solid ${colors.borderSubtle}` }}>
          <div style={itemRowStyle}>
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={settings.enableMatrixAppraisals}
                onChange={() => toggleCoreSetting("enableMatrixAppraisals")}
                style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
              />
              <span style={{ fontWeight: 700 }}>Enable matrix appraisals</span>
            </label>
          </div>
          <div style={infoBoxStyle}>
            <Icons.Info size={16} color={colors.indigoPrimary} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Enabling matrix appraisals will allow employees' objectives to be appraised by multiple reviewers other than their line manager.
            </span>
          </div>
        </div>
      </div>

      {/* 6. ADDITIONAL APPRAISAL REMARK */}
      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <span>Additional Appraisal Remark</span>
        </div>
        <div style={itemRowStyle}>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={settings.enableAdditionalRemarkForSupervisor}
              onChange={() => toggleCoreSetting("enableAdditionalRemarkForSupervisor")}
              style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
            />
            <span style={{ fontWeight: 700 }}>Enable additional remark for supervisor</span>
          </label>
        </div>
      </div>

      {/* 7. APPRAISAL CALIBRATION */}
      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <span>Appraisal Calibration</span>
        </div>
        <div style={itemRowStyle}>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={settings.enableAppraisalCalibration}
              onChange={() => toggleCoreSetting("enableAppraisalCalibration")}
              style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
            />
            <span style={{ fontWeight: 700 }}>Enable appraisal calibration</span>
          </label>
        </div>
        <div style={infoBoxStyle}>
          <Icons.Info size={16} color={colors.indigoPrimary} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Appraisal calibration allows you to adjust an employee's performance score based on the organization's standards. This can only happen when the employee's appraisal has been completed.
          </span>
        </div>
      </div>

      {/* 8. OTHERS & CYCLE OPERATIONS */}
      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <span>Others & Cycle Policies</span>
        </div>

        <div style={itemRowStyle}>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={settings.notifyEmployeesWhenCycleCreated}
              onChange={() => toggleCoreSetting("notifyEmployeesWhenCycleCreated")}
              style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
            />
            <span style={{ fontWeight: 600 }}>Notify all employees when an appraisal cycle is created</span>
          </label>
        </div>

        {/* Decimal Point Selection */}
        <div style={{ ...itemRowStyle, flexDirection: "column", alignItems: "flex-start", gap: "0.4rem", padding: "0.85rem 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
              Select decimal point
            </span>
            <select
              value={settings.decimalPointSelection}
              onChange={(e) => setSettings({ ...settings, decimalPointSelection: e.target.value as "0" | "1" | "2" })}
              style={{
                padding: "0.3rem 0.6rem",
                borderRadius: radii.sm,
                border: `1px solid ${colors.border}`,
                fontSize: "12px",
                fontWeight: 600,
                backgroundColor: colors.surface,
              }}
            >
              <option value="0">0 (Nearest whole number)</option>
              <option value="1">1 decimal place (0.0)</option>
              <option value="2">2 decimal places (0.00)</option>
            </select>
          </div>
          <div style={infoBoxStyle}>
            <Icons.Info size={16} color={colors.indigoPrimary} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Start value, actual value, target value, weight and final score should be rounded up to the nearest whole number
            </span>
          </div>
        </div>

        {/* Core Value Comments Timing */}
        <div style={{ padding: "0.85rem 0", borderBottom: `1px solid ${colors.borderSubtle}` }}>
          <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary, marginBottom: "0.5rem" }}>
            When should comments on a core value appraisal be inputted?
          </div>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
            {(["Extreme Ratings", "All Ratings", "Not Required", "Disabled"] as const).map((opt) => (
              <label key={opt} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: typography.sizes.xs, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="coreValueAppraisalCommentsTiming"
                  value={opt}
                  checked={settings.coreValueAppraisalCommentsTiming === opt}
                  onChange={() => setSettings({ ...settings, coreValueAppraisalCommentsTiming: opt })}
                  style={{ accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
          {settings.coreValueAppraisalCommentsTiming === "Disabled" && (
            <div style={{ fontSize: "11px", color: colors.textMuted, fontStyle: "italic" }}>
              info: Employees will not be able to make comments.
            </div>
          )}
        </div>

        {/* Core Value Comments Timing for Performance Review */}
        <div style={{ padding: "0.85rem 0", borderBottom: `1px solid ${colors.borderSubtle}` }}>
          <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary, marginBottom: "0.5rem" }}>
            When should comments on a core value for performance review be inputted?
          </div>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
            {(["Extreme Ratings", "All Ratings", "Not Required", "Disabled"] as const).map((opt) => (
              <label key={opt} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: typography.sizes.xs, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="coreValueReviewCommentsTiming"
                  value={opt}
                  checked={settings.coreValueReviewCommentsTiming === opt}
                  onChange={() => setSettings({ ...settings, coreValueReviewCommentsTiming: opt })}
                  style={{ accentColor: colors.indigoAction, cursor: "pointer" }}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
          {settings.coreValueReviewCommentsTiming === "Disabled" && (
            <div style={{ fontSize: "11px", color: colors.textMuted, fontStyle: "italic" }}>
              info: Employees will not be able to make comments.
            </div>
          )}
        </div>

        {/* Active Appraisal Specific Setting */}
        <div style={{ marginTop: "1rem", padding: "1rem", borderRadius: radii.md, backgroundColor: "#f8fafc", border: `1px dashed ${colors.border}` }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: colors.indigoAction, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>
            This setting will only be active during appraisal
          </div>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={settings.enableDailyReportsDuringAppraisal}
              onChange={() => toggleCoreSetting("enableDailyReportsDuringAppraisal")}
              style={{ width: 16, height: 16, accentColor: colors.indigoAction, cursor: "pointer" }}
            />
            <span style={{ fontWeight: 700 }}>Enable daily reports during appraisal</span>
          </label>
        </div>
      </div>

      {/* Bottom Sticky Save Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 1.5rem",
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.sm,
        }}
      >
        <div style={{ fontSize: "12px", color: colors.textMuted }}>
          All toggles and rules take immediate effect for active and draft appraisal cycles.
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} style={{ backgroundColor: colors.indigoAction }}>
            <Icons.Check size={14} />
            Save Appraisal Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

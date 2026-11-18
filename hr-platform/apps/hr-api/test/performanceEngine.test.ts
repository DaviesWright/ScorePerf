import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateGoalScore,
  calculateMeasureScore,
  canTransitionAssessmentStage,
  canTransitionGoalStatus,
  validateAlignmentLink,
  validateFrameworkGoal,
  validateGoalWeights,
} from "@hr-platform/shared";

describe("performanceEngine [BE-1]", () => {
  it("PM-002: validates goal weights summing to 100% within tolerance", () => {
    const ok = validateGoalWeights([
      { goalId: "G1", weightPct: 40 },
      { goalId: "G2", weightPct: 35 },
      { goalId: "G3", weightPct: 25 },
    ]);
    assert.equal(ok.valid, true);
    assert.equal(ok.totalWeight, 100);

    const bad = validateGoalWeights([
      { goalId: "G1", weightPct: 40 },
      { goalId: "G2", weightPct: 55 },
    ]);
    assert.equal(bad.valid, false);
    assert.equal(bad.code, "PERF_WEIGHTS_INVALID");
    assert.equal(bad.totalWeight, 95);
  });

  it("PM-004 & D4/D5: detects alignment loops, self-loops, cycle mismatches, and skip-level links", () => {
    const existing = [
      { childGoalId: "G2", parentGoalId: "G1", childCycleId: "C1", parentCycleId: "C1" },
      { childGoalId: "G3", parentGoalId: "G2", childCycleId: "C1", parentCycleId: "C1" },
    ];

    const loop = validateAlignmentLink(existing, {
      childGoalId: "G1",
      parentGoalId: "G3",
      childCycleId: "C1",
      parentCycleId: "C1",
    });
    assert.equal(loop.valid, false);
    assert.equal(loop.code, "PERF_ALIGNMENT_LOOP");

    const self = validateAlignmentLink(existing, {
      childGoalId: "G1",
      parentGoalId: "G1",
    });
    assert.equal(self.valid, false);
    assert.equal(self.code, "PERF_ALIGNMENT_SELF");

    const mismatch = validateAlignmentLink(existing, {
      childGoalId: "G4",
      parentGoalId: "G1",
      childCycleId: "C2",
      parentCycleId: "C1",
    });
    assert.equal(mismatch.valid, false);
    assert.equal(mismatch.code, "PERF_CYCLE_MISMATCH");

    const skip = validateAlignmentLink(existing, {
      childGoalId: "G4",
      parentGoalId: "G1",
      childCycleId: "C1",
      parentCycleId: "C1",
      childLevel: 4,
      parentLevel: 1,
    });
    assert.equal(skip.valid, true);
    assert.equal(skip.skipLevel, true);
  });

  it("PM-001 & D1: enforces single framework per cycle and framework-specific rules", () => {
    const bscBad = validateFrameworkGoal({
      cycleFramework: "BSC",
      goalFramework: "OKR",
    });
    assert.equal(bscBad.valid, false);

    const bscMissingPerspective = validateFrameworkGoal({
      cycleFramework: "BSC",
      goalFramework: "BSC",
      perspectiveCode: null,
    });
    assert.equal(bscMissingPerspective.valid, false);

    const okrOrphan = validateFrameworkGoal({
      cycleFramework: "OKR",
      goalFramework: "OKR",
      keyResultsCount: 3,
      isCompanyRoot: false,
      hasParentAlignment: false,
    });
    assert.equal(okrOrphan.valid, false);

    const okrValid = validateFrameworkGoal({
      cycleFramework: "OKR",
      goalFramework: "OKR",
      keyResultsCount: 4,
      isCompanyRoot: false,
      hasParentAlignment: true,
    });
    assert.equal(okrValid.valid, true);
  });

  it("§7.2: computes Ratio, Gap-to-Target, Staircase, Binary, and Milestone scores deterministically", () => {
    assert.equal(
      calculateMeasureScore({
        measureId: "M1",
        rule: "RATIO",
        baseline: 50,
        target: 100,
        actual: 75,
        weightPct: 100,
      }).rawScore,
      0.5,
    );

    assert.equal(
      calculateMeasureScore({
        measureId: "M2",
        rule: "GAP_TO_TARGET",
        baseline: 0,
        target: 80,
        actual: 60,
        weightPct: 100,
      }).rawScore,
      0.75,
    );

    assert.equal(
      calculateMeasureScore({
        measureId: "M3",
        rule: "STAIRCASE",
        baseline: 0,
        target: 100,
        actual: 82,
        weightPct: 100,
        staircaseBands: [
          { minActual: 90, score: 1.0 },
          { minActual: 80, score: 0.8 },
          { minActual: 60, score: 0.5 },
        ],
      }).rawScore,
      0.8,
    );

    assert.equal(
      calculateMeasureScore({
        measureId: "M4",
        rule: "BINARY",
        baseline: 0,
        target: 1,
        actual: 1,
        weightPct: 100,
        binaryMet: true,
      }).rawScore,
      1,
    );

    assert.equal(
      calculateMeasureScore({
        measureId: "M5",
        rule: "MILESTONE",
        baseline: 0,
        target: 4,
        actual: 3,
        completedMilestones: 3,
        totalMilestones: 4,
        weightPct: 100,
      }).rawScore,
      0.75,
    );
  });

  it("§7.3 & PM-006/PM-007: produces deterministic goal calculation snapshot", () => {
    const snap = calculateGoalScore({
      goalId: "G-101",
      framework: "OKR",
      profileVersionId: "PROF-OKR-v1",
      ruleVersion: "2026.1",
      cycleId: "CYC-2026-Q4",
      actorId: "EMP-1",
      computedAt: "2026-11-18T00:00:00Z",
      measures: [
        { measureId: "KR1", rule: "RATIO", baseline: 0, target: 100, actual: 70, weightPct: 50 },
        { measureId: "KR2", rule: "MILESTONE", baseline: 0, target: 4, actual: 3, completedMilestones: 3, totalMilestones: 4, weightPct: 50 },
      ],
    });
    assert.equal(snap.normalizedScoreZeroToOne, 0.725);
    assert.equal(snap.percentageScore, 72.5);
    assert.equal(snap.okrStretchStatus, "ON_TRACK_STRETCH");
  });

  it("PM-005, PM-008, PM-009, PM-010: enforces self-approval block and assessment stage locks", () => {
    const selfApprove = canTransitionGoalStatus({
      from: "PENDING_APPROVAL",
      to: "ACTIVE",
      actorIsOwner: true,
      actorIsApprover: false,
    });
    assert.equal(selfApprove.allowed, false);
    assert.equal(selfApprove.code, "PM-008");

    const mgrBeforeSelf = canTransitionAssessmentStage({
      from: "SELF_PENDING",
      to: "MANAGER_COMPLETE",
    });
    assert.equal(mgrBeforeSelf.allowed, false);
    assert.equal(mgrBeforeSelf.code, "PM-009");

    const locked = canTransitionAssessmentStage({
      from: "FINALIZED",
      to: "CALIBRATION_PENDING",
    });
    assert.equal(locked.allowed, false);
    assert.equal(locked.code, "PM-010");
  });
});

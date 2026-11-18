// ==============================================================================
// ScoreviewHR — Deterministic Performance Management Domain Engine ([BE-1])
// Pure TypeScript (zero DB or I/O dependencies).
// Implements Blueprint §6, §7.1 (PM-001..PM-025), §7.2 (Scoring), §7.3 (Snapshots):
//   - Weight-sum validation (PM-002)
//   - Acyclic alignment graph validation + skip-level detection (PM-004, D4/D5)
//   - Framework profile enforcement (PM-001, D1: one framework per cycle)
//   - Deterministic scoring: Ratio, Gap-to-Target, Staircase, Binary, Milestone
//   - Rule-version pinning & immutable calculation snapshots (PM-006, PM-007)
//   - Goal & Assessment state-machine guards (PM-005, PM-008, PM-009, PM-010)
// ==============================================================================

export type PerformanceFramework = "BSC" | "OKR" | "MBO";

export type ScoringRuleType =
  | "RATIO"
  | "GAP_TO_TARGET"
  | "STAIRCASE"
  | "BINARY"
  | "MILESTONE";

export type GoalStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "ACTIVE"
  | "IN_PROGRESS"
  | "AT_RISK"
  | "OFF_TRACK"
  | "REVISION_REQUESTED"
  | "COMPLETED"
  | "CLOSED"
  | "CANCELLED"
  | "DEFERRED";

export type AssessmentStage =
  | "SELF_PENDING"
  | "SELF_COMPLETE"
  | "MANAGER_PENDING"
  | "MANAGER_COMPLETE"
  | "PEER_PENDING"
  | "PEER_COMPLETE"
  | "CALIBRATION_PENDING"
  | "CALIBRATION_COMPLETE"
  | "FINALIZED"
  | "LETTER_ISSUED"
  | "ACKNOWLEDGED"
  | "APPEAL_OPEN"
  | "APPEAL_RESOLVED";

export type BscPerspectiveCode =
  | "FINANCIAL"
  | "CUSTOMER"
  | "INTERNAL_PROCESS"
  | "LEARNING_GROWTH";

export const DEFAULT_BSC_PERSPECTIVES: {
  code: BscPerspectiveCode;
  label: string;
  order: number;
}[] = [
  { code: "FINANCIAL", label: "Financial", order: 1 },
  { code: "CUSTOMER", label: "Customer", order: 2 },
  { code: "INTERNAL_PROCESS", label: "Internal Process", order: 3 },
  { code: "LEARNING_GROWTH", label: "Learning & Growth", order: 4 },
];

export interface GoalWeightItem {
  goalId: string;
  weightPct: number;
}

export interface WeightValidationResult {
  valid: boolean;
  totalWeight: number;
  expectedWeight: number;
  tolerance: number;
  code: "OK" | "PERF_WEIGHTS_INVALID";
  message: string;
}

/**
 * PM-002: Validate that weights at a level sum to 100% within tolerance.
 */
export function validateGoalWeights(
  items: GoalWeightItem[],
  tolerance = 0.01,
): WeightValidationResult {
  if (items.length === 0) {
    return {
      valid: false,
      totalWeight: 0,
      expectedWeight: 100,
      tolerance,
      code: "PERF_WEIGHTS_INVALID",
      message: "At least one weighted goal is required.",
    };
  }
  for (const item of items) {
    if (!Number.isFinite(item.weightPct) || item.weightPct < 0 || item.weightPct > 100) {
      return {
        valid: false,
        totalWeight: 0,
        expectedWeight: 100,
        tolerance,
        code: "PERF_WEIGHTS_INVALID",
        message: `Goal ${item.goalId} has invalid weight ${item.weightPct}%.`,
      };
    }
  }
  const totalWeight = Number(
    items.reduce((sum, i) => sum + i.weightPct, 0).toFixed(4),
  );
  const diff = Math.abs(totalWeight - 100);
  if (diff > tolerance) {
    return {
      valid: false,
      totalWeight,
      expectedWeight: 100,
      tolerance,
      code: "PERF_WEIGHTS_INVALID",
      message: `Goal weights must sum to 100% (±${tolerance}%). Current sum: ${totalWeight}%.`,
    };
  }
  return {
    valid: true,
    totalWeight,
    expectedWeight: 100,
    tolerance,
    code: "OK",
    message: "Goal weights sum to 100%.",
  };
}

export interface AlignmentEdge {
  childGoalId: string;
  parentGoalId: string;
  childCycleId?: string;
  parentCycleId?: string;
  childLevel?: number; // e.g. 1=Company, 2=Division/Dept, 3=Team, 4=Individual
  parentLevel?: number;
}

export interface AlignmentValidationResult {
  valid: boolean;
  skipLevel: boolean;
  code: "OK" | "PERF_ALIGNMENT_LOOP" | "PERF_ALIGNMENT_SELF" | "PERF_CYCLE_MISMATCH";
  message: string;
}

/**
 * PM-004 & D4/D5: Enforce acyclic alignment graph, same-cycle parent, and detect skip-level alignment.
 */
export function validateAlignmentLink(
  existingEdges: AlignmentEdge[],
  candidate: AlignmentEdge,
): AlignmentValidationResult {
  if (candidate.childGoalId === candidate.parentGoalId) {
    return {
      valid: false,
      skipLevel: false,
      code: "PERF_ALIGNMENT_SELF",
      message: "A goal cannot align to itself.",
    };
  }
  if (
    candidate.childCycleId &&
    candidate.parentCycleId &&
    candidate.childCycleId !== candidate.parentCycleId
  ) {
    return {
      valid: false,
      skipLevel: false,
      code: "PERF_CYCLE_MISMATCH",
      message: "Parent and child goals must belong to the same performance cycle.",
    };
  }

  // Build adjacency list: parent -> children, plus candidate edge
  // To check if adding (child -> parent) creates a cycle, verify whether `childGoalId`
  // can reach `parentGoalId` upward (or equivalently `parentGoalId` can reach `childGoalId` upward).
  const parentsByChild = new Map<string, string[]>();
  for (const e of existingEdges) {
    const list = parentsByChild.get(e.childGoalId);
    if (list) list.push(e.parentGoalId);
    else parentsByChild.set(e.childGoalId, [e.parentGoalId]);
  }

  // Walk ancestors starting from candidate.parentGoalId; if we ever hit candidate.childGoalId, it's a cycle.
  const visited = new Set<string>();
  const stack = [candidate.parentGoalId];
  while (stack.length > 0) {
    const curr = stack.pop()!;
    if (curr === candidate.childGoalId) {
      return {
        valid: false,
        skipLevel: false,
        code: "PERF_ALIGNMENT_LOOP",
        message: `Aligning ${candidate.childGoalId} to ${candidate.parentGoalId} creates a cycle in the alignment graph.`,
      };
    }
    if (visited.has(curr)) continue;
    visited.add(curr);
    const parents = parentsByChild.get(curr);
    if (parents) {
      for (const p of parents) {
        if (!visited.has(p)) stack.push(p);
      }
    }
  }

  const skipLevel =
    candidate.childLevel !== undefined &&
    candidate.parentLevel !== undefined &&
    candidate.childLevel - candidate.parentLevel > 1;

  return {
    valid: true,
    skipLevel,
    code: "OK",
    message: skipLevel
      ? "Alignment valid (flagged as skip-level direct alignment)."
      : "Alignment valid.",
  };
}

export interface FrameworkGoalValidationInput {
  cycleFramework: PerformanceFramework;
  goalFramework: PerformanceFramework;
  perspectiveCode?: string | null;
  keyResultsCount?: number;
  hasActionPlan?: boolean;
  visibility?: "PRIVATE" | "TEAM" | "PUBLIC";
  isCompanyRoot?: boolean;
  hasParentAlignment?: boolean;
}

export interface FrameworkValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * PM-001, D1, D4, D6, PM-013, PM-020: Validate goal payload against the cycle's single framework.
 */
export function validateFrameworkGoal(
  input: FrameworkGoalValidationInput,
): FrameworkValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (input.goalFramework !== input.cycleFramework) {
    errors.push(
      `Cycle enforces ${input.cycleFramework}; ${input.goalFramework} goals are not permitted in this cycle.`,
    );
  }

  if (input.cycleFramework === "BSC") {
    const validPerspectives = new Set<string>(
      DEFAULT_BSC_PERSPECTIVES.map((p) => p.code),
    );
    if (!input.perspectiveCode || !validPerspectives.has(input.perspectiveCode)) {
      errors.push(
        "BSC goals must belong to one of the four perspectives (FINANCIAL, CUSTOMER, INTERNAL_PROCESS, LEARNING_GROWTH).",
      );
    }
  }

  if (input.cycleFramework === "OKR") {
    if (input.perspectiveCode) {
      errors.push("OKR goals cannot carry BSC perspective fields.");
    }
    const krCount = input.keyResultsCount ?? 0;
    if (krCount < 3 || krCount > 5) {
      warnings.push(
        `OKR guidance recommends 3–5 Key Results per objective (found ${krCount}).`,
      );
    }
    if (!input.isCompanyRoot && !input.hasParentAlignment) {
      errors.push(
        "Non-root OKRs must align to a Team or Company parent OKR in the same cycle.",
      );
    }
  }

  if (input.cycleFramework === "MBO") {
    if (input.perspectiveCode) {
      errors.push("MBO objectives cannot carry BSC perspective fields.");
    }
    if (input.hasActionPlan === false) {
      warnings.push("MBO objectives should include an action plan with milestones.");
    }
    if (input.visibility === "PUBLIC") {
      warnings.push("MBO objectives default to PRIVATE visibility per PM-013.");
    }
  }

  return { valid: errors.length === 0, warnings, errors };
}

export interface StaircaseBand {
  minActual: number;
  score: number;
}

export interface MeasureScoreInput {
  measureId: string;
  rule: ScoringRuleType;
  baseline: number;
  target: number;
  actual: number;
  weightPct: number; // within the goal (0..100)
  staircaseBands?: StaircaseBand[];
  completedMilestones?: number;
  totalMilestones?: number;
  binaryMet?: boolean;
  capAtOne?: boolean; // OKR defaults to capped at 1.0
}

export interface MeasureScoreOutput {
  measureId: string;
  rawScore: number; // normalized 0.0 .. 1.0+
  weightedContribution: number;
}

/**
 * §7.2 Deterministic Measure Scoring Engine
 */
export function calculateMeasureScore(
  input: MeasureScoreInput,
): MeasureScoreOutput {
  let raw = 0;

  switch (input.rule) {
    case "RATIO": {
      const denom = input.target - input.baseline;
      if (denom === 0) {
        raw = input.actual >= input.target ? 1 : 0;
      } else {
        raw = (input.actual - input.baseline) / denom;
      }
      break;
    }
    case "GAP_TO_TARGET": {
      if (input.target <= 0) {
        raw = input.actual >= input.target ? 1 : 0;
      } else {
        raw = input.actual / input.target;
      }
      break;
    }
    case "STAIRCASE": {
      const bands = [...(input.staircaseBands ?? [])].sort(
        (a, b) => b.minActual - a.minActual,
      );
      const hit = bands.find((b) => input.actual >= b.minActual);
      raw = hit ? hit.score : 0;
      break;
    }
    case "BINARY": {
      raw = input.binaryMet || input.actual >= input.target ? 1 : 0;
      break;
    }
    case "MILESTONE": {
      const total = input.totalMilestones ?? 0;
      const done = input.completedMilestones ?? 0;
      raw = total > 0 ? done / total : 0;
      break;
    }
  }

  const floor = Math.max(0, raw);
  const clamped = input.capAtOne === false ? Math.min(1.5, floor) : Math.min(1.0, floor);
  const rawScore = Number(clamped.toFixed(4));
  const weightedContribution = Number(
    (rawScore * (input.weightPct / 100)).toFixed(4),
  );

  return {
    measureId: input.measureId,
    rawScore,
    weightedContribution,
  };
}

export interface ScoreCalculationSnapshot {
  goalId: string;
  framework: PerformanceFramework;
  profileVersionId: string;
  ruleVersion: string;
  cycleId: string;
  measureOutputs: MeasureScoreOutput[];
  normalizedScoreZeroToOne: number; // 0.0000 .. 1.0000
  percentageScore: number; // 0.00 .. 100.00
  fivePointScaleScore: number; // 1.00 .. 5.00
  okrStretchStatus?: "ON_TRACK_STRETCH" | "BELOW_STRETCH" | "EXCEEDED";
  computedAt: string;
  actorId: string;
}

/**
 * §7.3 & PM-006/PM-007: Compute deterministic goal score and produce an immutable snapshot.
 */
export function calculateGoalScore(params: {
  goalId: string;
  framework: PerformanceFramework;
  profileVersionId: string;
  ruleVersion: string;
  cycleId: string;
  measures: MeasureScoreInput[];
  actorId: string;
  computedAt?: string;
}): ScoreCalculationSnapshot {
  const outputs = params.measures.map((m) =>
    calculateMeasureScore({
      ...m,
      capAtOne: params.framework === "OKR" ? true : m.capAtOne,
    }),
  );

  const weightSum = params.measures.reduce((s, m) => s + m.weightPct, 0);
  const rawSum = outputs.reduce((s, o) => s + o.weightedContribution, 0);
  const normalized =
    weightSum > 0 ? Number((rawSum * (100 / weightSum)).toFixed(4)) : 0;
  const clampedNorm = Math.max(0, Math.min(1.5, normalized));
  const percentageScore = Number((Math.min(1, clampedNorm) * 100).toFixed(2));
  const fivePointScaleScore = Number((1 + Math.min(1, clampedNorm) * 4).toFixed(2));

  let okrStretchStatus: ScoreCalculationSnapshot["okrStretchStatus"];
  if (params.framework === "OKR") {
    okrStretchStatus =
      clampedNorm >= 0.85
        ? "EXCEEDED"
        : clampedNorm >= 0.6
        ? "ON_TRACK_STRETCH"
        : "BELOW_STRETCH";
  }

  return {
    goalId: params.goalId,
    framework: params.framework,
    profileVersionId: params.profileVersionId,
    ruleVersion: params.ruleVersion,
    cycleId: params.cycleId,
    measureOutputs: outputs,
    normalizedScoreZeroToOne: Number(clampedNorm.toFixed(4)),
    percentageScore,
    fivePointScaleScore,
    okrStretchStatus,
    computedAt: params.computedAt ?? new Date().toISOString(),
    actorId: params.actorId,
  };
}

/**
 * PM-005 & PM-008: Goal lifecycle transition guard (prohibits self-approval).
 */
export function canTransitionGoalStatus(params: {
  from: GoalStatus;
  to: GoalStatus;
  actorIsOwner: boolean;
  actorIsApprover: boolean;
  reason?: string;
}): { allowed: boolean; code: string; reason: string } {
  if (params.from === "CLOSED") {
    return {
      allowed: false,
      code: "PM-017",
      reason: "Closed cycle goals are append-only and cannot transition.",
    };
  }

  if (params.to === "ACTIVE" && params.from === "PENDING_APPROVAL") {
    if (params.actorIsOwner && !params.actorIsApprover) {
      return {
        allowed: false,
        code: "PM-008",
        reason: "Employees cannot approve their own goals (PM-008).",
      };
    }
    if (!params.actorIsApprover) {
      return {
        allowed: false,
        code: "PM-005",
        reason: "Only an assigned approver can activate a pending goal.",
      };
    }
  }

  if (
    (params.to === "CANCELLED" || params.to === "DEFERRED") &&
    (!params.reason || params.reason.trim().length < 5)
  ) {
    return {
      allowed: false,
      code: "PM-018",
      reason: "Cancelling or deferring a goal requires a written reason.",
    };
  }

  return { allowed: true, code: "OK", reason: "Transition permitted." };
}

/**
 * PM-009 & PM-010: Assessment stage-gate guard (self before manager; final lock).
 */
export function canTransitionAssessmentStage(params: {
  from: AssessmentStage;
  to: AssessmentStage;
  hasAuthorizedReopen?: boolean;
}): { allowed: boolean; code: string; reason: string } {
  if (
    (params.from === "FINALIZED" ||
      params.from === "LETTER_ISSUED" ||
      params.from === "ACKNOWLEDGED") &&
    params.to !== "APPEAL_OPEN" &&
    params.to !== "LETTER_ISSUED" &&
    params.to !== "ACKNOWLEDGED" &&
    !params.hasAuthorizedReopen
  ) {
    return {
      allowed: false,
      code: "PM-010",
      reason: "Final ratings are locked post-calibration; authorized reopen required.",
    };
  }

  if (
    params.to === "MANAGER_COMPLETE" &&
    params.from === "SELF_PENDING"
  ) {
    return {
      allowed: false,
      code: "PM-009",
      reason: "Self-assessment must be completed before manager assessment.",
    };
  }

  return { allowed: true, code: "OK", reason: "Stage transition permitted." };
}

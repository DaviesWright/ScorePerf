/**
 * MBO scoring adapter (BUILD.md §7.4, §9.1 – §9.4).
 *
 * Pure, deterministic functions. Every calculation declares its inputs,
 * direction, target/unit, thresholds, cap/floor, weight, missing-data policy,
 * rounding policy and rule version, and returns explicit validation issues
 * instead of dividing by zero or silently substituting values.
 *
 * Rounding is applied only at the output boundary (`policy.decimals`).
 */

export const MBO_RULE_VERSION = "mbo-2026.1";

export type MboDirection =
  | "HIGHER_IS_BETTER"
  | "LOWER_IS_BETTER"
  | "WITHIN_RANGE"
  | "EXACT"
  | "MILESTONE"
  | "QUALITATIVE";

export type MboIssueSeverity = "ERROR" | "WARNING";

export interface MboIssue {
  code: string;
  severity: MboIssueSeverity;
  message: string;
  objectiveId?: string;
  measureId?: string;
}

export interface MboRatingBand {
  /** Inclusive lower bound of achievement % for this band. */
  minPct: number;
  rating: 1 | 2 | 3 | 4 | 5;
  label: string;
}

export interface MboScoringPolicy {
  /** Maximum achievement % credited for a measure. */
  capPct: number;
  /** Minimum achievement % (never below zero). */
  floorPct: number;
  /** Achievement below this % scores zero (minimum threshold). */
  thresholdPct: number;
  /** BLOCK: a missing actual makes the result incomplete. SCORE_ZERO: scores 0 with a warning. */
  missingData: "BLOCK" | "SCORE_ZERO";
  /** Lower-is-better with a zero target (e.g. zero incidents): BINARY = 100% if actual is 0, else 0%. BLOCK = invalid. */
  zeroTargetLowerIsBetter: "BINARY" | "BLOCK";
  /** Lower-is-better with a zero actual and positive target: CAP = credited at capPct. BLOCK = invalid. */
  zeroActualLowerIsBetter: "CAP" | "BLOCK";
  /** Rubric for qualitative measures: rating (1–5) to achievement %. Declared, not derived. */
  qualitativeRubric: Record<1 | 2 | 3 | 4 | 5, number>;
  /** Bands mapping overall achievement % to a 1–5 rating, any order. */
  ratingBands: MboRatingBand[];
  /** Allowed absolute deviation when weights must sum to 100. */
  weightTolerance: number;
  /** Decimal places applied at the output boundary only. */
  decimals: number;
}

export const DEFAULT_MBO_POLICY: MboScoringPolicy = {
  capPct: 120,
  floorPct: 0,
  thresholdPct: 0,
  missingData: "BLOCK",
  zeroTargetLowerIsBetter: "BINARY",
  zeroActualLowerIsBetter: "CAP",
  qualitativeRubric: { 1: 0, 2: 50, 3: 100, 4: 110, 5: 120 },
  ratingBands: [
    { minPct: 115, rating: 5, label: "Outstanding" },
    { minPct: 105, rating: 4, label: "Exceeds expectations" },
    { minPct: 80, rating: 3, label: "Meets expectations" },
    { minPct: 50, rating: 2, label: "Needs improvement" },
    { minPct: 0, rating: 1, label: "Unsatisfactory" },
  ],
  weightTolerance: 0.01,
  decimals: 2,
};

export interface MboMeasureInput {
  measureId: string;
  direction: MboDirection;
  /** Weight of this measure within its objective (0–100). */
  weightPct: number;
  unit?: string;
  /** Unit the actual was recorded in; must match `unit` when both are given. */
  actualUnit?: string;
  target?: number | null;
  actual?: number | null;
  rangeMin?: number | null;
  rangeMax?: number | null;
  /** EXACT: allowed deviation as % of target (default 0). */
  tolerancePct?: number | null;
  completedMilestones?: number | null;
  totalMilestones?: number | null;
  /** QUALITATIVE: integer 1–5 against the configured rubric. */
  qualitativeRating?: number | null;
}

export interface MboObjectiveInput {
  objectiveId: string;
  /** Weight of this objective within the assessment (0–100). */
  weightPct: number;
  measures: MboMeasureInput[];
}

export type MboMeasureStatus = "SCORED" | "MISSING" | "INVALID";

export interface MboMeasureResult {
  measureId: string;
  direction: MboDirection;
  status: MboMeasureStatus;
  /** "FORMULA" for computed achievement, "RUBRIC" for qualitative mapping. */
  basis: "FORMULA" | "RUBRIC";
  rawAchievementPct: number | null;
  creditedPct: number | null;
  weightPct: number;
  issues: MboIssue[];
}

export interface MboObjectiveResult {
  objectiveId: string;
  weightPct: number;
  complete: boolean;
  achievementPct: number | null;
  measures: MboMeasureResult[];
  issues: MboIssue[];
}

export interface MboAssessmentResult {
  framework: "MBO";
  ruleVersion: string;
  completeness: "COMPLETE" | "INCOMPLETE";
  achievementPct: number | null;
  computedRating: number | null;
  ratingLabel: string | null;
  objectives: MboObjectiveResult[];
  issues: MboIssue[];
  policy: MboScoringPolicy;
}

const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const round = (v: number, decimals: number) => {
  const f = 10 ** decimals;
  return Math.round((v + Number.EPSILON) * f) / f;
};

function issue(
  code: string,
  severity: MboIssueSeverity,
  message: string,
  ids: { objectiveId?: string; measureId?: string } = {},
): MboIssue {
  return { code, severity, message, ...ids };
}

/** Score one MBO measure. Raw achievement is reported unrounded-by-policy until the boundary. */
export function scoreMboMeasure(
  m: MboMeasureInput,
  policy: MboScoringPolicy = DEFAULT_MBO_POLICY,
): MboMeasureResult {
  const issues: MboIssue[] = [];
  const ids = { measureId: m.measureId };
  const basis: "FORMULA" | "RUBRIC" =
    m.direction === "QUALITATIVE" ? "RUBRIC" : "FORMULA";
  const out = (
    status: MboMeasureStatus,
    raw: number | null,
  ): MboMeasureResult => {
    let credited: number | null = null;
    if (status === "SCORED" && raw !== null) {
      let v = raw;
      if (v < policy.thresholdPct) {
        issues.push(
          issue(
            "MBO_BELOW_THRESHOLD",
            "WARNING",
            `Achievement ${round(v, policy.decimals)}% is below the ${policy.thresholdPct}% threshold and scores 0.`,
            ids,
          ),
        );
        v = 0;
      }
      if (v > policy.capPct) {
        issues.push(
          issue(
            "MBO_CAPPED",
            "WARNING",
            `Achievement ${round(v, policy.decimals)}% capped at ${policy.capPct}%.`,
            ids,
          ),
        );
      }
      credited = Math.min(policy.capPct, Math.max(policy.floorPct, Math.max(0, v)));
    }
    return {
      measureId: m.measureId,
      direction: m.direction,
      status,
      basis,
      rawAchievementPct: raw === null ? null : round(raw, policy.decimals),
      creditedPct: credited === null ? null : round(credited, policy.decimals),
      weightPct: m.weightPct,
      issues,
    };
  };

  if (!isNum(m.weightPct) || m.weightPct < 0) {
    issues.push(issue("MBO_NEGATIVE_WEIGHT", "ERROR", "Measure weight must be zero or more.", ids));
    return out("INVALID", null);
  }

  if (m.unit && m.actualUnit && m.unit !== m.actualUnit) {
    issues.push(
      issue(
        "MBO_UNIT_MISMATCH",
        "ERROR",
        `Actual recorded in "${m.actualUnit}" but target is in "${m.unit}".`,
        ids,
      ),
    );
    return out("INVALID", null);
  }

  const missing = (what: string): MboMeasureResult => {
    if (policy.missingData === "SCORE_ZERO") {
      issues.push(issue("MBO_MISSING_ACTUAL", "WARNING", `${what} missing; scored 0 by policy.`, ids));
      return out("SCORED", 0);
    }
    issues.push(issue("MBO_MISSING_ACTUAL", "ERROR", `${what} missing.`, ids));
    return out("MISSING", null);
  };

  switch (m.direction) {
    case "HIGHER_IS_BETTER": {
      if (!isNum(m.target)) {
        issues.push(issue("MBO_MISSING_TARGET", "ERROR", "Target is required.", ids));
        return out("INVALID", null);
      }
      if (!isNum(m.actual)) return missing("Actual");
      if (m.target <= 0) {
        issues.push(
          issue(
            m.target === 0 ? "MBO_TARGET_ZERO" : "MBO_NEGATIVE_VALUE",
            "ERROR",
            "Higher-is-better targets must be greater than zero. Use WITHIN_RANGE or MILESTONE instead.",
            ids,
          ),
        );
        return out("INVALID", null);
      }
      if (m.actual < 0) {
        issues.push(issue("MBO_NEGATIVE_VALUE", "ERROR", "Actual cannot be negative for a ratio measure.", ids));
        return out("INVALID", null);
      }
      return out("SCORED", (m.actual / m.target) * 100);
    }

    case "LOWER_IS_BETTER": {
      if (!isNum(m.target)) {
        issues.push(issue("MBO_MISSING_TARGET", "ERROR", "Target is required.", ids));
        return out("INVALID", null);
      }
      if (!isNum(m.actual)) return missing("Actual");
      if (m.target < 0 || m.actual < 0) {
        issues.push(issue("MBO_NEGATIVE_VALUE", "ERROR", "Lower-is-better values cannot be negative.", ids));
        return out("INVALID", null);
      }
      if (m.target === 0) {
        if (policy.zeroTargetLowerIsBetter === "BLOCK") {
          issues.push(issue("MBO_TARGET_ZERO", "ERROR", "Zero target is not allowed by policy.", ids));
          return out("INVALID", null);
        }
        issues.push(
          issue("MBO_ZERO_TARGET_BINARY", "WARNING", "Zero target scored as met (100%) or not met (0%).", ids),
        );
        return out("SCORED", m.actual === 0 ? 100 : 0);
      }
      if (m.actual === 0) {
        if (policy.zeroActualLowerIsBetter === "BLOCK") {
          issues.push(issue("MBO_ACTUAL_ZERO", "ERROR", "Zero actual is not allowed by policy.", ids));
          return out("INVALID", null);
        }
        issues.push(
          issue("MBO_ACTUAL_ZERO_CAPPED", "WARNING", `Zero actual credited at the ${policy.capPct}% cap.`, ids),
        );
        return out("SCORED", policy.capPct);
      }
      return out("SCORED", (m.target / m.actual) * 100);
    }

    case "WITHIN_RANGE": {
      if (!isNum(m.rangeMin) || !isNum(m.rangeMax) || m.rangeMin > m.rangeMax) {
        issues.push(issue("MBO_INVALID_RANGE", "ERROR", "A valid range (min ≤ max) is required.", ids));
        return out("INVALID", null);
      }
      if (!isNum(m.actual)) return missing("Actual");
      return out("SCORED", m.actual >= m.rangeMin && m.actual <= m.rangeMax ? 100 : 0);
    }

    case "EXACT": {
      if (!isNum(m.target)) {
        issues.push(issue("MBO_MISSING_TARGET", "ERROR", "Target is required.", ids));
        return out("INVALID", null);
      }
      const tol = m.tolerancePct ?? 0;
      if (!isNum(tol) || tol < 0) {
        issues.push(issue("MBO_INVALID_TOLERANCE", "ERROR", "Tolerance must be zero or more.", ids));
        return out("INVALID", null);
      }
      if (!isNum(m.actual)) return missing("Actual");
      const allowed = Math.abs(m.target) * (tol / 100);
      return out("SCORED", Math.abs(m.actual - m.target) <= allowed ? 100 : 0);
    }

    case "MILESTONE": {
      const total = m.totalMilestones;
      if (!isNum(total) || total <= 0 || !Number.isInteger(total)) {
        issues.push(issue("MBO_INVALID_MILESTONES", "ERROR", "Total milestones must be a positive integer.", ids));
        return out("INVALID", null);
      }
      if (!isNum(m.completedMilestones)) return missing("Completed milestones");
      if (m.completedMilestones < 0 || m.completedMilestones > total || !Number.isInteger(m.completedMilestones)) {
        issues.push(
          issue("MBO_OUT_OF_RANGE", "ERROR", `Completed milestones must be a whole number from 0 to ${total}.`, ids),
        );
        return out("INVALID", null);
      }
      return out("SCORED", (m.completedMilestones / total) * 100);
    }

    case "QUALITATIVE": {
      if (!isNum(m.qualitativeRating)) return missing("Qualitative rating");
      const r = m.qualitativeRating;
      if (!Number.isInteger(r) || r < 1 || r > 5) {
        issues.push(issue("MBO_OUT_OF_RANGE", "ERROR", "Qualitative rating must be a whole number from 1 to 5.", ids));
        return out("INVALID", null);
      }
      return out("SCORED", policy.qualitativeRubric[r as 1 | 2 | 3 | 4 | 5]);
    }

    default: {
      // Direction is declared per measure, never inferred (e.g. legacy rows without one).
      issues.push(issue("MBO_MISSING_DIRECTION", "ERROR", "Measure has no MBO direction set.", ids));
      return out("INVALID", null);
    }
  }
}

function checkWeights(
  weights: number[],
  tolerance: number,
  code: string,
  label: string,
  ids: { objectiveId?: string },
): MboIssue | null {
  const total = weights.reduce((s, w) => s + w, 0);
  if (Math.abs(total - 100) > tolerance) {
    return issue(code, "ERROR", `${label} weights sum to ${round(total, 4)}%, not 100%.`, ids);
  }
  return null;
}

export function scoreMboObjective(
  o: MboObjectiveInput,
  policy: MboScoringPolicy = DEFAULT_MBO_POLICY,
): MboObjectiveResult {
  const ids = { objectiveId: o.objectiveId };
  const issues: MboIssue[] = [];
  const measures = o.measures.map((m) => scoreMboMeasure(m, policy));
  for (const mr of measures) for (const i of mr.issues) issues.push({ ...i, ...ids });

  if (o.measures.length === 0) {
    issues.push(issue("MBO_NO_MEASURES", "ERROR", "Objective has no measures.", ids));
  } else {
    const w = checkWeights(
      o.measures.map((m) => m.weightPct),
      policy.weightTolerance,
      "MBO_MEASURE_WEIGHTS_INVALID",
      "Measure",
      ids,
    );
    if (w) issues.push(w);
  }

  const complete =
    !issues.some((i) => i.severity === "ERROR") &&
    measures.every((m) => m.status === "SCORED");

  let achievement: number | null = null;
  if (complete) {
    const weightSum = o.measures.reduce((s, m) => s + m.weightPct, 0);
    const raw = measures.reduce(
      (s, mr) => s + (mr.creditedPct ?? 0) * mr.weightPct,
      0,
    );
    achievement = weightSum > 0 ? round(raw / weightSum, policy.decimals) : 0;
  }

  return {
    objectiveId: o.objectiveId,
    weightPct: o.weightPct,
    complete,
    achievementPct: achievement,
    measures,
    issues,
  };
}

export function mboRatingForAchievement(
  achievementPct: number,
  policy: MboScoringPolicy = DEFAULT_MBO_POLICY,
): MboRatingBand {
  const bands = [...policy.ratingBands].sort((a, b) => b.minPct - a.minPct);
  return bands.find((b) => achievementPct >= b.minPct) ?? bands[bands.length - 1];
}

/**
 * Score a whole MBO assessment (all objectives of one employee in one cycle).
 * Returns COMPLETE with a computed rating only when every objective and
 * weight is valid; otherwise INCOMPLETE with the blocking issues listed.
 */
export function scoreMboAssessment(
  objectives: MboObjectiveInput[],
  policy: MboScoringPolicy = DEFAULT_MBO_POLICY,
): MboAssessmentResult {
  const results = objectives.map((o) => scoreMboObjective(o, policy));
  const issues: MboIssue[] = results.flatMap((r) => r.issues);

  if (objectives.length === 0) {
    issues.push(issue("MBO_NO_OBJECTIVES", "ERROR", "No MBO objectives found for this assessment."));
  } else {
    for (const o of objectives) {
      if (!isNum(o.weightPct) || o.weightPct < 0) {
        issues.push(
          issue("MBO_NEGATIVE_WEIGHT", "ERROR", "Objective weight must be zero or more.", {
            objectiveId: o.objectiveId,
          }),
        );
      }
    }
    const w = checkWeights(
      objectives.map((o) => o.weightPct),
      policy.weightTolerance,
      "MBO_OBJECTIVE_WEIGHTS_INVALID",
      "Objective",
      {},
    );
    if (w) issues.push(w);
  }

  const complete =
    !issues.some((i) => i.severity === "ERROR") && results.every((r) => r.complete);

  let achievement: number | null = null;
  let band: MboRatingBand | null = null;
  if (complete) {
    const weightSum = objectives.reduce((s, o) => s + o.weightPct, 0);
    const raw = results.reduce(
      (s, r) => s + (r.achievementPct ?? 0) * r.weightPct,
      0,
    );
    achievement = weightSum > 0 ? round(raw / weightSum, policy.decimals) : 0;
    band = mboRatingForAchievement(achievement, policy);
  }

  return {
    framework: "MBO",
    ruleVersion: MBO_RULE_VERSION,
    completeness: complete ? "COMPLETE" : "INCOMPLETE",
    achievementPct: achievement,
    computedRating: band ? band.rating : null,
    ratingLabel: band ? band.label : null,
    objectives: results,
    issues,
    policy,
  };
}

/**
 * Manager ratings more than `maxBandGap` bands away from the computed rating
 * need a written reason (plan: "reason required at more than one band").
 */
export function requiresDivergenceReason(
  computedRating: number | null | undefined,
  managerRating: number | null | undefined,
  maxBandGap = 1,
): boolean {
  if (!isNum(computedRating) || !isNum(managerRating)) return false;
  return Math.abs(managerRating - computedRating) > maxBandGap;
}

// Company performance settings: balanced scorecard pillar weights, objective quotas and two policy switches.
// Pure: no database, no framework. Single-framework purity is enforced by the database, not stored here.

export interface PillarWeights {
  financial: number;
  customer: number;
  internal: number;
  learning: number;
}

export interface PerformanceSettings {
  pillarWeights: PillarWeights;
  minObjectives: number;
  maxObjectives: number;
  mandatoryCorporateAlignment: boolean;
  allowEmployeeProposeKeyResults: boolean;
}

export const DEFAULT_PERFORMANCE_SETTINGS: PerformanceSettings = {
  pillarWeights: { financial: 30, customer: 50, internal: 15, learning: 5 },
  minObjectives: 5,
  maxObjectives: 8,
  mandatoryCorporateAlignment: true,
  allowEmployeeProposeKeyResults: true,
};

export const MAX_OBJECTIVES_LIMIT = 20;

/** Returns the list of problems. An empty list means the settings can be saved. */
export function validatePerformanceSettings(s: PerformanceSettings): string[] {
  const errors: string[] = [];
  const weights = Object.values(s.pillarWeights);
  if (weights.some((w) => !Number.isInteger(w) || w < 0 || w > 100)) errors.push("Each pillar weight must be a whole number from 0 to 100.");
  else if (weights.reduce((a, b) => a + b, 0) !== 100) errors.push("Pillar weights must add up to 100.");
  if (!Number.isInteger(s.minObjectives) || s.minObjectives < 1) errors.push("Minimum objectives must be at least 1.");
  if (!Number.isInteger(s.maxObjectives) || s.maxObjectives > MAX_OBJECTIVES_LIMIT) errors.push(`Maximum objectives must be at most ${MAX_OBJECTIVES_LIMIT}.`);
  if (s.minObjectives > s.maxObjectives) errors.push("Minimum objectives cannot be more than the maximum.");
  return errors;
}

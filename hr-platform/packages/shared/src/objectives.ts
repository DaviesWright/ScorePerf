// Objective rules (goal setting and approval), kept free of the database and the framework so the API and the
// frontend share one copy. Flow: draft -> submitted -> approved | returned. Approved objectives are locked:
// the API refuses edits and a database trigger refuses them too. After approval the only change path is an
// HR amendment, which is recorded with a reason.

import type { AccessRole, Actor } from "./leave";

export type ObjectiveStatus = "draft" | "submitted" | "approved" | "returned";

/** Cycle stages as stored in performance_cycles.status. Named CycleStage because types.ts exports CycleStatus. */
export type CycleStage = string;

export interface ObjectiveInput {
  title: string;
  weight: number;
  target: string;
  metric: string;
}

export interface ObjectiveRow {
  id: number;
  employeeId: number;
  status: ObjectiveStatus;
  weight: number;
}

export const MAX_OBJECTIVES = 15;
const TITLE_MIN = 3;
const TITLE_MAX = 200;
const TEXT_MAX = 255;

const GOAL_STAGES: readonly string[] = ["configured", "approved", "active"];
const FROZEN_STAGES: readonly string[] = ["certified", "published", "closed"];
const HR_ROLES: readonly AccessRole[] = ["hr_admin", "hr_director"];
const DECIDER_ROLES: readonly AccessRole[] = ["line_manager", "hr_admin", "hr_director"];

/** Goals can be set from the moment HR configures a cycle until reviews start. */
export const objectivesOpen = (cycleStage: CycleStage): boolean => GOAL_STAGES.includes(cycleStage);

/** Returns an error message, or null when the fields are acceptable. */
export function validateObjective(input: ObjectiveInput): string | null {
  const title = input.title.trim();
  if (title.length < TITLE_MIN) return `The title needs at least ${TITLE_MIN} characters.`;
  if (title.length > TITLE_MAX) return `The title must be ${TITLE_MAX} characters or fewer.`;
  if (!Number.isFinite(input.weight) || input.weight <= 0 || input.weight > 100) return "The weight must be above 0 and at most 100.";
  if (Math.abs(input.weight * 100 - Math.round(input.weight * 100)) > 1e-6) return "The weight can have at most two decimal places.";
  if (input.target.length > TEXT_MAX) return `The target must be ${TEXT_MAX} characters or fewer.`;
  if (input.metric.length > TEXT_MAX) return `The metric must be ${TEXT_MAX} characters or fewer.`;
  return null;
}

/** Sum in hundredths so 33.33 + 33.33 + 33.34 is exactly 100. */
export const totalWeight = (weights: number[]): number => weights.reduce((sum, w) => sum + Math.round(w * 100), 0) / 100;

/** Returns an error message, or null when the set can be submitted (or stay approved after an amendment). */
export function checkWeights(weights: number[]): string | null {
  if (weights.length === 0) return "Add at least one objective.";
  const total = totalWeight(weights);
  return total === 100 ? null : `Weights must total 100%. They total ${total}%.`;
}

export const canEditObjective = (actor: Actor, o: ObjectiveRow): boolean =>
  actor.userId === o.employeeId && (o.status === "draft" || o.status === "returned");

/** Same rule as editing: nothing submitted or approved can be deleted. */
export const canDeleteObjective = canEditObjective;

export const canSubmitObjectives = (actor: Actor, ownerId: number): boolean => actor.userId === ownerId;

/**
 * HR decides any submitted set of someone else. A line manager decides only the sets of their solid reports.
 * Nobody decides their own set.
 */
export const canDecideObjectives = (actor: Actor, ownerId: number, status: ObjectiveStatus, solidManagerOfOwner: boolean): boolean => {
  if (actor.userId === ownerId || status !== "submitted") return false;
  if (actor.role === "hr_admin" || actor.role === "hr_director") return true;
  return actor.role === "line_manager" && solidManagerOfOwner;
};

/** HR may amend an approved objective of someone else while the cycle is not frozen. */
export function canAmend(actor: Actor, o: ObjectiveRow, cycleStage: CycleStage): boolean {
  return HR_ROLES.includes(actor.role) && actor.userId !== o.employeeId && o.status === "approved" && !FROZEN_STAGES.includes(cycleStage);
}

/** Progress is the owner's ongoing work and stays updatable once approved. */
export const canUpdateProgress = (actor: Actor, o: ObjectiveRow): boolean => actor.userId === o.employeeId && o.status === "approved";

export const isHr = (role: AccessRole): boolean => HR_ROLES.includes(role);

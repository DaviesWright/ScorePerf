// Approval levels for leave and objectives, stored as JSON in approval_settings. A level names who decides at that
// step: the employee's solid line manager, or HR. Pure: no database, no framework.
// Defaults reproduce the rules that were hard-coded before: leave "manager" stops at the line manager, leave
// "manager_then_hr" goes on to HR, and objectives go to the line manager. HR can always decide any step.

export type ApproverKind = "line_manager" | "hr";
export const APPROVER_KINDS: readonly ApproverKind[] = ["line_manager", "hr"];

/** The chain names leave_types.approval_chain already uses. Each name maps to a list of levels here. */
export const LEAVE_CHAINS = ["manager", "manager_then_hr"] as const;
export type LeaveChain = (typeof LEAVE_CHAINS)[number];

export interface ApprovalSettings {
  leave: Record<LeaveChain, ApproverKind[]>;
  objectives: ApproverKind[];
}

export const DEFAULT_APPROVAL_SETTINGS: ApprovalSettings = {
  leave: { manager: ["line_manager"], manager_then_hr: ["line_manager", "hr"] },
  objectives: ["line_manager"],
};

export const MAX_LEAVE_LEVELS = 3;
// ponytail: objectives stop at one level. A second level needs a manager-approved status in employee_objectives.
export const MAX_OBJECTIVE_LEVELS = 1;

function levelErrors(label: string, levels: unknown, max: number): string[] {
  if (!Array.isArray(levels) || levels.length === 0) return [`${label} needs at least one approval level.`];
  if (levels.length > max) return [`${label} can have at most ${max} approval level${max === 1 ? "" : "s"}.`];
  if (levels.some((l) => !APPROVER_KINDS.includes(l as ApproverKind))) return [`${label} has an unknown approver.`];
  if (new Set(levels).size !== levels.length) return [`${label} cannot use the same approver twice.`];
  if (levels.indexOf("hr") >= 0 && levels.indexOf("line_manager") > levels.indexOf("hr")) {
    return [`${label}: HR must be the last level, after the line manager.`];
  }
  return [];
}

/** Returns the list of problems. An empty list means the settings can be saved. */
export function validateApprovalSettings(s: ApprovalSettings): string[] {
  return [
    ...LEAVE_CHAINS.flatMap((chain) => levelErrors(`Leave (${chain})`, s.leave?.[chain], MAX_LEAVE_LEVELS)),
    ...levelErrors("Objectives", s.objectives, MAX_OBJECTIVE_LEVELS),
  ];
}

/** The approver a step needs, or null when the chain has no such step. Steps are 1-based. */
export const levelAt = (levels: ApproverKind[], step: number): ApproverKind | null => levels[step - 1] ?? null;

export type LeaveStepOutcome = { action: "advance"; step: number } | { action: "finish" } | { action: "forbidden"; reason: string };

/**
 * What a decision on a leave request does at `step`. The route checks the solid-manager rule first; this decides
 * the step. HR decides any step and finishes the request. A line manager decides only a line-manager step; an
 * approval there moves the request to the next level, a rejection ends it.
 */
export function leaveStepOutcome(
  levels: ApproverKind[],
  step: number,
  who: { hr: boolean; solidManager: boolean },
  decision: "approve" | "reject",
): LeaveStepOutcome {
  if (who.hr) return { action: "finish" };
  const needed = levelAt(levels, step);
  if (needed !== "line_manager" || !who.solidManager) {
    return { action: "forbidden", reason: needed === "hr" ? "This step is waiting for HR." : "Only HR can decide this step." };
  }
  if (decision === "reject" || step >= levels.length) return { action: "finish" };
  return { action: "advance", step: step + 1 };
}

/** Whether a line manager (not HR) sees a pending leave request at its current step. */
export const managerDecidesStep = (levels: ApproverKind[], step: number): boolean => levelAt(levels, step) === "line_manager";

/** Objectives: the single level. A line manager may decide only when the level is theirs. */
export const objectivesManagerDecides = (settings: ApprovalSettings): boolean => settings.objectives[0] === "line_manager";

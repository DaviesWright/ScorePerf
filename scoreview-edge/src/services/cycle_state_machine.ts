export type CycleStatus =
  | "draft"
  | "configured"
  | "approved"
  | "active"
  | "review"
  | "calibration"
  | "approval"
  | "certified"
  | "published"
  | "closed";

export const ALLOWED_CYCLE_TRANSITIONS: Record<CycleStatus, CycleStatus[]> = {
  draft: ["configured"],
  configured: ["draft", "approved"],
  approved: ["configured", "active"],
  active: ["review"],
  review: ["active", "calibration", "approval"],
  calibration: ["review", "approval"],
  approval: ["review", "calibration", "certified"],
  certified: ["published"],
  published: ["closed"],
  closed: [],
};

export class CycleTransitionError extends Error {
  public currentStatus: CycleStatus;
  public targetStatus: string;

  constructor(message: string, currentStatus: CycleStatus, targetStatus: string) {
    super(message);
    this.name = "CycleTransitionError";
    this.currentStatus = currentStatus;
    this.targetStatus = targetStatus;
  }
}

export function canTransitionCycle(currentStatus: CycleStatus, targetStatus: CycleStatus): boolean {
  const allowed = ALLOWED_CYCLE_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

export function validateCycleDates(startDate: string | Date, endDate: string | Date): void {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start > end) {
    throw new Error("End date must be greater than or equal to start date.");
  }
}

export function validateCycleTransition(currentStatus: CycleStatus, targetStatus: string): CycleStatus {
  const validStatuses: CycleStatus[] = [
    "draft",
    "configured",
    "approved",
    "active",
    "review",
    "calibration",
    "approval",
    "certified",
    "published",
    "closed",
  ];

  if (!validStatuses.includes(targetStatus as CycleStatus)) {
    throw new CycleTransitionError(
      `Unknown cycle status '${targetStatus}'.`,
      currentStatus,
      targetStatus
    );
  }

  const typedTarget = targetStatus as CycleStatus;
  if (!canTransitionCycle(currentStatus, typedTarget)) {
    const allowed = (ALLOWED_CYCLE_TRANSITIONS[currentStatus] || []).join(", ") || "none (terminal state)";
    throw new CycleTransitionError(
      `Cannot transition cycle from '${currentStatus}' to '${targetStatus}'. Allowed transitions: ${allowed}.`,
      currentStatus,
      targetStatus
    );
  }

  return typedTarget;
}


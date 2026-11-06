// Annual leave plan rules. Employees plan their leave for the year; HR approves each planned absence no later than
// PLAN_LEAD_DAYS (6 weeks) before it starts. A planned absence still unapproved at that point is returned to the
// manager. Pure: dates are ISO calendar dates ("YYYY-MM-DD").

export const PLAN_LEAD_DAYS = 42;
const DAY_MS = 86_400_000;

const toMs = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);
const toIso = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** The last day HR may approve a planned absence starting on `start`: six weeks before the start. */
export function planDeadline(start: string): string {
  return toIso(toMs(start) - PLAN_LEAD_DAYS * DAY_MS);
}

/** A planned absence may be submitted only if it starts at least six weeks after `today`. */
export function canSubmitPlan(today: string, start: string): boolean {
  return toMs(start) - toMs(today) >= PLAN_LEAD_DAYS * DAY_MS;
}

/** HR may approve only while today is on or before the deadline. */
export function canApprovePlan(today: string, start: string): boolean {
  return today <= planDeadline(start);
}

/** Unapproved entries past their deadline go back to the manager. */
export function isPlanLapsed(today: string, start: string, status: string): boolean {
  return (status === "draft" || status === "submitted") && today > planDeadline(start);
}

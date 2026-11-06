// Leave rules, kept free of the database and the framework so the API and the frontend share one copy and
// both can be tested directly. Dates are ISO calendar dates ("YYYY-MM-DD"); working days are Monday to
// Friday minus public holidays.
// Assumption (open question in docs/STREAMLINED-LEAVE-PERFORMANCE.md): the weekend is Saturday and Sunday.

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
export type AccessRole = "employee" | "line_manager" | "hr_admin" | "hr_director";

export interface LeaveRequestRow {
  id: number;
  employeeId: number;
  status: string;
}

export interface Actor {
  userId: number;
  role: AccessRole;
}

export interface RequestInput {
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason: string;
  /** Set for a half-day request: the request covers one working day, counted as 0.5. */
  halfDay?: "morning" | "afternoon";
}

export const HALF_DAY_DAYS = 0.5;

export interface ValidationContext {
  /** Today's date, ISO. */
  today: string;
  holidays: Set<string>;
  /** Days left for this leave type (total minus approved minus pending). */
  remaining: number;
  /** True if the dates overlap an existing pending or approved request of this employee. */
  overlaps: boolean;
}

export type Validation = { ok: true; days: number } | { ok: false; error: string };

const MAX_REASON = 500;
const MAX_SPAN_DAYS = 366;
const DAY_MS = 86_400_000;

/** Parses a strict ISO date to a UTC timestamp, or null if it is malformed or not a real calendar day. */
function parseIso(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const t = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString().slice(0, 10) === date ? t : null; // rejects 2026-02-30
}

export function countWorkingDays(start: string, end: string, holidays: Set<string>): number {
  const s = parseIso(start);
  const e = parseIso(end);
  if (s === null || e === null || e < s) return 0;
  let days = 0;
  for (let t = s; t <= e; t += DAY_MS) {
    const dow = new Date(t).getUTCDay();
    if (dow === 0 || dow === 6) continue;
    if (holidays.has(new Date(t).toISOString().slice(0, 10))) continue;
    days += 1;
  }
  return days;
}

export function remainingDays(total: number, approved: number, pending: number): number {
  return total - approved - pending;
}

/** Date checks that need no database. Returns an error message, or null when the range is well formed. */
export function checkDateShape(startDate: string, endDate: string): string | null {
  const s = parseIso(startDate);
  const e = parseIso(endDate);
  if (s === null || e === null) return "Enter valid start and end dates.";
  if (e < s) return "The end date cannot be before the start date.";
  if ((e - s) / DAY_MS > MAX_SPAN_DAYS) return "A request cannot span more than a year.";
  return null;
}

export function validateRequest(input: RequestInput, ctx: ValidationContext): Validation {
  const shapeError = checkDateShape(input.startDate, input.endDate);
  if (shapeError) return { ok: false, error: shapeError };
  if (input.startDate < ctx.today) return { ok: false, error: "The start date cannot be in the past." };
  if (input.reason.length > MAX_REASON) return { ok: false, error: `The reason must be ${MAX_REASON} characters or fewer.` };

  let days: number;
  if (input.halfDay) {
    // A half day is one working day: same start and end date, and that date must be a working day.
    if (input.startDate !== input.endDate) return { ok: false, error: "A half-day request covers one date. Set the end date to the start date." };
    if (countWorkingDays(input.startDate, input.endDate, ctx.holidays) === 0) return { ok: false, error: "That date is not a working day." };
    days = HALF_DAY_DAYS;
  } else {
    days = countWorkingDays(input.startDate, input.endDate, ctx.holidays);
    if (days === 0) return { ok: false, error: "Those dates contain no working days." };
  }
  if (ctx.overlaps) return { ok: false, error: "These dates overlap a pending or approved request." };
  if (days > ctx.remaining) return { ok: false, error: `You requested ${days} days but only ${ctx.remaining} remain for this leave type.` };
  return { ok: true, days };
}

const DECIDERS: readonly AccessRole[] = ["line_manager", "hr_admin", "hr_director"];

/**
 * HR decides any pending request of someone else. A line manager decides only the requests of people whose solid
 * (approving) line is to them. Nobody decides their own request. `solidManagerOfEmployee` comes from reporting_lines.
 */
export function canDecide(actor: Actor, request: LeaveRequestRow, solidManagerOfEmployee: boolean): boolean {
  if (actor.userId === request.employeeId || request.status !== "pending") return false;
  if (actor.role === "hr_admin" || actor.role === "hr_director") return true;
  return actor.role === "line_manager" && solidManagerOfEmployee;
}

export function canCancel(actor: Actor, request: LeaveRequestRow): boolean {
  return actor.userId === request.employeeId && request.status === "pending";
}

export const isDecider = (role: AccessRole): boolean => DECIDERS.includes(role);

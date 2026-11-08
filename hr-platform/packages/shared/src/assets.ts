// Assets rules, part B. Pure: the API loads the rows and calls these. Status values keep their stored names
// (available, allocated, maintenance, retired, lost); the UI shows "Written off" for lost.

import { isSolidManagerOf } from "./reporting";

export const DEFAULT_OVERDUE_DAYS = 365;
export const MAX_OVERDUE_DAYS = 3650;

/** Days held before an open assignment counts as overdue: the category's threshold, else the fallback. */
export function overdueThreshold(categoryDays: number | null | undefined, fallbackDays: number): number {
  return categoryDays ?? fallbackDays;
}

export function isOverdue(daysHeld: number, thresholdDays: number): boolean {
  return daysHeld >= thresholdDays;
}

/** Why an asset cannot be written off from its current status, or null when it can. */
export function writeOffBlocker(status: string): string | null {
  if (status === "lost") return "This asset is already written off.";
  if (status === "retired") return "A retired asset cannot be written off.";
  return null;
}

/** An asset held by a current employee needs approval from that person's manager before it is written off. */
export function writeOffNeedsApproval(holder: { isActive: boolean } | null): boolean {
  return holder !== null && holder.isActive;
}

/**
 * Who may decide a pending write-off. The holder's solid manager decides. If the holder has no solid manager (or the
 * solid manager is the person who asked), another HR user decides instead. The person who asked never decides.
 */
export function canDecideWriteOff(input: {
  deciderId: number;
  requesterId: number;
  holderSolidManagerId: number | null;
  deciderIsHr: boolean;
}): boolean {
  if (input.deciderId === input.requesterId) return false;
  const solidApplies = input.holderSolidManagerId !== null && input.holderSolidManagerId !== input.requesterId;
  if (solidApplies) return input.deciderId === input.holderSolidManagerId;
  return input.deciderIsHr;
}

/** Closing a recovery task while assets are still open needs a note saying where they are. */
export function recoveryCloseError(openCount: number, note: string): string | null {
  if (openCount > 0 && note.trim() === "") return "Closing with assets still open needs a note saying where they are.";
  return null;
}

export function recoveryTaskTitle(openCount: number, name: string): string {
  return `Recover ${openCount} asset${openCount === 1 ? "" : "s"} from ${name}`;
}

export interface OpenAssignment {
  assetId: number;
  assetCode: string;
  name: string;
  employeeId: number;
  employeeName: string;
  allocatedDate: string;
  daysHeld: number;
}

/**
 * The open assignments a manager may see: those of their direct (solid) reports only. Dotted-line reports and
 * other people's assets are excluded.
 */
export function teamAssignments(
  lines: { employeeId: number; managerId: number; kind: string }[],
  managerId: number,
  open: OpenAssignment[],
): OpenAssignment[] {
  return open.filter((a) => isSolidManagerOf(lines, managerId, a.employeeId));
}

/** A serial number as stored: trimmed, and null when blank. Serials are unique per company on this value. */
export function normaliseSerial(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

export const SERIAL_CONSTRAINT = "company_assets_company_serial_unique";

/** True when a database error is the serial-number unique index refusing a duplicate. */
export function isSerialViolation(err: unknown): boolean {
  const e = err as { code?: unknown; constraint_name?: unknown } | null;
  return e?.code === "23505" && e.constraint_name === SERIAL_CONSTRAINT;
}

/** One CSV cell. Quotes what needs quoting, and prefixes formula triggers so a spreadsheet will not run them. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

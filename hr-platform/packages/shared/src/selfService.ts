// Self-service rules: banking and tax changes that need HR approval, payslip files, document acknowledgments and
// the weighted progress shown on the personal performance page. Pure: no database, no framework.

export const PROFILE_FIELDS = ["bankName", "accountHolderName", "accountNumber", "routingCode", "taxId"] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];

export const PROFILE_FIELD_LABELS: Record<ProfileField, string> = {
  bankName: "Bank name",
  accountHolderName: "Account holder name",
  accountNumber: "Account number",
  routingCode: "Sort code or routing number",
  taxId: "Tax ID",
};

const FIELD_RULES: Record<ProfileField, { pattern: RegExp; message: string }> = {
  bankName: { pattern: /^[\p{L}\p{N} .,&'()-]{2,100}$/u, message: "Bank name must be 2 to 100 characters." },
  accountHolderName: { pattern: /^[\p{L} .'-]{2,100}$/u, message: "Account holder name must be 2 to 100 letters." },
  accountNumber: { pattern: /^[A-Za-z0-9]{6,34}$/, message: "Account number must be 6 to 34 letters or digits." },
  routingCode: { pattern: /^[A-Za-z0-9-]{3,34}$/, message: "Sort code or routing number must be 3 to 34 letters, digits or dashes." },
  taxId: { pattern: /^[A-Za-z0-9-]{5,20}$/, message: "Tax ID must be 5 to 20 letters, digits or dashes." },
};

export const isProfileField = (value: unknown): value is ProfileField => (PROFILE_FIELDS as readonly unknown[]).includes(value);

/** Checks a trimmed value against its field's format. Returns the problem, or null when the value is acceptable. */
export function profileValueError(field: ProfileField, value: string): string | null {
  const rule = FIELD_RULES[field];
  return rule.pattern.test(value) ? null : rule.message;
}

/** Only HR decides, and never a request they made about themselves. Returns the reason refused, or null. */
export function canDecideProfileChange(actor: { userId: number; role: string }, requesterId: number): string | null {
  if (actor.role !== "hr_admin" && actor.role !== "hr_director") return "Only HR can decide profile changes.";
  if (actor.userId === requesterId) return "You cannot decide your own profile change.";
  return null;
}

/** Payslip and document uploads are PDFs of at most PDF_MAX_BYTES. */
export const PDF_MAX_BYTES = 5 * 1024 * 1024;

/** True when the bytes start with the PDF signature "%PDF". */
export function isPdf(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

const MAX_MONEY = 9_999_999_999.99; // NUMERIC(12, 2) in db/schema.sql

/** Returns the problem with a payslip's period and amounts, or null. */
export function payslipError(p: { month: number; year: number; grossPay: number; deductions: number }): string | null {
  if (!Number.isInteger(p.month) || p.month < 1 || p.month > 12) return "Month must be 1 to 12.";
  if (!Number.isInteger(p.year) || p.year < 2000 || p.year > 2100) return "Year must be between 2000 and 2100.";
  if (!Number.isFinite(p.grossPay) || p.grossPay < 0 || p.grossPay > MAX_MONEY) return "Gross pay must be between 0 and 9,999,999,999.99.";
  if (!Number.isFinite(p.deductions) || p.deductions < 0 || p.deductions > p.grossPay) return "Deductions must be between 0 and gross pay.";
  return null;
}

/** Net pay computed in whole cents, so 0.1 + 0.2 style rounding never leaks into the stored value. */
export function netPay(grossPay: number, deductions: number): number {
  return (Math.round(grossPay * 100) - Math.round(deductions * 100)) / 100;
}

/** Acknowledging is a one-way step. Returns the reason refused, or null. */
export function acknowledgmentError(status: string): string | null {
  return status === "acknowledged" ? "This document is already acknowledged." : null;
}

/** Progress across objectives weighted by their weights, rounded to a whole percent. Null when nothing is weighted. */
export function weightedProgress(items: { progress: number; weight: number }[]): number | null {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  if (total <= 0) return null;
  return Math.round(items.reduce((sum, i) => sum + i.progress * i.weight, 0) / total);
}

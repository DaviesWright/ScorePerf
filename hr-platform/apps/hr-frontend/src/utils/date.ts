/**
 * Date formatting for ScoReview HR. Every date shows as DD/MM/YYYY.
 * Date-times add a 24-hour HH:mm after the date.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** A usable Date from a string or Date, or null when it does not parse. */
function asDate(input: string | Date): Date | null {
  const d = input instanceof Date ? input : new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats a date as DD/MM/YYYY (or DD/MM, MM/YYYY with the format option).
 * A string that starts with YYYY-MM-DD uses those digits as written, so a UTC-midnight value never shifts a day.
 */
export function formatDate(
  dateInput: string | Date | null | undefined,
  options?: {
    format?: "readable" | "short" | "dayMonth" | "monthYear";
    includeDayOfWeek?: boolean;
  }
): string {
  if (!dateInput) return "—";

  const literal = typeof dateInput === "string" ? dateInput.trim().match(/^(\d{4})-(\d{2})-(\d{2})/) : null;
  let year: number;
  let month: number;
  let day: number;
  if (literal) {
    year = Number(literal[1]);
    month = Number(literal[2]);
    day = Number(literal[3]);
  } else {
    const d = asDate(dateInput);
    if (!d) return String(dateInput);
    year = d.getFullYear();
    month = d.getMonth() + 1;
    day = d.getDate();
  }

  if (options?.format === "dayMonth") return `${pad(day)}/${pad(month)}`;
  if (options?.format === "monthYear") return `${pad(month)}/${year}`;
  return `${pad(day)}/${pad(month)}/${year}`;
}

/** Date and 24-hour time, e.g. "09/11/2026 14:05". A date-only value shows the date alone. */
export function formatDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  const d = asDate(dateInput);
  if (!d) return String(dateInput);
  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) return formatDate(dateInput);
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Formats a start and end date range: "01/04/2026 – 30/06/2026".
 */
export function formatDateRange(
  startDate?: string | Date | null,
  endDate?: string | Date | null
): string {
  if (!startDate && !endDate) return "—";
  if (!endDate) return formatDate(startDate);
  if (!startDate) return formatDate(endDate);
  return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

/**
 * Safely formats any table cell value: an ISO date string becomes DD/MM/YYYY. Other values are returned as they are.
 */
export function formatCellIfDate(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z?)?$/.test(trimmed)) {
      return formatDate(trimmed);
    }
  }
  return String(val);
}

/**
 * Returns "Today", "Yesterday", "N days ago" for recent dates, otherwise DD/MM/YYYY.
 */
export function formatTimeAgo(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  const d = asDate(dateInput);
  if (!d) return formatDate(dateInput);

  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return formatDate(d);
}

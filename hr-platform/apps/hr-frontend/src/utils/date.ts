/**
 * Enterprise Date Formatting Utilities for ScoReview HR
 * Simplifies ISO 8601 timestamps (e.g. "2026-04-01T00:00:00.000Z") into clean, human-readable formats.
 */

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Parses any ISO 8601 string or Date object and returns a simplified date string:
 * e.g. "2026-04-01T00:00:00.000Z" -> "01 Apr 2026"
 */
export function formatDate(
  dateInput: string | Date | null | undefined,
  options?: {
    format?: "readable" | "short" | "dayMonth" | "monthYear";
    includeDayOfWeek?: boolean;
  }
): string {
  if (!dateInput) return "—";

  try {
    // If it's a string like "2026-04-01T00:00:00.000Z" or "2026-04-01"
    const str = typeof dateInput === "string" ? dateInput.trim() : dateInput.toISOString();
    
    // Extract year, month, day directly to avoid timezone shift issues
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = match[1];
      const monthIdx = parseInt(match[2], 10) - 1;
      const day = match[3];
      const monthName = MONTHS_SHORT[monthIdx] || match[2];

      if (options?.format === "short") {
        return `${year}-${match[2]}-${day}`;
      }

      if (options?.format === "dayMonth") {
        return `${day} ${monthName}`;
      }

      if (options?.format === "monthYear") {
        return `${monthName} ${year}`;
      }

      // Default "readable": "01 Apr 2026"
      return `${day} ${monthName} ${year}`;
    }

    // Fallback to standard Date parsing if format differs
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    const day = String(d.getDate()).padStart(2, "0");
    const month = MONTHS_SHORT[d.getMonth()];
    const year = d.getFullYear();

    return `${day} ${month} ${year}`;
  } catch {
    return typeof dateInput === "string" ? dateInput.split("T")[0] : "—";
  }
}

/**
 * Formats a start and end date range cleanly:
 * e.g. "2026-04-01T00:00:00.000Z" and "2026-06-30T00:00:00.000Z" -> "01 Apr 2026 – 30 Jun 2026"
 */
export function formatDateRange(
  startDate?: string | Date | null,
  endDate?: string | Date | null
): string {
  if (!startDate && !endDate) return "—";
  if (!endDate) return formatDate(startDate);
  if (!startDate) return formatDate(endDate);

  const startFormatted = formatDate(startDate);
  const endFormatted = formatDate(endDate);

  // If same year, we can keep it ultra clean: "01 Apr – 30 Jun 2026"
  const startParts = startFormatted.split(" ");
  const endParts = endFormatted.split(" ");

  if (startParts.length === 3 && endParts.length === 3 && startParts[2] === endParts[2]) {
    return `${startParts[0]} ${startParts[1]} – ${endParts[0]} ${endParts[1]} ${endParts[2]}`;
  }

  return `${startFormatted} – ${endFormatted}`;
}

/**
 * Safely formats any table cell value: if it is an ISO date string (e.g. "2026-04-01T00:00:00.000Z" or "2026-11-01"),
 * it transforms it into a clean human readable format (e.g. "01 Apr 2026"). Otherwise returns original string.
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
 * Returns a short relative date or clean calendar date
 */
export function formatTimeAgo(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return formatDate(dateInput);

  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return formatDate(d);
}

// Pure tallies behind the module mini-dashboards (Leave, Workforce, Helpdesk, Projects). No I/O and no colours,
// so the components decide presentation and the test checks the numbers.

export type LeaveOutcome = "approved" | "pending" | "rejected";
export type Counts = Record<LeaveOutcome, number>;

export interface LeaveLike {
  status: string;
  startDate: string;
  leaveType: string;
  days: number;
}

export interface LeaveTally {
  counts: Counts;
  approvedDays: number;
  /** Start month as YYYY-MM, oldest first, last 12 months that have requests. */
  byMonth: { key: string; counts: Counts }[];
  /** Busiest leave type first. */
  byType: { label: string; counts: Counts }[];
}

const newCounts = (): Counts => ({ approved: 0, pending: 0, rejected: 0 });

/** Cancelled and unknown statuses are left out of the figures. */
export function leaveOutcome(status: string): LeaveOutcome | null {
  const s = status.toLowerCase();
  return s === "approved" || s === "pending" || s === "rejected" ? s : null;
}

export function tallyLeave(rows: LeaveLike[]): LeaveTally {
  const counts = newCounts();
  let approvedDays = 0;
  const byMonth = new Map<string, Counts>();
  const byType = new Map<string, Counts>();
  for (const row of rows) {
    const outcome = leaveOutcome(row.status);
    if (!outcome) continue;
    counts[outcome] += 1;
    if (outcome === "approved") approvedDays += Number(row.days) || 0;
    const type = row.leaveType?.trim() || "Unspecified";
    const typeCounts = byType.get(type) ?? newCounts();
    typeCounts[outcome] += 1;
    byType.set(type, typeCounts);
    if (/^\d{4}-\d{2}/.test(row.startDate)) {
      const key = row.startDate.slice(0, 7);
      const monthCounts = byMonth.get(key) ?? newCounts();
      monthCounts[outcome] += 1;
      byMonth.set(key, monthCounts);
    }
  }
  const sum = (c: Counts) => c.approved + c.pending + c.rejected;
  return {
    counts,
    approvedDays,
    byMonth: [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, c]) => ({ key, counts: c })),
    byType: [...byType.entries()]
      .sort(([, a], [, b]) => sum(b) - sum(a))
      .map(([label, c]) => ({ label, counts: c })),
  };
}

/** "2026-06" -> "Jun 2026". */
export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

export type TicketState = "open" | "inProgress" | "resolved" | "other";

export function ticketState(status: string): TicketState {
  const s = status.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (s === "open" || s === "new") return "open";
  if (s === "in_progress" || s === "progress") return "inProgress";
  if (s === "resolved" || s === "closed" || s === "done") return "resolved";
  return "other";
}

/** Counts items by a key, biggest first. */
export function countBy<T>(items: T[], key: (item: T) => string): [string, number][] {
  const totals = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    totals.set(k, (totals.get(k) ?? 0) + 1);
  }
  return [...totals.entries()].sort(([a, x], [b, y]) => y - x || a.localeCompare(b));
}

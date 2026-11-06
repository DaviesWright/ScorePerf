// Reporting-line import: a CSV of (employee_email, manager_email, kind). kind is "solid" (the manager who approves)
// or "dotted" (visibility and comment only). Pure: the API resolves emails to employees and stores the lines.
//
// Rules: one solid line per employee, no one reports to themselves, no duplicate pairs, and the solid lines must
// not form a loop (A reports to B reports to A).

import { splitCsvLine } from "./strategy";

export interface ReportingLineRow {
  line: number;
  employeeEmail: string;
  managerEmail: string;
  kind: "solid" | "dotted";
}

export interface ReportingParseResult {
  rows: ReportingLineRow[];
  errors: { line: number; message: string }[];
}

export const MAX_REPORTING_LINES = 1000;

const normalise = (e: string) => e.trim().toLowerCase();

export function parseReportingLinesCsv(text: string): ReportingParseResult {
  const errors: ReportingParseResult["errors"] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return { rows: [], errors: [{ line: 1, message: "The file needs a header row and at least one line." }] };

  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  for (const col of ["employee_email", "manager_email", "kind"]) {
    if (!header.includes(col)) errors.push({ line: 1, message: `Missing column: ${col}.` });
  }
  if (errors.length > 0) return { rows: [], errors };
  if (lines.length - 1 > MAX_REPORTING_LINES) return { rows: [], errors: [{ line: 1, message: `Load at most ${MAX_REPORTING_LINES} lines.` }] };

  const rows: ReportingLineRow[] = [];
  const seenPairs = new Set<string>();
  const solidManager = new Map<string, string>();

  lines.slice(1).forEach((raw, idx) => {
    const line = idx + 2;
    const cells = splitCsvLine(raw);
    const get = (name: string) => (cells[header.indexOf(name)] ?? "").trim();
    const employee = normalise(get("employee_email"));
    const manager = normalise(get("manager_email"));
    const kind = get("kind").toLowerCase();
    const before = errors.length;

    if (!employee.includes("@") || !manager.includes("@")) errors.push({ line, message: "Both emails are required." });
    if (kind !== "solid" && kind !== "dotted") errors.push({ line, message: "Kind must be solid or dotted." });
    if (employee && employee === manager) errors.push({ line, message: "Nobody can report to themselves." });

    const pair = `${employee}|${manager}`;
    if (seenPairs.has(pair)) errors.push({ line, message: "This reporting line appears more than once." });
    seenPairs.add(pair);

    if (kind === "solid" && employee) {
      const existing = solidManager.get(employee);
      if (existing && existing !== manager) errors.push({ line, message: "This person already has a solid line to another manager." });
      solidManager.set(employee, manager);
    }

    if (errors.length === before) rows.push({ line, employeeEmail: employee, managerEmail: manager, kind: kind as "solid" | "dotted" });
  });

  // Solid lines must not loop back on themselves.
  for (const start of solidManager.keys()) {
    const seen = new Set<string>([start]);
    let cur = solidManager.get(start);
    while (cur !== undefined) {
      if (seen.has(cur)) {
        errors.push({ line: 1, message: `Solid reporting lines form a loop through ${cur}.` });
        break;
      }
      seen.add(cur);
      cur = solidManager.get(cur);
    }
  }

  return { rows: errors.length > 0 ? [] : rows, errors };
}

/** Whether `managerId` is the solid (approving) manager of `employeeId`, given the loaded lines. */
export function isSolidManagerOf(
  lines: { employeeId: number; managerId: number; kind: string }[],
  managerId: number,
  employeeId: number,
): boolean {
  return lines.some((l) => l.kind === "solid" && l.employeeId === employeeId && l.managerId === managerId);
}

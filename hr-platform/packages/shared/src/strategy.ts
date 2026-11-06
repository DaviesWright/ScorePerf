// Corporate strategy import: parses a CSV of strategic goals (one row per goal) and reports every problem with its
// line number, so HR can fix the file and load it again. Pure: no database, no framework.
//
// Columns: perspective, objective, measure, target (required); owner, weight (optional).
// If any row has a weight, the weights must total 100.

export interface StrategyRow {
  line: number;
  perspective: string;
  objective: string;
  measure: string;
  target: number;
  owner: string | null;
  weight: number | null;
}

export interface StrategyParseResult {
  rows: StrategyRow[];
  errors: { line: number; message: string }[];
}

export const STRATEGY_REQUIRED_COLUMNS = ["perspective", "objective", "measure", "target"] as const;
export const MAX_STRATEGY_ROWS = 200;

/** Splits one CSV line, honouring double quotes ("" inside quotes is a literal quote). */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export function parseStrategyCsv(text: string): StrategyParseResult {
  const errors: StrategyParseResult["errors"] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return { rows: [], errors: [{ line: 1, message: "The file needs a header row and at least one goal." }] };

  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  for (const col of STRATEGY_REQUIRED_COLUMNS) {
    if (!header.includes(col)) errors.push({ line: 1, message: `Missing column: ${col}.` });
  }
  if (errors.length > 0) return { rows: [], errors };
  if (lines.length - 1 > MAX_STRATEGY_ROWS) return { rows: [], errors: [{ line: 1, message: `Load at most ${MAX_STRATEGY_ROWS} goals.` }] };

  const rows: StrategyRow[] = [];
  lines.slice(1).forEach((raw, idx) => {
    const line = idx + 2;
    const cells = splitCsvLine(raw);
    const get = (name: string) => (header.includes(name) ? (cells[header.indexOf(name)] ?? "").trim() : "");
    const before = errors.length;

    const perspective = get("perspective");
    const objective = get("objective");
    const measure = get("measure");
    const targetText = get("target");
    const owner = get("owner");
    const weightText = get("weight");

    if (!perspective || perspective.length > 100) errors.push({ line, message: "Perspective is required (100 characters or fewer)." });
    if (objective.length < 3 || objective.length > 255) errors.push({ line, message: "Objective needs 3 to 255 characters." });
    if (!measure || measure.length > 255) errors.push({ line, message: "Measure is required (255 characters or fewer)." });
    const target = Number(targetText);
    if (targetText === "" || !Number.isFinite(target) || target < 0) errors.push({ line, message: "Target must be a number, zero or more." });
    if (owner.length > 100) errors.push({ line, message: "Owner must be 100 characters or fewer." });
    let weight: number | null = null;
    if (weightText !== "") {
      weight = Number(weightText);
      if (!Number.isFinite(weight) || weight <= 0 || weight > 100) errors.push({ line, message: "Weight must be above 0 and at most 100." });
    }

    if (errors.length === before) {
      rows.push({ line, perspective, objective, measure, target, owner: owner || null, weight });
    }
  });

  const weighted = rows.filter((r) => r.weight !== null);
  if (weighted.length > 0 && weighted.length === rows.length) {
    const total = Math.round(weighted.reduce((s, r) => s + (r.weight ?? 0) * 100, 0)) / 100;
    if (total !== 100) errors.push({ line: 1, message: `Weights total ${total}. They must total 100.` });
  } else if (weighted.length > 0) {
    errors.push({ line: 1, message: "Either every goal has a weight or none does." });
  }

  return { rows: errors.length > 0 ? [] : rows, errors };
}

/** Demo file for a Ghana-based company: four perspectives, weights total 100. */
export const SAMPLE_STRATEGY_CSV = `perspective,objective,measure,target,owner,weight
Financial,Grow advisory revenue,Revenue growth %,15,Client Solutions & Sales,30
Client,Raise client satisfaction,Client NPS,50,Client Solutions & Sales,20
Internal process,Cut proposal turnaround,Days to issue proposal,10,Strategic Consulting,20
Internal process,Lift engagement quality,Engagements passing peer review %,90,Cloud & Edge Engineering,10
Learning and growth,Build practice capability,Certifications per consultant,2,People & Culture,20
`;

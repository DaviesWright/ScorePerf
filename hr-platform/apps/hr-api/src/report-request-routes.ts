import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { TenantContext } from "./auth";
import type { Env } from "./index";
import { REPORT_CATALOGUE, type ReportDefinition } from "./report-catalogue";
import { canAccessReport } from "./report-routes";

// Free-text report requests ("show me attrition in engineering last quarter").
// There is no language model here: the prompt is matched against the governed report catalogue, so every
// answer is a real, permission-checked report or a specific reason why not, with alternatives.
// Every request that does not produce a report is logged (prompt, error code, response) for HR to review.

const STOPWORDS = new Set(
  "a an and are as at be by can for from give how i in is it me my of on or our please report reports show tell the to us we what which who with list get see view all this that last next per vs versus compared".split(
    " ",
  ),
);

// Words people use mapped to the words the catalogue uses.
const SYNONYMS: Record<string, string[]> = {
  turnover: ["attrition", "leavers"],
  churn: ["attrition", "leavers"],
  resignations: ["leavers", "attrition"],
  exits: ["leavers", "attrition"],
  hires: ["new", "hires"],
  joiners: ["new", "hires"],
  staff: ["headcount"],
  employees: ["headcount", "employee"],
  fte: ["headcount", "fte"],
  diversity: ["diversity", "inclusion"],
  dei: ["diversity", "inclusion"],
  gender: ["diversity"],
  absence: ["leave"],
  holiday: ["leave"],
  vacation: ["leave"],
  liability: ["liability"],
  okr: ["okr", "goal"],
  okrs: ["okr", "goal"],
  objectives: ["goal", "objective", "mbo"],
  goals: ["goal"],
  kpi: ["scorecard", "goal"],
  ratings: ["rating"],
  appraisal: ["assessment", "rating"],
  appraisals: ["assessment", "rating"],
  reviews: ["assessment"],
  laptops: ["asset"],
  laptop: ["asset"],
  devices: ["asset"],
  equipment: ["asset"],
  assets: ["asset"],
  salary: ["salary", "compensation"],
  pay: ["compensation", "payroll"],
  cost: ["cost"],
  successors: ["succession"],
  talent: ["succession", "talent"],
  overdue: ["aging", "pending"],
  approvals: ["approval", "pending"],
};

// Topics the catalogue does not cover, with a specific explanation.
const KNOWN_GAPS: Array<{ words: string[]; reason: string }> = [
  {
    words: ["forecast", "predict", "prediction", "projection", "will"],
    reason: "Forecasts and predictions are not available. Reports describe recorded data only.",
  },
  {
    words: ["engagement", "sentiment", "survey", "morale", "pulse"],
    reason: "Engagement and sentiment survey results are not stored in ScoReviewHR yet, so there is no report for them.",
  },
  {
    words: ["market", "benchmark", "competitor", "industry"],
    reason: "External market or benchmark data is not held in ScoReviewHR. Reports cover your own organisation only.",
  },
  {
    words: ["candidate", "candidates", "interview", "applicants"],
    reason: "Candidate-level recruitment data is out of scope for ScoReviewHR reporting.",
  },
];

export type ResolveOutcome =
  | { status: "matched"; report: ReportDefinition; score: number; alternatives: ReportDefinition[] }
  | { status: "forbidden"; report: ReportDefinition; reason: string; alternatives: ReportDefinition[] }
  | { status: "out_of_scope"; reason: string; alternatives: ReportDefinition[] }
  | { status: "invalid"; reason: string; alternatives: ReportDefinition[] };

export function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function singular(t: string): string {
  return t.length > 4 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t;
}

function expand(tokens: string[]): string[] {
  const out = new Set<string>();
  for (const t of tokens) {
    out.add(singular(t));
    for (const s of SYNONYMS[t] ?? []) out.add(singular(s));
  }
  return [...out];
}

export function scoreReport(def: ReportDefinition, terms: string[]): number {
  const name = new Set(tokenise(def.name).map(singular));
  const purpose = new Set(tokenise(def.purpose).map(singular));
  let score = 0;
  for (const t of terms) {
    if (t.toUpperCase() === def.reportKey) score += 10;
    if (name.has(t)) score += 3;
    else if (purpose.has(t)) score += 1;
    if (t === def.module) score += 1;
  }
  return score;
}

const MATCH_THRESHOLD = 3;

/** Default suggestions per role when nothing in the prompt matches. */
function defaultAlternatives(role: string): ReportDefinition[] {
  const preferred = ["HR-002", "LV-001", "PM-001", "AS-001", "HR-004"];
  const accessible = REPORT_CATALOGUE.filter((d) => canAccessReport(role, d, null).ok);
  const picked = preferred
    .map((k) => accessible.find((d) => d.reportKey === k))
    .filter((d): d is ReportDefinition => Boolean(d));
  return (picked.length >= 3 ? picked : accessible).slice(0, 3);
}

export function resolveReportPrompt(prompt: string, role: string): ResolveOutcome {
  const trimmed = prompt.trim();
  const raw = tokenise(trimmed);
  if (raw.length === 0) {
    return {
      status: "invalid",
      reason: "The request has no words we can match. Describe the report you need, for example 'leave liability by department'.",
      alternatives: defaultAlternatives(role),
    };
  }
  const terms = expand(raw);
  const ranked = REPORT_CATALOGUE.map((def) => ({ def, score: scoreReport(def, terms) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const accessibleRanked = ranked.filter((r) => canAccessReport(role, r.def, null).ok);
  const best = ranked[0];

  if (best && best.score >= MATCH_THRESHOLD) {
    const access = canAccessReport(role, best.def, null);
    if (access.ok) {
      return {
        status: "matched",
        report: best.def,
        score: best.score,
        alternatives: accessibleRanked.slice(1, 4).map((r) => r.def),
      };
    }
    // The closest report exists but this role cannot run it. Offer the nearest ones it can.
    const alternatives = accessibleRanked.slice(0, 3).map((r) => r.def);
    return {
      status: "forbidden",
      report: best.def,
      reason: `The closest report is "${best.def.name}" (${best.def.reportKey}), but your role cannot run it because it is ${best.def.sensitivity.toLowerCase()}. Ask HR for a copy, or use one of the reports below.`,
      alternatives: alternatives.length > 0 ? alternatives : defaultAlternatives(role),
    };
  }

  const gap = KNOWN_GAPS.find((g) => g.words.some((w) => raw.includes(w)));
  const unmatched = raw.filter((t) => !ranked.some((r) => scoreReport(r.def, expand([t])) > 0));
  const reason = gap
    ? gap.reason
    : unmatched.length > 0
      ? `No report in the catalogue covers "${unmatched.slice(0, 4).join(", ")}". The catalogue covers people records, leave, performance, assets and cross-module summaries.`
      : "The request is too broad to pick one report. Add the subject (for example leave, attrition, goals or assets) and, if you need it, a department or period.";
  const alternatives = accessibleRanked.slice(0, 3).map((r) => r.def);
  return {
    status: "out_of_scope",
    reason,
    alternatives: alternatives.length > 0 ? alternatives : defaultAlternatives(role),
  };
}

const summary = (d: ReportDefinition) => ({
  reportKey: d.reportKey,
  module: d.module,
  name: d.name,
  purpose: d.purpose,
  drillDown: d.drillDown,
});

const RequestBody = z.object({ prompt: z.string().max(1000) });

const HR_ROLES = new Set(["hr_admin", "hr_director", "hr_manager", "admin", "super_admin", "auditor"]);

export function createReportRequestRoutes(getSql: (env: Env) => any) {
  const app = new Hono<{ Bindings: Env; Variables: { tenant: TenantContext } }>();

  app.post("/api/v1/report-requests", zValidator("json", RequestBody), async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const { prompt } = c.req.valid("json");
    let outcome: ResolveOutcome;
    try {
      outcome = resolveReportPrompt(prompt, role);
    } catch (err) {
      outcome = {
        status: "out_of_scope",
        reason: "The request could not be processed. It has been logged for HR to review.",
        alternatives: defaultAlternatives(role),
      };
      console.error("report request resolver failed", err);
    }

    const errorCode =
      outcome.status === "matched"
        ? null
        : outcome.status === "forbidden"
          ? "REPORT_FORBIDDEN"
          : outcome.status === "invalid"
            ? "EMPTY_PROMPT"
            : "OUT_OF_SCOPE";
    const response =
      outcome.status === "matched" ? `Matched ${outcome.report.reportKey} ${outcome.report.name}` : outcome.reason;

    let logId: number | null = null;
    if (errorCode) {
      try {
        const sql = getSql(c.env);
        const rows = await sql`
          INSERT INTO report_request_log (company_id, employee_id, role, prompt, outcome, error_code, response, closest_report_key, alternatives)
          VALUES (${companyId}, ${userId}, ${role}, ${prompt}, ${outcome.status}, ${errorCode}, ${response},
                  ${outcome.status === "forbidden" ? outcome.report.reportKey : null},
                  ${JSON.stringify(outcome.alternatives.map((a) => a.reportKey))}::jsonb)
          RETURNING id
        `;
        logId = rows[0] ? Number(rows[0].id) : null;
      } catch (err) {
        // The answer still goes back; the missing log line is visible in the worker logs.
        console.error("report request log write failed", err);
      }
    }

    if (outcome.status === "matched") {
      return c.json({
        status: "matched",
        report: summary(outcome.report),
        alternatives: outcome.alternatives.map(summary),
      });
    }
    return c.json({
      status: outcome.status,
      errorCode,
      reason: outcome.reason,
      closestReport: outcome.status === "forbidden" ? summary(outcome.report) : null,
      alternatives: outcome.alternatives.map(summary),
      logId,
    });
  });

  app.get("/api/v1/report-requests/failures", async (c) => {
    const { companyId, role } = c.get("tenant");
    if (!HR_ROLES.has(String(role))) return c.json({ error: "Only HR can view the report request log." }, 403);
    const limit = Math.min(Math.max(Number(c.req.query("limit") ?? 50) || 50, 1), 200);
    const sql = getSql(c.env);
    const rows = await sql`
      SELECT l.id, l.prompt, l.outcome, l.error_code, l.response, l.closest_report_key, l.alternatives, l.role,
             l.created_at, e.first_name, e.last_name
      FROM report_request_log l
      LEFT JOIN employees e ON e.id = l.employee_id AND e.company_id = l.company_id
      WHERE l.company_id = ${companyId}
      ORDER BY l.created_at DESC, l.id DESC
      LIMIT ${limit}
    `;
    return c.json({
      results: rows.map((r: any) => ({
        id: Number(r.id),
        prompt: r.prompt,
        outcome: r.outcome,
        errorCode: r.error_code,
        response: r.response,
        closestReportKey: r.closest_report_key,
        alternatives: r.alternatives ?? [],
        role: r.role,
        requestedBy: [r.first_name, r.last_name].filter(Boolean).join(" ") || null,
        createdAt: new Date(String(r.created_at)).toISOString(),
      })),
    });
  });

  return app;
}

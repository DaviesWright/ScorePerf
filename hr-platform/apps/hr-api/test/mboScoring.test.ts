import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import {
  DEFAULT_MBO_POLICY,
  mboRatingForAchievement,
  requiresDivergenceReason,
  scoreMboAssessment,
  scoreMboMeasure,
  scoreMboObjective,
  type MboMeasureInput,
} from "@hr-platform/shared";
import {
  buildMboObjectiveInputs,
  createPerformanceMboRoutes,
} from "../src/performance-mbo-routes.ts";

const m = (over: Partial<MboMeasureInput>): MboMeasureInput => ({
  measureId: "M1",
  direction: "HIGHER_IS_BETTER",
  weightPct: 100,
  target: 100,
  actual: 100,
  ...over,
});

const codes = (r: { issues: { code: string }[] }) => r.issues.map((i) => i.code);

describe("MBO scoring adapter (BUILD.md §7.4 / §7.5)", () => {
  it("higher-is-better: actual / target × 100", () => {
    const r = scoreMboMeasure(m({ target: 200, actual: 150 }));
    assert.equal(r.status, "SCORED");
    assert.equal(r.basis, "FORMULA");
    assert.equal(r.rawAchievementPct, 75);
    assert.equal(r.creditedPct, 75);
  });

  it("lower-is-better: target / actual × 100, tested independently", () => {
    const r = scoreMboMeasure(m({ direction: "LOWER_IS_BETTER", target: 10, actual: 20 }));
    assert.equal(r.rawAchievementPct, 50);
    const better = scoreMboMeasure(m({ direction: "LOWER_IS_BETTER", target: 10, actual: 8 }));
    assert.equal(better.rawAchievementPct, 125);
    assert.equal(better.creditedPct, 120, "capped at policy cap");
    assert.ok(codes(better).includes("MBO_CAPPED"));
  });

  it("zero target on higher-is-better is invalid, never divides by zero", () => {
    const r = scoreMboMeasure(m({ target: 0, actual: 5 }));
    assert.equal(r.status, "INVALID");
    assert.equal(r.creditedPct, null);
    assert.ok(codes(r).includes("MBO_TARGET_ZERO"));
  });

  it("zero target on lower-is-better (e.g. zero incidents) is an explicit binary outcome", () => {
    const met = scoreMboMeasure(m({ direction: "LOWER_IS_BETTER", target: 0, actual: 0 }));
    assert.equal(met.creditedPct, 100);
    assert.ok(codes(met).includes("MBO_ZERO_TARGET_BINARY"));
    const missed = scoreMboMeasure(m({ direction: "LOWER_IS_BETTER", target: 0, actual: 2 }));
    assert.equal(missed.creditedPct, 0);
    const blocked = scoreMboMeasure(m({ direction: "LOWER_IS_BETTER", target: 0, actual: 0 }), {
      ...DEFAULT_MBO_POLICY,
      zeroTargetLowerIsBetter: "BLOCK",
    });
    assert.equal(blocked.status, "INVALID");
  });

  it("zero actual on lower-is-better is credited at the cap with a warning", () => {
    const r = scoreMboMeasure(m({ direction: "LOWER_IS_BETTER", target: 5, actual: 0 }));
    assert.equal(r.creditedPct, 120);
    assert.ok(codes(r).includes("MBO_ACTUAL_ZERO_CAPPED"));
  });

  it("negative values are rejected", () => {
    assert.equal(scoreMboMeasure(m({ actual: -5 })).status, "INVALID");
    assert.equal(scoreMboMeasure(m({ target: -5 })).status, "INVALID");
    assert.equal(scoreMboMeasure(m({ direction: "LOWER_IS_BETTER", target: 5, actual: -1 })).status, "INVALID");
    assert.equal(scoreMboMeasure(m({ weightPct: -1 })).status, "INVALID");
  });

  it("missing actual blocks by default, or scores zero only when policy says so", () => {
    const blocked = scoreMboMeasure(m({ actual: null }));
    assert.equal(blocked.status, "MISSING");
    assert.equal(blocked.creditedPct, null);
    const zero = scoreMboMeasure(m({ actual: undefined }), { ...DEFAULT_MBO_POLICY, missingData: "SCORE_ZERO" });
    assert.equal(zero.status, "SCORED");
    assert.equal(zero.creditedPct, 0);
    assert.equal(zero.issues[0].severity, "WARNING");
  });

  it("unit mismatch is an error, not a silent conversion", () => {
    const r = scoreMboMeasure(m({ unit: "GHS", actualUnit: "USD" }));
    assert.equal(r.status, "INVALID");
    assert.ok(codes(r).includes("MBO_UNIT_MISMATCH"));
  });

  it("threshold zeroes achievement below the minimum", () => {
    const r = scoreMboMeasure(m({ target: 100, actual: 40 }), { ...DEFAULT_MBO_POLICY, thresholdPct: 50 });
    assert.equal(r.rawAchievementPct, 40);
    assert.equal(r.creditedPct, 0);
    assert.ok(codes(r).includes("MBO_BELOW_THRESHOLD"));
  });

  it("within-range, exact-with-tolerance and milestone measures", () => {
    assert.equal(scoreMboMeasure(m({ direction: "WITHIN_RANGE", rangeMin: 90, rangeMax: 110, actual: 95 })).creditedPct, 100);
    assert.equal(scoreMboMeasure(m({ direction: "WITHIN_RANGE", rangeMin: 90, rangeMax: 110, actual: 111 })).creditedPct, 0);
    assert.equal(scoreMboMeasure(m({ direction: "WITHIN_RANGE", rangeMin: 110, rangeMax: 90, actual: 100 })).status, "INVALID");
    assert.equal(scoreMboMeasure(m({ direction: "EXACT", target: 100, tolerancePct: 2, actual: 101.5 })).creditedPct, 100);
    assert.equal(scoreMboMeasure(m({ direction: "EXACT", target: 100, tolerancePct: 2, actual: 103 })).creditedPct, 0);
    assert.equal(scoreMboMeasure(m({ direction: "MILESTONE", totalMilestones: 4, completedMilestones: 3 })).creditedPct, 75);
    assert.equal(scoreMboMeasure(m({ direction: "MILESTONE", totalMilestones: 4, completedMilestones: 5 })).status, "INVALID");
    assert.equal(scoreMboMeasure(m({ direction: "MILESTONE", totalMilestones: 0, completedMilestones: 0 })).status, "INVALID");
  });

  it("qualitative measures use the declared rubric, marked RUBRIC not FORMULA", () => {
    const r = scoreMboMeasure(m({ direction: "QUALITATIVE", qualitativeRating: 3 }));
    assert.equal(r.basis, "RUBRIC");
    assert.equal(r.creditedPct, 100);
    assert.equal(scoreMboMeasure(m({ direction: "QUALITATIVE", qualitativeRating: 6 })).status, "INVALID");
    assert.equal(scoreMboMeasure(m({ direction: "QUALITATIVE", qualitativeRating: 2.5 })).status, "INVALID");
  });

  it("objective: measure weights must sum to 100", () => {
    const bad = scoreMboObjective({
      objectiveId: "O1",
      weightPct: 100,
      measures: [m({ measureId: "A", weightPct: 60 }), m({ measureId: "B", weightPct: 30 })],
    });
    assert.equal(bad.complete, false);
    assert.ok(codes(bad).includes("MBO_MEASURE_WEIGHTS_INVALID"));
  });

  it("weighted results reconcile exactly to the policy", () => {
    // O1 (60%): A 75% × 50 + B 120%(cap) × 50 = 97.5%
    // O2 (40%): milestones 2/4 = 50%
    // Overall = 0.6 × 97.5 + 0.4 × 50 = 78.5% → band 2 "Needs improvement"
    const r = scoreMboAssessment([
      {
        objectiveId: "O1",
        weightPct: 60,
        measures: [
          m({ measureId: "A", weightPct: 50, target: 200, actual: 150 }),
          m({ measureId: "B", weightPct: 50, direction: "LOWER_IS_BETTER", target: 10, actual: 5 }),
        ],
      },
      {
        objectiveId: "O2",
        weightPct: 40,
        measures: [m({ measureId: "C", direction: "MILESTONE", totalMilestones: 4, completedMilestones: 2 })],
      },
    ]);
    assert.equal(r.completeness, "COMPLETE");
    assert.equal(r.objectives[0].achievementPct, 97.5);
    assert.equal(r.objectives[1].achievementPct, 50);
    assert.equal(r.achievementPct, 78.5);
    assert.equal(r.computedRating, 2);
    assert.equal(r.ratingLabel, "Needs improvement");
    assert.equal(r.ruleVersion, "mbo-2026.1");
  });

  it("assessment is INCOMPLETE with no rating when any objective is invalid or weights are off", () => {
    const missing = scoreMboAssessment([
      { objectiveId: "O1", weightPct: 100, measures: [m({ actual: null })] },
    ]);
    assert.equal(missing.completeness, "INCOMPLETE");
    assert.equal(missing.computedRating, null);

    const weights = scoreMboAssessment([
      { objectiveId: "O1", weightPct: 50, measures: [m({})] },
      { objectiveId: "O2", weightPct: 40, measures: [m({})] },
    ]);
    assert.equal(weights.completeness, "INCOMPLETE");
    assert.ok(codes(weights).includes("MBO_OBJECTIVE_WEIGHTS_INVALID"));

    assert.ok(codes(scoreMboAssessment([])).includes("MBO_NO_OBJECTIVES"));
  });

  it("rating bands and divergence rule", () => {
    assert.equal(mboRatingForAchievement(120).rating, 5);
    assert.equal(mboRatingForAchievement(105).rating, 4);
    assert.equal(mboRatingForAchievement(100).rating, 3);
    assert.equal(mboRatingForAchievement(79.99).rating, 2);
    assert.equal(mboRatingForAchievement(0).rating, 1);
    assert.equal(requiresDivergenceReason(3, 4), false);
    assert.equal(requiresDivergenceReason(3, 5), true);
    assert.equal(requiresDivergenceReason(2, 3.5), true);
    assert.equal(requiresDivergenceReason(null, 5), false);
  });
});

describe("MBO compute route", () => {
  it("never treats an unrecorded default actual of 0 as data", () => {
    const inputs = buildMboObjectiveInputs(
      [{ id: "G1", weight_pct: "100" }],
      [
        { id: "M1", goal_id: "G1", direction: "HIGHER_IS_BETTER", weight_pct: "100", target: "10", actual: "0", actual_recorded_at: null },
      ],
    );
    assert.equal(inputs[0].measures[0].actual, null);
  });

  function makeSql(state: { assessment: any; goals: any[]; measures: any[]; writes: string[] }) {
    const sql: any = (strings: any, ...vals: unknown[]) => {
      if (!Array.isArray(strings) || !("raw" in strings)) return { __list: strings };
      const q = strings.join(" ");
      if (/^\s*(INSERT|UPDATE)/.test(q)) {
        state.writes.push(q.trim().split(/\s+/).slice(0, 3).join(" "));
        return Promise.resolve([]);
      }
      if (q.includes("FROM performance_assessments")) {
        return Promise.resolve(vals[0] === state.assessment.id ? [state.assessment] : []);
      }
      if (q.includes("FROM performance_goals")) return Promise.resolve(state.goals);
      if (q.includes("FROM performance_goal_measures")) return Promise.resolve(state.measures);
      return Promise.resolve([]);
    };
    sql.begin = async (fn: (t: unknown) => Promise<unknown>) => fn(sql);
    return sql;
  }

  function appFor(sql: any, tenant: { userId: number; role: string }) {
    const app = new Hono<any>();
    app.use("*", async (c, next) => {
      c.set("tenant", { companyId: 1, ...tenant });
      await next();
    });
    app.route("/", createPerformanceMboRoutes(() => sql));
    return app;
  }

  const base = (): { assessment: any; goals: any[]; measures: any[]; writes: string[] } => ({
    assessment: { id: "A1", tenant_id: "1", cycle_id: "C1", employee_id: "21", manager_employee_id: "20", is_locked: false },
    goals: [
      { id: "G1", framework: "MBO", weight_pct: "60", status: "ACTIVE" },
      { id: "G2", framework: "MBO", weight_pct: "40", status: "ACTIVE" },
    ],
    measures: [
      { id: "M1", goal_id: "G1", direction: "HIGHER_IS_BETTER", weight_pct: "100", target: "100", actual: "110", actual_recorded_at: "2026-11-01" },
      { id: "M2", goal_id: "G2", direction: "MILESTONE", weight_pct: "100", total_milestones: 4, completed_milestones: 4, actual_recorded_at: "2026-11-01" },
    ],
    writes: [] as string[],
  });

  it("computes, stores and audits a COMPLETE rating for the manager", async () => {
    const state = base();
    const res = await appFor(makeSql(state), { userId: 20, role: "line_manager" }).request(
      "/api/v1/performance/assessments/A1/compute",
      { method: "POST" },
    );
    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.completeness, "COMPLETE");
    assert.equal(body.achievementPct, 106); // 0.6 × 110 + 0.4 × 100
    assert.equal(body.computedRating, 4);
    assert.deepEqual(state.writes, [
      "INSERT INTO performance_assessment_computations",
      "UPDATE performance_assessments SET",
      "INSERT INTO performance_audit_events",
    ]);
  });

  it("returns 422 INCOMPLETE when a measure has no direction", async () => {
    const state = base();
    state.measures[0].direction = null;
    const res = await appFor(makeSql(state), { userId: 1, role: "hr_admin" }).request(
      "/api/v1/performance/assessments/A1/compute",
      { method: "POST" },
    );
    assert.equal(res.status, 422);
    const body: any = await res.json();
    assert.equal(body.computedRating, null);
    assert.equal(body.issues[0].code, "MBO_MISSING_DIRECTION");
  });

  it("refuses non-MBO cycles, outsiders and locked assessments", async () => {
    const okr = base();
    okr.goals[0].framework = "OKR";
    okr.goals[1].framework = "OKR";
    const r1 = await appFor(makeSql(okr), { userId: 1, role: "hr_admin" }).request(
      "/api/v1/performance/assessments/A1/compute",
      { method: "POST" },
    );
    assert.equal(r1.status, 422);
    assert.equal(((await r1.json()) as any).code, "PERF_NOT_MBO_CYCLE");

    const r2 = await appFor(makeSql(base()), { userId: 99, role: "employee" }).request(
      "/api/v1/performance/assessments/A1/compute",
      { method: "POST" },
    );
    assert.equal(r2.status, 403);

    const locked = base();
    locked.assessment.is_locked = true;
    const r3 = await appFor(makeSql(locked), { userId: 1, role: "hr_director" }).request(
      "/api/v1/performance/assessments/A1/compute",
      { method: "POST" },
    );
    assert.equal(r3.status, 409);
  });
});

describe("Manager submit: divergence from computed MBO rating", () => {
  it("requires a reason when the manager rating is more than one band away", async () => {
    const { createPerformanceV12Routes } = await import("../src/performance-v12-routes.ts");
    const mockSql: any = (strings: TemplateStringsArray, ...vals: unknown[]) => {
      const q = strings.join(" ");
      if (q.includes("FROM performance_assessments") && q.includes("WHERE id =")) {
        return Promise.resolve([
          { id: vals[0], employee_id: "21", cycle_id: "c1", stage: "SELF_COMPLETE", computed_rating: "2.00", revision_round: 0, max_revision_rounds: 2 },
        ]);
      }
      if (q.includes("FROM reporting_lines")) return Promise.resolve([{ employee_id: 21, manager_id: 20 }]);
      if (q.includes("FROM performance_objective_volume_policies")) {
        return Promise.resolve([{ min_objectives: 8, max_objectives: 10, per_focus_floor: 2, enforcement: "warn" }]);
      }
      return Promise.resolve([]);
    };
    const app = new Hono<any>();
    app.use("*", async (c, next) => {
      c.set("tenant", { companyId: 1, userId: 20, role: "line_manager" });
      await next();
    });
    app.route("/", createPerformanceV12Routes(() => mockSql));
    const post = (body: unknown) =>
      app.request("/api/v1/performance/assessments/A1/manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

    const noReason = await post({ overallRating: 4 });
    assert.equal(noReason.status, 400);
    const j: any = await noReason.json();
    assert.equal(j.code, "PERF_DIVERGENCE_REASON_REQUIRED");
    assert.equal(j.computedRating, 2);

    const withinOneBand = await post({ overallRating: 3 });
    assert.equal(withinOneBand.status, 200);

    const withReason = await post({ overallRating: 4, divergenceReason: "Delivered the Tema site handover early; target was set before scope doubled." });
    assert.equal(withReason.status, 200);
  });
});

describe("Check-in authorisation", () => {
  it("owner, their manager or HR may check in; only manager or HR set a rubric rating", async () => {
    const { canRecordCheckin } = await import("../src/performance-routes.ts");
    const base = { actorId: "21", ownerId: "21", role: "employee", isOwnersManager: false, setsQualitativeRating: false };
    assert.equal(canRecordCheckin(base).allowed, true);
    assert.equal(canRecordCheckin({ ...base, actorId: "22" }).code, "PERF_CHECKIN_FORBIDDEN");
    assert.equal(canRecordCheckin({ ...base, actorId: "30", role: "line_manager" }).code, "PERF_CHECKIN_FORBIDDEN");
    assert.equal(canRecordCheckin({ ...base, actorId: "20", role: "line_manager", isOwnersManager: true }).allowed, true);
    assert.equal(canRecordCheckin({ ...base, setsQualitativeRating: true }).code, "PERF_QUALITATIVE_RATING_FORBIDDEN");
    assert.equal(canRecordCheckin({ ...base, role: "hr_admin", setsQualitativeRating: true }).code, "PERF_QUALITATIVE_RATING_FORBIDDEN");
    assert.equal(canRecordCheckin({ ...base, actorId: "20", isOwnersManager: true, setsQualitativeRating: true }).allowed, true);
    assert.equal(canRecordCheckin({ ...base, actorId: "1", role: "hr_admin", setsQualitativeRating: true }).allowed, true);
  });

  it("the check-in route refuses a colleague", async () => {
    const { createPerformanceRoutes } = await import("../src/performance-routes.ts");
    const sql: any = (strings: TemplateStringsArray) => {
      const q = strings.join(" ");
      if (q.includes("FROM performance_goals WHERE id =")) return Promise.resolve([{ id: "G1", owner_employee_id: "21", framework: "MBO" }]);
      return Promise.resolve([]);
    };
    const app = new Hono<any>();
    app.use("*", async (c, next) => {
      c.set("tenant", { companyId: 1, userId: 22, role: "employee" });
      await next();
    });
    app.route("/", createPerformanceRoutes(() => sql));
    const res = await app.request("/api/v1/performance/goals/G1/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progressPct: 50, measureActuals: [{ measureId: "M1", actual: 999 }] }),
    });
    assert.equal(res.status, 403);
    assert.equal(((await res.json()) as any).code, "PERF_CHECKIN_FORBIDDEN");
  });
});

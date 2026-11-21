import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import {
  buildNineBox,
  createPerformanceTalentRoutes,
  performanceBand,
} from "../src/performance-talent-routes.ts";

describe("9-box from certified results", () => {
  it("maps certified ratings to performance bands", () => {
    assert.equal(performanceBand(1), "LOW");
    assert.equal(performanceBand(2.49), "LOW");
    assert.equal(performanceBand(3), "MODERATE");
    assert.equal(performanceBand(3.5), "HIGH");
    assert.equal(performanceBand(5), "HIGH");
  });

  it("places only certified results with confirmed potential; lists the rest as excluded", () => {
    const { cells, excluded } = buildNineBox([
      { assessment_id: "A1", employee_id: "1", final_rating: "4.00", potential_confirmed: "HIGH", stage: "FINALIZED" },
      { assessment_id: "A2", employee_id: "2", final_rating: "2.00", potential_confirmed: "LOW", stage: "ACKNOWLEDGED" },
      { assessment_id: "A3", employee_id: "3", final_rating: "3.00", potential_confirmed: "MEDIUM", stage: "APPEAL_RESOLVED" },
      { assessment_id: "A4", employee_id: "4", final_rating: "3.00", potential_confirmed: null, stage: "FINALIZED" },
      { assessment_id: "A5", employee_id: "5", final_rating: "2.00", potential_confirmed: "LOW", stage: "APPEAL_OPEN" },
    ]);
    assert.equal(cells.length, 9);
    const at = (id: string) => cells.find((c) => c.cellId === id)!.employees.map((e) => e.employeeId);
    assert.deepEqual(at("consistent_star"), ["1"]);
    assert.deepEqual(at("talent_action"), ["2"]);
    assert.deepEqual(at("core_contributor"), ["3"]);
    assert.deepEqual(
      excluded.map((e) => [e.employeeId, e.reason]),
      [["4", "POTENTIAL_NOT_CONFIRMED"], ["5", "APPEAL_OPEN"]],
    );
  });
});

type State = { assessment: any; pip: any; livePips: number; writes: string[]; matrixRows: any[] };

function makeSql(st: State) {
  const sql: any = (strings: any, ...vals: unknown[]) => {
    if (!Array.isArray(strings) || !("raw" in strings)) return { __list: strings };
    const q = strings.join(" ");
    if (/^\s*(INSERT|UPDATE)/.test(q)) {
      st.writes.push(q.trim().split(/\s+/).slice(0, 3).join(" "));
      return Promise.resolve([]);
    }
    if (q.includes("AS assessment_id, employee_id, final_rating, potential_confirmed")) return Promise.resolve(st.matrixRows);
    if (q.includes("FROM performance_assessments WHERE id =")) {
      return Promise.resolve(st.assessment && vals[0] === st.assessment.id ? [st.assessment] : []);
    }
    if (q.includes("FROM performance_pips WHERE id =")) {
      return Promise.resolve(st.pip && vals[0] === st.pip.id ? [st.pip] : []);
    }
    if (q.includes("FROM performance_pips") && q.includes("stage <> 'CLOSURE'")) {
      return Promise.resolve(Array.from({ length: st.livePips }, () => ({ id: "X" })));
    }
    return Promise.resolve([]);
  };
  sql.begin = async (fn: (t: unknown) => Promise<unknown>) => fn(sql);
  return sql;
}

function appFor(st: State, userId: number, role: string) {
  const app = new Hono<any>();
  app.use("*", async (c, next) => {
    c.set("tenant", { companyId: 1, userId, role });
    await next();
  });
  app.route("/", createPerformanceTalentRoutes(() => makeSql(st)));
  return app;
}

const post = (body?: unknown) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

const fresh = (): State => ({
  assessment: {
    id: "A1", employee_id: "21", manager_employee_id: "20", cycle_id: "C1", stage: "FINALIZED",
    final_rating: "2.00", certified_version: 1, is_locked: true,
  },
  pip: { id: "P1", employee_id: "21", manager_id: "20", stage: "ACCEPTANCE", created_by: "1" },
  livePips: 0,
  writes: [],
  matrixRows: [],
});

const pipBody = {
  assessmentId: "A1",
  improvementAreas: [{ area: "Site handover SLA", expectedStandard: "90% of handovers on schedule", measure: "Monthly handover report" }],
  supportPlan: "Weekly coaching with the operations lead and a site-scheduling refresher course.",
  startDate: "2026-12-01",
  endDate: "2027-02-28",
};

describe("Potential, talent matrix and PIP routes", () => {
  it("only the assessing manager proposes potential, and only before calibration ends", async () => {
    const st = fresh();
    st.assessment = { ...st.assessment, stage: "MANAGER_COMPLETE", is_locked: false };
    const body = { level: "HIGH", rationale: "Led two site launches and coached three new supervisors." };
    assert.equal((await appFor(st, 5, "hr_admin").request("/api/v1/performance/assessments/A1/potential", post(body))).status, 403);
    assert.equal((await appFor(st, 20, "line_manager").request("/api/v1/performance/assessments/A1/potential", post(body))).status, 200);
    st.assessment.stage = "FINALIZED";
    assert.equal((await appFor(st, 20, "line_manager").request("/api/v1/performance/assessments/A1/potential", post(body))).status, 409);
  });

  it("talent matrix is HR-only and needs a cycle", async () => {
    const st = fresh();
    st.matrixRows = [{ assessment_id: "A1", employee_id: "21", final_rating: "4.00", potential_confirmed: "HIGH", stage: "FINALIZED" }];
    assert.equal((await appFor(st, 20, "line_manager").request("/api/v1/performance/talent-matrix?cycleId=C1")).status, 403);
    assert.equal((await appFor(st, 1, "hr_admin").request("/api/v1/performance/talent-matrix")).status, 400);
    const ok = await appFor(st, 1, "hr_admin").request("/api/v1/performance/talent-matrix?cycleId=C1");
    const body: any = await ok.json();
    assert.equal(body.cells.find((c: any) => c.cellId === "consistent_star").employees.length, 1);
  });

  it("PIP needs HR, a certified rating of 2 or below, no open appeal and a 30–180 day window", async () => {
    const st = fresh();
    assert.equal((await appFor(st, 20, "line_manager").request("/api/v1/performance/pips", post(pipBody))).status, 403);
    assert.equal(
      ((await (await appFor(st, 1, "hr_admin").request("/api/v1/performance/pips", post({ ...pipBody, endDate: "2026-12-10" }))).json()) as any).code,
      "PERF_PIP_DURATION",
    );

    st.assessment.final_rating = "3.00";
    assert.equal(((await (await appFor(st, 1, "hr_admin").request("/api/v1/performance/pips", post(pipBody))).json()) as any).code, "PERF_PIP_NOT_ELIGIBLE");

    st.assessment.final_rating = "2.00";
    st.assessment.stage = "APPEAL_OPEN";
    assert.equal(((await (await appFor(st, 1, "hr_admin").request("/api/v1/performance/pips", post(pipBody))).json()) as any).code, "PERF_APPEAL_OPEN");

    st.assessment.stage = "FINALIZED";
    const ok = await appFor(st, 1, "hr_admin").request("/api/v1/performance/pips", post(pipBody));
    assert.equal(ok.status, 201);
    assert.equal(((await ok.json()) as any).stage, "ACCEPTANCE");

    st.livePips = 1;
    assert.equal(((await (await appFor(st, 1, "hr_admin").request("/api/v1/performance/pips", post(pipBody))).json()) as any).code, "PERF_PIP_OPEN");
  });

  it("PIP stages: employee accepts, a different HR director signs off, manager checks in, HR closes", async () => {
    const st = fresh();
    assert.equal((await appFor(st, 20, "line_manager").request("/api/v1/performance/pips/P1/accept", post({}))).status, 403);
    assert.equal((await appFor(st, 21, "employee").request("/api/v1/performance/pips/P1/accept", post({ comment: "I disagree with area 1" }))).status, 200);

    st.pip.stage = "SIGN_OFF";
    const self = await appFor(st, 1, "hr_director").request("/api/v1/performance/pips/P1/sign-off", post());
    assert.equal(((await self.json()) as any).code, "PERF_SOD_PIP_SIGNOFF");
    assert.equal((await appFor(st, 9, "hr_director").request("/api/v1/performance/pips/P1/sign-off", post())).status, 200);

    st.pip.stage = "EXECUTION";
    const checkin = { status: "AT_RISK", notes: "Two of four handovers late this month." };
    assert.equal((await appFor(st, 33, "line_manager").request("/api/v1/performance/pips/P1/check-ins", post(checkin))).status, 403);
    assert.equal((await appFor(st, 20, "line_manager").request("/api/v1/performance/pips/P1/check-ins", post(checkin))).status, 201);

    const close = { outcome: "MET", reason: "All handovers on schedule for the final six weeks." };
    assert.equal((await appFor(st, 20, "line_manager").request("/api/v1/performance/pips/P1/close", post(close))).status, 403);
    const done = await appFor(st, 1, "hr_admin").request("/api/v1/performance/pips/P1/close", post(close));
    assert.equal(done.status, 200);
    assert.equal(((await done.json()) as any).outcome, "MET");
  });
});

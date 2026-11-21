import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import {
  canCalibrate,
  createPerformanceCalibrationRoutes,
} from "../src/performance-calibration-routes.ts";

describe("Calibration separation of duties", () => {
  it("only committee members, never the employee or their assessing manager", () => {
    const base = { actorId: "5", employeeId: "21", managerId: "20", isCommitteeMember: true };
    assert.equal(canCalibrate(base).allowed, true);
    assert.equal(canCalibrate({ ...base, isCommitteeMember: false }).code, "PERF_NOT_COMMITTEE_MEMBER");
    assert.equal(canCalibrate({ ...base, actorId: "21" }).code, "PERF_SOD_OWN_RATING");
    assert.equal(canCalibrate({ ...base, actorId: "20" }).code, "PERF_SOD_MANAGER_CALIBRATOR");
  });
});

type State = {
  session: any;
  members: string[];
  items: string[];
  decided: string[];
  assessments: Record<string, any>;
  otherOpen: string[];
  writes: string[];
};

function makeSql(state: State) {
  const sql: any = (strings: any, ...vals: unknown[]) => {
    if (!Array.isArray(strings) || !("raw" in strings)) return { __list: strings };
    const q = strings.join(" ");
    if (/^\s*(INSERT|UPDATE)/.test(q)) {
      state.writes.push(q.trim().split(/\s+/).slice(0, 3).join(" "));
      if (q.includes("INSERT INTO performance_calibration_decisions")) state.decided.push(String(vals[2]));
      return Promise.resolve([]);
    }
    if (q.includes("FROM performance_calibration_sessions WHERE id =")) {
      return Promise.resolve(state.session && vals[0] === state.session.id ? [state.session] : []);
    }
    if (q.includes("FROM performance_calibration_members WHERE session_id")) {
      return Promise.resolve(state.members.includes(String(vals[1])) ? [{ "?column?": 1 }] : []);
    }
    if (q.includes("NOT EXISTS")) {
      return Promise.resolve(
        state.items.filter((i) => !state.decided.includes(i)).map((assessment_id) => ({ assessment_id })),
      );
    }
    if (q.includes("JOIN performance_calibration_sessions s ON s.id = i.session_id")) {
      return Promise.resolve(state.otherOpen.map((assessment_id) => ({ assessment_id })));
    }
    if (q.includes("FROM performance_calibration_items") && q.includes("assessment_id =")) {
      return Promise.resolve(state.items.includes(String(vals[1])) ? [{ "?column?": 1 }] : []);
    }
    if (q.includes("FROM performance_assessments") && q.includes("id IN")) {
      return Promise.resolve(Object.values(state.assessments));
    }
    if (q.includes("FROM performance_assessments WHERE id =")) {
      const a = state.assessments[String(vals[0])];
      return Promise.resolve(a ? [a] : []);
    }
    return Promise.resolve([]);
  };
  sql.begin = async (fn: (t: unknown) => Promise<unknown>) => fn(sql);
  return sql;
}

function appFor(state: State, userId: number, role: string) {
  const app = new Hono<any>();
  app.use("*", async (c, next) => {
    c.set("tenant", { companyId: 1, userId, role });
    await next();
  });
  app.route("/", createPerformanceCalibrationRoutes(() => makeSql(state)));
  return app;
}

const json = (body: unknown) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const fresh = (): State => ({
  session: { id: "S1", tenant_id: "1", cycle_id: "C1", status: "OPEN" },
  members: ["5", "20"],
  items: ["A1"],
  decided: [],
  assessments: {
    A1: { id: "A1", cycle_id: "C1", employee_id: "21", manager_employee_id: "20", stage: "CALIBRATION_PENDING", manager_rating: "4.00", computed_rating: "3.00", calibrated_rating: null, is_locked: false },
    A2: { id: "A2", cycle_id: "C1", employee_id: "22", manager_employee_id: "20", stage: "MANAGER_COMPLETE", is_locked: false },
    A3: { id: "A3", cycle_id: "C2", employee_id: "23", stage: "MANAGER_COMPLETE", is_locked: false },
    A4: { id: "A4", cycle_id: "C1", employee_id: "24", stage: "SELF_PENDING", is_locked: false },
  },
  otherOpen: [],
  writes: [],
});

describe("Calibration session routes", () => {
  it("only HR can open a session; chair is added as a member", async () => {
    const st = fresh();
    const denied = await appFor(st, 20, "line_manager").request(
      "/api/v1/performance/calibration/sessions",
      json({ cycleId: "C1", title: "Ops H2", chairId: "5", memberIds: ["6"] }),
    );
    assert.equal(denied.status, 403);
    const ok = await appFor(st, 1, "hr_admin").request(
      "/api/v1/performance/calibration/sessions",
      json({ cycleId: "C1", title: "Ops H2", chairId: "5", memberIds: ["6", "5"] }),
    );
    assert.equal(ok.status, 201);
    const body: any = await ok.json();
    assert.deepEqual(body.members, ["5", "6"]);
  });

  it("adds only ready, same-cycle assessments and reports the rest", async () => {
    const st = fresh();
    const res = await appFor(st, 1, "hr_admin").request(
      "/api/v1/performance/calibration/sessions/S1/assessments",
      json({ assessmentIds: ["A2", "A3", "A4", "A9"] }),
    );
    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.deepEqual(body.accepted, ["A2"]);
    assert.deepEqual(
      body.rejected.map((r: any) => r.code),
      ["PERF_CYCLE_MISMATCH", "PERF_STAGE_NOT_READY", "PERF_ASSESSMENT_NOT_FOUND"],
    );
  });

  it("decide: committee member records a decision keeping manager and computed ratings", async () => {
    const st = fresh();
    const res = await appFor(st, 5, "line_manager").request(
      "/api/v1/performance/calibration/decide",
      json({ sessionId: "S1", assessmentId: "A1", postRating: 3, rationale: "Aligned to computed MBO result" }),
    );
    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.preRating, 4);
    assert.equal(body.managerRating, 4);
    assert.equal(body.computedRating, 3);
    assert.ok(st.writes.includes("INSERT INTO performance_calibration_decisions"));
  });

  it("decide: the assessing manager and non-members are refused even if HR", async () => {
    const st = fresh();
    const mgr = await appFor(st, 20, "line_manager").request(
      "/api/v1/performance/calibration/decide",
      json({ sessionId: "S1", assessmentId: "A1", postRating: 5, rationale: "My team member deserves it" }),
    );
    assert.equal(mgr.status, 403);
    assert.equal(((await mgr.json()) as any).code, "PERF_SOD_MANAGER_CALIBRATOR");

    const hrOutsider = await appFor(st, 1, "hr_director").request(
      "/api/v1/performance/calibration/decide",
      json({ sessionId: "S1", assessmentId: "A1", postRating: 5, rationale: "Override by HR" }),
    );
    assert.equal(hrOutsider.status, 403);
    assert.equal(((await hrOutsider.json()) as any).code, "PERF_NOT_COMMITTEE_MEMBER");
  });

  it("decide: refuses closed sessions and assessments outside the session", async () => {
    const st = fresh();
    const notIn = await appFor(st, 5, "hr_admin").request(
      "/api/v1/performance/calibration/decide",
      json({ sessionId: "S1", assessmentId: "A2", postRating: 3, rationale: "Not in this session" }),
    );
    assert.equal(notIn.status, 409);
    assert.equal(((await notIn.json()) as any).code, "PERF_NOT_IN_SESSION");

    st.session.status = "COMPLETED";
    const closed = await appFor(st, 5, "hr_admin").request(
      "/api/v1/performance/calibration/decide",
      json({ sessionId: "S1", assessmentId: "A1", postRating: 3, rationale: "Too late" }),
    );
    assert.equal(closed.status, 409);
  });

  it("close: blocked until every item has a decision", async () => {
    const st = fresh();
    const blocked = await appFor(st, 1, "hr_admin").request("/api/v1/performance/calibration/sessions/S1/close", { method: "POST" });
    assert.equal(blocked.status, 409);
    assert.deepEqual(((await blocked.json()) as any).assessmentIds, ["A1"]);

    st.decided.push("A1");
    const ok = await appFor(st, 1, "hr_admin").request("/api/v1/performance/calibration/sessions/S1/close", { method: "POST" });
    assert.equal(ok.status, 200);
    assert.equal(((await ok.json()) as any).status, "COMPLETED");
  });
});

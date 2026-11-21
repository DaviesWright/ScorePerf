import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import {
  addWorkingDays,
  canReviewAppeal,
  createPerformanceCertificationRoutes,
} from "../src/performance-certification-routes.ts";

describe("Certification and appeal rules", () => {
  it("appeal window counts Monday to Friday only", () => {
    // Fri 20 Nov 2026 + 10 working days = Fri 4 Dec 2026
    assert.equal(addWorkingDays(new Date("2026-11-20T15:00:00Z"), 10), "2026-12-04");
    // Sat 21 Nov 2026 + 1 working day = Mon 23 Nov 2026
    assert.equal(addWorkingDays(new Date("2026-11-21T09:00:00Z"), 1), "2026-11-23");
  });

  it("appeal reviewer must be independent of the result", () => {
    const base = { reviewerId: "50", employeeId: "21", managerId: "20", calibratorIds: ["5"], certifierId: "9" };
    assert.equal(canReviewAppeal(base).allowed, true);
    assert.equal(canReviewAppeal({ ...base, reviewerId: "21" }).code, "PERF_SOD_OWN_APPEAL");
    assert.equal(canReviewAppeal({ ...base, reviewerId: "20" }).code, "PERF_SOD_MANAGER_REVIEWER");
    assert.equal(canReviewAppeal({ ...base, reviewerId: "5" }).code, "PERF_SOD_CALIBRATOR_REVIEWER");
    assert.equal(canReviewAppeal({ ...base, reviewerId: "9" }).code, "PERF_SOD_CERTIFIER_REVIEWER");
  });
});

type State = {
  session: any;
  items: any[];
  assessment: any;
  appeal: any;
  openAppeals: number;
  writes: string[];
};

function makeSql(st: State) {
  const sql: any = (strings: any, ...vals: unknown[]) => {
    if (!Array.isArray(strings) || !("raw" in strings)) return { __list: strings };
    const q = strings.join(" ");
    if (/^\s*(INSERT|UPDATE)/.test(q)) {
      st.writes.push(q.trim().split(/\s+/).slice(0, 3).join(" "));
      return Promise.resolve([]);
    }
    if (q.includes("FROM performance_calibration_sessions WHERE id =")) {
      return Promise.resolve(st.session && vals[0] === st.session.id ? [st.session] : []);
    }
    if (q.includes("FROM performance_calibration_items i")) return Promise.resolve(st.items);
    if (q.includes("FROM performance_assessments WHERE id =")) {
      return Promise.resolve(st.assessment && vals[0] === st.assessment.id ? [st.assessment] : []);
    }
    if (q.includes("FROM performance_appeals") && q.includes("status IN")) {
      return Promise.resolve(Array.from({ length: st.openAppeals }, () => ({ id: "X" })));
    }
    if (q.includes("FROM performance_appeals WHERE id =")) {
      return Promise.resolve(st.appeal && vals[0] === st.appeal.id ? [st.appeal] : []);
    }
    if (q.includes("FROM performance_calibration_decisions")) return Promise.resolve([{ approver_employee_id: "5" }]);
    if (q.includes("FROM performance_certified_results")) return Promise.resolve([{ certified_by: "9" }]);
    return Promise.resolve([]);
  };
  sql.begin = async (fn: (t: unknown) => Promise<unknown>) => fn(sql);
  return sql;
}

const NOW = new Date("2026-11-23T10:00:00Z");

function appFor(st: State, userId: number, role: string, now = NOW) {
  const app = new Hono<any>();
  app.use("*", async (c, next) => {
    c.set("tenant", { companyId: 1, userId, role });
    await next();
  });
  app.route("/", createPerformanceCertificationRoutes(() => makeSql(st), () => now));
  return app;
}

const post = (body?: unknown) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

const fresh = (): State => ({
  session: { id: "S1", tenant_id: "1", status: "COMPLETED", certified_at: null },
  items: [
    { id: "A1", employee_id: "21", stage: "CALIBRATION_COMPLETE", calibrated_rating: "3.00", computed_rating: "3.00", manager_rating: "4.00" },
  ],
  assessment: {
    id: "A1", employee_id: "21", manager_employee_id: "20", stage: "FINALIZED", final_rating: "3.00",
    calibrated_rating: "3.00", certified_version: 1, appeal_deadline: "2026-12-07",
  },
  appeal: { id: "P1", assessment_id: "A1", status: "FILED", reviewer_id: null },
  openAppeals: 0,
  writes: [],
});

describe("Certification routes", () => {
  it("only an HR director certifies, only closed sessions, never their own result", async () => {
    const st = fresh();
    assert.equal((await appFor(st, 1, "hr_admin").request("/api/v1/performance/calibration/sessions/S1/certify", post())).status, 403);

    st.session.status = "OPEN";
    assert.equal((await appFor(st, 9, "hr_director").request("/api/v1/performance/calibration/sessions/S1/certify", post())).status, 409);

    st.session.status = "COMPLETED";
    const own = await appFor(st, 21, "hr_director").request("/api/v1/performance/calibration/sessions/S1/certify", post());
    assert.equal(own.status, 403);
    assert.equal(((await own.json()) as any).code, "PERF_SOD_OWN_CERTIFICATION");
  });

  it("certifies: version 1, lock, appeal deadline 10 working days out", async () => {
    const st = fresh();
    const res = await appFor(st, 9, "hr_director").request("/api/v1/performance/calibration/sessions/S1/certify", post());
    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.certified, 1);
    assert.equal(body.appealDeadline, "2026-12-07");
    assert.deepEqual(st.writes, [
      "INSERT INTO performance_certified_results",
      "UPDATE performance_assessments SET",
      "UPDATE performance_calibration_sessions SET",
      "INSERT INTO performance_audit_events",
    ]);
  });

  it("refuses to certify uncalibrated items", async () => {
    const st = fresh();
    st.items[0].calibrated_rating = null;
    const res = await appFor(st, 9, "hr_director").request("/api/v1/performance/calibration/sessions/S1/certify", post());
    assert.equal(res.status, 409);
    assert.equal(((await res.json()) as any).code, "PERF_NOT_CALIBRATED");
  });
});

describe("Appeal routes", () => {
  const reason = { assessmentId: "A1", reason: "The Q3 sales target was raised mid-cycle without agreement." };

  it("employee files within the window; others and late filings are refused", async () => {
    const st = fresh();
    assert.equal((await appFor(st, 20, "line_manager").request("/api/v1/performance/appeals", post(reason))).status, 403);

    const late = await appFor(st, 21, "employee", new Date("2026-12-08T09:00:00Z")).request("/api/v1/performance/appeals", post(reason));
    assert.equal(late.status, 409);
    assert.equal(((await late.json()) as any).code, "PERF_APPEAL_WINDOW_CLOSED");

    const ok = await appFor(st, 21, "employee").request("/api/v1/performance/appeals", post(reason));
    assert.equal(ok.status, 201);

    st.openAppeals = 1;
    const dup = await appFor(st, 21, "employee").request("/api/v1/performance/appeals", post(reason));
    assert.equal(((await dup.json()) as any).code, "PERF_APPEAL_OPEN");
  });

  it("acknowledging does not block a later appeal", async () => {
    const st = fresh();
    const ack = await appFor(st, 21, "employee").request("/api/v1/performance/assessments/A1/acknowledge", post());
    assert.equal(ack.status, 200);
    st.assessment.stage = "ACKNOWLEDGED";
    assert.equal((await appFor(st, 21, "employee").request("/api/v1/performance/appeals", post(reason))).status, 201);
  });

  it("assign refuses a calibrator; resolve by the assigned reviewer amends as a new version", async () => {
    const st = fresh();
    const bad = await appFor(st, 1, "hr_admin").request("/api/v1/performance/appeals/P1/assign", post({ reviewerId: "5" }));
    assert.equal(bad.status, 403);
    assert.equal(((await bad.json()) as any).code, "PERF_SOD_CALIBRATOR_REVIEWER");

    const ok = await appFor(st, 1, "hr_admin").request("/api/v1/performance/appeals/P1/assign", post({ reviewerId: "50" }));
    assert.equal(ok.status, 200);

    st.appeal = { ...st.appeal, status: "UNDER_REVIEW", reviewer_id: "50" };
    st.assessment.stage = "APPEAL_OPEN";
    const notes = "Target change was not agreed; rating amended to reflect the original target.";

    const wrongPerson = await appFor(st, 1, "hr_director").request(
      "/api/v1/performance/appeals/P1/resolve",
      post({ outcome: "UPHELD", resolutionNotes: notes }),
    );
    assert.equal(wrongPerson.status, 403);

    const missingRating = await appFor(st, 50, "line_manager").request(
      "/api/v1/performance/appeals/P1/resolve",
      post({ outcome: "AMENDED", resolutionNotes: notes }),
    );
    assert.equal(missingRating.status, 400);

    st.writes = [];
    const res = await appFor(st, 50, "line_manager").request(
      "/api/v1/performance/appeals/P1/resolve",
      post({ outcome: "AMENDED", amendedRating: 4, resolutionNotes: notes }),
    );
    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.finalRating, 4);
    assert.equal(body.certifiedVersion, 2);
    assert.ok(st.writes.includes("INSERT INTO performance_certified_results"));
  });
});

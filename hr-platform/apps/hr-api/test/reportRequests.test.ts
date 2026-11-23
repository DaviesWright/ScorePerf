import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { createReportRequestRoutes, resolveReportPrompt } from "../src/report-request-routes.ts";

describe("Free-text report requests (to-do P1)", () => {
  it("matches everyday wording to the governed catalogue", () => {
    const turnover = resolveReportPrompt("Show me staff turnover for engineering last quarter", "hr_admin");
    assert.equal(turnover.status, "matched");
    if (turnover.status === "matched") assert.match(turnover.report.name, /Attrition|Leavers/);

    const liability = resolveReportPrompt("what is our leave liability", "hr_admin");
    assert.equal(liability.status, "matched");
    if (liability.status === "matched") assert.equal(liability.report.name, "Leave Liability Report");

    const laptops = resolveReportPrompt("who has which laptops", "hr_admin");
    assert.equal(laptops.status, "matched");
    if (laptops.status === "matched") assert.equal(laptops.report.module, "assets");
  });

  it("explains a permission block and offers reports the role can run", () => {
    const r = resolveReportPrompt("salary and compensation structure", "employee");
    assert.equal(r.status, "forbidden");
    if (r.status === "forbidden") {
      assert.match(r.reason, /your role cannot run it/);
      assert.ok(r.alternatives.length > 0);
    }
  });

  it("gives a specific reason and alternatives when out of scope", () => {
    const r = resolveReportPrompt("forecast next year's engagement survey scores", "hr_admin");
    assert.equal(r.status, "out_of_scope");
    if (r.status === "out_of_scope") {
      assert.match(r.reason, /Forecasts|Engagement/);
      assert.ok(r.alternatives.length > 0 && r.alternatives.length <= 3);
    }
    const nonsense = resolveReportPrompt("purple elephants", "hr_admin");
    assert.equal(nonsense.status, "out_of_scope");
    if (nonsense.status === "out_of_scope") assert.match(nonsense.reason, /purple/);
    assert.equal(resolveReportPrompt("   ", "employee").status, "invalid");
  });

  it("logs every failed request with prompt, error and response, and only HR can read the log", async () => {
    const inserts: unknown[][] = [];
    const mockSql = (strings: TemplateStringsArray, ...vals: unknown[]) => {
      const q = strings.join(" ");
      if (q.includes("INSERT INTO report_request_log")) {
        inserts.push(vals);
        return Promise.resolve([{ id: 7 }]);
      }
      if (q.includes("FROM report_request_log")) {
        return Promise.resolve([
          {
            id: 7,
            prompt: "purple elephants",
            outcome: "out_of_scope",
            error_code: "OUT_OF_SCOPE",
            response: "No report",
            closest_report_key: null,
            alternatives: ["HR-002"],
            role: "employee",
            created_at: "2026-11-21T10:00:00Z",
            first_name: "Ama",
            last_name: "Mensah",
          },
        ]);
      }
      return Promise.resolve([]);
    };
    const build = (role: string) => {
      const app = new Hono<any>();
      app.use("*", async (c, next) => {
        c.set("tenant", { companyId: 1, userId: 21, role });
        await next();
      });
      app.route("/", createReportRequestRoutes(() => mockSql));
      return app;
    };
    const post = (app: Hono<any>, prompt: string) =>
      app.request("/api/v1/report-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

    const emp = build("employee");
    const ok = await post(emp, "my leave balance");
    assert.equal(ok.status, 200);
    assert.equal(((await ok.json()) as any).status, "matched");
    assert.equal(inserts.length, 0, "successful requests are not logged as failures");

    const bad = await post(emp, "purple elephants");
    const badJson: any = await bad.json();
    assert.equal(badJson.status, "out_of_scope");
    assert.equal(badJson.errorCode, "OUT_OF_SCOPE");
    assert.equal(badJson.logId, 7);
    assert.equal(inserts.length, 1);
    assert.ok(inserts[0].includes("purple elephants"));
    assert.ok(inserts[0].includes("OUT_OF_SCOPE"));

    assert.equal((await emp.request("/api/v1/report-requests/failures")).status, 403);
    const hr = await build("hr_admin").request("/api/v1/report-requests/failures");
    assert.equal(hr.status, 200);
    const log: any = await hr.json();
    assert.equal(log.results[0].prompt, "purple elephants");
    assert.equal(log.results[0].requestedBy, "Ama Mensah");
  });
});

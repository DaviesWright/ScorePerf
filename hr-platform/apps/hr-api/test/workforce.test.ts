import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import {
  canDecideRedeployment,
  canManageSquad,
  canSeeSquad,
  createWorkforceRoutes,
  validateScaleLevels,
} from "../src/workforce-routes.ts";

// A tiny in-memory stand-in for the postgres tagged template, enough to exercise the route logic.
function makeDb() {
  const audit: Array<{ entity: unknown; action: unknown }> = [];
  const employees = new Map<number, { id: number; department_id: number; role: string; active: boolean }>([
    [10, { id: 10, department_id: 1, role: "Manager", active: true }],
    [21, { id: 21, department_id: 1, role: "Analyst", active: true }],
    [22, { id: 22, department_id: 2, role: "Engineer", active: true }],
    [30, { id: 30, department_id: 2, role: "HR Lead", active: true }],
  ]);
  const squads: any[] = [];
  const members: Array<{ squad_id: number; employee_id: number }> = [];
  const redeploys: any[] = [];
  const updates: unknown[][] = [];
  const sql: any = (strings: TemplateStringsArray, ...v: any[]) => {
    const q = strings.join("?");
    if (q.includes("INSERT INTO workforce_audit_events")) {
      audit.push({ entity: v[3], action: v[5] });
      return Promise.resolve([]);
    }
    if (q.includes("SELECT id FROM employees") && q.includes("ANY")) {
      return Promise.resolve((v[1] as number[]).filter((id) => employees.get(id)?.active).map((id) => ({ id })));
    }
    if (q.includes("FROM workforce_squads WHERE company_id") && q.includes("lower(name)")) {
      return Promise.resolve(squads.filter((s) => s.name.toLowerCase() === String(v[1]).toLowerCase()));
    }
    if (q.includes("INSERT INTO workforce_squads")) {
      const s = { id: squads.length + 1, name: v[1], lead_employee_id: v[2], mission: v[3], active_focus: v[4] };
      squads.push(s);
      return Promise.resolve([{ id: s.id }]);
    }
    if (q.includes("INSERT INTO workforce_squad_members")) {
      members.push({ squad_id: v[0], employee_id: v[1] });
      return Promise.resolve([]);
    }
    if (q.includes("FROM workforce_squads s")) {
      const only = q.includes("s.lead_employee_id = ") ? v[1] : null;
      return Promise.resolve(
        squads.filter((s) => only === null || s.lead_employee_id === only || members.some((m) => m.squad_id === s.id && m.employee_id === only)),
      );
    }
    if (q.includes("FROM workforce_squad_members m")) {
      return Promise.resolve(
        members.filter((m) => (v[1] as number[]).includes(m.squad_id)).map((m) => ({
          squad_id: m.squad_id, id: m.employee_id, first_name: "P", last_name: String(m.employee_id), job_title: "x", department: "d",
        })),
      );
    }
    if (q.includes("FROM reporting_lines")) {
      return Promise.resolve(v[1] === 21 && v[2] === 10 ? [{ ok: 1 }] : []);
    }
    if (q.includes("SELECT id, department_id, role FROM employees")) {
      const e = employees.get(v[0]);
      return Promise.resolve(e ? [e] : []);
    }
    if (q.includes("SELECT id FROM departments")) return Promise.resolve(v[0] <= 2 ? [{ id: v[0] }] : []);
    if (q.includes("FROM workforce_redeployments WHERE company_id") && q.includes("employee_id =")) {
      return Promise.resolve(redeploys.filter((r) => r.employee_id === v[1] && ["pending", "approved"].includes(r.status)));
    }
    if (q.includes("INSERT INTO workforce_redeployments")) {
      const r = { id: redeploys.length + 1, employee_id: v[1], to_department_id: v[3], to_job_title: v[5], effective_date: v[6], status: "pending", requested_by: v[8] };
      redeploys.push(r);
      return Promise.resolve([{ id: r.id }]);
    }
    if (q.includes("SELECT * FROM workforce_redeployments WHERE id")) {
      return Promise.resolve(redeploys.filter((r) => r.id === v[0]));
    }
    if (q.includes("UPDATE workforce_redeployments")) {
      const r = redeploys.find((x) => x.id === v[4]);
      if (r) r.status = v[0];
      return Promise.resolve([]);
    }
    if (q.includes("SELECT department_id, role FROM employees")) return Promise.resolve([employees.get(v[0])]);
    if (q.includes("UPDATE employees SET department_id")) {
      updates.push(v);
      return Promise.resolve([]);
    }
    if (q.includes("FROM performance_rating_scales WHERE company_id") && q.includes("lower(name)")) return Promise.resolve([]);
    if (q.includes("INSERT INTO performance_rating_scales")) return Promise.resolve([{ id: 5 }]);
    return Promise.resolve([]);
  };
  sql.begin = async (fn: (tx: any) => Promise<unknown>) => fn(sql);
  return { sql, audit, squads, members, redeploys, updates };
}

const build = (db: any, userId: number, role: string) => {
  const app = new Hono<any>();
  app.use("*", async (c, next) => {
    c.set("tenant", { companyId: 1, userId, role });
    await next();
  });
  app.route("/", createWorkforceRoutes(() => db.sql));
  return app;
};
const post = (app: Hono<any>, path: string, body: unknown) =>
  app.request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("Squads, redeployments and rating scales (to-do P1)", () => {
  it("rules: squad visibility, squad management, maker-checker, scale validation", () => {
    assert.equal(canSeeSquad("employee", 21, 10, [21, 22]), true);
    assert.equal(canSeeSquad("employee", 99, 10, [21, 22]), false);
    assert.equal(canSeeSquad("hr_admin", 99, 10, []), true);
    assert.equal(canManageSquad("employee", 21, 10), false);
    assert.equal(canManageSquad("line_manager", 10, 10), true);
    assert.equal(canDecideRedeployment("line_manager", 10, 30).ok, false);
    assert.equal(canDecideRedeployment("hr_admin", 30, 30).ok, false);
    assert.equal(canDecideRedeployment("hr_admin", 30, 10).ok, true);
    assert.deepEqual(validateScaleLevels([{ score: 4, label: "Strong", description: "" }, { score: 1, label: "Weak", description: "" }]), []);
    assert.ok(validateScaleLevels([{ score: 4, label: "A", description: "" }]).length > 0);
    assert.ok(validateScaleLevels([{ score: 4, label: "A", description: "" }, { score: 4, label: "B", description: "" }]).length > 0);
    assert.ok(validateScaleLevels([{ score: 4, label: "A", description: "" }, { score: 3, label: " ", description: "" }]).length > 0);
  });

  it("a manager forms a squad they lead; members see each other; outsiders do not", async () => {
    const db = makeDb();
    const mgr = build(db, 10, "line_manager");
    const res = await post(mgr, "/api/v1/squads", { name: "Data Guild", memberIds: [21, 22] });
    assert.equal(res.status, 201);
    const created: any = await res.json();
    assert.equal(created.squad.leadEmployeeId, 10);
    assert.deepEqual(created.squad.members.map((m: any) => m.id).sort(), [10, 21, 22]);
    assert.equal(db.audit.length, 1);

    assert.equal((await post(mgr, "/api/v1/squads", { name: "data guild" })).status, 409, "names are unique");
    assert.equal((await post(build(db, 21, "employee"), "/api/v1/squads", { name: "Mine" })).status, 403);
    assert.equal((await post(mgr, "/api/v1/squads", { name: "Ghosts", memberIds: [999] })).status, 422);

    const memberView: any = await (await build(db, 21, "employee").request("/api/v1/squads/me")).json();
    assert.equal(memberView.results.length, 1);
    assert.equal(memberView.results[0].members.length, 3);
    const outsider: any = await (await build(db, 30, "employee").request("/api/v1/squads")).json();
    assert.equal(outsider.results.length, 0);
  });

  it("redeployment: manager requests for a direct report, HR approves, record updated and audited", async () => {
    const db = makeDb();
    const mgr = build(db, 10, "line_manager");
    const future = "2099-01-01";
    assert.equal((await post(mgr, "/api/v1/redeployments", { employeeId: 22, toDepartmentId: 1, toJobTitle: "Analyst", effectiveDate: future, reason: "Team change" })).status, 403, "not a direct report");
    assert.equal((await post(mgr, "/api/v1/redeployments", { employeeId: 21, toDepartmentId: 2, toJobTitle: "Engineer", effectiveDate: "2000-01-01", reason: "Team change" })).status, 422, "past date");

    const today = new Date().toISOString().slice(0, 10);
    const ok = await post(mgr, "/api/v1/redeployments", { employeeId: 21, toDepartmentId: 2, toJobTitle: "Engineer", effectiveDate: today, reason: "Skills match" });
    assert.equal(ok.status, 201);
    assert.equal((await post(mgr, "/api/v1/redeployments", { employeeId: 21, toDepartmentId: 2, toJobTitle: "Engineer", effectiveDate: today, reason: "Again please" })).status, 409);

    assert.equal((await post(mgr, "/api/v1/redeployments/1/decision", { decision: "approve" })).status, 403, "managers cannot approve");
    const hr = build(db, 30, "hr_admin");
    const decided: any = await (await post(hr, "/api/v1/redeployments/1/decision", { decision: "approve" })).json();
    assert.equal(decided.status, "applied");
    assert.equal(db.updates.length, 1, "employee record updated");
    assert.deepEqual(db.audit.map((a) => a.action), ["REQUEST", "APPROVE", "REDEPLOY"]);
  });

  it("custom rating scale: HR defines levels, others cannot", async () => {
    const db = makeDb();
    const body = { name: "Sales 4-point", scope: "Commercial", levels: [{ score: 1, label: "Below", description: "" }, { score: 4, label: "Exceeds", description: "" }] };
    assert.equal((await post(build(db, 10, "line_manager"), "/api/v1/performance/rating-scales", body)).status, 403);
    const res = await post(build(db, 30, "hr_admin"), "/api/v1/performance/rating-scales", body);
    assert.equal(res.status, 201);
    const json: any = await res.json();
    assert.equal(json.scale.levels[0].score, 4, "levels stored highest first");
    const bad = await post(build(db, 30, "hr_admin"), "/api/v1/performance/rating-scales", { ...body, name: "Bad", levels: [{ score: 1, label: "Only", description: "" }] });
    assert.equal(bad.status, 422);
  });
});

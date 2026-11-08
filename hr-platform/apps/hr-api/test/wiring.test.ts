import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Hono runs handlers in registration order, so a route registered above the `authenticate` middleware
// is public. src/index.ts imports Cloudflare-only modules, so these checks read it as text.
const src = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

test("authenticate is mounted above every /api/v1 route", () => {
  const auth = src.indexOf('app.use("/api/v1/*", authenticate)');
  assert.notEqual(auth, -1, 'app.use("/api/v1/*", authenticate) is missing');
  const firstRoute = /app\.(get|post|put|patch|delete|all|on)\(\s*"\/api\/v1\//.exec(src);
  assert.ok(firstRoute, "no /api/v1 routes found");
  assert.ok(auth < firstRoute.index, `authenticate is mounted after the route at offset ${firstRoute.index}`);
});

test("every SESSIONS access in index.ts uses the sess: prefix", () => {
  // SESSIONS also holds sign-in links (ml:, mlr:). An unprefixed session key would let any caller
  // plant a forged link entry through POST /api/v1/session and redeem it as another user.
  const calls = [...src.matchAll(/SESSIONS\.(get|put|delete|list)\(\s*([^,)]*)/g)];
  assert.ok(calls.length > 0, "no SESSIONS calls found");
  for (const [, method, firstArg] of calls) {
    assert.match(firstArg, /^`sess:/, `SESSIONS.${method}(${firstArg}) is not prefixed with sess:`);
  }
});

test("writes to cycles, KPIs and scores are limited to HR roles in the RBAC middleware", () => {
  assert.match(src, /\(cycles\|kpis\|scores\)/);
  assert.match(src, /role !== "hr_admin" && role !== "hr_director"/);
});

test("POST /api/v1/employees refuses non-HR callers before it inserts", () => {
  // The route creates employees. A signed-in employee must get 403 before any INSERT runs.
  const route = /app\.post\("\/api\/v1\/employees",[\s\S]*?\n\}\);/.exec(src)?.[0] ?? "";
  assert.ok(route, "POST /api/v1/employees not found");
  const guard = route.indexOf("if (!isHrRole(role))");
  const insert = route.indexOf("INSERT INTO employees");
  assert.notEqual(guard, -1, "POST /api/v1/employees has no HR-role check");
  assert.ok(insert === -1 || guard < insert, "HR-role check comes after the insert");
});

test("GET /api/v1/leaves limits non-approvers to their own requests", () => {
  const route = /app\.get\("\/api\/v1\/leaves"[\s\S]*?\n\}\);/.exec(src)?.[0] ?? "";
  assert.match(route, /isDecider\(role\)/);
  assert.match(route, /lr\.employee_id = \$\{userId\}/);
});

const routeBody = (path: string) => new RegExp(`app\\.(get|post)\\("${path.replace(/[/:]/g, (m) => `\\${m}`)}"[\\s\\S]*?\\n\\}\\);`).exec(src)?.[0] ?? "";

test("objective writes by the owner are guarded by status in the WHERE clause", () => {
  for (const route of ["/api/v1/objectives/:id/update", "/api/v1/objectives/:id/delete"]) {
    const body = routeBody(route);
    assert.ok(body, `${route} not found`);
    assert.match(body, /status IN \('draft', 'returned'\)/, `${route} must only touch draft or returned rows`);
    assert.match(body, /employee_id = \$\{userId\}/, `${route} must be limited to the owner's rows`);
  }
  assert.match(routeBody("/api/v1/objectives/:id/progress"), /status = 'approved'/);
});

test("only the HR-gated amend route lifts the database lock, inside a transaction", () => {
  assert.equal((src.match(/set_config\('app\.amend'/g) ?? []).length, 1, "app.amend may be set in exactly one place");
  const amend = routeBody("/api/v1/objectives/:id/amend");
  assert.match(amend, /isHr\(role\)/);
  assert.match(amend, /canAmend\(/);
  assert.match(amend, /sql\.begin\(/);
  assert.match(amend, /objective_amendments/);
  assert.match(amend, /checkWeights\(/);
});

test("approval stamps the lock; only deciders can approve, never their own set", () => {
  const body = routeBody("/api/v1/objectives/decision");
  assert.match(body, /isDecider\(role\)/);
  assert.match(body, /employeeId === userId/);
  assert.match(body, /locked_at = NOW\(\)/);
  assert.match(body, /status = 'submitted'/);
});

test("sign-in routes are mounted outside /api/v1", () => {
  assert.match(src, /app\.route\(\s*"\/auth"/);
});

test("index.ts does not read tenant, user or role from request headers", () => {
  assert.doesNotMatch(src, /header\(\s*["'`]x-(company-id|user-id|user-role)/i);
});

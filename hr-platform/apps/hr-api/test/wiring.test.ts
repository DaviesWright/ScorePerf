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

test("GET /api/v1/leaves limits non-approvers to their own requests", () => {
  const route = /app\.get\("\/api\/v1\/leaves"[\s\S]*?\n\}\);/.exec(src)?.[0] ?? "";
  assert.match(route, /isDecider\(role\)/);
  assert.match(route, /lr\.employee_id = \$\{userId\}/);
});

test("sign-in routes are mounted outside /api/v1", () => {
  assert.match(src, /app\.route\(\s*"\/auth"/);
});

test("index.ts does not read tenant, user or role from request headers", () => {
  assert.doesNotMatch(src, /header\(\s*["'`]x-(company-id|user-id|user-role)/i);
});

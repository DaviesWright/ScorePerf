import { test } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { authenticate, ISSUER, AUDIENCE, type TenantContext } from "../src/auth";

const SECRET = "test-secret-test-secret-test-secret-1234";
const now = () => Math.floor(Date.now() / 1000);

const app = new Hono<{
  Bindings: { AUTH_JWT_SECRET?: string };
  Variables: { tenant: TenantContext };
}>();
app.use("/api/*", authenticate);
app.get("/api/whoami", (c) => c.json(c.get("tenant")));

const claims = (over: Record<string, unknown> = {}) => ({
  sub: "7",
  company_id: 1,
  role: "line_manager",
  iss: ISSUER,
  aud: AUDIENCE,
  iat: now(),
  exp: now() + 300,
  ...over,
});

const call = (headers: Record<string, string> = {}, env: { AUTH_JWT_SECRET?: string } = { AUTH_JWT_SECRET: SECRET }) =>
  app.request("/api/whoami", { headers }, env);

const bearer = async (payload: Record<string, unknown>, secret = SECRET, alg: "HS256" | "HS512" = "HS256") => ({
  Authorization: `Bearer ${await sign(payload, secret, alg)}`,
});

test("a request with only X-Company-ID is rejected", async () => {
  const res = await call({ "X-Company-ID": "1" });
  assert.equal(res.status, 401);
  assert.equal(res.headers.get("WWW-Authenticate"), "Bearer");
});

test("X-Company-ID, X-User-ID and X-User-Role headers cannot stand in for a token", async () => {
  const res = await call({ "X-Company-ID": "1", "X-User-ID": "1", "X-User-Role": "hr_director" });
  assert.equal(res.status, 401);
});

test("a valid token yields the tenant, user and role from its claims", async () => {
  const res = await call(await bearer(claims()));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { companyId: 1, userId: 7, role: "line_manager" });
});

test("tenant headers are ignored when a valid token is present", async () => {
  const res = await call({
    ...(await bearer(claims())),
    "X-Company-ID": "2",
    "X-User-ID": "999",
    "X-User-Role": "hr_director",
  });
  assert.deepEqual(await res.json(), { companyId: 1, userId: 7, role: "line_manager" });
});

test("rejects a token signed with another secret", async () => {
  const res = await call(await bearer(claims(), "another-secret-another-secret-another-1"));
  assert.equal(res.status, 401);
});

test("rejects a token signed with a different algorithm", async () => {
  const res = await call(await bearer(claims(), SECRET, "HS512"));
  assert.equal(res.status, 401);
});

test("rejects an unsigned (alg none) token", async () => {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const token = `${b64({ alg: "none", typ: "JWT" })}.${b64(claims())}.`;
  const res = await call({ Authorization: `Bearer ${token}` });
  assert.equal(res.status, 401);
});

test("rejects an expired token", async () => {
  const res = await call(await bearer(claims({ exp: now() - 10, iat: now() - 400 })));
  assert.equal(res.status, 401);
});

test("rejects a token with no expiry", async () => {
  const { exp, ...noExp } = claims();
  const res = await call(await bearer(noExp));
  assert.equal(res.status, 401);
});

test("rejects a token for another issuer or audience", async () => {
  assert.equal((await call(await bearer(claims({ iss: "someone-else" })))).status, 401);
  assert.equal((await call(await bearer(claims({ aud: "another-api" })))).status, 401);
});

test("rejects a token whose role is not a known role", async () => {
  assert.equal((await call(await bearer(claims({ role: "superuser" })))).status, 401);
  assert.equal((await call(await bearer(claims({ role: undefined })))).status, 401);
});

test("rejects a token whose company or user is not a positive integer", async () => {
  for (const bad of [0, -1, 1.5, "1", null]) {
    assert.equal((await call(await bearer(claims({ company_id: bad })))).status, 401, `company_id=${bad}`);
  }
  for (const bad of ["0", "abc", "", "1.5", "-3"]) {
    assert.equal((await call(await bearer(claims({ sub: bad })))).status, 401, `sub=${bad}`);
  }
});

test("rejects a malformed Authorization header", async () => {
  assert.equal((await call({ Authorization: "Bearer" })).status, 401);
  assert.equal((await call({ Authorization: "Basic abc" })).status, 401);
  assert.equal((await call({ Authorization: "Bearer not.a.jwt" })).status, 401);
});

test("fails closed when the secret is missing or too short", async () => {
  const headers = await bearer(claims());
  assert.equal((await call(headers, {})).status, 500);
  assert.equal((await call(headers, { AUTH_JWT_SECRET: "short" })).status, 500);
});

test("the 401 body does not say why the token was refused", async () => {
  const res = await call(await bearer(claims({ exp: now() - 10, iat: now() - 400 })));
  assert.deepEqual(await res.json(), { error: "Unauthorized" });
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { createAuthRoutes } from "../src/auth-routes";
import { authenticate, type AuthEnv } from "../src/auth";
import type { MagicLinkDeps, UserRecord } from "../src/magic-link";

const SECRET = "test-secret-test-secret-test-secret-0123456789";
const BASE = "https://app.example.test";
const alice: UserRecord = { id: 7, companyId: 1, role: "line_manager" };

function build(users: UserRecord[]) {
  const store = new Map<string, string>();
  const sent: { email: string; link: string }[] = [];
  const deps: MagicLinkDeps = {
    linkBase: BASE,
    kv: {
      async get(k) {
        return store.get(k) ?? null;
      },
      async put(k, v) {
        store.set(k, v);
      },
      async delete(k) {
        store.delete(k);
      },
    },
    async findActiveUsersByEmail(email) {
      return email === "alice@example.com" ? users : [];
    },
    async findActiveUser(companyId, userId) {
      return users.find((u) => u.companyId === companyId && u.id === userId) ?? null;
    },
    async deliver(email, link) {
      sent.push({ email, link });
    },
  };
  const app = new Hono<{ Bindings: { AUTH_JWT_SECRET?: string } }>();
  app.route("/auth", createAuthRoutes(() => deps));

  const pending: Promise<unknown>[] = [];
  const ctx = { waitUntil: (p: Promise<unknown>) => void pending.push(p), passThroughOnException() {} };
  const call = async (path: string, body: unknown, env: { AUTH_JWT_SECRET?: string } = { AUTH_JWT_SECRET: SECRET }, headers = {}) => {
    const res = await app.request(
      path,
      { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) },
      env,
      ctx as never
    );
    await Promise.all(pending.splice(0));
    return res;
  };
  return { call, sent };
}

const tokenOf = (link: string) => new URL(link).hash.replace(/^#token=/, "");

test("magic-link request answers 202 with the same body for known and unknown addresses", async () => {
  const { call, sent } = build([alice]);
  const known = await call("/auth/magic-link", { email: "alice@example.com" });
  const unknown = await call("/auth/magic-link", { email: "nobody@example.com" });
  assert.equal(known.status, 202);
  assert.equal(unknown.status, 202);
  assert.deepEqual(await known.json(), await unknown.json());
  assert.equal(sent.length, 1);
});

test("a malformed body is a 400", async () => {
  const { call } = build([alice]);
  assert.equal((await call("/auth/magic-link", "{not json")).status, 400);
  assert.equal((await call("/auth/magic-link", {})).status, 400);
  assert.equal((await call("/auth/verify", { token: 5 })).status, 400);
});

test("the link host comes from configuration, not from request headers", async () => {
  const { call, sent } = build([alice]);
  await call("/auth/magic-link", { email: "alice@example.com" }, undefined, {
    Host: "evil.test",
    Origin: "https://evil.test",
    "X-Forwarded-Host": "evil.test",
  });
  assert.ok(sent[0].link.startsWith(`${BASE}/login/verify#token=`), sent[0].link);
});

test("verify turns a link token into a bearer token that authenticate accepts", async () => {
  const { call, sent } = build([alice]);
  await call("/auth/magic-link", { email: "alice@example.com" });
  const res = await call("/auth/verify", { token: tokenOf(sent[0].link) });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  const body = (await res.json()) as { accessToken: string; tokenType: string; expiresIn: number; user: unknown };
  assert.equal(body.tokenType, "Bearer");
  assert.equal(body.expiresIn, 3600);
  assert.deepEqual(body.user, { id: 7, companyId: 1, role: "line_manager" });

  const protectedApp = new Hono<AuthEnv>();
  protectedApp.use("*", authenticate);
  protectedApp.get("/who", (c) => c.json(c.get("tenant")));
  const who = await protectedApp.request("/who", { headers: { Authorization: `Bearer ${body.accessToken}` } }, { AUTH_JWT_SECRET: SECRET });
  assert.deepEqual(await who.json(), { companyId: 1, userId: 7, role: "line_manager" });
});

test("a link works once", async () => {
  const { call, sent } = build([alice]);
  await call("/auth/magic-link", { email: "alice@example.com" });
  const token = tokenOf(sent[0].link);
  assert.equal((await call("/auth/verify", { token })).status, 200);
  const again = await call("/auth/verify", { token });
  assert.equal(again.status, 401);
  assert.deepEqual(await again.json(), { error: "Invalid or expired link" });
});

test("an unknown token is a 401 with a generic body", async () => {
  const { call } = build([alice]);
  const res = await call("/auth/verify", { token: "a".repeat(43) });
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: "Invalid or expired link" });
});

test("a missing or short signing secret is a 500 and does not burn the link", async () => {
  const { call, sent } = build([alice]);
  await call("/auth/magic-link", { email: "alice@example.com" });
  const token = tokenOf(sent[0].link);
  assert.equal((await call("/auth/verify", { token }, {})).status, 500);
  assert.equal((await call("/auth/verify", { token }, { AUTH_JWT_SECRET: "short" })).status, 500);
  assert.equal((await call("/auth/verify", { token })).status, 200);
});

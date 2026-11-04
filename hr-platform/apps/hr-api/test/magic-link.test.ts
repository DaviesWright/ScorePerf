import { test } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import {
  ACCESS_TTL_SECONDS,
  LINK_TTL_SECONDS,
  THROTTLE_SECONDS,
  issueAccessToken,
  redeemMagicLink,
  requestMagicLink,
  type MagicLinkDeps,
  type UserRecord,
} from "../src/magic-link";
import { authenticate, type AuthEnv } from "../src/auth";

const SECRET = "test-secret-test-secret-test-secret-0123456789";
const BASE = "https://app.example.test";

function setup(users: UserRecord[] = [], opts: { deliverFails?: boolean } = {}) {
  const clock = { now: 1_000_000 };
  const store = new Map<string, { value: string; expiresAt: number }>();
  const kv = {
    async get(key: string) {
      const hit = store.get(key);
      if (!hit || hit.expiresAt <= clock.now) return null;
      return hit.value;
    },
    async put(key: string, value: string, o?: { expirationTtl?: number }) {
      store.set(key, { value, expiresAt: clock.now + (o?.expirationTtl ?? Infinity) * 1000 });
    },
    async delete(key: string) {
      store.delete(key);
    },
  };
  const state = { users: [...users], lookups: [] as string[], sent: [] as { email: string; link: string }[] };
  const deps: MagicLinkDeps = {
    kv,
    linkBase: BASE,
    async findActiveUsersByEmail(email) {
      state.lookups.push(email);
      return state.users;
    },
    async findActiveUser(companyId, userId) {
      return state.users.find((u) => u.companyId === companyId && u.id === userId) ?? null;
    },
    async deliver(email, link) {
      if (opts.deliverFails) throw new Error("mail provider down");
      state.sent.push({ email, link });
    },
  };
  return { deps, state, store, clock };
}

const tokenOf = (link: string) => new URL(link).hash.replace(/^#token=/, "");
const alice: UserRecord = { id: 7, companyId: 1, role: "line_manager" };

test("known single account: a link is delivered with the token in the URL fragment", async () => {
  const { deps, state } = setup([alice]);
  await requestMagicLink(deps, "alice@example.com");
  assert.equal(state.sent.length, 1);
  assert.equal(state.sent[0].email, "alice@example.com");
  const url = new URL(state.sent[0].link);
  assert.equal(url.origin, BASE);
  assert.equal(url.search, "", "token must not be in the query string (it would reach server logs)");
  assert.match(url.hash, /^#token=[A-Za-z0-9_-]{43}$/);
});

test("email is trimmed and lowercased before lookup", async () => {
  const { deps, state } = setup([alice]);
  await requestMagicLink(deps, "  Alice@Example.COM ");
  assert.deepEqual(state.lookups, ["alice@example.com"]);
});

test("unknown email: nothing delivered, nothing stored besides the throttle marker", async () => {
  const { deps, state, store } = setup([]);
  await requestMagicLink(deps, "nobody@example.com");
  assert.equal(state.sent.length, 0);
  assert.ok([...store.keys()].every((k) => k.startsWith("mlr:")));
});

test("email shared by several accounts is refused rather than guessed", async () => {
  const { deps, state } = setup([alice, { id: 9, companyId: 2, role: "hr_director" }]);
  await requestMagicLink(deps, "alice@example.com");
  assert.equal(state.sent.length, 0);
});

test("malformed or oversized email is rejected without a lookup", async () => {
  const { deps, state } = setup([alice]);
  await requestMagicLink(deps, "not-an-email");
  await requestMagicLink(deps, `${"a".repeat(250)}@example.com`);
  assert.equal(state.lookups.length, 0);
});

test("a second request inside the throttle window sends nothing; after it, a new link goes out", async () => {
  const { deps, state, clock } = setup([alice]);
  await requestMagicLink(deps, "alice@example.com");
  await requestMagicLink(deps, "alice@example.com");
  assert.equal(state.sent.length, 1);
  clock.now += THROTTLE_SECONDS * 1000 + 1;
  await requestMagicLink(deps, "alice@example.com");
  assert.equal(state.sent.length, 2);
});

test("delivery failure does not throw (no account-existence signal)", async () => {
  const { deps } = setup([alice], { deliverFails: true });
  await assert.doesNotReject(requestMagicLink(deps, "alice@example.com"));
});

test("KV never holds the raw token", async () => {
  const { deps, state, store } = setup([alice]);
  await requestMagicLink(deps, "alice@example.com");
  const token = tokenOf(state.sent[0].link);
  for (const [key, entry] of store) {
    assert.ok(!key.includes(token), `key ${key} contains the token`);
    assert.ok(!entry.value.includes(token), `value for ${key} contains the token`);
  }
});

test("redeeming a valid token yields the user's tenant context, and only once", async () => {
  const { deps, state } = setup([alice]);
  await requestMagicLink(deps, "alice@example.com");
  const token = tokenOf(state.sent[0].link);
  assert.deepEqual(await redeemMagicLink(deps, token), { companyId: 1, userId: 7, role: "line_manager" });
  assert.equal(await redeemMagicLink(deps, token), null);
});

test("an expired token is refused", async () => {
  const { deps, state, clock } = setup([alice]);
  await requestMagicLink(deps, "alice@example.com");
  clock.now += LINK_TTL_SECONDS * 1000 + 1;
  assert.equal(await redeemMagicLink(deps, tokenOf(state.sent[0].link)), null);
});

test("garbage, empty and wrong-length tokens are refused", async () => {
  const { deps } = setup([alice]);
  for (const t of ["", "x", "a".repeat(42), "a".repeat(44), `${"a".repeat(42)}!`, "../etc/passwd"]) {
    assert.equal(await redeemMagicLink(deps, t), null, JSON.stringify(t));
  }
});

test("the role is re-read at redemption, so a promotion or demotion applies", async () => {
  const { deps, state } = setup([alice]);
  await requestMagicLink(deps, "alice@example.com");
  state.users[0] = { ...alice, role: "hr_admin" };
  const tenant = await redeemMagicLink(deps, tokenOf(state.sent[0].link));
  assert.equal(tenant?.role, "hr_admin");
});

test("an account deactivated after the link was sent cannot redeem it", async () => {
  const { deps, state } = setup([alice]);
  await requestMagicLink(deps, "alice@example.com");
  state.users.length = 0;
  assert.equal(await redeemMagicLink(deps, tokenOf(state.sent[0].link)), null);
});

test("a role outside the allow-list is refused at redemption", async () => {
  const { deps, state } = setup([{ ...alice, role: "consultant" }]);
  await requestMagicLink(deps, "alice@example.com");
  assert.equal(await redeemMagicLink(deps, tokenOf(state.sent[0].link)), null);
});

test("an issued access token passes authenticate and carries the same tenant", async () => {
  const app = new Hono<AuthEnv>();
  app.use("*", authenticate);
  app.get("/who", (c) => c.json(c.get("tenant")));
  const token = await issueAccessToken(SECRET, { companyId: 3, userId: 11, role: "hr_admin" });
  const res = await app.request("/who", { headers: { Authorization: `Bearer ${token}` } }, { AUTH_JWT_SECRET: SECRET });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { companyId: 3, userId: 11, role: "hr_admin" });
});

test("access tokens expire after ACCESS_TTL_SECONDS", async () => {
  const app = new Hono<AuthEnv>();
  app.use("*", authenticate);
  app.get("/who", (c) => c.json(c.get("tenant")));
  const issuedAt = Math.floor(Date.now() / 1000) - ACCESS_TTL_SECONDS - 5;
  const stale = await issueAccessToken(SECRET, { companyId: 1, userId: 1, role: "employee" }, issuedAt);
  const res = await app.request("/who", { headers: { Authorization: `Bearer ${stale}` } }, { AUTH_JWT_SECRET: SECRET });
  assert.equal(res.status, 401);
});

import { sign } from "hono/jwt";
import { AUDIENCE, ISSUER, isRole, type TenantContext } from "./auth";

// Passwordless sign-in: a one-time link is emailed, redeeming it mints the bearer token that
// `authenticate` (src/auth.ts) verifies. Link state lives in KV (`SESSIONS`), keyed by SHA-256 so a KV
// read never exposes a usable link. Everything external (KV, DB, mail) is injected so the logic is testable.
export const LINK_TTL_SECONDS = 600;
export const THROTTLE_SECONDS = 60; // also KV's minimum expirationTtl
export const ACCESS_TTL_SECONDS = 3600;

export interface KvLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface UserRecord {
  id: number;
  companyId: number;
  role: string;
}

export interface MagicLinkDeps {
  kv: KvLike;
  /** Origin of the frontend, from configuration. Never derived from the request (link poisoning). */
  linkBase: string;
  findActiveUsersByEmail(email: string): Promise<UserRecord[]>;
  findActiveUser(companyId: number, userId: number): Promise<UserRecord | null>;
  deliver(email: string, link: string): Promise<void>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

/**
 * Sends a sign-in link if `rawEmail` belongs to exactly one active account. Never throws and never
 * reveals whether the address exists: callers answer identically either way.
 * The address is throttled before lookup, so unknown addresses cost the same as known ones.
 */
export async function requestMagicLink(deps: MagicLinkDeps, rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return;

  const throttleKey = `mlr:${await sha256Hex(email)}`;
  if (await deps.kv.get(throttleKey)) return;
  await deps.kv.put(throttleKey, "1", { expirationTtl: THROTTLE_SECONDS });

  try {
    const users = await deps.findActiveUsersByEmail(email);
    if (users.length !== 1) {
      // employees is UNIQUE (company_id, email): one address can exist in several tenants. Refuse, don't guess.
      if (users.length > 1) console.warn("magic link refused: address maps to several accounts");
      return;
    }
    const token = randomToken();
    await deps.kv.put(`ml:${await sha256Hex(token)}`, JSON.stringify({ c: users[0].companyId, u: users[0].id }), {
      expirationTtl: LINK_TTL_SECONDS,
    });
    // Token goes in the fragment: browsers don't send it to servers, so it stays out of logs and Referer.
    await deps.deliver(email, `${deps.linkBase}/login/verify#token=${token}`);
  } catch (err) {
    console.error("magic link request failed:", err instanceof Error ? err.message : "unknown error");
  }
}

/**
 * Consumes a link token. Returns the tenant context for the account, or null for anything invalid,
 * expired, already used, or belonging to an account that is no longer active.
 * KV is eventually consistent, so single use is best-effort across locations (the 10 min TTL and the
 * 256-bit token bound the exposure). Strictly atomic single use would need a Durable Object.
 */
export async function redeemMagicLink(deps: MagicLinkDeps, token: string): Promise<TenantContext | null> {
  if (!TOKEN_RE.test(token)) return null;
  const key = `ml:${await sha256Hex(token)}`;
  const raw = await deps.kv.get(key);
  if (!raw) return null;
  await deps.kv.delete(key);

  let entry: { c?: unknown; u?: unknown };
  try {
    entry = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Number.isSafeInteger(entry.c) || !Number.isSafeInteger(entry.u)) return null;

  // Re-read so a deactivation or role change since the link was sent takes effect.
  const user = await deps.findActiveUser(entry.c as number, entry.u as number);
  if (!user || !isRole(user.role)) return null;
  return { companyId: user.companyId, userId: user.id, role: user.role };
}

export async function issueAccessToken(
  secret: string,
  tenant: TenantContext,
  issuedAt = Math.floor(Date.now() / 1000)
): Promise<string> {
  return sign(
    {
      iss: ISSUER,
      aud: AUDIENCE,
      sub: String(tenant.userId),
      company_id: tenant.companyId,
      role: tenant.role,
      iat: issuedAt,
      exp: issuedAt + ACCESS_TTL_SECONDS,
    },
    secret,
    "HS256"
  );
}

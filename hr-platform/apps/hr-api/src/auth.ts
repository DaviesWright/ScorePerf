import type { MiddlewareHandler } from "hono";
import { verify } from "hono/jwt";

// Tenant, user and role come only from a signed bearer token (ADR-0005, BUILD.md §11.1).
// Client-supplied X-Company-ID / X-User-ID / X-User-Role headers are never read.
export const ISSUER = "scoreview-auth";
export const AUDIENCE = "hr-api";
const MIN_SECRET_LENGTH = 32;

export type Role = "employee" | "line_manager" | "hr_admin" | "hr_director";
const ROLES: readonly string[] = ["employee", "line_manager", "hr_admin", "hr_director"];

export interface TenantContext {
  companyId: number;
  userId: number;
  role: Role;
}

export type AuthEnv = {
  Bindings: { AUTH_JWT_SECRET?: string };
  Variables: { tenant: TenantContext };
};

const isPositiveInt = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n) && n > 0;

export const isRole = (r: unknown): r is Role => typeof r === "string" && ROLES.includes(r);
export const hasUsableSecret = (s: string | undefined): s is string => !!s && s.length >= MIN_SECRET_LENGTH;

export const authenticate: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const secret = c.env.AUTH_JWT_SECRET;
  if (!hasUsableSecret(secret)) {
    console.error(`AUTH_JWT_SECRET is missing or shorter than ${MIN_SECRET_LENGTH} characters`);
    return c.json({ error: "Server misconfigured" }, 500);
  }

  const refuse = () => {
    c.header("WWW-Authenticate", "Bearer");
    return c.json({ error: "Unauthorized" }, 401);
  };

  const token = /^Bearer\s+(\S+)$/i.exec(c.req.header("Authorization") ?? "")?.[1];
  if (!token) return refuse();

  let claims;
  try {
    claims = await verify(token, secret, { alg: "HS256", iss: ISSUER, aud: AUDIENCE });
  } catch {
    return refuse();
  }

  const { sub, company_id: companyId, role, exp } = claims as Record<string, unknown>;
  const userId = typeof sub === "string" && /^[1-9]\d*$/.test(sub) ? Number(sub) : NaN;
  if (typeof exp !== "number" || !isPositiveInt(companyId) || !isPositiveInt(userId)) return refuse();
  if (typeof role !== "string" || !ROLES.includes(role)) return refuse();

  c.set("tenant", { companyId, userId, role: role as Role });
  await next();
};

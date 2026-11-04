import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { hasUsableSecret } from "./auth";
import { ACCESS_TTL_SECONDS, issueAccessToken, redeemMagicLink, requestMagicLink, type MagicLinkDeps } from "./magic-link";

const RequestBody = z.object({ email: z.string().max(254) });
const VerifyBody = z.object({ token: z.string().max(128) });

/**
 * Public sign-in routes, mounted at /auth (outside /api/v1, so `authenticate` does not apply).
 * - POST /magic-link  {email}  -> 202 always; the work runs after the response so timing doesn't leak
 *                                  whether the address exists.
 * - POST /verify      {token}  -> 200 {accessToken, ...} | 401. POST, not GET: mail scanners prefetch links.
 */
export function createAuthRoutes<B extends { AUTH_JWT_SECRET?: string }>(makeDeps: (env: B) => MagicLinkDeps) {
  const routes = new Hono<{ Bindings: B }>();

  routes.use("*", async (c, next) => {
    await next();
    c.header("Cache-Control", "no-store");
  });

  routes.post("/magic-link", zValidator("json", RequestBody), (c) => {
    const { email } = c.req.valid("json");
    c.executionCtx.waitUntil(
      (async () => requestMagicLink(makeDeps(c.env as B), email))().catch((err) =>
        console.error("magic link request failed:", err instanceof Error ? err.message : "unknown error")
      )
    );
    return c.json({ message: "If that address belongs to an active account, a sign-in link is on its way." }, 202);
  });

  routes.post("/verify", zValidator("json", VerifyBody), async (c) => {
    const env = c.env as B;
    const secret = env.AUTH_JWT_SECRET;
    // Checked before redeeming, so a misconfigured server doesn't burn the user's one-time link.
    if (!hasUsableSecret(secret)) {
      console.error("AUTH_JWT_SECRET is missing or shorter than 32 characters");
      return c.json({ error: "Server misconfigured" }, 500);
    }
    const tenant = await redeemMagicLink(makeDeps(env), c.req.valid("json").token);
    if (!tenant) return c.json({ error: "Invalid or expired link" }, 401);
    return c.json({
      accessToken: await issueAccessToken(secret, tenant),
      tokenType: "Bearer",
      expiresIn: ACCESS_TTL_SECONDS,
      user: { id: tenant.userId, companyId: tenant.companyId, role: tenant.role },
    });
  });

  return routes;
}

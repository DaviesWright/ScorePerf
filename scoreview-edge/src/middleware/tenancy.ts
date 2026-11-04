import { createMiddleware } from "hono/factory";
import type { Env, HonoVariables } from "../bindings";

export const tenancyMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: HonoVariables;
}>(async (c, next) => {
  const companyHeader = c.req.header("X-Company-ID");
  
  // In production, also parse JWT or session cookie for verified tenant context
  if (!companyHeader) {
    return c.json(
      {
        error: "Missing required 'X-Company-ID' tenant header.",
        code: "TENANT_HEADER_REQUIRED",
      },
      400
    );
  }

  const companyId = parseInt(companyHeader, 10);
  if (isNaN(companyId) || companyId <= 0) {
    return c.json(
      {
        error: "Invalid 'X-Company-ID' header format.",
        code: "INVALID_TENANT_ID",
      },
      400
    );
  }

  c.set("tenant", {
    companyId,
    userId: c.req.header("X-User-ID") ? parseInt(c.req.header("X-User-ID")!, 10) : undefined,
    role: c.req.header("X-User-Role") || "member",
  });

  await next();
});


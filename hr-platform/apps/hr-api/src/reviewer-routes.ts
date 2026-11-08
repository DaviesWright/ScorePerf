import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type postgres from "postgres";
import type { Env } from "./index";

// Public capture for demo reviewers: the sign-in screen records who is reviewing, then sends them to the demo
// persona picker. No email is sent and no account is needed. Mounted at /auth (outside /api/v1).

type Sql = ReturnType<typeof postgres>;

const ReviewerBody = z.object({
  email: z.string().trim().email().max(254),
  fullName: z.string().trim().min(2).max(120),
  company: z.string().trim().min(2).max(160),
  jobTitle: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(40).regex(/^[0-9+()\-\s]*$/, "Use digits, spaces, + ( ) or -").optional().default(""),
  note: z.string().trim().max(500).optional().default(""),
});

export function createReviewerRoutes(getSql: (env: Env) => Sql) {
  const routes = new Hono<{ Bindings: Env }>();

  routes.use("*", async (c, next) => {
    await next();
    c.header("Cache-Control", "no-store");
  });

  // Creates the reviewer on first visit, updates their details and counts repeat visits.
  routes.post("/reviewer-access", zValidator("json", ReviewerBody), async (c) => {
    const body = c.req.valid("json");
    const email = body.email.toLowerCase();
    await getSql(c.env)`
      INSERT INTO demo_reviewers (email, full_name, company, job_title, phone, note)
      VALUES (${email}, ${body.fullName}, ${body.company}, ${body.jobTitle}, ${body.phone}, ${body.note})
      ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        company = EXCLUDED.company,
        job_title = EXCLUDED.job_title,
        phone = EXCLUDED.phone,
        note = EXCLUDED.note,
        last_seen_at = NOW(),
        visit_count = demo_reviewers.visit_count + 1
    `;
    return c.json({ ok: true }, 201);
  });

  return routes;
}

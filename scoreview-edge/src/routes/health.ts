import { Hono } from "hono";
import type { Env, HonoVariables } from "../bindings";

export const healthRouter = new Hono<{
  Bindings: Env;
  Variables: HonoVariables;
}>();

healthRouter.get("/", (c) => {
  return c.json({
    status: "healthy",
    service: "scoreview-edge",
    environment: c.env.ENVIRONMENT || "development",
    timestamp: new Date().toISOString(),
    hyperdrive_configured: !!c.env.HYPERDRIVE,
    queues_configured: !!c.env.PROGRESS_QUEUE,
    workflows_configured: !!c.env.CYCLE_WORKFLOW,
    kv_configured: !!c.env.CONFIG_KV,
  });
});


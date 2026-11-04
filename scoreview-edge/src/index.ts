import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Env, HonoVariables } from "./bindings";
import { errorHandler } from "./middleware/error";
import { tenancyMiddleware } from "./middleware/tenancy";
import { handleQueueBatch } from "./queues/progress_consumer";
import { cyclesRouter } from "./routes/cycles";
import { healthRouter } from "./routes/health";
import { PerformanceCycleWorkflow } from "./workflows/performance_cycle";

const app = new Hono<{
  Bindings: Env;
  Variables: HonoVariables;
}>();

// Global middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Company-ID", "X-User-ID", "X-User-Role"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

// Global Error Handler
app.onError(errorHandler);

// Public Routes
app.route("/health", healthRouter);

// Protected Tenant-Scoped Routes (ADR-0005, ADR-0015)
app.use("/api/v1/*", tenancyMiddleware);
app.route("/api/v1/cycles", cyclesRouter);

// Export Workers Entrypoint
export default {
  // HTTP Fetch handler
  fetch: app.fetch,

  // Cloudflare Queues batch consumer
  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    await handleQueueBatch(batch, env);
  },
};

// Export Cloudflare Workflow Entrypoint
export { PerformanceCycleWorkflow };


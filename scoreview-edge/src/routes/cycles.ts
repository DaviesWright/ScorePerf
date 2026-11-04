import { eq, and } from "drizzle-orm";
import { Hono } from "hono";
import type { Env, HonoVariables } from "../bindings";
import { getDb } from "../db/client";
import { performanceCycles } from "../db/schema/performance_core";
import {
  validateCycleDates,
  validateCycleTransition,
} from "../services/cycle_state_machine";

export const cyclesRouter = new Hono<{
  Bindings: Env;
  Variables: HonoVariables;
}>();

// List cycles for the authenticated company (ADR-0005)
cyclesRouter.get("/", async (c) => {
  const { companyId } = c.get("tenant");
  const db = getDb(c.env);

  const list = await db
    .select()
    .from(performanceCycles)
    .where(eq(performanceCycles.companyId, companyId));

  return c.json({ count: list.length, results: list });
});

// Create cycle
cyclesRouter.post("/", async (c) => {
  const { companyId } = c.get("tenant");
  const db = getDb(c.env);
  const body = await c.req.json();

  validateCycleDates(body.start_date, body.end_date);

  const [cycle] = await db
    .insert(performanceCycles)
    .values({
      companyId,
      title: body.title,
      description: body.description || "",
      frameworkTypeId: body.framework_type_id,
      frameworkConfigurationId: body.framework_configuration_id || null,
      startDate: body.start_date,
      endDate: body.end_date,
      status: "draft",
    })
    .returning();

  return c.json(cycle, 201);
});

// Cycle transition endpoint (BUILD.md §5.3, ADR-0015)
cyclesRouter.post("/:id/transition", async (c) => {
  const { companyId } = c.get("tenant");
  const db = getDb(c.env);
  const id = parseInt(c.req.param("id"), 10);
  const body = await c.req.json();
  const targetStatus = body.target_status;

  const [cycle] = await db
    .select()
    .from(performanceCycles)
    .where(
      and(
        eq(performanceCycles.id, id),
        eq(performanceCycles.companyId, companyId)
      )
    )
    .limit(1);

  if (!cycle) {
    return c.json({ error: "Performance cycle not found.", code: "NOT_FOUND" }, 404);
  }

  // Enforce state machine transition validity
  const newStatus = validateCycleTransition(cycle.status, targetStatus);

  const [updated] = await db
    .update(performanceCycles)
    .set({ status: newStatus })
    .where(eq(performanceCycles.id, id))
    .returning();

  // If transitioning to active or review, initiate Cloudflare Workflow
  if (c.env.CYCLE_WORKFLOW && (newStatus === "active" || newStatus === "review")) {
    await c.env.CYCLE_WORKFLOW.create({
      id: `cycle-${id}-${newStatus}-${Date.now()}`,
      params: {
        cycleId: id,
        companyId,
        targetStage: newStatus,
        autoCloseDate: updated.endDate,
      },
    });
  }

  return c.json(updated);
});


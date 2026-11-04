import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import type { Env } from "../bindings";

interface CycleWorkflowPayload {
  cycleId: number;
  companyId: number;
  targetStage: string;
  autoCloseDate?: string;
}

export class PerformanceCycleWorkflow extends WorkflowEntrypoint<Env, CycleWorkflowPayload> {
  async run(event: WorkflowEvent<CycleWorkflowPayload>, step: WorkflowStep) {
    const { cycleId, companyId, targetStage, autoCloseDate } = event.payload;

    // Step 1: Log workflow kickoff
    await step.do("record-workflow-start", async () => {
      console.log(`[Workflow] Started durable orchestration for Cycle ${cycleId} (Company: ${companyId}) to stage: ${targetStage}`);
      return { status: "initialized", timestamp: new Date().toISOString() };
    });

    // Step 2: If an auto-close or milestone date is supplied, sleep until that timestamp
    if (autoCloseDate) {
      const waitUntil = new Date(autoCloseDate);
      const secondsUntil = Math.max(1, Math.floor((waitUntil.getTime() - Date.now()) / 1000));
      if (secondsUntil > 0) {
        await step.sleep("wait-for-cycle-cutoff", secondsUntil);
      }
    }

    // Step 3: Trigger notifications or queue events when stage cutoffs arrive
    await step.do("trigger-stage-notifications", async () => {
      console.log(`[Workflow] Cycle ${cycleId} reached cutoff. Dispatching review reminder notifications.`);
      // Enqueue async reminder batch via Cloudflare Queues
      await this.env.PROGRESS_QUEUE.send({
        type: "CYCLE_STAGE_ADVANCE",
        payload: { cycleId, targetStage },
        companyId,
        timestamp: new Date().toISOString(),
      });
      return { notificationsDispatched: true };
    });

    return { completed: true, cycleId, finalStage: targetStage };
  }
}


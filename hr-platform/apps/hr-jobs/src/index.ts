import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import postgres from "postgres";
import type { JobMessage } from "@hr-platform/shared";

export interface Env {
  HYPERDRIVE: {
    connectionString: string;
  };
  SESSIONS: KVNamespace;
  REVIEW_WORKFLOW: Workflow;
}

// 1. Durable Performance Review Workflow (Cloudflare Workflows)
interface ReviewWorkflowPayload {
  cycleId: number;
  companyId: number;
}

export class PerformanceReviewWorkflow extends WorkflowEntrypoint<Env, ReviewWorkflowPayload> {
  async run(event: WorkflowEvent<ReviewWorkflowPayload>, step: WorkflowStep) {
    const { cycleId, companyId } = event.payload;

    // Step 1: Initialize review cycle and record start
    await step.do("init-review-cycle", async () => {
      console.log(`[Workflow] Started Review Workflow for Cycle ${cycleId} (Company ${companyId})`);
      const sql = postgres(this.env.HYPERDRIVE.connectionString, { max: 2 });
      await sql`
        INSERT INTO audit_logs (company_id, entity_name, entity_id, action, diff)
        VALUES (${companyId}, 'performance_cycle', ${cycleId.toString()}, 'WORKFLOW_STARTED', '{"status": "active"}'::jsonb)
      `;
      return { initialized: true };
    });

    // Step 2: Sleep for the active review duration (e.g. 14 days in production; configurable)
    await step.sleep("wait-for-review-submission-window", 14 * 24 * 3600);

    // Step 3: Advance cycle to calibration stage
    await step.do("advance-to-calibration", async () => {
      console.log(`[Workflow] Review window elapsed. Advancing Cycle ${cycleId} to calibration.`);
      const sql = postgres(this.env.HYPERDRIVE.connectionString, { max: 2 });
      await sql`
        UPDATE performance_cycles
        SET status = 'calibration', updated_at = NOW()
        WHERE id = ${cycleId} AND company_id = ${companyId}
      `;
      return { advancedTo: "calibration" };
    });

    return { completed: true, cycleId };
  }
}

// 2. Queue Consumer Handler
async function handleJob(job: JobMessage, env: Env): Promise<void> {
  const sql = postgres(env.HYPERDRIVE.connectionString, { max: 3 });

  switch (job.type) {
    case "score_calculation": {
      console.log(`[Queue Worker] Calculating score for employee ${job.employeeId} in cycle ${job.cycleId}`);
      // Weighted progress over approved objectives in this cycle only. Drafts, submitted and returned objectives
      // are not agreed yet and must not count. Weights total 100 per approved set, so the result is a percentage.
      const results = await sql`
        SELECT SUM(progress_percentage * weight) / NULLIF(SUM(weight), 0) AS avg_progress
        FROM employee_objectives
        WHERE employee_id = ${job.employeeId} AND company_id = ${job.companyId}
          AND cycle_id = ${job.cycleId} AND status = 'approved'
      `;
      const avg = Number(results[0]?.avg_progress ?? 0);
      console.log(`[Queue Worker] Computed score: ${avg}`);
      break;
    }

    case "kpi_created": {
      console.log(`[Queue Worker] Processing KPI created: ${job.name} (Target: ${job.target})`);
      break;
    }

    case "cycle_stage_advance": {
      console.log(`[Queue Worker] Advancing cycle ${job.cycleId} to stage: ${job.targetStage}`);
      break;
    }
  }
}

export default {
  // Cloudflare Queues batch processor
  async queue(batch: MessageBatch<JobMessage>, env: Env): Promise<void> {
    console.log(`[hr-jobs] Received batch of ${batch.messages.length} queue messages`);
    for (const msg of batch.messages) {
      try {
        await handleJob(msg.body, env);
        msg.ack();
      } catch (err) {
        console.error(`[hr-jobs] Error handling message ${msg.id}:`, err);
        msg.retry();
      }
    }
  },
};


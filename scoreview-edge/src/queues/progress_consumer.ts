import type { Env } from "../bindings";

interface QueueMessage {
  type: "RECALCULATE_PROGRESS" | "CYCLE_STAGE_ADVANCE" | "AUDIT_EVENT";
  payload: Record<string, unknown>;
  companyId: number;
  timestamp: string;
}

export async function handleQueueBatch(
  batch: MessageBatch<QueueMessage>,
  env: Env
): Promise<void> {
  console.log(`[Queue Consumer] Processing batch of ${batch.messages.length} messages.`);

  for (const message of batch.messages) {
    try {
      const { type, payload, companyId } = message.body;

      if (type === "RECALCULATE_PROGRESS") {
        const { employeeKeyResultId, startValue, currentValue, targetValue } = payload as {
          employeeKeyResultId: number;
          startValue: number;
          currentValue: number;
          targetValue: number;
        };

        // ADR-0012: (current - start) / (target - start) * 100, floored at 0
        const denominator = targetValue - startValue;
        let progress = 0;
        if (denominator !== 0) {
          progress = Math.max(0, Math.round(((currentValue - startValue) / denominator) * 100));
        }

        console.log(
          `[Queue Consumer] Recalculated EKR ${employeeKeyResultId} for company ${companyId}: ${progress}%`
        );
      } else if (type === "CYCLE_STAGE_ADVANCE") {
        console.log(`[Queue Consumer] Processing cycle stage advance event for company ${companyId}:`, payload);
      }

      message.ack();
    } catch (err) {
      console.error("[Queue Consumer] Failed processing message, retrying:", err);
      message.retry();
    }
  }
}


import type { ErrorHandler } from "hono";
import type { Env, HonoVariables } from "../bindings";
import { CycleTransitionError } from "../services/cycle_state_machine";

export const errorHandler: ErrorHandler<{
  Bindings: Env;
  Variables: HonoVariables;
}> = (err, c) => {
  console.error("Unhandled Edge API Error:", err);

  if (err instanceof CycleTransitionError) {
    return c.json(
      {
        error: err.message,
        current_status: err.currentStatus,
        target_status: err.targetStatus,
        code: "CYCLE_TRANSITION_DISALLOWED",
      },
      400
    );
  }

  return c.json(
    {
      error: err.message || "Internal Edge Server Error",
      code: "INTERNAL_ERROR",
    },
    500
  );
};


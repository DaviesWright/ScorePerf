import { describe, expect, it } from "vitest";
import {
  ALLOWED_CYCLE_TRANSITIONS,
  canTransitionCycle,
  CycleTransitionError,
  validateCycleDates,
  validateCycleTransition,
} from "../src/services/cycle_state_machine";

describe("PerformanceCycle State Machine (Edge Engine)", () => {
  it("should permit full lifecycle forward progression", () => {
    const progression = [
      { from: "draft", to: "configured" },
      { from: "configured", to: "approved" },
      { from: "approved", to: "active" },
      { from: "active", to: "review" },
      { from: "review", to: "calibration" },
      { from: "calibration", to: "approval" },
      { from: "approval", to: "certified" },
      { from: "certified", to: "published" },
      { from: "published", to: "closed" },
    ] as const;

    for (const step of progression) {
      expect(canTransitionCycle(step.from, step.to)).toBe(true);
      expect(validateCycleTransition(step.from, step.to)).toBe(step.to);
    }
  });

  it("should permit direct transition from review to approval when calibration is bypassed", () => {
    expect(canTransitionCycle("review", "approval")).toBe(true);
    expect(validateCycleTransition("review", "approval")).toBe("approval");
  });

  it("should permit valid backward transitions for rework", () => {
    expect(canTransitionCycle("configured", "draft")).toBe(true);
    expect(canTransitionCycle("approved", "configured")).toBe(true);
    expect(canTransitionCycle("calibration", "review")).toBe(true);
    expect(canTransitionCycle("approval", "review")).toBe(true);
  });

  it("should reject invalid transitions and throw CycleTransitionError", () => {
    expect(() => validateCycleTransition("draft", "active")).toThrow(CycleTransitionError);
    expect(() => validateCycleTransition("draft", "closed")).toThrow(CycleTransitionError);
    expect(() => validateCycleTransition("closed", "active")).toThrow(CycleTransitionError);
  });

  it("should reject unknown status strings", () => {
    expect(() => validateCycleTransition("draft", "random_stage")).toThrow(CycleTransitionError);
  });

  it("should validate start and end dates correctly", () => {
    expect(() => validateCycleDates("2026-01-01", "2026-03-31")).not.toThrow();
    expect(() => validateCycleDates("2026-03-31", "2026-01-01")).toThrow(
      "End date must be greater than or equal to start date."
    );
  });
});


import { z } from "zod";

export const CycleStatusSchema = z.enum([
  "draft",
  "configured",
  "approved",
  "active",
  "review",
  "calibration",
  "approval",
  "certified",
  "published",
  "closed",
]);

export const CreateKpiSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  target: z.number().positive("Target must be positive"),
  unit: z.string().default("count"),
});

export const FrameworkCodeSchema = z.enum(["OKR", "MBO", "BSC"]);

export const CreateCycleSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(255),
    description: z.string().default(""),
    framework_code: FrameworkCodeSchema.optional(),
    framework_type_id: z.number().int().positive().optional(),
    framework_configuration_id: z.number().int().positive().optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  })
  .refine((data) => data.framework_code !== undefined || data.framework_type_id !== undefined, {
    message: "A single framework must be chosen (OKR, MBO, or BSC)",
    path: ["framework_code"],
  })
  .refine((data) => new Date(data.start_date) <= new Date(data.end_date), {
    message: "end_date must be greater than or equal to start_date",
    path: ["end_date"],
  });

export const CreateAppraisalSchema = z
  .object({
    cycleId: z.number().int().positive(),
    employeeId: z.number().int().positive(),
    reviewerId: z.number().int().positive().optional(),
    feedback: z.string().default(""),
    // Framework-specific payloads (strictly mutually exclusive per appraisal)
    okrPayload: z
      .object({
        objectives: z.array(
          z.object({
            title: z.string().min(1),
            keyResults: z.array(
              z.object({
                title: z.string().min(1),
                targetValue: z.number().positive(),
                currentValue: z.number().min(0).default(0),
              })
            ).min(1),
          })
        ).min(1),
      })
      .optional(),
    mboPayload: z
      .object({
        objectives: z.array(
          z.object({
            title: z.string().min(1),
            weight: z.number().min(1).max(100),
            targetScore: z.number().min(0).max(100),
          })
        ).min(1),
      })
      .optional(),
    bscPayload: z
      .object({
        perspectives: z.array(
          z.object({
            perspective: z.enum(["financial", "customer", "internal", "learning_growth"]),
            weight: z.number().min(1).max(100),
            measures: z.array(z.string().min(1)).min(1),
          })
        ).min(1),
      })
      .optional(),
  })
  .refine(
    (data) => {
      const activeCount = [data.okrPayload, data.mboPayload, data.bscPayload].filter(Boolean).length;
      return activeCount <= 1;
    },
    {
      message: "Framework purity violation: A mix of frameworks cannot be used for any single appraisal. Only the cycle's chosen framework is permitted.",
      path: ["okrPayload"],
    }
  );

export const TransitionCycleSchema = z.object({
  target_status: CycleStatusSchema,
});

export const CreateSessionSchema = z.object({
  sessionId: z.string().min(1),
  session: z.record(z.string(), z.unknown()),
  ttlSeconds: z.number().int().positive().default(86400),
});

export const CalculateScoreSchema = z.object({
  cycleId: z.number().int().positive(),
  employeeId: z.number().int().positive(),
});

// Core HRMS Validation Schemas

export const ClockInOutSchema = z.object({
  employeeId: z.number().int().positive(),
  type: z.enum(["clock_in", "clock_out"]),
  timestamp: z.string().optional(),
});

export const CreateLeaveRequestSchema = z.object({
  employeeId: z.number().int().positive(),
  leaveTypeId: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requestedDays: z.number().positive(),
  reason: z.string().default(""),
});

export const CreateTicketSchema = z.object({
  employeeId: z.number().int().positive(),
  categoryId: z.number().int().positive().optional(),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
});

export const CreateCandidateSchema = z.object({
  jobPositionId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().default(""),
});

export const CreateAssetSchema = z.object({
  name: z.string().min(1).max(255),
  assetCode: z.string().min(1).max(100),
  serialNumber: z.string().default(""),
  categoryId: z.number().int().positive().optional(),
});

export const CreateEmployeeSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Valid corporate email required"),
  role: z.string().default("consultant"),
  departmentId: z.number().int().positive().optional(),
});



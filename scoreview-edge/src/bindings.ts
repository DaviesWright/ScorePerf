export interface Env {
  // Cloudflare Hyperdrive connection pool to external PostgreSQL
  HYPERDRIVE: {
    connectionString: string;
  };

  // Cloudflare Queues for asynchronous recalculations and audit
  PROGRESS_QUEUE: Queue<{
    type: "RECALCULATE_PROGRESS" | "CYCLE_STAGE_ADVANCE" | "AUDIT_EVENT";
    payload: Record<string, unknown>;
    companyId: number;
    timestamp: string;
  }>;

  // Cloudflare Workflows for durable multi-day cycle execution
  CYCLE_WORKFLOW: Workflow;

  // Workers KV for tenant settings & framework definitions
  CONFIG_KV: KVNamespace;

  // Upstash Redis (REST) configuration
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;

  ENVIRONMENT: string;
  APP_NAME: string;
}

export interface TenantContext {
  companyId: number;
  userId?: number;
  employeeId?: number;
  role?: string;
}

export type HonoVariables = {
  tenant: TenantContext;
};


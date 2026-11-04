# NestJS → Hono Pattern Mapping Guide

This guide maps familiar NestJS architecture concepts to lightweight, isolate-native Hono and Cloudflare Workers patterns.

---

## 1. Architectural Concept Comparison

| NestJS Concept | Hono / Cloudflare Workers Equivalent | Why It Differs |
|---|---|---|
| `@Controller()`, `@Get()`, `@Post()` | `app.get()`, `app.post()` or sub-routers (`new Hono()`) | Functional routing without heavy reflection metadata or classes. |
| `@Module()` | Modular Hono route trees mounted via `app.route('/path', router)` | Plain ES Modules without runtime dependency injection containers. |
| `@Injectable()` / Providers | Factory functions passing `c.env` or explicit service classes | No reflection (`reflect-metadata`) overhead in V8 isolates. |
| DTOs (`class-validator`) | **Zod schemas** validated with `@hono/zod-validator` | Runtime safety and full TypeScript compile-time type inference. |
| `@UseGuards(AuthGuard)` | Hono middleware (`c.req.header()`, JWT verification, `c.set()`) | Direct async middleware in request pipeline. |
| `ValidationPipe` | `zValidator('json', schema)` | Granular per-route request payload validation. |
| `@Catch()` Exception Filters | `app.onError((err, c) => ...)` | Global and scoped functional error interceptors. |
| `@Cron()` (Nest Schedule) | **Cloudflare Cron Triggers** (`scheduled(event, env, ctx)`) | Platform-level cron without background daemon nodes. |
| `@Processor()` (BullMQ / Redis) | **Cloudflare Queues** (`queue(batch, env, ctx)`) | Serverless queue processing without dedicated worker clusters. |
| BullMQ FlowProducer / Sagas | **Cloudflare Workflows** (`WorkflowEntrypoint`) | Stateful multi-day orchestration with built-in sleep and retries. |

---

## 2. Direct Code Equivalents

### A. Controller & Route Definition

#### NestJS:
```typescript
@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get()
  async findAll(@Headers('x-company-id') companyId: string) {
    return this.employeeService.findByCompany(companyId);
  }
}
```

#### Hono:
```typescript
import { Hono } from 'hono';

export const employeeRouter = new Hono<{ Bindings: Env }>();

employeeRouter.get('/', async (c) => {
  const companyId = c.req.header('x-company-id');
  const sql = postgres(c.env.HYPERDRIVE.connectionString);
  const employees = await sql`SELECT * FROM employees WHERE company_id = ${companyId}`;
  return c.json(employees);
});
```

---

### B. DTO Validation

#### NestJS:
```typescript
export class CreateKpiDto {
  @IsString()
  name: string;

  @IsNumber()
  target: number;
}

@Post()
create(@Body() dto: CreateKpiDto) {
  return this.kpiService.create(dto);
}
```

#### Hono:
```typescript
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

export const CreateKpiSchema = z.object({
  name: z.string().min(1),
  target: z.number().positive(),
});

app.post('/kpis', zValidator('json', CreateKpiSchema), async (c) => {
  const data = c.req.valid('json'); // Fully typed as { name: string; target: number }
  // Process KPI creation...
  return c.json({ success: true });
});
```

---

### C. Background Jobs (BullMQ vs. Cloudflare Queues)

#### NestJS (BullMQ):
```typescript
// Producer
await this.jobsQueue.add('kpi_created', { id: 123 }, { attempts: 3 });

// Consumer
@Processor('jobs')
export class JobsConsumer {
  @Process('kpi_created')
  async handle(job: Job) {
    await doWork(job.data);
  }
}
```

#### Cloudflare Queues:
```typescript
// Producer (Inside API Worker)
await env.JOBS_QUEUE.send({ type: 'kpi_created', id: 123 });

// Consumer (Inside hr-jobs Worker)
export default {
  async queue(batch: MessageBatch<JobMessage>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      if (msg.body.type === 'kpi_created') {
        await doWork(msg.body.id);
      }
      msg.ack();
    }
  },
};
```

---

### D. Multi-Day Sagas vs. Cloudflare Workflows

#### Cloudflare Workflows:
```typescript
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';

export class PerformanceReviewWorkflow extends WorkflowEntrypoint<Env, { cycleId: number }> {
  async run(event: WorkflowEvent<{ cycleId: number }>, step: WorkflowStep) {
    // Step 1: Open cycle
    await step.do('open-cycle', async () => {
      await updateCycleStatus(event.payload.cycleId, 'active');
    });

    // Step 2: Sleep for 90 days (zero compute costs while waiting)
    await step.sleep('wait-for-cycle-end', { days: 90 });

    // Step 3: Automatically advance to review stage
    await step.do('advance-to-review', async () => {
      await updateCycleStatus(event.payload.cycleId, 'review');
    });
  }
}
```


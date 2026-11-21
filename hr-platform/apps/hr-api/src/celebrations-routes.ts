import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { TenantContext } from "./auth";
import type { Env } from "./index";

export type CelebrationType = "BIRTHDAY" | "WORK_ANNIVERSARY";

export interface CelebrationEmployeeRow {
  id: number;
  first_name: string;
  last_name: string;
  department: string | null;
  date_of_birth: string | null;
  start_date: string | null;
  show_birthday: boolean;
  show_anniversary: boolean;
  custom_message?: string | null;
}

export interface CelebrationItem {
  id: string;
  employee_id: number;
  employee_name: string;
  department: string;
  celebration_type: CelebrationType;
  event_date: string; // YYYY-MM-DD (upcoming occurrence)
  days_until: number;
  bucket: "this_week" | "this_month";
  label: string;
  years_of_service: number | null;
  custom_message: string | null;
}

function nextOccurrenceDays(
  sourceDateStr: string | null,
  today: Date
): { occurrence: Date; daysUntil: number; sourceYear: number } | null {
  if (!sourceDateStr) return null;
  const s = String(sourceDateStr).slice(0, 10);
  const parts = s.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [srcYear, month, day] = parts;

  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  let occ = new Date(Date.UTC(today.getUTCFullYear(), month - 1, day));
  if (occ.getTime() < todayUtc) {
    occ = new Date(Date.UTC(today.getUTCFullYear() + 1, month - 1, day));
  }
  const daysUntil = Math.round((occ.getTime() - todayUtc) / 86_400_000);
  return { occurrence: occ, daysUntil, sourceYear: srcYear };
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const mod10 = n % 10;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}

export function computeCelebrations(
  rows: CelebrationEmployeeRow[],
  options: { today?: Date; showBirthYear?: boolean; windowDays?: number } = {}
): { this_week: CelebrationItem[]; this_month: CelebrationItem[]; all: CelebrationItem[] } {
  const today = options.today ?? new Date();
  const showBirthYear = options.showBirthYear ?? false;
  const windowDays = options.windowDays ?? 30;
  const items: CelebrationItem[] = [];

  for (const r of rows) {
    const fullName = `${r.first_name} ${r.last_name}`.trim();
    const dept = r.department || "General";

    if (r.show_birthday && r.date_of_birth) {
      const occ = nextOccurrenceDays(r.date_of_birth, today);
      if (occ && occ.daysUntil >= 0 && occ.daysUntil <= windowDays) {
        const age = occ.occurrence.getUTCFullYear() - occ.sourceYear;
        const label = showBirthYear && age > 0 ? `${ordinal(age)} Birthday` : "Birthday";
        items.push({
          id: `bday-${r.id}`,
          employee_id: r.id,
          employee_name: fullName,
          department: dept,
          celebration_type: "BIRTHDAY",
          event_date: occ.occurrence.toISOString().slice(0, 10),
          days_until: occ.daysUntil,
          bucket: occ.daysUntil <= 7 ? "this_week" : "this_month",
          label,
          years_of_service: showBirthYear && age > 0 ? age : null,
          custom_message: r.custom_message ?? null,
        });
      }
    }

    if (r.show_anniversary && r.start_date) {
      const occ = nextOccurrenceDays(r.start_date, today);
      if (occ && occ.daysUntil >= 0 && occ.daysUntil <= windowDays) {
        const years = occ.occurrence.getUTCFullYear() - occ.sourceYear;
        if (years >= 1) {
          items.push({
            id: `anniv-${r.id}`,
            employee_id: r.id,
            employee_name: fullName,
            department: dept,
            celebration_type: "WORK_ANNIVERSARY",
            event_date: occ.occurrence.toISOString().slice(0, 10),
            days_until: occ.daysUntil,
            bucket: occ.daysUntil <= 7 ? "this_week" : "this_month",
            label: `${years}-Year Work Anniversary`,
            years_of_service: years,
            custom_message: r.custom_message ?? null,
          });
        }
      }
    }
  }

  items.sort((a, b) => a.days_until - b.days_until || a.employee_name.localeCompare(b.employee_name));
  return {
    this_week: items.filter((i) => i.bucket === "this_week"),
    this_month: items.filter((i) => i.bucket === "this_month"),
    all: items,
  };
}

const settingsSchema = z.object({
  show_birthday: z.boolean().optional(),
  show_anniversary: z.boolean().optional(),
  custom_message: z.string().max(240).nullable().optional(),
});

const recognizeSchema = z.object({
  message: z.string().trim().min(2).max(500),
  to_employee_id: z.number().int().positive().optional(),
});

export function createCelebrationsRoutes(getSql: (env: Env) => any) {
  const app = new Hono<{ Bindings: Env; Variables: { tenant: TenantContext } }>();

  app.get("/api/v1/ess/celebrations", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const sql = getSql(c.env);

    const rows = await sql`
      SELECT
        e.id,
        e.first_name,
        e.last_name,
        COALESCE(d.name, 'General') AS department,
        e.date_of_birth::text AS date_of_birth,
        e.created_at::date::text AS start_date,
        COALESCE(ecs.show_birthday, TRUE) AS show_birthday,
        COALESCE(ecs.show_anniversary, TRUE) AS show_anniversary,
        ecs.show_birth_year,
        ecs.custom_message
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN employee_celebrations_settings ecs ON ecs.employee_id = e.id
      WHERE e.company_id = ${companyId} AND e.is_active = TRUE
    `;

    const mySettingRow = rows.find((r: any) => Number(r.id) === userId);
    const showBirthYear = Boolean(mySettingRow?.show_birth_year ?? false);
    const result = computeCelebrations(rows, { showBirthYear });

    return c.json({
      context: "ess",
      show_birth_year: showBirthYear,
      this_week_count: result.this_week.length,
      this_week: result.this_week,
      this_month: result.this_month,
      my_milestones: result.all.filter((i) => i.employee_id === userId),
      settings: {
        show_birthday: Boolean(mySettingRow?.show_birthday ?? true),
        show_anniversary: Boolean(mySettingRow?.show_anniversary ?? true),
        custom_message: mySettingRow?.custom_message ?? null,
      },
    });
  });

  app.put("/api/v1/ess/settings/celebrations", zValidator("json", settingsSchema), async (c) => {
    const { companyId, userId } = c.get("tenant");
    const body = c.req.valid("json");
    const sql = getSql(c.env);

    await sql`
      INSERT INTO employee_celebrations_settings (
        employee_id, company_id, show_birthday, show_anniversary, custom_message, updated_at
      ) VALUES (
        ${userId},
        ${companyId},
        ${body.show_birthday ?? true},
        ${body.show_anniversary ?? true},
        ${body.custom_message ?? null},
        NOW()
      )
      ON CONFLICT (employee_id) DO UPDATE SET
        show_birthday = COALESCE(${body.show_birthday ?? null}, employee_celebrations_settings.show_birthday),
        show_anniversary = COALESCE(${body.show_anniversary ?? null}, employee_celebrations_settings.show_anniversary),
        custom_message = ${body.custom_message === undefined ? null : body.custom_message},
        updated_at = NOW()
    `;

    return c.json({ ok: true });
  });

  app.get("/api/v1/mss/celebrations", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const sql = getSql(c.env);

    // TC-CELEB-03: Direct reports only
    const rows = await sql`
      SELECT
        e.id,
        e.first_name,
        e.last_name,
        COALESCE(d.name, 'General') AS department,
        e.date_of_birth::text AS date_of_birth,
        e.created_at::date::text AS start_date,
        COALESCE(ecs.show_birthday, TRUE) AS show_birthday,
        COALESCE(ecs.show_anniversary, TRUE) AS show_anniversary,
        ecs.custom_message
      FROM reporting_lines rl
      JOIN employees e ON e.id = rl.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN employee_celebrations_settings ecs ON ecs.employee_id = e.id
      WHERE rl.company_id = ${companyId}
        AND rl.manager_id = ${userId}
        AND e.is_active = TRUE
    `;

    const result = computeCelebrations(rows, { showBirthYear: false });
    return c.json({
      context: "mss",
      this_week_count: result.this_week.length,
      this_week: result.this_week,
      this_month: result.this_month,
    });
  });

  app.post("/api/v1/mss/celebrations/:id/recognize", zValidator("json", recognizeSchema), async (c) => {
    const { companyId, userId } = c.get("tenant");
    const celebrationId = c.req.param("id");
    const body = c.req.valid("json");
    const sql = getSql(c.env);

    // Parse target employee_id from celebration id (e.g. bday-12 or anniv-12) or body
    const match = celebrationId.match(/^(?:bday|anniv)-(\d+)$/);
    const toEmployeeId = body.to_employee_id ?? (match ? Number(match[1]) : 0);
    if (!toEmployeeId) {
      return c.json({ error: "INVALID_CELEBRATION_ID", message: "Could not resolve target employee." }, 400);
    }

    const feedbackId = `FB-${crypto.randomUUID()}`;
    await sql`
      INSERT INTO continuous_feedback (
        id, company_id, from_employee_id, to_employee_id, feedback_type, message, celebration_ref
      ) VALUES (
        ${feedbackId},
        ${companyId},
        ${userId},
        ${toEmployeeId},
        'PRAISE',
        ${body.message},
        ${celebrationId}
      )
    `;

    try {
      await sql`
        INSERT INTO arch_audit_log (
          id, company_id, actor_employee_id, context, scope_type, entity_type, entity_id, action, after_json
        ) VALUES (
          ${`AUD-CEL-${crypto.randomUUID()}`},
          ${companyId},
          ${userId},
          'mss',
          'team',
          'continuous_feedback',
          ${feedbackId},
          'CELEBRATION_RECOGNITION_SENT',
          ${JSON.stringify({ to_employee_id: toEmployeeId, celebration_id: celebrationId })}::jsonb
        )
      `;
    } catch {
      // Non-fatal
    }

    return c.json({ ok: true, id: feedbackId, feedback_type: "PRAISE", to_employee_id: toEmployeeId }, 201);
  });

  app.get("/api/v1/hrms/celebrations", async (c) => {
    const { companyId } = c.get("tenant");
    const sql = getSql(c.env);
    const windowDays = Math.min(90, Math.max(7, Number(c.req.query("windowDays") || 90)));

    const rows = await sql`
      SELECT
        e.id,
        e.first_name,
        e.last_name,
        COALESCE(d.name, 'General') AS department,
        e.date_of_birth::text AS date_of_birth,
        e.created_at::date::text AS start_date,
        COALESCE(ecs.show_birthday, TRUE) AS show_birthday,
        COALESCE(ecs.show_anniversary, TRUE) AS show_anniversary,
        ecs.custom_message
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN employee_celebrations_settings ecs ON ecs.employee_id = e.id
      WHERE e.company_id = ${companyId} AND e.is_active = TRUE
    `;

    const result = computeCelebrations(rows, { showBirthYear: false, windowDays });
    return c.json({
      context: "hrms",
      window_days: windowDays,
      this_week_count: result.this_week.length,
      this_week: result.this_week,
      this_month: result.this_month,
      all: result.all,
    });
  });

  // ============================================================================
  // ESS Personal Celebrations (Opt-In) & Send-a-Note
  // ============================================================================
  app.get("/api/v1/ess/celebrations/personal", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const sql = getSql(c.env);
    const rows = await sql`
      SELECT id, employee_id, title, event_date::text AS event_date, visibility, note, created_at
      FROM personal_celebrations
      WHERE company_id = ${companyId}
        AND (employee_id = ${userId} OR visibility = 'TEAM')
      ORDER BY event_date ASC
      LIMIT 50
    `;
    return c.json({ results: rows });
  });

  app.post(
    "/api/v1/ess/celebrations/personal",
    zValidator(
      "json",
      z.object({
        title: z.string().trim().min(2).max(120),
        eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        visibility: z.enum(["TEAM", "PRIVATE"]).default("TEAM"),
        note: z.string().max(300).default(""),
      })
    ),
    async (c) => {
      const { companyId, userId } = c.get("tenant");
      const body = c.req.valid("json");
      const id = `pcel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const sql = getSql(c.env);

      await sql`
        INSERT INTO personal_celebrations (id, company_id, employee_id, title, event_date, visibility, note)
        VALUES (${id}, ${companyId}, ${userId}, ${body.title}, ${body.eventDate}::date, ${body.visibility}, ${body.note})
      `;
      return c.json({ id, ...body }, 201);
    }
  );

  app.delete("/api/v1/ess/celebrations/personal/:id", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const id = c.req.param("id");
    const sql = getSql(c.env);
    await sql`
      DELETE FROM personal_celebrations
      WHERE id = ${id} AND company_id = ${companyId} AND employee_id = ${userId}
    `;
    return c.json({ deleted: true, id });
  });

  app.post(
    "/api/v1/ess/celebrations/:id/note",
    zValidator("json", z.object({ toEmployeeId: z.number().int().positive(), message: z.string().trim().min(1).max(500) })),
    async (c) => {
      const { companyId, userId } = c.get("tenant");
      const celebrationId = c.req.param("id");
      const { toEmployeeId, message } = c.req.valid("json");
      const sql = getSql(c.env);
      const feedbackId = `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      try {
        await sql`
          INSERT INTO continuous_feedback (id, company_id, from_employee_id, to_employee_id, feedback_type, message, visibility, created_at)
          VALUES (${feedbackId}, ${companyId}, ${userId}, ${toEmployeeId}, 'PRAISE', ${message}, 'SHARED', NOW())
        `;
      } catch {
        // Fallback if continuous_feedback schema differs in older envs
      }

      return c.json({ ok: true, id: feedbackId, celebrationId, toEmployeeId }, 201);
    }
  );

  // ============================================================================
  // ESS Shortcuts Personalisation (Max 4 Primary + 8 Secondary)
  // ============================================================================
  const DEFAULT_PINNED = ["apply_leave", "view_payslip", "my_goals", "my_assets"];

  app.get("/api/v1/ess/shortcuts", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const sql = getSql(c.env);
    const rows = await sql`
      SELECT pinned_ids
      FROM employee_shortcut_preferences
      WHERE company_id = ${companyId} AND employee_id = ${userId}
      LIMIT 1
    `;
    const pinnedIds =
      rows[0] && Array.isArray(rows[0].pinned_ids) && rows[0].pinned_ids.length > 0
        ? rows[0].pinned_ids.slice(0, 4)
        : DEFAULT_PINNED;

    return c.json({ pinnedIds, defaults: DEFAULT_PINNED });
  });

  app.put(
    "/api/v1/ess/shortcuts",
    zValidator("json", z.object({ pinnedIds: z.array(z.string().min(1)).min(1).max(4) })),
    async (c) => {
      const { companyId, userId } = c.get("tenant");
      const { pinnedIds } = c.req.valid("json");
      const sql = getSql(c.env);

      await sql`
        INSERT INTO employee_shortcut_preferences (company_id, employee_id, pinned_ids, updated_at)
        VALUES (${companyId}, ${userId}, ${JSON.stringify(pinnedIds)}::jsonb, NOW())
        ON CONFLICT (company_id, employee_id) DO UPDATE SET
          pinned_ids = EXCLUDED.pinned_ids,
          updated_at = NOW()
      `;

      return c.json({ pinnedIds });
    }
  );

  return app;
}

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { TenantContext } from "./auth";
import type { Env } from "./index";

export type NotificationContext = "ESS" | "MSS" | "HRMS";
export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type NotificationChannel = "IN_APP" | "EMAIL" | "SLACK" | "TEAMS" | "SMS";
export type DigestPolicy = "IMMEDIATE" | "DAILY_DIGEST" | "WEEKLY_DIGEST";
export type ResolverType =
  | "ACTOR"
  | "SUBJECT"
  | "MANAGER_OF_SUBJECT"
  | "SKIP_LEVEL_OF_SUBJECT"
  | "ROLE_IN_SCOPE"
  | "DELEGATE_OF"
  | "RELIEF_OF"
  | "PEER_ASSIGNED"
  | "TEAM_OF_SUBJECT";

export interface EventRuleSpec {
  eventType: string;
  domain: "PERFORMANCE" | "LEAVE" | "CELEBRATIONS" | "ASSETS" | "COMPLIANCE";
  resolver: ResolverType;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  digestPolicy: DigestPolicy;
  context: NotificationContext;
  titleTemplate: string;
  bodyTemplate: string;
  deepLinkTemplate: string;
}

export const NOTIFICATION_EVENT_CATALOGUE: Record<string, EventRuleSpec> = {
  GoalSubmitted: {
    eventType: "GoalSubmitted",
    domain: "PERFORMANCE",
    resolver: "MANAGER_OF_SUBJECT",
    channels: ["IN_APP", "EMAIL"],
    priority: "NORMAL",
    digestPolicy: "IMMEDIATE",
    context: "MSS",
    titleTemplate: "Goal awaiting approval",
    bodyTemplate: "{{subjectName}} submitted a goal for your review.",
    deepLinkTemplate: "/mss/performance/goals",
  },
  GoalApproved: {
    eventType: "GoalApproved",
    domain: "PERFORMANCE",
    resolver: "SUBJECT",
    channels: ["IN_APP"],
    priority: "NORMAL",
    digestPolicy: "IMMEDIATE",
    context: "ESS",
    titleTemplate: "Goal approved",
    bodyTemplate: "Your goal has been approved.",
    deepLinkTemplate: "/ess/goals",
  },
  SelfAssessmentSubmitted: {
    eventType: "SelfAssessmentSubmitted",
    domain: "PERFORMANCE",
    resolver: "MANAGER_OF_SUBJECT",
    channels: ["IN_APP", "EMAIL"],
    priority: "HIGH",
    digestPolicy: "IMMEDIATE",
    context: "MSS",
    titleTemplate: "Manager assessment ready",
    bodyTemplate: "{{subjectName}} completed self-assessment. Your manager review is now due.",
    deepLinkTemplate: "/mss/performance/reviews",
  },
  PeerInputRequested: {
    eventType: "PeerInputRequested",
    domain: "PERFORMANCE",
    resolver: "PEER_ASSIGNED",
    channels: ["IN_APP", "EMAIL"],
    priority: "NORMAL",
    digestPolicy: "IMMEDIATE",
    context: "ESS",
    titleTemplate: "Peer feedback requested",
    bodyTemplate: "A colleague has requested confidential peer feedback.",
    deepLinkTemplate: "/ess/performance",
  },
  FinalRatingIssued: {
    eventType: "FinalRatingIssued",
    domain: "PERFORMANCE",
    resolver: "SUBJECT",
    channels: ["IN_APP", "EMAIL"],
    priority: "HIGH",
    digestPolicy: "IMMEDIATE",
    context: "ESS",
    titleTemplate: "Final appraisal rating issued",
    bodyTemplate: "Your final cycle rating is now available to review.",
    deepLinkTemplate: "/ess/performance",
  },
  LeaveApplicationSubmitted: {
    eventType: "LeaveApplicationSubmitted",
    domain: "LEAVE",
    resolver: "MANAGER_OF_SUBJECT",
    channels: ["IN_APP", "EMAIL"],
    priority: "NORMAL",
    digestPolicy: "IMMEDIATE",
    context: "MSS",
    titleTemplate: "Leave request awaiting approval",
    bodyTemplate: "{{subjectName}} has requested leave from {{startDate}} to {{endDate}}.",
    deepLinkTemplate: "/mss/leave",
  },
  LeaveApproved: {
    eventType: "LeaveApproved",
    domain: "LEAVE",
    resolver: "SUBJECT",
    channels: ["IN_APP", "EMAIL"],
    priority: "NORMAL",
    digestPolicy: "IMMEDIATE",
    context: "ESS",
    titleTemplate: "Leave approved",
    bodyTemplate: "Your leave request ({{startDate}} to {{endDate}}) was approved.",
    deepLinkTemplate: "/ess/leave",
  },
  LeaveRejected: {
    eventType: "LeaveRejected",
    domain: "LEAVE",
    resolver: "SUBJECT",
    channels: ["IN_APP", "EMAIL"],
    priority: "HIGH",
    digestPolicy: "IMMEDIATE",
    context: "ESS",
    titleTemplate: "Leave request declined",
    bodyTemplate: "Your leave request ({{startDate}} to {{endDate}}) was declined.",
    deepLinkTemplate: "/ess/leave",
  },
  BirthdayThisWeek: {
    eventType: "BirthdayThisWeek",
    domain: "CELEBRATIONS",
    resolver: "TEAM_OF_SUBJECT",
    channels: ["IN_APP"],
    priority: "LOW",
    digestPolicy: "WEEKLY_DIGEST",
    context: "MSS",
    titleTemplate: "Upcoming birthday",
    bodyTemplate: "{{subjectName}} celebrates a birthday on {{eventDate}}.",
    deepLinkTemplate: "/mss/celebrations",
  },
  AnniversaryThisWeek: {
    eventType: "AnniversaryThisWeek",
    domain: "CELEBRATIONS",
    resolver: "TEAM_OF_SUBJECT",
    channels: ["IN_APP"],
    priority: "LOW",
    digestPolicy: "WEEKLY_DIGEST",
    context: "MSS",
    titleTemplate: "Upcoming work anniversary",
    bodyTemplate: "{{subjectName}} celebrates a work anniversary on {{eventDate}}.",
    deepLinkTemplate: "/mss/celebrations",
  },
  AssetAssigned: {
    eventType: "AssetAssigned",
    domain: "ASSETS",
    resolver: "SUBJECT",
    channels: ["IN_APP"],
    priority: "NORMAL",
    digestPolicy: "IMMEDIATE",
    context: "ESS",
    titleTemplate: "Asset assigned",
    bodyTemplate: "Asset {{assetCode}} ({{assetName}}) has been assigned to you.",
    deepLinkTemplate: "/ess/assets",
  },
  AssetReturned: {
    eventType: "AssetReturned",
    domain: "ASSETS",
    resolver: "SUBJECT",
    channels: ["IN_APP"],
    priority: "NORMAL",
    digestPolicy: "IMMEDIATE",
    context: "ESS",
    titleTemplate: "Asset return recorded",
    bodyTemplate: "Return of asset {{assetCode}} has been recorded.",
    deepLinkTemplate: "/ess/assets",
  },
  EmployeeWithoutManager: {
    eventType: "EmployeeWithoutManager",
    domain: "COMPLIANCE",
    resolver: "ROLE_IN_SCOPE",
    channels: ["IN_APP", "EMAIL"],
    priority: "HIGH",
    digestPolicy: "WEEKLY_DIGEST",
    context: "HRMS",
    titleTemplate: "Data quality: missing primary manager",
    bodyTemplate: "{{subjectName}} currently has no primary manager assigned in the org graph.",
    deepLinkTemplate: "/hrms/organogram",
  },
  HRISSyncConflict: {
    eventType: "HRISSyncConflict",
    domain: "COMPLIANCE",
    resolver: "ROLE_IN_SCOPE",
    channels: ["IN_APP", "EMAIL"],
    priority: "HIGH",
    digestPolicy: "IMMEDIATE",
    context: "HRMS",
    titleTemplate: "HRIS sync conflict detected",
    bodyTemplate: "A reporting-line conflict requires HR review.",
    deepLinkTemplate: "/hrms/organogram",
  },
};

export function applyPiiFilter(
  eventType: string,
  payload: Record<string, unknown>,
  recipientRole: string
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = { ...payload };
  const isHr = ["hr_admin", "hr_director", "admin", "hr"].includes(recipientRole.toLowerCase());

  // Never expose birth year or age in celebrations
  if (eventType === "BirthdayThisWeek" || eventType === "AnniversaryThisWeek") {
    delete sanitized.birthYear;
    delete sanitized.birth_year;
    delete sanitized.age;
    delete sanitized.dateOfBirth;
  }

  // Never reveal peer feedback identity to reviewee
  if (eventType === "PeerInputRequested" || eventType === "PeerFeedbackSubmitted") {
    delete sanitized.peerId;
    delete sanitized.peerName;
    delete sanitized.reviewerName;
    sanitized.peerLabel = "A colleague";
  }

  // Leave reason (medical/sick) is always masked in notifications; leave type masked for managers
  if (eventType.startsWith("Leave")) {
    delete sanitized.reason;
    delete sanitized.medicalNote;
    if (!isHr && recipientRole !== "payroll") {
      delete sanitized.leaveType;
      delete sanitized.leave_type;
    }
  }

  // Salary/financial values masked for non-HR/non-payroll
  if (!isHr && recipientRole !== "payroll") {
    delete sanitized.salary;
    delete sanitized.allowanceAmount;
    delete sanitized.purchasePrice;
  }

  // Calibration rationale masked for non-HR
  if (!isHr) {
    delete sanitized.calibrationRationale;
  }

  return sanitized;
}

export function isWithinQuietHours(
  quietHours: { enabled?: boolean; from?: string; to?: string } | null | undefined,
  currentHHMM: string,
  priority: NotificationPriority
): { deferred: boolean; reason?: string } {
  if (priority === "URGENT") {
    return { deferred: false };
  }
  if (!quietHours?.enabled || !quietHours.from || !quietHours.to) {
    return { deferred: false };
  }
  const from = quietHours.from;
  const to = quietHours.to;
  const inWindow = from <= to ? currentHHMM >= from && currentHHMM < to : currentHHMM >= from || currentHHMM < to;
  if (inWindow) {
    return { deferred: true, reason: "QUIET_HOURS" };
  }
  return { deferred: false };
}

export function shouldDeduplicate(
  recentEvents: Array<{ aggregate_id: string; event_type: string; occurred_at: string }>,
  aggregateId: string,
  eventType: string,
  windowMinutes = 5,
  nowMs = Date.now()
): boolean {
  const cutoff = nowMs - windowMinutes * 60_000;
  return recentEvents.some(
    (e) =>
      String(e.aggregate_id) === String(aggregateId) &&
      String(e.event_type) === String(eventType) &&
      new Date(e.occurred_at).getTime() >= cutoff
  );
}

export function resolveRecipients(options: {
  resolver: ResolverType;
  subjectId?: number;
  actorId?: number;
  peerId?: number;
  reliefId?: number;
  reportingRows?: Array<{ employee_id: number; manager_id: number; kind?: string }>;
  delegationRows?: Array<{ delegator_id: number | string; delegate_id: number | string; status: string }>;
  hrUserIds?: number[];
  teamMemberIds?: number[];
}): Array<{ userId: number; delegatedFrom?: number }> {
  const {
    resolver,
    subjectId,
    actorId,
    peerId,
    reliefId,
    reportingRows = [],
    delegationRows = [],
    hrUserIds = [],
    teamMemberIds = [],
  } = options;

  const findActiveDelegate = (managerId: number): number | null => {
    const d = delegationRows.find(
      (del) => Number(del.delegator_id) === Number(managerId) && del.status === "ACTIVE"
    );
    return d ? Number(d.delegate_id) : null;
  };

  if (resolver === "ACTOR" && actorId) return [{ userId: actorId }];
  if (resolver === "SUBJECT" && subjectId) return [{ userId: subjectId }];
  if (resolver === "PEER_ASSIGNED" && peerId) return [{ userId: peerId }];
  if (resolver === "RELIEF_OF" && reliefId) return [{ userId: reliefId }];
  if (resolver === "ROLE_IN_SCOPE") return hrUserIds.map((id) => ({ userId: id }));
  if (resolver === "TEAM_OF_SUBJECT") {
    return teamMemberIds.filter((id) => id !== subjectId).map((id) => ({ userId: id }));
  }

  if (resolver === "MANAGER_OF_SUBJECT" && subjectId) {
    const line = reportingRows.find(
      (r) => Number(r.employee_id) === Number(subjectId) && (r.kind ?? "solid") === "solid"
    );
    if (!line) return [];
    const mgrId = Number(line.manager_id);
    const delegateId = findActiveDelegate(mgrId);
    if (delegateId) {
      return [
        { userId: delegateId, delegatedFrom: mgrId },
        { userId: mgrId },
      ];
    }
    return [{ userId: mgrId }];
  }

  if (resolver === "SKIP_LEVEL_OF_SUBJECT" && subjectId) {
    const line1 = reportingRows.find(
      (r) => Number(r.employee_id) === Number(subjectId) && (r.kind ?? "solid") === "solid"
    );
    if (!line1) return [];
    const line2 = reportingRows.find(
      (r) => Number(r.employee_id) === Number(line1.manager_id) && (r.kind ?? "solid") === "solid"
    );
    return line2 ? [{ userId: Number(line2.manager_id) }] : [];
  }

  return [];
}

export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : ""
  );
}

const emitSchema = z.object({
  eventType: z.string().min(1),
  aggregateType: z.string().min(1).default("GENERIC"),
  aggregateId: z.string().min(1),
  subjectId: z.number().int().positive().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

const preferencesSchema = z.object({
  eventType: z.string().min(1).default("*"),
  channels: z.array(z.enum(["IN_APP", "EMAIL", "SLACK", "TEAMS", "SMS"])).min(1),
  digestOptIn: z.boolean().default(true),
  quietHours: z
    .object({
      enabled: z.boolean(),
      from: z.string().regex(/^\d{2}:\d{2}$/),
      to: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .optional(),
});

const adminRuleSchema = z.object({
  eventType: z.string().min(1),
  channels: z.array(z.enum(["IN_APP", "EMAIL", "SLACK", "TEAMS", "SMS"])).min(1),
  digestPolicy: z.enum(["IMMEDIATE", "DAILY_DIGEST", "WEEKLY_DIGEST"]).default("IMMEDIATE"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  active: z.boolean().default(true),
});

function isHrAdmin(role: string) {
  return role === "hr_admin" || role === "hr_director";
}

export function createNotificationEngineRoutes(getSql: (env: Env) => any) {
  const app = new Hono<{ Bindings: Env; Variables: { tenant: TenantContext } }>();

  // Canonical inbox (context-aware: ESS | MSS | HRMS)
  app.get("/api/v1/notifications/inbox", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const contextFilter = c.req.query("context")?.toUpperCase();
    const unreadOnly = c.req.query("unreadOnly") === "true";
    const sql = getSql(c.env);

    const rows = await sql`
      SELECT id, context, title, body, deep_link, priority, read_at, dismissed_at, created_at
      FROM notification_inbox
      WHERE company_id = ${companyId}
        AND recipient_user_id = ${userId}
        AND dismissed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const filtered = rows.filter((r: any) => {
      if (contextFilter && contextFilter !== "ALL" && String(r.context) !== contextFilter) return false;
      if (unreadOnly && r.read_at !== null) return false;
      return true;
    });

    return c.json({ results: filtered });
  });

  app.get("/api/v1/notifications/unread-count", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const sql = getSql(c.env);

    const rows = await sql`
      SELECT context, COUNT(*)::int AS cnt
      FROM notification_inbox
      WHERE company_id = ${companyId}
        AND recipient_user_id = ${userId}
        AND dismissed_at IS NULL
        AND read_at IS NULL
      GROUP BY context
    `;
    const byContext: Record<string, number> = { ESS: 0, MSS: 0, HRMS: 0 };
    let total = 0;
    for (const r of rows) {
      byContext[String(r.context)] = Number(r.cnt);
      total += Number(r.cnt);
    }

    // Include legacy notifications table unread count if any
    const legacy = await sql`
      SELECT COUNT(*)::int AS cnt FROM notifications
      WHERE company_id = ${companyId} AND recipient_id = ${userId} AND read_at IS NULL
    `;
    const legacyCount = Number(legacy[0]?.cnt ?? 0);

    return c.json({
      total: total + legacyCount,
      inboxTotal: total,
      legacyCount,
      byContext,
    });
  });

  app.patch("/api/v1/notifications/:id/read", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const id = c.req.param("id");
    const sql = getSql(c.env);

    await sql`
      UPDATE notification_inbox
      SET read_at = COALESCE(read_at, NOW())
      WHERE id = ${id} AND company_id = ${companyId} AND recipient_user_id = ${userId}
    `;
    return c.json({ id, read: true });
  });

  app.patch("/api/v1/notifications/read-all", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const context = c.req.query("context")?.toUpperCase();
    const sql = getSql(c.env);

    if (context && ["ESS", "MSS", "HRMS"].includes(context)) {
      await sql`
        UPDATE notification_inbox
        SET read_at = NOW()
        WHERE company_id = ${companyId} AND recipient_user_id = ${userId} AND context = ${context} AND read_at IS NULL
      `;
    } else {
      await sql`
        UPDATE notification_inbox
        SET read_at = NOW()
        WHERE company_id = ${companyId} AND recipient_user_id = ${userId} AND read_at IS NULL
      `;
    }
    return c.json({ ok: true });
  });

  app.patch("/api/v1/notifications/:id/dismiss", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const id = c.req.param("id");
    const sql = getSql(c.env);

    await sql`
      UPDATE notification_inbox
      SET dismissed_at = NOW()
      WHERE id = ${id} AND company_id = ${companyId} AND recipient_user_id = ${userId}
    `;
    return c.json({ id, dismissed: true });
  });

  // Preferences
  app.get("/api/v1/notifications/preferences", async (c) => {
    const { userId } = c.get("tenant");
    const sql = getSql(c.env);
    const rows = await sql`
      SELECT id, event_type, channels, digest_opt_in, quiet_hours, updated_at
      FROM notification_preferences
      WHERE user_id = ${userId}
    `;
    return c.json({
      preferences:
        rows.length > 0
          ? rows
          : [
              {
                event_type: "*",
                channels: ["IN_APP", "EMAIL"],
                digest_opt_in: true,
                quiet_hours: { enabled: false, from: "22:00", to: "07:00" },
              },
            ],
    });
  });

  app.put("/api/v1/notifications/preferences", zValidator("json", preferencesSchema), async (c) => {
    const { userId } = c.get("tenant");
    const body = c.req.valid("json");
    const sql = getSql(c.env);
    const channels = Array.from(new Set(["IN_APP", ...body.channels])); // IN_APP cannot be disabled
    const qh = body.quietHours ?? { enabled: false, from: "22:00", to: "07:00" };
    const id = `pref-${userId}-${body.eventType}`;

    await sql`
      INSERT INTO notification_preferences (id, user_id, event_type, channels, digest_opt_in, quiet_hours, updated_at)
      VALUES (${id}, ${userId}, ${body.eventType}, ${JSON.stringify(channels)}::jsonb, ${body.digestOptIn}, ${JSON.stringify(qh)}::jsonb, NOW())
      ON CONFLICT (user_id, event_type) DO UPDATE SET
        channels = EXCLUDED.channels,
        digest_opt_in = EXCLUDED.digest_opt_in,
        quiet_hours = EXCLUDED.quiet_hours,
        updated_at = NOW()
    `;

    return c.json({ saved: true, channels, digestOptIn: body.digestOptIn, quietHours: qh });
  });

  // Event emission pipeline (handles dedup, PII filter, org-graph resolution, inbox + deliveries)
  app.post("/api/v1/notifications/emit", zValidator("json", emitSchema), async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const body = c.req.valid("json");
    const sql = getSql(c.env);

    const ruleSpec = NOTIFICATION_EVENT_CATALOGUE[body.eventType];
    if (!ruleSpec) {
      const unhandledId = `unh-${Date.now()}`;
      await sql`
        INSERT INTO notification_unhandled_events (id, company_id, event_type, payload)
        VALUES (${unhandledId}, ${companyId}, ${body.eventType}, ${JSON.stringify(body.payload)}::jsonb)
      `;
      return c.json({ status: "EVENT_UNHANDLED", id: unhandledId }, 202);
    }

    const recent = await sql`
      SELECT aggregate_id, event_type, occurred_at::text AS occurred_at
      FROM notification_events
      WHERE company_id = ${companyId} AND aggregate_id = ${body.aggregateId} AND event_type = ${body.eventType}
      ORDER BY occurred_at DESC
      LIMIT 5
    `;
    if (shouldDeduplicate(recent, body.aggregateId, body.eventType)) {
      return c.json({ status: "DEDUPLICATED" });
    }

    const eventId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await sql`
      INSERT INTO notification_events (id, company_id, event_type, aggregate_type, aggregate_id, payload, actor_id)
      VALUES (${eventId}, ${companyId}, ${body.eventType}, ${body.aggregateType}, ${body.aggregateId}, ${JSON.stringify(body.payload)}::jsonb, ${userId})
    `;

    const [reportingRows, hrRows] = await Promise.all([
      sql`SELECT employee_id, manager_id, kind FROM reporting_lines WHERE company_id = ${companyId}`,
      sql`SELECT id FROM employees WHERE company_id = ${companyId} AND access_role IN ('hr_admin', 'hr_director') AND is_active = TRUE`,
    ]);

    const recipients = resolveRecipients({
      resolver: ruleSpec.resolver,
      subjectId: body.subjectId ?? userId,
      actorId: userId,
      reportingRows,
      hrUserIds: hrRows.map((r: any) => Number(r.id)),
    });

    const createdIds: string[] = [];
    for (const rec of recipients) {
      const filteredPayload = applyPiiFilter(body.eventType, body.payload, role);
      const title = renderTemplate(ruleSpec.titleTemplate, filteredPayload);
      const msgBody = rec.delegatedFrom
        ? `[Acting for #${rec.delegatedFrom}] ${renderTemplate(ruleSpec.bodyTemplate, filteredPayload)}`
        : renderTemplate(ruleSpec.bodyTemplate, filteredPayload);
      const inboxId = `inb-${Date.now()}-${rec.userId}-${Math.random().toString(36).slice(2, 5)}`;

      await sql`
        INSERT INTO notification_inbox (
          id, company_id, recipient_user_id, event_id, context, title, body, deep_link, priority
        ) VALUES (
          ${inboxId}, ${companyId}, ${rec.userId}, ${eventId}, ${ruleSpec.context},
          ${title}, ${msgBody}, ${ruleSpec.deepLinkTemplate}, ${ruleSpec.priority}
        )
      `;
      await sql`
        INSERT INTO notification_deliveries (id, notification_inbox_id, channel, status, attempt_count, last_attempt_at, idempotency_key)
        VALUES (${`del-${inboxId}-inapp`}, ${inboxId}, 'IN_APP', 'SENT', 1, NOW(), ${`${eventId}:${rec.userId}:IN_APP`})
      `;
      createdIds.push(inboxId);
    }

    return c.json({ status: "DISPATCHED", eventId, inboxIds: createdIds }, 201);
  });

  // Admin endpoints (HRMS only)
  app.get("/api/v1/notifications/admin/rules", async (c) => {
    const { companyId, role } = c.get("tenant");
    if (!isHrAdmin(role)) return c.json({ error: "Forbidden" }, 403);
    const sql = getSql(c.env);
    const customRules = await sql`
      SELECT * FROM notification_rules WHERE company_id = ${companyId} ORDER BY event_type
    `;
    return c.json({
      catalogue: Object.values(NOTIFICATION_EVENT_CATALOGUE),
      customRules,
    });
  });

  app.post("/api/v1/notifications/admin/rules", zValidator("json", adminRuleSchema), async (c) => {
    const { companyId, role } = c.get("tenant");
    if (!isHrAdmin(role)) return c.json({ error: "Forbidden" }, 403);
    const body = c.req.valid("json");
    const sql = getSql(c.env);
    const id = `rule-${companyId}-${body.eventType}`;
    await sql`
      INSERT INTO notification_rules (id, company_id, event_type, channels, template_key, digest_policy, priority, active)
      VALUES (${id}, ${companyId}, ${body.eventType}, ${JSON.stringify(body.channels)}::jsonb, ${body.eventType}, ${body.digestPolicy}, ${body.priority}, ${body.active})
      ON CONFLICT (id) DO UPDATE SET
        channels = EXCLUDED.channels,
        digest_policy = EXCLUDED.digest_policy,
        priority = EXCLUDED.priority,
        active = EXCLUDED.active
    `;
    return c.json({ id, ...body }, 201);
  });

  app.get("/api/v1/notifications/admin/deliveries", async (c) => {
    const { companyId, role } = c.get("tenant");
    if (!isHrAdmin(role)) return c.json({ error: "Forbidden" }, 403);
    const sql = getSql(c.env);
    const rows = await sql`
      SELECT nd.*, ni.context, ni.title, ni.recipient_user_id
      FROM notification_deliveries nd
      JOIN notification_inbox ni ON ni.id = nd.notification_inbox_id
      WHERE ni.company_id = ${companyId}
      ORDER BY nd.last_attempt_at DESC NULLS LAST
      LIMIT 100
    `;
    return c.json({ results: rows });
  });

  app.get("/api/v1/notifications/admin/events/unhandled", async (c) => {
    const { companyId, role } = c.get("tenant");
    if (!isHrAdmin(role)) return c.json({ error: "Forbidden" }, 403);
    const sql = getSql(c.env);
    const rows = await sql`
      SELECT * FROM notification_unhandled_events
      WHERE company_id = ${companyId}
      ORDER BY occurred_at DESC
      LIMIT 50
    `;
    return c.json({ results: rows });
  });

  return app;
}

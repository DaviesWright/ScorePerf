import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type postgres from "postgres";
import {
  DEFAULT_OVERDUE_DAYS,
  MAX_OVERDUE_DAYS,
  canDecideWriteOff,
  isOverdue,
  isSerialViolation,
  normaliseSerial,
  overdueThreshold,
  recoveryCloseError,
  recoveryTaskTitle,
  teamAssignments,
  toCsv,
  writeOffBlocker,
  writeOffNeedsApproval,
  type OpenAssignment,
} from "@hr-platform/shared";
import type { TenantContext } from "./auth";
// Type-only: erased at runtime, so index.ts can import this module without a cycle.
import type { Env } from "./index";

// Part B of the assets module: categories, asset details, write-off with approval, offboarding recovery tasks,
// the manager team view and CSV exports. Mounted from index.ts after `authenticate`. The register, assign, return,
// history and offboard routes stay in index.ts.

type Sql = ReturnType<typeof postgres>;

class AssetError extends Error {
  constructor(message: string, readonly httpStatus: 403 | 404 | 409 | 422) {
    super(message);
  }
}

const isHr = (role: string) => role === "hr_admin" || role === "hr_director";
const parseId = (raw: string): number | null => {
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};
const daysParam = (raw: string | undefined): number => {
  const n = Number(raw ?? DEFAULT_OVERDUE_DAYS);
  return Number.isSafeInteger(n) && n >= 0 && n <= MAX_OVERDUE_DAYS ? n : DEFAULT_OVERDUE_DAYS;
};
const csvResponse = (c: { body: (data: string, status: 200, headers: Record<string, string>) => Response }, filename: string, body: string) =>
  c.body(body, 200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });

const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date as YYYY-MM-DD.");
const OverdueDays = z.number().int().min(1).max(MAX_OVERDUE_DAYS);
const DepreciationMonths = z.number().int().min(1).max(600);
const CategoryBody = z.object({
  name: z.string().trim().min(2).max(100),
  overdueDays: OverdueDays.nullable().optional(),
  depreciationMonths: DepreciationMonths.nullable().optional(),
});
const CategoryUpdateBody = z.object({ overdueDays: OverdueDays.nullable(), depreciationMonths: DepreciationMonths.nullable() });
const AssetDetailsBody = z.object({
  serialNumber: z.string().max(100).nullable().optional(),
  purchaseDate: IsoDate.nullable().optional(),
  purchasePrice: z.number().min(0).max(9_999_999_999.99).nullable().optional(),
  warrantyExpiry: IsoDate.nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
const WriteOffBody = z.object({ reason: z.string().trim().min(3).max(1000) });
const DecisionBody = z.object({ decision: z.enum(["approve", "reject"]), note: z.string().trim().max(500).default("") });
const CloseTaskBody = z.object({ note: z.string().trim().max(1000).default("") });

export interface OpenRow extends OpenAssignment {
  thresholdDays: number;
}

/** Every open assignment in the company, with the overdue threshold for its category (or the fallback). */
export async function openAssignments(sql: Sql, companyId: number, fallbackDays: number): Promise<OpenRow[]> {
  const rows = await sql`
    SELECT ca.id AS asset_id, ca.asset_code, ca.name, aa.allocated_date::text AS allocated_date,
      (CURRENT_DATE - aa.allocated_date)::int AS days_held,
      ac.overdue_days AS category_days,
      e.id AS employee_id, e.first_name, e.last_name
    FROM asset_allocations aa
    JOIN company_assets ca ON ca.id = aa.asset_id
    LEFT JOIN asset_categories ac ON ac.id = ca.category_id
    JOIN employees e ON e.id = aa.employee_id
    WHERE aa.company_id = ${companyId} AND aa.return_date IS NULL
    ORDER BY aa.allocated_date ASC, aa.id ASC
    LIMIT 2000
  `;
  return rows.map((r) => ({
    assetId: Number(r.asset_id),
    assetCode: String(r.asset_code),
    name: String(r.name),
    employeeId: Number(r.employee_id),
    employeeName: `${r.first_name} ${r.last_name}`,
    allocatedDate: String(r.allocated_date),
    daysHeld: Number(r.days_held),
    thresholdDays: overdueThreshold(r.category_days === null ? null : Number(r.category_days), fallbackDays),
  }));
}

/** Open assignments past their threshold. Used by the overdue screen and its CSV. */
export async function overdueAssets(sql: Sql, companyId: number, fallbackDays: number): Promise<OpenRow[]> {
  return (await openAssignments(sql, companyId, fallbackDays)).filter((r) => isOverdue(r.daysHeld, r.thresholdDays));
}

/** Records the "Recover N assets from [name]" task. One open task per person; a second attempt changes nothing. */
export async function openRecoveryTask(sql: Sql, companyId: number, employeeId: number, openedBy: number): Promise<void> {
  await sql`
    INSERT INTO asset_recovery_tasks (company_id, employee_id, opened_by)
    VALUES (${companyId}, ${employeeId}, ${openedBy})
    ON CONFLICT (employee_id) WHERE status = 'open' DO NOTHING
  `;
}

export function createAssetRoutes(getSql: (env: Env) => Sql) {
  const routes = new Hono<{ Bindings: Env; Variables: { tenant: TenantContext } }>();

  // Categories. The overdue threshold is per category; null means the report's default applies.
  routes.get("/api/v1/assets/categories", async (c) => {
    const { companyId, role } = c.get("tenant");
    if (!isHr(role)) return c.json({ error: "Forbidden" }, 403);
    const rows = await getSql(c.env)`
      SELECT id, name, overdue_days, depreciation_months FROM asset_categories WHERE company_id = ${companyId} ORDER BY name
    `;
    return c.json({
      results: rows.map((r) => ({
        id: Number(r.id),
        name: String(r.name),
        overdueDays: r.overdue_days === null ? null : Number(r.overdue_days),
        depreciationMonths: r.depreciation_months === null ? null : Number(r.depreciation_months),
      })),
    });
  });

  routes.post("/api/v1/assets/categories", zValidator("json", CategoryBody), async (c) => {
    const { companyId, role } = c.get("tenant");
    if (!isHr(role)) return c.json({ error: "Only HR can add asset categories." }, 403);
    const body = c.req.valid("json");
    try {
      const [row] = await getSql(c.env)`
        INSERT INTO asset_categories (company_id, name, overdue_days, depreciation_months)
        VALUES (${companyId}, ${body.name}, ${body.overdueDays ?? null}, ${body.depreciationMonths ?? null})
        RETURNING id
      `;
      return c.json({ id: Number(row.id) }, 201);
    } catch (err) {
      if ((err as { code?: string }).code === "23505") return c.json({ error: "A category with this name already exists." }, 409);
      throw err;
    }
  });

  routes.post("/api/v1/assets/categories/:id/update", zValidator("json", CategoryUpdateBody), async (c) => {
    const { companyId, role } = c.get("tenant");
    if (!isHr(role)) return c.json({ error: "Only HR can change asset categories." }, 403);
    const id = parseId(c.req.param("id"));
    if (id === null) return c.json({ error: "Not found" }, 404);
    const body = c.req.valid("json");
    const updated = await getSql(c.env)`
      UPDATE asset_categories SET overdue_days = ${body.overdueDays}, depreciation_months = ${body.depreciationMonths}
      WHERE id = ${id} AND company_id = ${companyId}
      RETURNING id
    `;
    if (updated.length === 0) return c.json({ error: "Not found" }, 404);
    return c.json({ id, overdueDays: body.overdueDays, depreciationMonths: body.depreciationMonths });
  });

  // Asset details: serial number and the purchase and warranty fields. Serials are unique per company.
  routes.post("/api/v1/assets/:id/update", zValidator("json", AssetDetailsBody), async (c) => {
    const { companyId, role } = c.get("tenant");
    if (!isHr(role)) return c.json({ error: "Only HR can change asset details." }, 403);
    const id = parseId(c.req.param("id"));
    if (id === null) return c.json({ error: "Not found" }, 404);
    const body = c.req.valid("json");
    const sql = getSql(c.env);
    try {
      const [current] = await sql`
        SELECT serial_number, purchase_date::text AS purchase_date, purchase_price::text AS purchase_price,
          warranty_expiry::text AS warranty_expiry, notes
        FROM company_assets WHERE id = ${id} AND company_id = ${companyId}
      `;
      if (!current) return c.json({ error: "Not found" }, 404);
      const pick = <T>(incoming: T | null | undefined, existing: T | null): T | null => (incoming === undefined ? existing : incoming);
      const serial = body.serialNumber === undefined ? normaliseSerial(current.serial_number as string | null) : normaliseSerial(body.serialNumber);
      await sql`
        UPDATE company_assets SET serial_number = ${serial},
          purchase_date = ${pick(body.purchaseDate, current.purchase_date as string | null)},
          purchase_price = ${pick(body.purchasePrice, current.purchase_price === null ? null : Number(current.purchase_price))},
          warranty_expiry = ${pick(body.warrantyExpiry, current.warranty_expiry as string | null)},
          notes = ${pick(body.notes, current.notes as string | null)}
        WHERE id = ${id} AND company_id = ${companyId}
      `;
    } catch (err) {
      if (isSerialViolation(err)) return c.json({ error: "Another asset already has this serial number." }, 409);
      throw err;
    }
    return c.json({ id });
  });

  // Write-off. HR only. A holder who is a current employee means approval first (status 202, asset unchanged).
  // Otherwise the asset becomes 'lost' now and any open assignment closes.
  routes.post("/api/v1/assets/:id/write-off", zValidator("json", WriteOffBody), async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (!isHr(role)) return c.json({ error: "Only HR can write off assets." }, 403);
    const id = parseId(c.req.param("id"));
    if (id === null) return c.json({ error: "Not found" }, 404);
    const { reason } = c.req.valid("json");
    const sql = getSql(c.env);
    try {
      const result = await sql.begin(async (tx) => {
        const [asset] = await tx`SELECT status FROM company_assets WHERE id = ${id} AND company_id = ${companyId} FOR UPDATE`;
        if (!asset) throw new AssetError("Not found.", 404);
        const blocker = writeOffBlocker(String(asset.status));
        if (blocker) throw new AssetError(blocker, 409);

        const [open] = await tx`
          SELECT id, employee_id FROM asset_allocations
          WHERE asset_id = ${id} AND company_id = ${companyId} AND return_date IS NULL FOR UPDATE
        `;
        let holder: { isActive: boolean } | null = null;
        if (open) {
          const [person] = await tx`SELECT is_active FROM employees WHERE id = ${open.employee_id}`;
          holder = { isActive: Boolean(person?.is_active) };
        }

        if (writeOffNeedsApproval(holder)) {
          const [pending] = await tx`
            INSERT INTO asset_write_offs (company_id, asset_id, allocation_id, holder_id, reason, status, requested_by)
            VALUES (${companyId}, ${id}, ${open.id}, ${open.employee_id}, ${reason}, 'pending', ${userId})
            RETURNING id
          `;
          return { writeOffId: Number(pending.id), status: "pending" as const };
        }

        if (open) {
          await tx`UPDATE asset_allocations SET return_date = CURRENT_DATE, return_notes = ${`Written off: ${reason}`} WHERE id = ${open.id}`;
        }
        await tx`UPDATE company_assets SET status = 'lost' WHERE id = ${id}`;
        const [done] = await tx`
          INSERT INTO asset_write_offs (company_id, asset_id, allocation_id, holder_id, reason, status, requested_by, decided_by, decided_at)
          VALUES (${companyId}, ${id}, ${open?.id ?? null}, ${open?.employee_id ?? null}, ${reason}, 'approved', ${userId}, ${userId}, NOW())
          RETURNING id
        `;
        return { writeOffId: Number(done.id), status: "approved" as const };
      });
      if (result.status === "pending") return c.json({ writeOffId: result.writeOffId, status: "pending", assetStatus: "allocated" }, 202);
      return c.json({ writeOffId: result.writeOffId, status: "approved", assetStatus: "lost" });
    } catch (err) {
      if (err instanceof AssetError) return c.json({ error: err.message }, err.httpStatus);
      if ((err as { constraint_name?: string }).constraint_name === "asset_write_offs_one_pending") {
        return c.json({ error: "A write-off for this asset is already waiting for approval." }, 409);
      }
      throw err;
    }
  });

  // Pending write-offs this person can decide: HR (where there is no solid manager to decide) and solid managers.
  routes.get("/api/v1/assets/write-offs/pending", async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const sql = getSql(c.env);
    const rows = await sql`
      SELECT wo.id, wo.asset_id, ca.asset_code, ca.name, wo.reason, wo.requested_at::text AS requested_at,
        wo.holder_id, wo.requested_by, h.first_name, h.last_name
      FROM asset_write_offs wo
      JOIN company_assets ca ON ca.id = wo.asset_id
      LEFT JOIN employees h ON h.id = wo.holder_id
      WHERE wo.company_id = ${companyId} AND wo.status = 'pending'
      ORDER BY wo.requested_at ASC
    `;
    const solid = await sql`
      SELECT employee_id, manager_id FROM reporting_lines WHERE company_id = ${companyId} AND kind = 'solid'
    `;
    const solidManager = new Map(solid.map((l) => [Number(l.employee_id), Number(l.manager_id)]));
    const results = rows
      .filter((r) =>
        canDecideWriteOff({
          deciderId: userId,
          requesterId: Number(r.requested_by),
          holderSolidManagerId: solidManager.get(Number(r.holder_id)) ?? null,
          deciderIsHr: isHr(role),
        }),
      )
      .map((r) => ({
        id: Number(r.id),
        assetId: Number(r.asset_id),
        assetCode: String(r.asset_code),
        name: String(r.name),
        reason: String(r.reason),
        requestedAt: String(r.requested_at),
        holderName: r.first_name ? `${r.first_name} ${r.last_name}` : null,
      }));
    return c.json({ results });
  });

  // Decision on a pending write-off. Approving marks the asset written off and closes the holder's assignment.
  routes.post("/api/v1/assets/write-offs/:id/decision", zValidator("json", DecisionBody), async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    const id = parseId(c.req.param("id"));
    if (id === null) return c.json({ error: "Not found" }, 404);
    const body = c.req.valid("json");
    const sql = getSql(c.env);
    try {
      await sql.begin(async (tx) => {
        const [wo] = await tx`
          SELECT id, asset_id, allocation_id, holder_id, requested_by, status
          FROM asset_write_offs WHERE id = ${id} AND company_id = ${companyId} FOR UPDATE
        `;
        if (!wo) throw new AssetError("Not found.", 404);
        if (wo.status !== "pending") throw new AssetError("This write-off has already been decided.", 409);
        const [line] = wo.holder_id
          ? await tx`SELECT manager_id FROM reporting_lines WHERE company_id = ${companyId} AND employee_id = ${wo.holder_id} AND kind = 'solid'`
          : [];
        const allowed = canDecideWriteOff({
          deciderId: userId,
          requesterId: Number(wo.requested_by),
          holderSolidManagerId: line ? Number(line.manager_id) : null,
          deciderIsHr: isHr(role),
        });
        if (!allowed) throw new AssetError("Only the holder's manager can decide this write-off.", 403);

        if (body.decision === "reject") {
          await tx`UPDATE asset_write_offs SET status = 'rejected', decided_by = ${userId}, decided_at = NOW(), decision_note = ${body.note} WHERE id = ${id}`;
          return;
        }
        // The holder may have returned the asset since the request. Then it is no longer theirs to write off.
        const [still] = wo.allocation_id
          ? await tx`SELECT id FROM asset_allocations WHERE id = ${wo.allocation_id} AND return_date IS NULL FOR UPDATE`
          : [];
        if (!still) throw new AssetError("The asset was returned before this was decided. Reject this write-off.", 409);
        await tx`UPDATE asset_allocations SET return_date = CURRENT_DATE, return_notes = ${`Written off: ${body.note || "approved"}`} WHERE id = ${still.id}`;
        await tx`UPDATE company_assets SET status = 'lost' WHERE id = ${wo.asset_id}`;
        await tx`UPDATE asset_write_offs SET status = 'approved', decided_by = ${userId}, decided_at = NOW(), decision_note = ${body.note} WHERE id = ${id}`;
      });
    } catch (err) {
      if (err instanceof AssetError) return c.json({ error: err.message }, err.httpStatus);
      throw err;
    }
    return c.json({ id, status: body.decision === "approve" ? "approved" : "rejected" });
  });

  // Offboarding recovery tasks. HR sees and closes them. The open count is live, so the title stays true.
  routes.get("/api/v1/assets/recovery-tasks", async (c) => {
    const { companyId, role } = c.get("tenant");
    if (!isHr(role)) return c.json({ error: "Forbidden" }, 403);
    const rows = await getSql(c.env)`
      SELECT t.id, t.status, t.opened_at::text AS opened_at, t.closed_at::text AS closed_at, t.close_note,
        e.first_name, e.last_name,
        (SELECT COUNT(*)::int FROM asset_allocations aa
          WHERE aa.company_id = t.company_id AND aa.employee_id = t.employee_id AND aa.return_date IS NULL) AS open_count
      FROM asset_recovery_tasks t
      JOIN employees e ON e.id = t.employee_id
      WHERE t.company_id = ${companyId}
      ORDER BY (t.status = 'open') DESC, t.opened_at DESC
      LIMIT 100
    `;
    return c.json({
      results: rows.map((r) => ({
        id: Number(r.id),
        status: String(r.status),
        title: recoveryTaskTitle(Number(r.open_count), `${r.first_name} ${r.last_name}`),
        openAssetCount: Number(r.open_count),
        openedAt: String(r.opened_at),
        closedAt: r.closed_at ? String(r.closed_at) : null,
        closeNote: String(r.close_note),
      })),
    });
  });

  routes.post("/api/v1/assets/recovery-tasks/:id/close", zValidator("json", CloseTaskBody), async (c) => {
    const { companyId, userId, role } = c.get("tenant");
    if (!isHr(role)) return c.json({ error: "Only HR can close recovery tasks." }, 403);
    const id = parseId(c.req.param("id"));
    if (id === null) return c.json({ error: "Not found" }, 404);
    const body = c.req.valid("json");
    try {
      await getSql(c.env).begin(async (tx) => {
        const [task] = await tx`SELECT employee_id, status FROM asset_recovery_tasks WHERE id = ${id} AND company_id = ${companyId} FOR UPDATE`;
        if (!task) throw new AssetError("Not found.", 404);
        if (task.status !== "open") throw new AssetError("This task is already closed.", 409);
        const [{ n }] = await tx`
          SELECT COUNT(*)::int AS n FROM asset_allocations
          WHERE company_id = ${companyId} AND employee_id = ${task.employee_id} AND return_date IS NULL
        `;
        const problem = recoveryCloseError(Number(n), body.note);
        if (problem) throw new AssetError(problem, 422);
        await tx`UPDATE asset_recovery_tasks SET status = 'closed', closed_by = ${userId}, closed_at = NOW(), close_note = ${body.note} WHERE id = ${id}`;
      });
    } catch (err) {
      if (err instanceof AssetError) return c.json({ error: err.message }, err.httpStatus);
      throw err;
    }
    return c.json({ id, status: "closed" });
  });

  // Manager view, read only: open assignments of direct (solid) reports.
  routes.get("/api/v1/assets/team", async (c) => {
    const { companyId, userId } = c.get("tenant");
    const sql = getSql(c.env);
    const lines = await sql`
      SELECT employee_id, manager_id, kind FROM reporting_lines
      WHERE company_id = ${companyId} AND manager_id = ${userId} AND kind = 'solid'
    `;
    if (lines.length === 0) return c.json({ results: [] });
    const open = await openAssignments(sql, companyId, DEFAULT_OVERDUE_DAYS);
    const mine = teamAssignments(
      lines.map((l) => ({ employeeId: Number(l.employee_id), managerId: Number(l.manager_id), kind: String(l.kind) })),
      userId,
      open,
    );
    return c.json({
      results: mine.map((a) => ({
        assetId: a.assetId,
        assetCode: a.assetCode,
        name: a.name,
        employeeId: a.employeeId,
        employeeName: a.employeeName,
        allocatedDate: a.allocatedDate,
        daysHeld: a.daysHeld,
      })),
    });
  });

  // CSV exports (HR). Built on the same rules as the JSON routes.
  routes.get("/api/v1/assets/overdue.csv", async (c) => {
    const { companyId, role } = c.get("tenant");
    if (!isHr(role)) return c.json({ error: "Forbidden" }, 403);
    const days = daysParam(c.req.query("days"));
    const rows = await overdueAssets(getSql(c.env), companyId, days);
    const body = toCsv(
      ["Asset code", "Name", "Holder", "Assigned", "Days held", "Threshold days"],
      rows.map((r) => [r.assetCode, r.name, r.employeeName, r.allocatedDate, r.daysHeld, r.thresholdDays]),
    );
    return csvResponse(c, "assets-overdue.csv", body);
  });

  routes.get("/api/v1/assets/export.csv", async (c) => {
    const { companyId, role } = c.get("tenant");
    if (!isHr(role)) return c.json({ error: "Forbidden" }, 403);
    const rows = await getSql(c.env)`
      SELECT ca.asset_code, ca.name, ac.name AS category_name, ca.serial_number, ca.status, ca.asset_condition,
        e.first_name, e.last_name, ca.purchase_date::text AS purchase_date, ca.purchase_price::text AS purchase_price,
        ca.warranty_expiry::text AS warranty_expiry, ca.notes
      FROM company_assets ca
      LEFT JOIN asset_categories ac ON ac.id = ca.category_id
      LEFT JOIN asset_allocations aa ON aa.asset_id = ca.id AND aa.return_date IS NULL
      LEFT JOIN employees e ON e.id = aa.employee_id
      WHERE ca.company_id = ${companyId}
      ORDER BY ca.id ASC
    `;
    const body = toCsv(
      ["Asset code", "Name", "Category", "Serial number", "Status", "Condition", "Holder", "Purchase date", "Purchase price", "Warranty expiry", "Notes"],
      rows.map((r) => [
        r.asset_code,
        r.name,
        r.category_name,
        r.serial_number,
        r.status,
        r.asset_condition,
        r.first_name ? `${r.first_name} ${r.last_name}` : "",
        r.purchase_date,
        r.purchase_price,
        r.warranty_expiry,
        r.notes,
      ]),
    );
    return csvResponse(c, "assets-register.csv", body);
  });

  return routes;
}

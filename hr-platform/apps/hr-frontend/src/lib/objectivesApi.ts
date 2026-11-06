import {
  canAmend,
  canDecideObjectives,
  canDeleteObjective,
  canEditObjective,
  canUpdateProgress,
  checkWeights,
  isDecider,
  isHr,
  MAX_OBJECTIVES,
  objectivesOpen,
  validateObjective,
  type AccessRole,
  type ObjectiveStatus,
} from "@hr-platform/shared";
import { DEMO_STAFF } from "../data/demoData";

// One interface for the Objectives screens, with two implementations: the real API (through the same-origin
// proxy at /api/objectives/*, which attaches the httpOnly session token) and an in-memory demo used when there is
// no real session. Both apply the same rules from @hr-platform/shared. The real API also enforces the lock in
// the database; the demo only mirrors the rules.

export interface CycleInfo {
  id: number;
  title: string;
  status: string;
  /** True while goals can still be set (the cycle is configured, approved or active). */
  open: boolean;
}

export interface ObjectiveView {
  id: number;
  employeeId: number;
  employeeName?: string;
  department?: string | null;
  title: string;
  weight: number;
  target: string;
  metric: string;
  status: ObjectiveStatus;
  progress: number;
  locked: boolean;
}

export interface ObjectiveFields {
  title: string;
  weight: number;
  target: string;
  metric: string;
}

export interface AmendmentView {
  id: number;
  objectiveTitle: string | null;
  owner: string | null;
  amendedBy: string | null;
  reason: string;
  before: Partial<ObjectiveFields>;
  after: Partial<ObjectiveFields>;
  createdAt: string;
}

export type Result = { ok: true } | { ok: false; error: string };
export interface Listing {
  cycle: CycleInfo | null;
  results: ObjectiveView[];
}

export interface ObjectivesApi {
  me(): Promise<{ cycle: CycleInfo | null; objectives: ObjectiveView[] }>;
  create(cycleId: number, fields: ObjectiveFields): Promise<Result>;
  update(id: number, fields: ObjectiveFields): Promise<Result>;
  remove(id: number): Promise<Result>;
  submit(cycleId: number): Promise<Result>;
  progress(id: number, value: number): Promise<Result>;
  pending(): Promise<Listing>;
  decide(cycleId: number, employeeId: number, decision: "approve" | "return"): Promise<Result>;
  all(): Promise<Listing>;
  amend(id: number, change: Partial<ObjectiveFields> & { reason: string }): Promise<Result>;
  amendments(): Promise<AmendmentView[]>;
}

// ---- Real API ----

async function call<T>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T & { error?: string } }> {
  const res = await fetch(`/api/objectives/${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  let data = {} as T & { error?: string };
  try {
    data = await res.json();
  } catch {
    // empty or non-JSON body: keep the status only
  }
  return { status: res.status, data };
}

const asResult = (r: { status: number; data: { error?: string } }): Result =>
  r.status >= 200 && r.status < 300
    ? { ok: true }
    : { ok: false, error: r.data.error ?? (r.status === 401 ? "Your session has expired. Sign in again." : "Something went wrong. Try again.") };

async function load<T>(path: string, what: string): Promise<T> {
  const r = await call<T>("GET", path);
  if (r.status !== 200) throw new Error(r.data.error ?? `Could not load ${what} (${r.status}).`);
  return r.data;
}

export const httpObjectivesApi: ObjectivesApi = {
  me: () => load("me", "your objectives"),
  create: async (cycleId, fields) => asResult(await call("POST", "create", { cycleId, ...fields })),
  update: async (id, fields) => asResult(await call("POST", `${id}/update`, fields)),
  remove: async (id) => asResult(await call("POST", `${id}/delete`, {})),
  submit: async (cycleId) => asResult(await call("POST", "submit", { cycleId })),
  progress: async (id, value) => asResult(await call("POST", `${id}/progress`, { progress: value })),
  pending: () => load("pending", "approvals"),
  decide: async (cycleId, employeeId, decision) => asResult(await call("POST", "decision", { cycleId, employeeId, decision })),
  all: () => load("all", "objectives"),
  amend: async (id, change) => asResult(await call("POST", `${id}/amend`, change)),
  amendments: async () => (await load<{ results: AmendmentView[] }>("amendments", "amendments")).results,
};

// ---- In-memory demo ----

const CYCLE: CycleInfo = { id: 1, title: "FY2026 Q1 OKR & Advisory Cycle", status: "active", open: objectivesOpen("active") };
const staffId = (id: string) => Number(id.replace(/\D/g, ""));
const staffOf = (employeeId: number) => DEMO_STAFF.find((s) => staffId(s.id) === employeeId);

export function createMemoryObjectivesApi(actor: { userId: number; role: AccessRole }): ObjectivesApi {
  let nextId = 100;
  const make = (employeeId: number, title: string, weight: number, status: ObjectiveStatus, target = "", metric = ""): ObjectiveView => ({
    id: nextId++,
    employeeId,
    title,
    weight,
    target,
    metric,
    status,
    progress: status === "approved" ? 20 : 0,
    locked: status === "approved",
  });
  const rows: ObjectiveView[] = [
    make(4, "Grow advisory pipeline", 60, "submitted", "R4m qualified", "Pipeline value"),
    make(4, "Client satisfaction", 40, "submitted", "NPS 50", "Quarterly NPS"),
    make(6, "Deliver audit programme", 70, "approved", "12 audits", "Audits closed"),
    make(6, "Mentor two juniors", 30, "approved", "2 mentees", "Mentoring sessions"),
  ];
  const amendments: AmendmentView[] = [];
  const named = (o: ObjectiveView): ObjectiveView => {
    const s = staffOf(o.employeeId);
    return { ...o, employeeName: s?.name, department: s?.department ?? null };
  };
  const pause = <T,>(v: T) => new Promise<T>((resolve) => setTimeout(() => resolve(v), 120));
  const fail = (error: string) => pause<Result>({ ok: false, error });
  const ok = () => pause<Result>({ ok: true });
  const mine = () => rows.filter((o) => o.employeeId === actor.userId);
  const find = (id: number) => rows.find((o) => o.id === id);
  const asRow = (o: ObjectiveView) => ({ id: o.id, employeeId: o.employeeId, status: o.status, weight: o.weight });

  return {
    me: () => pause({ cycle: CYCLE, objectives: mine().map((o) => ({ ...o })) }),
    create: (_cycleId, fields) => {
      if (!CYCLE.open) return fail("Goal setting is closed for this cycle.");
      const invalid = validateObjective(fields);
      if (invalid) return fail(invalid);
      if (mine().length >= MAX_OBJECTIVES) return fail(`You can set at most ${MAX_OBJECTIVES} objectives per cycle.`);
      rows.push({ ...make(actor.userId, fields.title.trim(), fields.weight, "draft", fields.target, fields.metric) });
      return ok();
    },
    update: (id, fields) => {
      const o = find(id);
      if (!o || o.employeeId !== actor.userId) return fail("Not found.");
      if (!canEditObjective(actor, asRow(o))) return fail(o.status === "approved" ? "Approved objectives are locked. Ask HR to amend it." : "Submitted objectives cannot be edited.");
      const invalid = validateObjective(fields);
      if (invalid) return fail(invalid);
      Object.assign(o, { ...fields, title: fields.title.trim(), status: "draft" as ObjectiveStatus });
      return ok();
    },
    remove: (id) => {
      const o = find(id);
      if (!o || o.employeeId !== actor.userId) return fail("Not found.");
      if (!canDeleteObjective(actor, asRow(o))) return fail(o.status === "approved" ? "Approved objectives are locked and cannot be deleted." : "Submitted objectives cannot be deleted.");
      rows.splice(rows.indexOf(o), 1);
      return ok();
    },
    submit: () => {
      const weightError = checkWeights(mine().map((o) => o.weight));
      if (weightError) return fail(weightError);
      const open = mine().filter((o) => o.status === "draft" || o.status === "returned");
      if (open.length === 0) return fail("There is nothing new to submit.");
      open.forEach((o) => (o.status = "submitted"));
      return ok();
    },
    progress: (id, value) => {
      const o = find(id);
      if (!o || o.employeeId !== actor.userId) return fail("Not found.");
      if (!canUpdateProgress(actor, asRow(o))) return fail("Progress can be recorded once an objective is approved.");
      o.progress = Math.max(0, Math.min(100, Math.round(value)));
      return ok();
    },
    pending: () => {
      if (!isDecider(actor.role)) return Promise.reject(new Error("You do not have access to approvals."));
      return pause({ cycle: CYCLE, results: rows.filter((o) => o.status === "submitted" && o.employeeId !== actor.userId).map(named) });
    },
    decide: (_cycleId, employeeId, decision) => {
      const set = rows.filter((o) => o.employeeId === employeeId && o.status === "submitted");
      // Demo has no reporting lines: a line manager is treated as the solid manager of the demo staff.
      if (set.length === 0 || !canDecideObjectives(actor, employeeId, "submitted", actor.role === "line_manager")) {
        return fail("Nothing is waiting for a decision.");
      }
      set.forEach((o) => {
        o.status = decision === "approve" ? "approved" : "returned";
        o.locked = decision === "approve";
      });
      return ok();
    },
    all: () => {
      if (!isHr(actor.role)) return Promise.reject(new Error("You do not have access to this list."));
      return pause({ cycle: CYCLE, results: rows.map(named) });
    },
    amend: (id, change) => {
      const o = find(id);
      if (!o) return fail("Not found.");
      if (!canAmend(actor, asRow(o), CYCLE.status)) return fail("Only approved objectives of other people can be amended, by HR.");
      if (change.reason.trim().length < 5) return fail("Give a reason of at least 5 characters.");
      const next: ObjectiveFields = { title: change.title ?? o.title, weight: change.weight ?? o.weight, target: change.target ?? o.target, metric: change.metric ?? o.metric };
      const invalid = validateObjective(next);
      if (invalid) return fail(invalid);
      const others = rows.filter((x) => x.employeeId === o.employeeId && x.id !== o.id).map((x) => x.weight);
      const weightError = checkWeights([...others, next.weight]);
      if (weightError) return fail(weightError);
      amendments.unshift({
        id: nextId++,
        objectiveTitle: next.title,
        owner: staffOf(o.employeeId)?.name ?? null,
        amendedBy: staffOf(actor.userId)?.name ?? "HR",
        reason: change.reason.trim(),
        before: { title: o.title, weight: o.weight, target: o.target, metric: o.metric },
        after: next,
        createdAt: new Date().toISOString(),
      });
      Object.assign(o, next, { title: next.title.trim() });
      return ok();
    },
    amendments: () => {
      if (!isHr(actor.role)) return Promise.reject(new Error("You do not have access to amendments."));
      return pause([...amendments]);
    },
  };
}

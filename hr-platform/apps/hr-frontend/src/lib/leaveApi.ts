import { canCancel, canDecide, checkDateShape, isDecider, remainingDays, validateRequest, type AccessRole } from "@hr-platform/shared";
import { DEMO_STAFF } from "../data/demoData";

// One interface for the Leave screens, with two implementations: the real API (through the same-origin proxy
// at /api/leave/*, which attaches the httpOnly session token) and an in-memory demo used when there is no
// real session. Both apply the same rules from @hr-platform/shared.

export interface LeaveBalance {
  leaveTypeId: number;
  name: string;
  total: number;
  used: number;
  pending: number;
  remaining: number;
}

export interface LeaveRequestView {
  id: number;
  employeeId: number;
  employeeName?: string;
  department?: string;
  leaveTypeId: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  reason: string;
}

export interface NewLeaveRequest {
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason: string;
  halfDay?: "morning" | "afternoon";
}

export type Result = { ok: true } | { ok: false; error: string };

export interface LeaveApi {
  me(): Promise<{ balances: LeaveBalance[]; requests: LeaveRequestView[] }>;
  create(input: NewLeaveRequest): Promise<Result>;
  cancel(id: number): Promise<Result>;
  approvals(): Promise<LeaveRequestView[]>;
  decide(id: number, decision: "approve" | "reject", comment?: string): Promise<Result>;
  calendar(): Promise<LeaveRequestView[]>;
}

// ---- Real API ----

async function call<T>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T & { error?: string } }> {
  const res = await fetch(`/api/leave/${path}`, {
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
  r.status >= 200 && r.status < 300 ? { ok: true } : { ok: false, error: r.data.error ?? (r.status === 401 ? "Your session has expired. Sign in again." : "Something went wrong. Try again.") };

export const httpLeaveApi: LeaveApi = {
  async me() {
    const r = await call<{ balances: LeaveBalance[]; requests: LeaveRequestView[] }>("GET", "me");
    if (r.status !== 200) throw new Error(r.data.error ?? `Could not load your leave (${r.status}).`);
    return r.data;
  },
  async create(input) {
    return asResult(await call("POST", "requests", input));
  },
  async cancel(id) {
    return asResult(await call("POST", `requests/${id}/cancel`, {}));
  },
  async approvals() {
    const r = await call<{ results: LeaveRequestView[] }>("GET", "approvals");
    if (r.status !== 200) throw new Error(r.data.error ?? `Could not load approvals (${r.status}).`);
    return r.data.results;
  },
  async decide(id, decision, comment) {
    return asResult(await call("POST", `requests/${id}/decision`, { decision, comment }));
  },
  async calendar() {
    const r = await call<{ results: LeaveRequestView[] }>("GET", "calendar");
    if (r.status !== 200) throw new Error(r.data.error ?? `Could not load the calendar (${r.status}).`);
    return r.data.results;
  },
};

// ---- In-memory demo ----

const TYPES = [
  { id: 1, name: "Annual Paid Leave", total: 25 },
  { id: 2, name: "Sick Leave", total: 10 },
  { id: 3, name: "Parental Leave", total: 60 },
];

const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
const staffId = (id: string) => Number(id.replace(/\D/g, ""));
const staffOf = (employeeId: number) => DEMO_STAFF.find((s) => staffId(s.id) === employeeId);

export function createMemoryLeaveApi(actor: { userId: number; role: AccessRole }): LeaveApi {
  let nextId = 100;
  const rows: LeaveRequestView[] = [
    { id: 1, employeeId: 4, leaveTypeId: 1, leaveType: TYPES[0].name, startDate: iso(1), endDate: iso(4), days: 4, status: "pending", reason: "Family event" },
    { id: 2, employeeId: 6, leaveTypeId: 1, leaveType: TYPES[0].name, startDate: iso(10), endDate: iso(14), days: 5, status: "approved", reason: "" },
    { id: 3, employeeId: 11, leaveTypeId: 2, leaveType: TYPES[1].name, startDate: iso(0), endDate: iso(1), days: 2, status: "approved", reason: "" },
    { id: 4, employeeId: actor.userId, leaveTypeId: 1, leaveType: TYPES[0].name, startDate: iso(30), endDate: iso(34), days: 5, status: "pending", reason: "Holiday" },
  ];
  const named = (r: LeaveRequestView): LeaveRequestView => {
    const s = staffOf(r.employeeId);
    return { ...r, employeeName: s?.name, department: s?.department };
  };
  const overlaps = (employeeId: number, start: string, end: string) =>
    rows.some((r) => r.employeeId === employeeId && (r.status === "pending" || r.status === "approved") && r.startDate <= end && r.endDate >= start);
  const balances = (employeeId: number): LeaveBalance[] =>
    TYPES.map((t) => {
      const mine = rows.filter((r) => r.employeeId === employeeId && r.leaveTypeId === t.id);
      const used = mine.filter((r) => r.status === "approved").reduce((n, r) => n + r.days, 0);
      const pending = mine.filter((r) => r.status === "pending").reduce((n, r) => n + r.days, 0);
      return { leaveTypeId: t.id, name: t.name, total: t.total, used, pending, remaining: remainingDays(t.total, used, pending) };
    });
  const pause = <T,>(v: T) => new Promise<T>((resolve) => setTimeout(() => resolve(v), 120));

  return {
    me: () => pause({ balances: balances(actor.userId), requests: rows.filter((r) => r.employeeId === actor.userId).map(named).sort((a, b) => b.startDate.localeCompare(a.startDate)) }),
    create: (input) => {
      const shape = checkDateShape(input.startDate, input.endDate);
      const balance = balances(actor.userId).find((b) => b.leaveTypeId === input.leaveTypeId);
      if (shape) return pause<Result>({ ok: false, error: shape });
      if (!balance) return pause<Result>({ ok: false, error: "Unknown leave type." });
      const v = validateRequest(input, { today: iso(0), holidays: new Set(), remaining: balance.remaining, overlaps: overlaps(actor.userId, input.startDate, input.endDate) });
      if (!v.ok) return pause<Result>({ ok: false, error: v.error });
      rows.push({ id: nextId++, employeeId: actor.userId, leaveTypeId: balance.leaveTypeId, leaveType: balance.name, startDate: input.startDate, endDate: input.endDate, days: v.days, status: "pending", reason: input.reason });
      return pause<Result>({ ok: true });
    },
    cancel: (id) => {
      const r = rows.find((x) => x.id === id);
      if (!r || !canCancel(actor, r)) return pause<Result>({ ok: false, error: "Only your own pending requests can be cancelled." });
      r.status = "cancelled";
      return pause<Result>({ ok: true });
    },
    approvals: () => {
      if (!isDecider(actor.role)) return Promise.reject(new Error("You do not have access to approvals."));
      return pause(rows.filter((r) => r.status === "pending" && r.employeeId !== actor.userId).map(named));
    },
    decide: (id, decision) => {
      const r = rows.find((x) => x.id === id);
      // Demo has no reporting lines: a line manager is treated as the solid manager of the demo staff.
      if (!r || !canDecide(actor, r, actor.role === "line_manager")) return pause<Result>({ ok: false, error: "This request can no longer be decided." });
      r.status = decision === "approve" ? "approved" : "rejected";
      return pause<Result>({ ok: true });
    },
    calendar: () => {
      if (!isDecider(actor.role)) return Promise.reject(new Error("You do not have access to the calendar."));
      return pause(rows.filter((r) => r.status === "approved" && r.endDate >= iso(0)).map(named).sort((a, b) => a.startDate.localeCompare(b.startDate)));
    },
  };
}

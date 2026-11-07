"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { countWorkingDays, isDecider, type AccessRole } from "@hr-platform/shared";
import { createMemoryLeaveApi, httpLeaveApi, type LeaveApi, type LeaveBalance, type LeaveRequestView } from "../../lib/leaveApi";

// Plain Leave screens: My leave, Request leave, Approvals, Team calendar. Standard controls, text status
// labels, no decoration. Visual language matches PlainShell.

type Tab = "mine" | "request" | "approvals" | "calendar" | "company" | "trips" | "plan" | "holidays" | "types";

interface LeaveSimpleProps {
  api: LeaveApi;
  user: { userId: number; role: AccessRole };
}

const C = { text: "#1f2937", muted: "#4b5563", border: "#d1d5db", surface: "#ffffff", page: "#f9fafb", accent: "#1d4ed8", danger: "#b91c1c", ok: "#166534", warn: "#92400e" };

const S = {
  page: { padding: "1.5rem", maxWidth: "1100px" } as React.CSSProperties,
  h1: { margin: "0 0 1rem", fontSize: "22px" } as React.CSSProperties,
  h2: { margin: "1.5rem 0 0.5rem", fontSize: "17px" } as React.CSSProperties,
  tabs: { display: "flex", gap: "0.25rem", flexWrap: "wrap", borderBottom: `1px solid ${C.border}`, marginBottom: "1rem" } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse", background: C.surface, border: `1px solid ${C.border}` } as React.CSSProperties,
  th: { textAlign: "left", padding: "0.6rem 0.75rem", borderBottom: `1px solid ${C.border}`, background: C.page, fontWeight: 600 } as React.CSSProperties,
  td: { padding: "0.6rem 0.75rem", borderBottom: `1px solid ${C.border}`, verticalAlign: "top" } as React.CSSProperties,
  btn: { minHeight: "40px", padding: "0 0.9rem", border: `1px solid ${C.border}`, borderRadius: "4px", background: C.surface, color: C.text, font: "inherit", cursor: "pointer" } as React.CSSProperties,
  primary: { minHeight: "44px", padding: "0 1.2rem", border: `1px solid ${C.accent}`, borderRadius: "4px", background: C.accent, color: "#ffffff", font: "inherit", cursor: "pointer" } as React.CSSProperties,
  field: { display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "1rem" } as React.CSSProperties,
  input: { minHeight: "40px", padding: "0.4rem 0.6rem", border: `1px solid ${C.border}`, borderRadius: "4px", font: "inherit", background: C.surface } as React.CSSProperties,
  note: { color: C.muted, margin: "0.25rem 0 0" } as React.CSSProperties,
};

const STATUS_COLOR: Record<string, string> = { pending: C.warn, approved: C.ok, rejected: C.danger, cancelled: C.muted };
const STATUS_LABEL: Record<string, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled" };

function Status({ value }: { value: string }) {
  const color = STATUS_COLOR[value] ?? C.muted;
  return (
    <span style={{ display: "inline-block", padding: "0.1rem 0.5rem", border: `1px solid ${color}`, borderRadius: "3px", color, fontWeight: 600 }}>
      {STATUS_LABEL[value] ?? value}
    </span>
  );
}

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const range = (r: { startDate: string; endDate: string }) => (r.startDate === r.endDate ? fmt(r.startDate) : `${fmt(r.startDate)} to ${fmt(r.endDate)}`);

function useLoad<T>(load: () => Promise<T>, deps: React.DependencyList) {
  const [state, setState] = useState<{ data: T | null; error: string; loading: boolean }>({ data: null, error: "", loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: "" }));
    load()
      .then((data) => !cancelled && setState({ data, error: "", loading: false }))
      .catch((e: unknown) => !cancelled && setState({ data: null, error: e instanceof Error ? e.message : "Could not load.", loading: false }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((n) => n + 1) };
}

function LoadState({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return <p role="status">Loading…</p>;
  if (error) return <p role="alert" style={{ color: C.danger }}>{error}</p>;
  return null;
}

/**
 * Picks the data source for the signed-in user: the real API for a real session (numeric database id),
 * or the in-memory demo for the demo login (ids like "EMP-001"). Remounts when the user changes.
 */
export const LeaveScreen: React.FC<{ user: { id: string; persona: AccessRole }; realSession: boolean }> = ({ user, realSession }) => {
  const userId = Number(user.id.replace(/\D/g, "")) || 0;
  const api = useMemo(
    () => (realSession ? httpLeaveApi : createMemoryLeaveApi({ userId, role: user.persona })),
    [realSession, userId, user.persona]
  );
  return <LeaveSimple key={`${realSession}-${user.id}-${user.persona}`} api={api} user={{ userId, role: user.persona }} />;
};

export const LeaveSimple: React.FC<LeaveSimpleProps> = ({ api, user }) => {
  const decider = isDecider(user.role);
  const [tab, setTab] = useState<Tab>("mine");
  const [message, setMessage] = useState("");
  const tabs: { key: Tab; label: string }[] = [
    { key: "mine", label: "My leave" },
    { key: "request", label: "Request leave" },
    { key: "calendar", label: "Team and company leave" },
    { key: "trips", label: "Business trips" },
    { key: "plan", label: "Annual plan" },
    ...(decider ? ([{ key: "approvals", label: "Approvals" }] as { key: Tab; label: string }[]) : []),
    ...(user.role === "hr_admin" || user.role === "hr_director"
      ? ([{ key: "holidays", label: "Holidays" }, { key: "types", label: "Leave types" }] as { key: Tab; label: string }[])
      : []),
  ];

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Leave</h1>
      <div role="tablist" aria-label="Leave sections" style={S.tabs}>
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            onClick={() => {
              setTab(t.key);
              setMessage("");
            }}
            style={{ ...S.btn, border: "none", borderBottom: `3px solid ${tab === t.key ? C.accent : "transparent"}`, borderRadius: 0, fontWeight: tab === t.key ? 700 : 400, color: tab === t.key ? C.accent : C.text }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {message && <p role="status" style={{ color: C.ok, fontWeight: 600 }}>{message}</p>}

      {tab === "mine" && <MyLeave api={api} onRequest={() => setTab("request")} />}
      {tab === "request" && (
        <RequestForm
          api={api}
          onDone={() => {
            setMessage("Request submitted. It is now pending approval.");
            setTab("mine");
          }}
        />
      )}
      {tab === "approvals" && decider && <Approvals api={api} />}
      {tab === "calendar" && <TeamLeavePage />}
      {tab === "trips" && <TripsPanel canDecide={decider} />}
      {tab === "plan" && <PlanPanel isHr={user.role === "hr_admin" || user.role === "hr_director"} />}
      {tab === "holidays" && (user.role === "hr_admin" || user.role === "hr_director") && <Holidays />}
      {tab === "types" && (user.role === "hr_admin" || user.role === "hr_director") && (
        <>
          <LeaveTypes />
          <div style={{ marginTop: "2rem" }}>
            <BalanceAdjust />
          </div>
        </>
      )}
    </div>
  );
};

// Evidence for a pending request: attach a JPEG, PNG or PDF (doctor's note or photo), and see what is attached.
function EvidenceControl({ requestId }: { requestId: number }) {
  const [files, setFiles] = useState<{ id: number; contentType: string; sizeBytes: number }[]>([]);
  const [message, setMessage] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/leave/requests/${requestId}/evidence`, { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => !cancelled && setFiles(b.results ?? []))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [requestId, tick]);

  const upload = async (file: File) => {
    setMessage("Uploading…");
    const r = await fetch(`/api/leave/requests/${requestId}/evidence`, { method: "POST", headers: { "Content-Type": file.type }, body: file });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return setMessage(body.error ?? "Upload failed.");
    setMessage("Attached.");
    setTick((n) => n + 1);
  };

  return (
    <div style={{ marginTop: "0.4rem", fontSize: "13px" }}>
      <label>
        Attach evidence (JPEG, PNG or PDF, up to 5 MB)
        <input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      </label>
      {message && <p role="status" style={{ margin: "0.25rem 0", color: C.muted }}>{message}</p>}
      {files.map((f) => (
        <div key={f.id}>
          <a href={`/api/leave/evidence/${f.id}`} download style={{ color: C.accent }}>Evidence {f.id} ({Math.max(1, Math.round(f.sizeBytes / 1024))} KB)</a>
        </div>
      ))}
    </div>
  );
}

function MyLeave({ api, onRequest }: { api: LeaveApi; onRequest: () => void }) {
  const { data, error, loading, reload } = useLoad(() => api.me(), [api]);
  const [busy, setBusy] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");

  const cancel = async (id: number) => {
    setBusy(id);
    setActionError("");
    const r = await api.cancel(id);
    setBusy(null);
    if (!r.ok) setActionError(r.error);
    reload();
  };

  return (
    <>
      <LoadState loading={loading && !data} error={error} />
      {data && (
        <>
          <h2 style={{ ...S.h2, marginTop: 0 }}>Balances</h2>
          <table style={S.table}>
            <caption style={{ textAlign: "left", position: "absolute", left: "-9999px" }}>Leave balances for this year</caption>
            <thead>
              <tr>{["Leave type", "Entitlement", "Taken", "Pending", "Remaining"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.balances.map((b: LeaveBalance) => (
                <tr key={b.leaveTypeId}>
                  <th scope="row" style={{ ...S.td, textAlign: "left", fontWeight: 600 }}>{b.name}</th>
                  <td style={S.td}>{b.total} days</td>
                  <td style={S.td}>{b.used}</td>
                  <td style={S.td}>{b.pending}</td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{b.remaining} days</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <h2 style={S.h2}>My requests</h2>
            <button type="button" style={S.primary} onClick={onRequest}>Request leave</button>
          </div>
          {actionError && <p role="alert" style={{ color: C.danger }}>{actionError}</p>}
          {data.requests.length === 0 ? (
            <p style={S.note}>You have no leave requests yet.</p>
          ) : (
            <table style={S.table}>
              <caption style={{ textAlign: "left", position: "absolute", left: "-9999px" }}>My leave requests</caption>
              <thead>
                <tr>{["Dates", "Type", "Days", "Status", "Reason", "Action"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {data.requests.map((r) => (
                  <tr key={r.id}>
                    <td style={S.td}>{range(r)}</td>
                    <td style={S.td}>{r.leaveType}</td>
                    <td style={S.td}>{r.days}</td>
                    <td style={S.td}><Status value={r.status} /></td>
                    <td style={S.td}>{r.reason || "-"}</td>
                    <td style={S.td}>
                      {r.status === "pending" && (
                        <button type="button" style={S.btn} disabled={busy === r.id} onClick={() => cancel(r.id)} aria-label={`Cancel request for ${range(r)}`}>
                          {busy === r.id ? "Cancelling…" : "Cancel"}
                        </button>
                      )}
                      {r.status === "pending" && <EvidenceControl requestId={r.id} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </>
  );
}

function RequestForm({ api, onDone }: { api: LeaveApi; onDone: () => void }) {
  const { data, error, loading } = useLoad(() => api.me(), [api]);
  const [typeId, setTypeId] = useState<number | "">("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [half, setHalf] = useState(false);
  const [halfPeriod, setHalfPeriod] = useState<"morning" | "afternoon">("morning");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (data && typeId === "") setTypeId(data.balances[0]?.leaveTypeId ?? "");
  }, [data, typeId]);

  const balance = data?.balances.find((b) => b.leaveTypeId === typeId);
  const estimate = useMemo(() => (start && end && end >= start ? countWorkingDays(start, end, new Set()) : null), [start, end]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeId === "") return;
    setSubmitting(true);
    setFormError("");
    const r = await api.create({
      leaveTypeId: typeId,
      startDate: start,
      endDate: half ? start : end,
      reason: reason.trim(),
      ...(half ? { halfDay: halfPeriod } : {}),
    });
    setSubmitting(false);
    if (r.ok) onDone();
    else setFormError(r.error);
  };

  return (
    <>
      <LoadState loading={loading && !data} error={error} />
      {data && (
        <form onSubmit={submit} style={{ maxWidth: "520px" }}>
          <h2 style={{ ...S.h2, marginTop: 0 }}>Request leave</h2>
          <label style={S.field}>
            Leave type *
            <select required value={typeId} onChange={(e) => setTypeId(Number(e.target.value))} style={S.input}>
              {data.balances.map((b) => (
                <option key={b.leaveTypeId} value={b.leaveTypeId}>{b.name} ({b.remaining} days left)</option>
              ))}
            </select>
          </label>
          <label style={S.field}>
            Start date *
            <input required type="date" value={start} onChange={(e) => setStart(e.target.value)} style={S.input} />
          </label>
          <label style={{ ...S.field, flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
            <input type="checkbox" checked={half} onChange={(e) => setHalf(e.target.checked)} />
            Half day (one working day, counted as 0.5)
          </label>
          {half && (
            <label style={S.field}>
              Which half *
              <select value={halfPeriod} onChange={(e) => setHalfPeriod(e.target.value as "morning" | "afternoon")} style={S.input}>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
              </select>
            </label>
          )}
          {!half && (
            <label style={S.field}>
              End date *
              <input required type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} style={S.input} />
            </label>
          )}
          {half && start && balance && (
            <p style={{ ...S.note, marginBottom: "1rem" }} aria-live="polite">
              Half day: 0.5 days. Balance after: {balance.remaining - 0.5} days.
            </p>
          )}
          {!half && estimate !== null && balance && (
            <p style={{ ...S.note, marginBottom: "1rem" }} aria-live="polite">
              About {estimate} working {estimate === 1 ? "day" : "days"} (weekends excluded; public holidays are taken off when you submit). Balance after: {balance.remaining - estimate} days.
            </p>
          )}
          <label style={S.field}>
            Reason (optional)
            <textarea value={reason} maxLength={500} rows={3} onChange={(e) => setReason(e.target.value)} style={{ ...S.input, minHeight: "80px" }} />
          </label>
          {formError && <p role="alert" style={{ color: C.danger, fontWeight: 600 }}>{formError}</p>}
          <button type="submit" style={S.primary} disabled={submitting}>{submitting ? "Submitting…" : "Submit request"}</button>
        </form>
      )}
    </>
  );
}

function Approvals({ api }: { api: LeaveApi }) {
  const { data, error, loading, reload } = useLoad(() => api.approvals(), [api]);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");

  const decide = useCallback(
    async (id: number, decision: "approve" | "reject", comment?: string) => {
      setBusy(id);
      setActionError("");
      const r = await api.decide(id, decision, comment);
      setBusy(null);
      setConfirming(null);
      setReason("");
      if (!r.ok) setActionError(r.error);
      reload();
    },
    [api, reload]
  );

  return (
    <>
      <h2 style={{ ...S.h2, marginTop: 0 }}>Approvals {data ? `(${data.length} pending)` : ""}</h2>
      <LoadState loading={loading && !data} error={error} />
      {actionError && <p role="alert" style={{ color: C.danger }}>{actionError}</p>}
      {data && data.length === 0 && <p style={S.note}>Nothing is waiting for approval.</p>}
      {data && data.length > 0 && (
        <table style={S.table}>
          <caption style={{ textAlign: "left", position: "absolute", left: "-9999px" }}>Pending leave requests</caption>
          <thead>
            <tr>{["Employee", "Dates", "Type", "Days", "Reason", "Action"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.map((r: LeaveRequestView) => (
              <tr key={r.id}>
                <td style={S.td}>
                  <strong>{r.employeeName ?? `Employee ${r.employeeId}`}</strong>
                  {r.department && <div style={{ color: C.muted }}>{r.department}</div>}
                </td>
                <td style={S.td}>{range(r)}</td>
                <td style={S.td}>{r.leaveType}</td>
                <td style={S.td}>{r.days}</td>
                <td style={S.td}>{r.reason || "-"}</td>
                <td style={S.td}>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button type="button" style={S.primary} disabled={busy === r.id} onClick={() => decide(r.id, "approve")} aria-label={`Approve ${r.employeeName ?? "request"} ${range(r)}`}>
                      Approve
                    </button>
                    {confirming === r.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", minWidth: "220px" }}>
                        <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                          Reason for rejecting (required)
                          <textarea rows={2} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} style={S.input} />
                        </label>
                        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                          <button type="button" style={{ ...S.btn, borderColor: C.danger, color: C.danger }} disabled={busy === r.id || reason.trim().length < 3} onClick={() => decide(r.id, "reject", reason.trim())}>
                            Confirm reject
                          </button>
                          <button type="button" style={S.btn} onClick={() => { setConfirming(null); setReason(""); }}>Keep pending</button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" style={S.btn} onClick={() => setConfirming(r.id)} aria-label={`Reject ${r.employeeName ?? "request"} ${range(r)}`}>
                        Reject
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function Calendar({ api }: { api: LeaveApi }) {
  const { data, error, loading } = useLoad(() => api.calendar(), [api]);
  return (
    <>
      <h2 style={{ ...S.h2, marginTop: 0 }}>Team calendar: approved leave from today</h2>
      <LoadState loading={loading && !data} error={error} />
      {data && data.length === 0 && <p style={S.note}>No approved leave is coming up.</p>}
      {data && data.length > 0 && (
        <table style={S.table}>
          <caption style={{ textAlign: "left", position: "absolute", left: "-9999px" }}>Approved upcoming leave</caption>
          <thead>
            <tr>{["Employee", "Department", "Dates", "Type", "Days"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id}>
                <td style={S.td}><strong>{r.employeeName ?? `Employee ${r.employeeId}`}</strong></td>
                <td style={S.td}>{r.department ?? "-"}</td>
                <td style={S.td}>{range(r)}</td>
                <td style={S.td}>{r.leaveType}</td>
                <td style={S.td}>{r.days}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

// Company holidays. HR adds and removes them; working-day counts skip them on the next request.
function Holidays() {
  const [rows, setRows] = useState<{ id: number; name: string; date: string }[]>([]);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/hr/holidays", { cache: "no-store" })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error ?? "Could not load holidays.");
        if (!cancelled) setRows(body.results ?? []);
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Could not load holidays."));
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await fetch("/api/hr/holidays", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, date }) });
    const body = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setError(body.error ?? "Could not add the holiday.");
    setName("");
    setDate("");
    setTick((n) => n + 1);
  };

  const remove = async (id: number) => {
    setBusy(true);
    setError("");
    const r = await fetch(`/api/hr/holidays/${id}/delete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    setBusy(false);
    if (!r.ok) return setError("Could not remove the holiday.");
    setTick((n) => n + 1);
  };

  return (
    <>
      <h2 style={{ ...S.h2, marginTop: 0 }}>Company holidays</h2>
      <p style={S.note}>Holidays on weekdays are not counted as leave days.</p>
      {error && <p role="alert" style={{ color: C.danger }}>{error}</p>}
      {rows.length === 0 ? (
        <p style={S.note}>No holidays yet.</p>
      ) : (
        <table style={S.table}>
          <caption style={{ textAlign: "left", position: "absolute", left: "-9999px" }}>Company holidays</caption>
          <thead>
            <tr>{["Date", "Holiday", "Action"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.id}>
                <td style={S.td}>{fmt(h.date)}</td>
                <td style={S.td}>{h.name}</td>
                <td style={S.td}><button type="button" style={S.btn} disabled={busy} onClick={() => remove(h.id)} aria-label={`Remove ${h.name}`}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form onSubmit={add} style={{ maxWidth: "420px", marginTop: "1rem" }}>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "16px" }}>Add a holiday</h3>
        <label style={S.field}>Name *<input required minLength={2} maxLength={255} value={name} onChange={(e) => setName(e.target.value)} style={S.input} /></label>
        <label style={S.field}>Date *<input required type="date" value={date} onChange={(e) => setDate(e.target.value)} style={S.input} /></label>
        <button type="submit" style={S.primary} disabled={busy}>{busy ? "Saving…" : "Add holiday"}</button>
      </form>
    </>
  );
}

// Business trips: request one, see your own, and (for managers and HR) decide the pending ones. An approved trip shows
// on the team and company views as "Travel". Trips do not use leave balances.
interface TripMine {
  id: number;
  destination: string;
  startDate: string;
  endDate: string;
  status: string;
  decisionComment: string | null;
}
interface TripPending {
  id: number;
  destination: string;
  startDate: string;
  endDate: string;
  employeeName: string;
  department: string | null;
}

function TripsPanel({ canDecide }: { canDecide: boolean }) {
  const [mine, setMine] = useState<TripMine[]>([]);
  const [pending, setPending] = useState<TripPending[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [draft, setDraft] = useState({ destination: "", purpose: "", startDate: "", endDate: "" });
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/leave/trips/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => !cancelled && setMine(b.results ?? []))
      .catch(() => !cancelled && setError("Could not load your trips."));
    if (canDecide) {
      fetch("/api/leave/trips/pending", { cache: "no-store" })
        .then((r) => r.json())
        .then((b) => !cancelled && setPending(b.results ?? []))
        .catch(() => !cancelled && setError("Could not load trips to approve."));
    }
    return () => {
      cancelled = true;
    };
  }, [canDecide, tick]);

  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await fetch("/api/leave/trips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    const body = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setError(body.error ?? "Could not request the trip.");
    setDraft({ destination: "", purpose: "", startDate: "", endDate: "" });
    setTick((n) => n + 1);
  };

  const decide = async (id: number, decision: "approve" | "reject", comment?: string) => {
    setBusy(true);
    setError("");
    const r = await fetch(`/api/leave/trips/${id}/decision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, comment }) });
    const body = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setError(body.error ?? "Could not record the decision.");
    setRejecting(null);
    setReason("");
    setTick((n) => n + 1);
  };

  const cancel = async (id: number) => {
    setBusy(true);
    const r = await fetch(`/api/leave/trips/${id}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    setBusy(false);
    if (!r.ok) return setError("Only pending trips can be cancelled.");
    setTick((n) => n + 1);
  };

  return (
    <>
      <h2 style={{ ...S.h2, marginTop: 0 }}>Request a business trip</h2>
      {error && <p role="alert" style={{ color: C.danger }}>{error}</p>}
      <form onSubmit={request} style={{ maxWidth: "520px" }}>
        <label style={S.field}>Destination *<input required minLength={2} maxLength={200} value={draft.destination} onChange={(e) => setDraft({ ...draft, destination: e.target.value })} style={S.input} /></label>
        <label style={S.field}>Purpose<textarea maxLength={1000} rows={2} value={draft.purpose} onChange={(e) => setDraft({ ...draft, purpose: e.target.value })} style={{ ...S.input, minHeight: "70px" }} /></label>
        <label style={S.field}>Start date *<input required type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} style={S.input} /></label>
        <label style={S.field}>End date *<input required type="date" value={draft.endDate} min={draft.startDate || undefined} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} style={S.input} /></label>
        <button type="submit" style={S.primary} disabled={busy}>{busy ? "Sending…" : "Request trip"}</button>
      </form>

      <h2 style={S.h2}>My trips</h2>
      {mine.length === 0 ? (
        <p style={S.note}>You have no trips yet.</p>
      ) : (
        <table style={S.table}>
          <caption style={{ textAlign: "left", position: "absolute", left: "-9999px" }}>My trips</caption>
          <thead>
            <tr>{["Destination", "Dates", "Status", "Action"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {mine.map((t) => (
              <tr key={t.id}>
                <td style={S.td}>{t.destination}</td>
                <td style={S.td}>{t.startDate === t.endDate ? fmt(t.startDate) : `${fmt(t.startDate)} to ${fmt(t.endDate)}`}</td>
                <td style={S.td}><Status value={t.status} />{t.decisionComment ? <div style={{ color: C.muted }}>{t.decisionComment}</div> : null}</td>
                <td style={S.td}>{t.status === "pending" && <button type="button" style={S.btn} disabled={busy} onClick={() => cancel(t.id)}>Cancel</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canDecide && (
        <>
          <h2 style={S.h2}>Trips to approve</h2>
          {pending.length === 0 ? (
            <p style={S.note}>No trips are waiting for approval.</p>
          ) : (
            <table style={S.table}>
              <caption style={{ textAlign: "left", position: "absolute", left: "-9999px" }}>Trips to approve</caption>
              <thead>
                <tr>{["Employee", "Destination", "Dates", "Action"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {pending.map((t) => (
                  <tr key={t.id}>
                    <td style={S.td}><strong>{t.employeeName}</strong>{t.department ? <div style={{ color: C.muted }}>{t.department}</div> : null}</td>
                    <td style={S.td}>{t.destination}</td>
                    <td style={S.td}>{t.startDate === t.endDate ? fmt(t.startDate) : `${fmt(t.startDate)} to ${fmt(t.endDate)}`}</td>
                    <td style={S.td}>
                      {rejecting === t.id ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", minWidth: "220px" }}>
                          <textarea rows={2} maxLength={1000} placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} style={S.input} />
                          <div style={{ display: "flex", gap: "0.4rem" }}>
                            <button type="button" style={{ ...S.btn, borderColor: C.danger, color: C.danger }} disabled={busy || reason.trim().length < 3} onClick={() => decide(t.id, "reject", reason.trim())}>Confirm reject</button>
                            <button type="button" style={S.btn} onClick={() => { setRejecting(null); setReason(""); }}>Keep pending</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                          <button type="button" style={S.primary} disabled={busy} onClick={() => decide(t.id, "approve")}>Approve</button>
                          <button type="button" style={S.btn} disabled={busy} onClick={() => setRejecting(t.id)}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </>
  );
}

// Annual leave plan. Plan absences at least six weeks ahead. HR approves no later than six weeks before the start.
// An entry still unapproved at that point goes back to the manager.
interface PlanEntry {
  id: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  deadline: string;
  decisionComment: string | null;
}
interface PlanWaiting {
  id: number;
  employeeName: string;
  department: string | null;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  deadline: string;
}

function PlanPanel({ isHr }: { isHr: boolean }) {
  const thisYear = new Date().getUTCFullYear();
  const [year, setYear] = useState(thisYear);
  const [entries, setEntries] = useState<PlanEntry[]>([]);
  const [types, setTypes] = useState<{ leaveTypeId: number; name: string }[]>([]);
  const [waiting, setWaiting] = useState<PlanWaiting[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [draft, setDraft] = useState({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
  const [returning, setReturning] = useState<number | null>(null);
  const [returnReason, setReturnReason] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/leave/plan/me?year=${year}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => !cancelled && setEntries(b.results ?? []))
      .catch(() => !cancelled && setError("Could not load your plan."));
    fetch("/api/leave/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => !cancelled && setTypes((b.balances ?? []).map((x: { leaveTypeId: number; name: string }) => ({ leaveTypeId: x.leaveTypeId, name: x.name }))))
      .catch(() => undefined);
    if (isHr) {
      fetch("/api/leave/plan/pending", { cache: "no-store" })
        .then((r) => r.json())
        .then((b) => !cancelled && setWaiting(b.results ?? []))
        .catch(() => !cancelled && setError("Could not load plans to approve."));
    }
    return () => {
      cancelled = true;
    };
  }, [year, isHr, tick]);

  const act = async (url: string, payload: unknown, done: string) => {
    setBusy(true);
    setError("");
    setMessage("");
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setError(body.error ?? "Something went wrong.");
    setMessage(done);
    setTick((n) => n + 1);
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    act("/api/leave/plan", { leaveTypeId: Number(draft.leaveTypeId), startDate: draft.startDate, endDate: draft.endDate, reason: draft.reason }, "Added to your plan as a draft. Submit it when ready.");
    setDraft({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
  };

  return (
    <>
      <h2 style={{ ...S.h2, marginTop: 0 }}>Annual leave plan</h2>
      <p style={S.note}>Plan absences at least six weeks ahead. HR approves each one no later than six weeks before it starts. Anything still unapproved then goes back to your manager.</p>
      <label style={{ ...S.field, maxWidth: "200px" }}>Plan year
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={S.input}>
          {[thisYear, thisYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </label>
      {message && <p role="status" style={{ color: C.ok, fontWeight: 600 }}>{message}</p>}
      {error && <p role="alert" style={{ color: C.danger }}>{error}</p>}

      <form onSubmit={add} style={{ maxWidth: "520px" }}>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "16px" }}>Add a planned absence</h3>
        <label style={S.field}>Leave type *
          <select required value={draft.leaveTypeId} onChange={(e) => setDraft({ ...draft, leaveTypeId: e.target.value })} style={S.input}>
            <option value="">Choose…</option>
            {types.map((t) => <option key={t.leaveTypeId} value={t.leaveTypeId}>{t.name}</option>)}
          </select>
        </label>
        <label style={S.field}>Start date *<input required type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} style={S.input} /></label>
        <label style={S.field}>End date *<input required type="date" value={draft.endDate} min={draft.startDate || undefined} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} style={S.input} /></label>
        <label style={S.field}>Reason (optional)<input maxLength={500} value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} style={S.input} /></label>
        <button type="submit" style={S.primary} disabled={busy}>{busy ? "Saving…" : "Add to plan"}</button>
      </form>

      <h2 style={S.h2}>My plan for {year}</h2>
      {entries.length === 0 ? (
        <p style={S.note}>Nothing planned for {year} yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <caption style={{ textAlign: "left", position: "absolute", left: "-9999px" }}>My annual plan</caption>
            <thead>
              <tr>{["Type", "Dates", "Days", "Status", "Approve by", "Action"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {entries.map((p) => (
                <tr key={p.id}>
                  <td style={S.td}>{p.leaveType}</td>
                  <td style={S.td}>{range(p)}</td>
                  <td style={S.td}>{p.days}</td>
                  <td style={S.td}>
                    <strong style={{ color: p.status === "approved" ? C.ok : p.status === "returned" ? C.danger : C.text }}>{p.status}</strong>
                    {p.decisionComment ? <div style={{ color: C.muted }}>{p.decisionComment}</div> : null}
                  </td>
                  <td style={S.td}>{fmt(p.deadline)}</td>
                  <td style={S.td}>
                    {(p.status === "draft" || p.status === "returned") && (
                      <button type="button" style={S.btn} disabled={busy} onClick={() => act(`/api/leave/plan/${p.id}/submit`, {}, "Submitted for HR approval.")}>Submit</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isHr && (
        <>
          <h2 style={S.h2}>Plans waiting for HR</h2>
          <button type="button" style={{ ...S.btn, marginBottom: "0.5rem" }} disabled={busy} onClick={() => act("/api/leave/plan/sweep", {}, "Sweep done: unapproved entries past their deadline are back with managers.")}>Run deadline sweep</button>
          {waiting.length === 0 ? (
            <p style={S.note}>Nothing is waiting.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={S.table}>
                <caption style={{ textAlign: "left", position: "absolute", left: "-9999px" }}>Plans waiting for HR</caption>
                <thead>
                  <tr>{["Employee", "Type", "Dates", "Days", "Approve by", "Action"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {waiting.map((w) => (
                    <tr key={w.id}>
                      <td style={S.td}><strong>{w.employeeName}</strong>{w.department ? <div style={{ color: C.muted }}>{w.department}</div> : null}</td>
                      <td style={S.td}>{w.leaveType}</td>
                      <td style={S.td}>{range(w)}</td>
                      <td style={S.td}>{w.days}</td>
                      <td style={S.td}>{fmt(w.deadline)}</td>
                      <td style={S.td}>
                        {returning === w.id ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", minWidth: "220px" }}>
                            <textarea rows={2} maxLength={1000} placeholder="Reason for returning (required)" value={returnReason} onChange={(e) => setReturnReason(e.target.value)} style={S.input} />
                            <div style={{ display: "flex", gap: "0.4rem" }}>
                              <button type="button" style={{ ...S.btn, borderColor: C.danger, color: C.danger }} disabled={busy || returnReason.trim().length < 3} onClick={() => { act(`/api/leave/plan/${w.id}/decision`, { decision: "reject", comment: returnReason.trim() }, "Returned to the employee."); setReturning(null); setReturnReason(""); }}>Confirm return</button>
                              <button type="button" style={S.btn} onClick={() => { setReturning(null); setReturnReason(""); }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                            <button type="button" style={S.primary} disabled={busy} onClick={() => act(`/api/leave/plan/${w.id}/decision`, { decision: "approve" }, "Plan entry approved.")}>Approve</button>
                            <button type="button" style={S.btn} disabled={busy} onClick={() => setReturning(w.id)}>Return</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

// Leave types. HR sets the name, the days each person gets by default, and whether unused days carry forward.
// Changing the days changes every balance that has no per-person allocation.
interface LeaveTypeRow {
  id: number;
  name: string;
  defaultDays: number;
  isCarryForward: boolean;
  isActive: boolean;
  requiresEvidence: boolean;
  approvalChain: "manager" | "manager_then_hr";
  carryForwardLimit: number | null;
}

// HR balance adjustments: a day count (positive or negative) with a reason, kept as history per person.
function BalanceAdjust() {
  const thisYear = new Date().getUTCFullYear();
  const [people, setPeople] = useState<{ id: number; name: string }[]>([]);
  const [types, setTypes] = useState<{ id: number; name: string }[]>([]);
  const [history, setHistory] = useState<{ id: number; leaveType: string; year: number; days: number; reason: string; adjustedBy: string | null; createdAt: string }[]>([]);
  const [draft, setDraft] = useState({ employeeId: "", leaveTypeId: "", year: String(thisYear), days: "1", reason: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetch("/api/hr/home", { cache: "no-store" }).then((r) => r.json()).then((b) => setPeople((b.directory ?? []).map((p: { id: number; name: string }) => ({ id: p.id, name: p.name })))).catch(() => undefined);
    fetch("/api/hr/leave/types", { cache: "no-store" }).then((r) => r.json()).then((b) => setTypes((b.results ?? []).map((t: { id: number; name: string }) => ({ id: t.id, name: t.name })))).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!draft.employeeId) return setHistory([]);
    let cancelled = false;
    fetch(`/api/leave/balances/adjustments?employeeId=${draft.employeeId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => !cancelled && setHistory(b.results ?? []))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [draft.employeeId, tick]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const r = await fetch("/api/leave/balances/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: Number(draft.employeeId), leaveTypeId: Number(draft.leaveTypeId), year: Number(draft.year), days: Number(draft.days), reason: draft.reason.trim() }),
    });
    const body = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setError(body.error ?? "Could not record the adjustment.");
    setMessage("Adjustment recorded.");
    setDraft({ ...draft, days: "1", reason: "" });
    setTick((n) => n + 1);
  };

  return (
    <>
      <h2 style={{ ...S.h2, marginTop: 0 }}>Balance adjustments</h2>
      <p style={S.note}>Every adjustment is kept with its reason and who made it.</p>
      {message && <p role="status" style={{ color: C.ok, fontWeight: 600 }}>{message}</p>}
      {error && <p role="alert" style={{ color: C.danger }}>{error}</p>}
      <form onSubmit={submit} style={{ maxWidth: "520px" }}>
        <label style={S.field}>Person *
          <select required value={draft.employeeId} onChange={(e) => setDraft({ ...draft, employeeId: e.target.value })} style={S.input}>
            <option value="">Choose…</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label style={S.field}>Leave type *
          <select required value={draft.leaveTypeId} onChange={(e) => setDraft({ ...draft, leaveTypeId: e.target.value })} style={S.input}>
            <option value="">Choose…</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label style={S.field}>Year *<input required type="number" min={2000} max={2100} value={draft.year} onChange={(e) => setDraft({ ...draft, year: e.target.value })} style={S.input} /></label>
        <label style={S.field}>Days (use minus to take days back) *<input required type="number" min={-365} max={365} step={0.5} value={draft.days} onChange={(e) => setDraft({ ...draft, days: e.target.value })} style={S.input} /></label>
        <label style={S.field}>Reason *<input required minLength={5} maxLength={500} value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} style={S.input} /></label>
        <button type="submit" style={S.primary} disabled={busy}>{busy ? "Saving…" : "Record adjustment"}</button>
      </form>
      {draft.employeeId && (
        <>
          <h3 style={{ margin: "1rem 0 0.5rem", fontSize: "16px" }}>History for this person</h3>
          {history.length === 0 ? (
            <p style={S.note}>No adjustments yet.</p>
          ) : (
            <table style={S.table}>
              <caption style={{ textAlign: "left", position: "absolute", left: "-9999px" }}>Balance adjustments</caption>
              <thead>
                <tr>{["When", "Type", "Year", "Days", "Reason", "By"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td style={S.td}>{new Date(h.createdAt).toLocaleDateString("en-GB")}</td>
                    <td style={S.td}>{h.leaveType}</td>
                    <td style={S.td}>{h.year}</td>
                    <td style={S.td}>{h.days > 0 ? `+${h.days}` : h.days}</td>
                    <td style={S.td}>{h.reason}</td>
                    <td style={S.td}>{h.adjustedBy ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </>
  );
}

function LeaveTypes() {
  const [rows, setRows] = useState<LeaveTypeRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [draft, setDraft] = useState({ name: "", defaultDays: "10", isCarryForward: false });
  const [editing, setEditing] = useState<LeaveTypeRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/hr/leave/types", { cache: "no-store" })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error ?? "Could not load leave types.");
        if (!cancelled) setRows(body.results ?? []);
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Could not load leave types."));
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const send = async (url: string, payload: unknown, done: string) => {
    setBusy(true);
    setError("");
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setError(body.error ?? "Could not save.");
    setEditing(null);
    setTick((n) => n + 1);
    return done;
  };

  return (
    <>
      <h2 style={{ ...S.h2, marginTop: 0 }}>Leave types</h2>
      <p style={S.note}>A change to days applies to everyone who has no individual allocation.</p>
      {error && <p role="alert" style={{ color: C.danger }}>{error}</p>}
      {rows.length > 0 && (
        <table style={S.table}>
          <caption style={{ textAlign: "left", position: "absolute", left: "-9999px" }}>Leave types</caption>
          <thead>
            <tr>{["Name", "Days", "Carry forward", "Status", "Action"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td style={S.td}><strong>{t.name}</strong></td>
                <td style={S.td}>{t.defaultDays}</td>
                <td style={S.td}>{t.isCarryForward ? "Yes" : "No"}</td>
                <td style={S.td}>{t.isActive ? "Active" : "Inactive"}</td>
                <td style={S.td}>
                  <button type="button" style={S.btn} onClick={() => setEditing({ ...t })} aria-label={`Edit ${t.name}`}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <form style={{ ...S.field, maxWidth: "420px", marginTop: "1rem" }} onSubmit={(e) => { e.preventDefault(); send(`/api/hr/leave/types/${editing.id}/update`, { name: editing.name, defaultDays: editing.defaultDays, isCarryForward: editing.isCarryForward, isActive: editing.isActive, requiresEvidence: editing.requiresEvidence, approvalChain: editing.approvalChain, carryForwardLimit: editing.carryForwardLimit }, "Saved."); }}>
          <h3 style={{ margin: "0 0 0.5rem", fontSize: "16px" }}>Edit {editing.name}</h3>
          <label style={S.field}>Name<input required minLength={2} maxLength={100} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} style={S.input} /></label>
          <label style={S.field}>Days per person<input type="number" min={0} max={365} value={editing.defaultDays} onChange={(e) => setEditing({ ...editing, defaultDays: Number(e.target.value) })} style={S.input} /></label>
          <label style={{ ...S.field, flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
            <input type="checkbox" checked={editing.isCarryForward} onChange={(e) => setEditing({ ...editing, isCarryForward: e.target.checked })} />
            Unused days carry forward
          </label>
          <label style={{ ...S.field, flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
            <input type="checkbox" checked={editing.requiresEvidence} onChange={(e) => setEditing({ ...editing, requiresEvidence: e.target.checked })} />
            Needs evidence (doctor's note or photo) before approval
          </label>
          <label style={S.field}>Approval chain
            <select value={editing.approvalChain} onChange={(e) => setEditing({ ...editing, approvalChain: e.target.value as "manager" | "manager_then_hr" })} style={S.input}>
              <option value="manager">Solid manager only</option>
              <option value="manager_then_hr">Solid manager, then HR</option>
            </select>
          </label>
          <label style={S.field}>Carry-forward cap (days, blank for no cap)
            <input type="number" min={0} max={365} value={editing.carryForwardLimit ?? ""} onChange={(e) => setEditing({ ...editing, carryForwardLimit: e.target.value === "" ? null : Number(e.target.value) })} style={S.input} />
          </label>
          <label style={{ ...S.field, flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
            <input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
            Active
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" style={S.primary} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
            <button type="button" style={S.btn} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      <form style={{ maxWidth: "420px", marginTop: "1rem" }} onSubmit={(e) => { e.preventDefault(); send("/api/hr/leave/types", { name: draft.name, defaultDays: Number(draft.defaultDays), isCarryForward: draft.isCarryForward }, "Added."); setDraft({ name: "", defaultDays: "10", isCarryForward: false }); }}>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "16px" }}>Add a leave type</h3>
        <label style={S.field}>Name *<input required minLength={2} maxLength={100} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={S.input} /></label>
        <label style={S.field}>Days per person *<input required type="number" min={0} max={365} value={draft.defaultDays} onChange={(e) => setDraft({ ...draft, defaultDays: e.target.value })} style={S.input} /></label>
        <label style={{ ...S.field, flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
          <input type="checkbox" checked={draft.isCarryForward} onChange={(e) => setDraft({ ...draft, isCarryForward: e.target.checked })} />
          Unused days carry forward
        </label>
        <button type="submit" style={S.primary} disabled={busy}>Add leave type</button>
      </form>
    </>
  );
}

// Leave by date range. "team": approved leave of everyone in your department. "company": HR only, approved and pending,
// with department and status. The range defaults to today to 60 days ahead and is capped at a year by the API.
interface RosterRow {
  id: number;
  employeeName: string;
  department?: string | null;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number | null;
  halfDayPeriod: string | null;
  status?: string;
}

// One date range shared by the department panel and the company-wide panel, which sit together on the same page.
function TeamLeavePage() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10));
  return (
    <>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
        <label style={S.field}>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={S.input} /></label>
        <label style={S.field}>To<input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} style={S.input} /></label>
      </div>
      <LeaveRoster scope="team" from={from} to={to} />
      <div style={{ marginTop: "1.5rem" }}>
        <LeaveRoster scope="company" from={from} to={to} />
      </div>
    </>
  );
}

function LeaveRoster({ scope, from, to }: { scope: "team" | "company"; from: string; to: string }) {
  const [rows, setRows] = useState<RosterRow[] | null>(null);
  const [department, setDepartment] = useState<string | null>(null);
  const [canSeePending, setCanSeePending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError("");
    fetch(`/api/leave/${scope}?from=${from}&to=${to}`, { cache: "no-store" })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error ?? "Could not load leave.");
        if (!cancelled) {
          setRows(body.results ?? []);
          setDepartment(body.department ?? null);
          setCanSeePending(Boolean(body.canSeePending));
        }
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Could not load leave."));
    return () => {
      cancelled = true;
    };
  }, [scope, from, to]);

  return (
    <>
      <h2 style={{ ...S.h2, marginTop: 0 }}>{scope === "team" ? (department ? `My department: ${department}` : "My department") : "Company-wide"}</h2>
      <p style={S.note}>{scope === "team" ? "Approved leave of people in your department." : canSeePending ? "Approved and pending leave across the company." : "Approved leave across the company."}</p>
      {error && <p role="alert" style={{ color: C.danger }}>{error}</p>}
      {rows === null && !error && <p role="status">Loading…</p>}
      {rows && rows.length === 0 && <p style={S.note}>No leave in this period.</p>}
      {rows && rows.length > 0 && (
        <table style={S.table}>
          <caption style={{ textAlign: "left", position: "absolute", left: "-9999px" }}>{scope === "team" ? "My team leave" : "Company leave"}</caption>
          <thead>
            <tr>{(scope === "team" ? ["Employee", "Type", "Dates", "Days"] : ["Employee", "Department", "Type", "Dates", "Days", "Status"]).map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={S.td}><strong>{r.employeeName}</strong></td>
                {scope === "company" && <td style={S.td}>{r.department ?? "-"}</td>}
                <td style={S.td}>{r.leaveType}{r.halfDayPeriod ? ` (${r.halfDayPeriod})` : ""}</td>
                <td style={S.td}>{range(r)}</td>
                <td style={S.td}>{r.days ?? "-"}</td>
                {scope === "company" && <td style={S.td}><Status value={r.status ?? ""} /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

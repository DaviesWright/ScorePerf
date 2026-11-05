"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { countWorkingDays, isDecider, type AccessRole } from "@hr-platform/shared";
import { createMemoryLeaveApi, httpLeaveApi, type LeaveApi, type LeaveBalance, type LeaveRequestView } from "../../lib/leaveApi";

// Plain Leave screens: My leave, Request leave, Approvals, Team calendar. Standard controls, text status
// labels, no decoration. Visual language matches PlainShell.

type Tab = "mine" | "request" | "approvals" | "calendar";

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
    ...(decider ? ([{ key: "approvals", label: "Approvals" }, { key: "calendar", label: "Team calendar" }] as { key: Tab; label: string }[]) : []),
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
      {tab === "calendar" && decider && <Calendar api={api} />}
    </div>
  );
};

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
    const r = await api.create({ leaveTypeId: typeId, startDate: start, endDate: end, reason: reason.trim() });
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
          <label style={S.field}>
            End date *
            <input required type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} style={S.input} />
          </label>
          {estimate !== null && balance && (
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
  const [busy, setBusy] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");

  const decide = useCallback(
    async (id: number, decision: "approve" | "reject") => {
      setBusy(id);
      setActionError("");
      const r = await api.decide(id, decision);
      setBusy(null);
      setConfirming(null);
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
                      <>
                        <button type="button" style={{ ...S.btn, borderColor: C.danger, color: C.danger }} disabled={busy === r.id} onClick={() => decide(r.id, "reject")}>
                          Confirm reject
                        </button>
                        <button type="button" style={S.btn} onClick={() => setConfirming(null)}>Keep pending</button>
                      </>
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

"use client";

import React, { useState } from "react";
import { PROFILE_FIELDS, PROFILE_FIELD_LABELS, type ProfileField } from "@hr-platform/shared";
import { C, Muted, Notice, btn, card, cell, fieldStyle, formatDate, isHr, readJson, useLoad } from "./selfServiceUi";

// Banking and tax details. An employee asks for a change; HR approves or rejects it. The stored value changes only on approval.

interface ChangeRequest {
  id: number;
  field: string;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  status: string;
  decisionComment: string | null;
  createdAt: string;
  decidedAt: string | null;
  employeeName?: string;
}

interface DetailsResponse {
  values: Record<string, string>;
  requests: ChangeRequest[];
}

const STATUS_LABEL: Record<string, string> = { pending: "Waiting for HR", approved: "Approved", rejected: "Rejected" };

const PendingRow: React.FC<{ request: ChangeRequest; onDecided: () => void }> = ({ request, onDecided }) => {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decide = async (decision: "approve" | "reject") => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/hr/profile/changes/${request.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, comment }),
      });
      const data = await readJson<object>(res);
      if (!res.ok) {
        setError(data.error ?? "The decision was not saved.");
        return;
      }
      onDecided();
    } catch {
      setError("The server could not be reached. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr>
      <td style={cell}>{request.employeeName}</td>
      <td style={cell}>{request.fieldLabel}</td>
      <td style={cell}>{request.oldValue || "Not set"}</td>
      <td style={cell}>{request.newValue}</td>
      <td style={cell}>
        <label style={{ display: "block", marginBottom: "0.25rem", fontSize: 13 }}>
          Comment (optional)
          <input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} style={fieldStyle} />
        </label>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" style={{ ...btn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => decide("approve")}>
            Approve
          </button>
          <button type="button" style={{ ...btn, background: "#fff", color: C.accent, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => decide("reject")}>
            Reject
          </button>
        </div>
        <Notice kind="error" text={error} />
      </td>
    </tr>
  );
};

export const ProfileChangesScreen: React.FC<{ user: { id: string; persona: string }; realSession: boolean }> = ({ user }) => {
  const hr = isHr(user.persona);
  const details = useLoad<DetailsResponse>("/api/hr/profile/details");
  const pending = useLoad<{ results: ChangeRequest[] }>(hr ? "/api/hr/profile/changes/pending" : null);
  const [field, setField] = useState<ProfileField>("bankName");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/hr/profile/changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value: value.trim() }),
      });
      const data = await readJson<object>(res);
      if (!res.ok) {
        setError(data.error ?? "The request was not sent.");
        return;
      }
      setNotice("Your request is with HR. The stored value stays the same until HR approves it.");
      setValue("");
      details.reload();
      pending.reload();
    } catch {
      setError("The server could not be reached. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: 960 }}>
      <h1 style={{ fontSize: 22, margin: "0 0 0.25rem" }}>Bank and tax details</h1>
      <Muted>To change any of these, ask HR here. Your change is saved only after HR approves it.</Muted>

      <section style={card} aria-labelledby="values-heading">
        <h2 id="values-heading" style={{ fontSize: 18, margin: "0 0 0.5rem" }}>
          Stored values
        </h2>
        {details.loading && <p role="status">Loading…</p>}
        <Notice kind="error" text={details.error || null} />
        {details.data && (
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
            <tbody>
              {PROFILE_FIELDS.map((f) => (
                <tr key={f}>
                  <th scope="row" style={{ ...cell, width: "40%" }}>
                    {PROFILE_FIELD_LABELS[f]}
                  </th>
                  <td style={cell}>{details.data?.values[f] || "Not set"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={card} aria-labelledby="request-heading">
        <h2 id="request-heading" style={{ fontSize: 18, margin: "0 0 0.5rem" }}>
          Ask for a change
        </h2>
        <form onSubmit={submit} style={{ display: "grid", gap: "0.75rem", maxWidth: 480 }}>
          <label>
            Field
            <select value={field} onChange={(e) => setField(e.target.value as ProfileField)} style={fieldStyle}>
              {PROFILE_FIELDS.map((f) => (
                <option key={f} value={f}>
                  {PROFILE_FIELD_LABELS[f]}
                </option>
              ))}
            </select>
          </label>
          <label>
            New value
            <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={100} required style={fieldStyle} />
          </label>
          <div>
            <button type="submit" style={{ ...btn, opacity: busy || !value.trim() ? 0.6 : 1 }} disabled={busy || !value.trim()}>
              {busy ? "Sending…" : "Send to HR"}
            </button>
          </div>
        </form>
        <Notice kind="error" text={error} />
        <Notice kind="ok" text={notice} />
      </section>

      <section style={card} aria-labelledby="history-heading">
        <h2 id="history-heading" style={{ fontSize: 18, margin: "0 0 0.5rem" }}>
          My requests
        </h2>
        {details.data && details.data.requests.length === 0 && <p style={{ color: C.muted }}>You have not asked for any changes.</p>}
        {details.data && details.data.requests.length > 0 && (
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
            <thead>
              <tr>
                <th style={cell}>Field</th>
                <th style={cell}>Asked on</th>
                <th style={cell}>Status</th>
                <th style={cell}>HR comment</th>
              </tr>
            </thead>
            <tbody>
              {details.data.requests.map((r) => (
                <tr key={r.id}>
                  <td style={cell}>{r.fieldLabel}</td>
                  <td style={cell}>{formatDate(r.createdAt)}</td>
                  <td style={cell}>{STATUS_LABEL[r.status] ?? r.status}</td>
                  <td style={cell}>{r.decisionComment ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {hr && (
        <section style={card} aria-labelledby="queue-heading">
          <h2 id="queue-heading" style={{ fontSize: 18, margin: "0 0 0.5rem" }}>
            Waiting for HR
          </h2>
          <Notice kind="error" text={pending.error || null} />
          {pending.data && pending.data.results.length === 0 && <p style={{ color: C.muted }}>No changes are waiting.</p>}
          {pending.data && pending.data.results.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={cell}>Employee</th>
                    <th style={cell}>Field</th>
                    <th style={cell}>Stored now</th>
                    <th style={cell}>Requested</th>
                    <th style={cell}>Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.data.results.map((r) => (
                    <PendingRow
                      key={r.id}
                      request={r}
                      onDecided={() => {
                        pending.reload();
                        details.reload();
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

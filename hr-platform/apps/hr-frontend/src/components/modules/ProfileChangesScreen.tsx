"use client";

import React, { useEffect, useRef, useState } from "react";
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

export const ProfileChangesScreen: React.FC<{
  user: { id: string; persona: string; name?: string; email?: string; role?: string; department?: string; location?: string };
  realSession: boolean;
}> = ({ user, realSession }) => {
  const hr = isHr(user.persona);
  const details = useLoad<DetailsResponse>(realSession ? "/api/hr/profile/details" : null);
  const pending = useLoad<{ results: ChangeRequest[] }>(hr && realSession ? "/api/hr/profile/changes/pending" : null);

  const storageKey = `scoreview_profile_store:${(user.email || user.id || "default").toLowerCase()}`;
  const defaultLocalValues: Record<string, string> = {
    bankName: "Ecobank Ghana / Barclays UK",
    accountNumber: "****4821",
    routingNumber: "",
    taxId: "",
    socialSecurity: "SSNIT-GH-88210",
  };

  const [localValues, setLocalValues] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) return { ...defaultLocalValues, ...JSON.parse(raw).values };
      } catch {
        // ignore
      }
    }
    return defaultLocalValues;
  });

  const [localRequests, setLocalRequests] = useState<ChangeRequest[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw && Array.isArray(JSON.parse(raw).requests)) return JSON.parse(raw).requests;
      } catch {
        // ignore
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          setLocalValues({ ...defaultLocalValues, ...(parsed.values || {}) });
          setLocalRequests(Array.isArray(parsed.requests) ? parsed.requests : []);
          return;
        }
      } catch {
        // ignore
      }
    }
    setLocalValues(defaultLocalValues);
    setLocalRequests([]);
  }, [storageKey]);

  const [field, setField] = useState<ProfileField>("bankName");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestSectionRef = useRef<HTMLElement | null>(null);
  const valueInputRef = useRef<HTMLInputElement | null>(null);

  const activeValues = details.data?.values ?? localValues;
  const activeRequests = details.data?.requests ?? localRequests;

  const jumpToEditField = (targetField: ProfileField) => {
    setField(targetField);
    setValue(activeValues[targetField] || "");
    requestSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => valueInputRef.current?.focus(), 150);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const trimmed = value.trim();

    if (!realSession) {
      const nextValues = { ...localValues, [field]: trimmed };
      const newReq: ChangeRequest = {
        id: Date.now(),
        field,
        fieldLabel: PROFILE_FIELD_LABELS[field],
        oldValue: localValues[field] || "Not set",
        newValue: trimmed,
        status: "approved",
        decisionComment: "Saved to personal profile",
        createdAt: new Date().toISOString(),
        decidedAt: new Date().toISOString(),
        employeeName: user.name || "Employee",
      };
      const nextRequests = [newReq, ...localRequests];
      setLocalValues(nextValues);
      setLocalRequests(nextRequests);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, JSON.stringify({ values: nextValues, requests: nextRequests }));
      }
      setNotice(`${PROFILE_FIELD_LABELS[field]} updated and saved to your profile.`);
      setValue("");
      setBusy(false);
      return;
    }

    try {
      const res = await fetch("/api/hr/profile/changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value: trimmed }),
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

  const missingFields = PROFILE_FIELDS.filter((f) => !activeValues[f]?.trim());
  const filledCount = PROFILE_FIELDS.length - missingFields.length;
  const selfCompletenessPct = Math.round((filledCount / PROFILE_FIELDS.length) * 100);

  return (
    <div style={{ padding: "1.5rem", maxWidth: 960 }}>
      <h1 style={{ fontSize: 22, margin: "0 0 0.25rem" }}>My Profile &amp; Bank / Tax Details</h1>
      <Muted>Your personal employee profile and payroll bank/tax details on one page. Sensitive bank/tax changes require HR approval.</Muted>

      <section style={card} aria-labelledby="personal-profile-heading">
        <h2 id="personal-profile-heading" style={{ fontSize: 18, margin: "0 0 0.65rem" }}>
          Personal Profile
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", fontSize: 14 }}>
          <div><div style={{ fontSize: 11, color: C.muted }}>Full Name</div><strong>{user.name || "Employee"}</strong></div>
          <div><div style={{ fontSize: 11, color: C.muted }}>Email</div><strong>{user.email || "—"}</strong></div>
          <div><div style={{ fontSize: 11, color: C.muted }}>Role / Title</div><strong>{user.role || user.persona}</strong></div>
          <div><div style={{ fontSize: 11, color: C.muted }}>Department</div><strong>{user.department || "General"}</strong></div>
          <div><div style={{ fontSize: 11, color: C.muted }}>Office / Location</div><strong>{user.location || "Accra HQ"}</strong></div>
        </div>
      </section>

      <section style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <strong style={{ fontSize: 14 }}>My Profile Completeness: {selfCompletenessPct}%</strong>
          <div style={{ fontSize: 12, color: C.muted }}>
            {filledCount} of {PROFILE_FIELDS.length} required fields completed (your personal record only).
          </div>
          {missingFields.length > 0 && (
            <div style={{ fontSize: 12, color: "#b45309", marginTop: 4 }}>
              Outstanding: {missingFields.map((f) => PROFILE_FIELD_LABELS[f]).join(", ")}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ width: "160px", height: "8px", borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
            <div style={{ width: `${selfCompletenessPct}%`, height: "100%", background: C.accent }} />
          </div>
          {missingFields.length > 0 && (
            <button type="button" style={btn} onClick={() => jumpToEditField(missingFields[0])}>
              Complete Outstanding →
            </button>
          )}
        </div>
      </section>

      <section style={card} aria-labelledby="values-heading">
        <h2 id="values-heading" style={{ fontSize: 18, margin: "0 0 0.5rem" }}>
          Stored values (Bank &amp; Tax Details)
        </h2>
        {details.loading && <p role="status">Loading…</p>}
        {realSession && <Notice kind="error" text={details.error || null} />}
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
          <tbody>
            {PROFILE_FIELDS.map((f) => (
              <tr key={f}>
                <th scope="row" style={{ ...cell, width: "36%" }}>
                  {PROFILE_FIELD_LABELS[f]}
                </th>
                <td style={cell}>
                  {activeValues[f]?.trim() ? (
                    activeValues[f]
                  ) : (
                    <span style={{ color: "#b45309", fontWeight: 600 }}>Not set (Outstanding)</span>
                  )}
                </td>
                <td style={{ ...cell, width: "100px", textAlign: "right" }}>
                  <button
                    type="button"
                    onClick={() => jumpToEditField(f)}
                    style={{ ...btn, padding: "0.25rem 0.65rem", fontSize: 12, background: "#fff", color: C.accent }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section ref={requestSectionRef} style={card} aria-labelledby="request-heading">
        <h2 id="request-heading" style={{ fontSize: 18, margin: "0 0 0.5rem" }}>
          {realSession ? "Ask for a change" : "Edit Stored Profile / Bank & Tax Value"}
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
            <input ref={valueInputRef} value={value} onChange={(e) => setValue(e.target.value)} maxLength={100} required style={fieldStyle} />
          </label>
          <div>
            <button type="submit" style={{ ...btn, opacity: busy || !value.trim() ? 0.6 : 1 }} disabled={busy || !value.trim()}>
              {busy ? "Saving…" : realSession ? "Send to HR" : "Save Change"}
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
        {activeRequests.length === 0 && <p style={{ color: C.muted }}>You have not asked for any changes.</p>}
        {activeRequests.length > 0 && (
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
              {activeRequests.map((r) => (
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

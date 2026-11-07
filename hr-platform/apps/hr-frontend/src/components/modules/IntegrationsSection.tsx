"use client";

import React, { useCallback, useEffect, useState } from "react";

// Integration connections (HR only). The screen names Worker secrets and shows whether each one is set. It never
// shows or stores a secret value: those live in Cloudflare Worker secrets. "Test connection" runs the server
// preflight and reports "not configured" while any referenced secret is missing; no provider is called until then.

type Slot = { slot: string; secretName: string | null; present: boolean };
type Status = { status: "not_configured" | "disabled" | "ready"; message?: string };
interface Connection { label: string; enabled: boolean; baseUrl: string; secretRefs: Record<string, string>; updatedAt: string }
interface IntegrationRow { provider: string; label: string; purpose: string; connection: Connection | null; slots: Slot[]; status: Status }

const C = { text: "#1f2937", muted: "#4b5563", border: "#d1d5db", surface: "#ffffff", accent: "#1d4ed8", danger: "#b91c1c", ok: "#166534", warn: "#92400e" };
const card: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: "1rem", marginBottom: "1rem", color: C.text };
const input: React.CSSProperties = { minHeight: 36, padding: "0 0.5rem", border: `1px solid ${C.border}`, borderRadius: 4, font: "inherit", width: "100%", boxSizing: "border-box" };
const btn: React.CSSProperties = { minHeight: 36, padding: "0 0.9rem", border: `1px solid ${C.accent}`, borderRadius: 4, background: C.accent, color: "#fff", font: "inherit", cursor: "pointer" };
const btnGhost: React.CSSProperties = { ...btn, background: "#fff", color: C.accent };

// Suggested Worker secret names, e.g. BC_CLIENT_SECRET. HR can change them.
const PREFIX: Record<string, string> = { business_central: "BC", seamless_hr: "SEAMLESS_HR", clay_hr: "CLAY_HR", coursera: "COURSERA" };
const suggest = (provider: string, slot: string) => `${PREFIX[provider] ?? "INTEGRATION"}_${slot.replace(/([A-Z])/g, "_$1").toUpperCase()}`;

const STATUS_TEXT: Record<Status["status"], { label: string; color: string }> = {
  ready: { label: "Ready", color: C.ok },
  disabled: { label: "Switched off", color: C.muted },
  not_configured: { label: "Not configured", color: C.warn },
};

const ConnectionCard: React.FC<{ row: IntegrationRow; canEdit: boolean; onSaved: () => void }> = ({ row, canEdit, onSaved }) => {
  const seed = row.connection;
  const [label, setLabel] = useState(seed?.label ?? row.label);
  const [enabled, setEnabled] = useState(seed?.enabled ?? false);
  const [baseUrl, setBaseUrl] = useState(seed?.baseUrl ?? "");
  const [refs, setRefs] = useState<Record<string, string>>(() =>
    Object.fromEntries(row.slots.map((s) => [s.slot, s.secretName ?? suggest(row.provider, s.slot)])),
  );
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<string | null>(null);
  const shown = STATUS_TEXT[row.status.status];

  const save = async () => {
    setBusy(true);
    setErrors([]);
    try {
      const res = await fetch(`/api/hr/integrations/${row.provider}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, enabled, baseUrl, secretRefs: refs }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; errors?: string[] };
      if (!res.ok) {
        setErrors(data.errors ?? [data.error ?? "The connection was not saved."]);
        return;
      }
      setTestResult(null);
      onSaved();
    } catch {
      setErrors(["The server could not be reached. Try again."]);
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/hr/integrations/${row.provider}/test`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      setTestResult(data.message ?? data.error ?? "No result.");
    } catch {
      setTestResult("The server could not be reached. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={card} aria-labelledby={`integration-${row.provider}`}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <h3 id={`integration-${row.provider}`} style={{ fontSize: 16, margin: 0 }}>
          {row.label} <span style={{ color: C.muted, fontWeight: 400 }}>({row.purpose})</span>
        </h3>
        <span style={{ color: shown.color, fontWeight: 600 }}>{shown.label}</span>
      </div>
      {row.status.status !== "ready" && row.status.message && <p style={{ color: C.muted, margin: "0.5rem 0" }}>{row.status.message}</p>}

      <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", margin: "0.75rem 0" }}>
        <label>
          Label
          <input style={input} value={label} disabled={!canEdit} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <label>
          Base URL (https)
          <input style={input} value={baseUrl} disabled={!canEdit} placeholder="https://" onChange={(e) => setBaseUrl(e.target.value)} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", alignSelf: "end" }}>
          <input type="checkbox" checked={enabled} disabled={!canEdit} onChange={(e) => setEnabled(e.target.checked)} />
          Enabled
        </label>
      </div>

      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "0.3rem" }}>Secret slot</th>
            <th style={{ textAlign: "left", padding: "0.3rem" }}>Worker secret name</th>
            <th style={{ textAlign: "left", padding: "0.3rem" }}>Set in Worker?</th>
          </tr>
        </thead>
        <tbody>
          {row.slots.map((s) => (
            <tr key={s.slot}>
              <td style={{ padding: "0.3rem" }}>{s.slot}</td>
              <td style={{ padding: "0.3rem" }}>
                <input
                  aria-label={`Secret name for ${s.slot}`}
                  style={input}
                  value={refs[s.slot] ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => setRefs({ ...refs, [s.slot]: e.target.value.toUpperCase() })}
                />
              </td>
              <td style={{ padding: "0.3rem", color: s.present ? C.ok : C.warn }}>{s.present ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {errors.length > 0 && (
        <ul role="alert" style={{ color: C.danger, margin: "0.5rem 0" }}>
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {testResult && <p role="status" style={{ margin: "0.5rem 0" }}>{testResult}</p>}

      {canEdit && (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button type="button" style={{ ...btn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={save}>
            Save connection
          </button>
          <button type="button" style={{ ...btnGhost, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={test}>
            Test connection
          </button>
        </div>
      )}
    </section>
  );
};

export const IntegrationsSection: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const [rows, setRows] = useState<IntegrationRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/hr/integrations", { cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as { results?: IntegrationRow[]; error?: string };
    if (res.ok && data.results) {
      setRows(data.results);
      setError(null);
    } else {
      setError(data.error ?? "Could not load the integrations.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h2 style={{ fontSize: 18, margin: "1.5rem 0 0.5rem" }}>Integration connections</h2>
      <p style={{ color: C.muted, margin: "0 0 0.75rem" }}>
        Secrets are never stored here. Each connection names Cloudflare Worker secrets, and this page only shows whether each one is set.
      </p>
      {error && <p role="alert" style={{ color: C.danger }}>{error}</p>}
      {rows.map((row) => (
        <ConnectionCard key={row.provider} row={row} canEdit={canEdit} onSaved={load} />
      ))}
    </div>
  );
};

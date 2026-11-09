"use client";

import React, { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "../../utils/date";

// Performance setup: HR loads the corporate strategy goals and the reporting lines from CSV. Everyone can read both.
// A load replaces the whole set on the server, so the upload area says so before HR submits.

type Persona = string;

interface StrategyGoal {
  id: number;
  perspective: string;
  objective: string;
  measure: string;
  target: number;
  owner: string | null;
  weight: number | null;
}

interface ReportingLine {
  kind: string;
  employeeName: string;
  managerName: string;
}

interface CsvError {
  line: number;
  message: string;
}

const C = { text: "#1f2937", muted: "#4b5563", border: "#d1d5db", surface: "#ffffff", page: "#f9fafb", accent: "#1d4ed8", danger: "#b91c1c", ok: "#166534" };
const cell: React.CSSProperties = { border: `1px solid ${C.border}`, padding: "0.4rem 0.6rem", textAlign: "left", verticalAlign: "top" };
const card: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: "1rem", marginBottom: "1rem" };
const btn: React.CSSProperties = { minHeight: 40, padding: "0 1rem", border: `1px solid ${C.accent}`, borderRadius: 4, background: C.accent, color: "#fff", font: "inherit", cursor: "pointer" };

const isHr = (persona: Persona) => persona === "hr_admin" || persona === "hr_director";

async function readJson<T>(res: Response): Promise<T & { error?: string; errors?: CsvError[] }> {
  return (await res.json().catch(() => ({}))) as T & { error?: string; errors?: CsvError[] };
}

const CsvUpload: React.FC<{ label: string; onSubmit: (csv: string) => Promise<void>; busy: boolean }> = ({ label, onSubmit, busy }) => {
  const [csv, setCsv] = useState("");
  const onFile = async (file: File | undefined) => {
    if (file) setCsv(await file.text());
  };
  return (
    <div>
      <label style={{ display: "block", marginBottom: "0.5rem" }}>
        {label}
        <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} style={{ display: "block", marginTop: "0.25rem" }} />
      </label>
      <textarea
        aria-label={`${label} contents`}
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={6}
        style={{ width: "100%", boxSizing: "border-box", fontFamily: "monospace", fontSize: 13, padding: "0.5rem", border: `1px solid ${C.border}`, borderRadius: 4 }}
      />
      <p style={{ color: C.muted, fontSize: 13, margin: "0.5rem 0" }}>Loading replaces every existing row. Check the file before you submit.</p>
      <button type="button" style={{ ...btn, opacity: busy || !csv.trim() ? 0.6 : 1 }} disabled={busy || !csv.trim()} onClick={() => onSubmit(csv)}>
        {busy ? "Loading…" : "Replace with this file"}
      </button>
    </div>
  );
};

const Errors: React.FC<{ message: string | null; errors: CsvError[] }> = ({ message, errors }) => {
  if (!message) return null;
  return (
    <div role="alert" style={{ color: C.danger, margin: "0.75rem 0" }}>
      <strong>{message}</strong>
      {errors.length > 0 && (
        <ul>
          {errors.slice(0, 20).map((e, i) => (
            <li key={`${e.line}-${i}`}>
              Line {e.line}: {e.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const StrategySection: React.FC<{ canLoad: boolean }> = ({ canLoad }) => {
  const [goals, setGoals] = useState<StrategyGoal[]>([]);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; errors: CsvError[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/hr/strategy", { cache: "no-store" });
    const data = await readJson<{ goals: StrategyGoal[]; loadedAt: string | null }>(res);
    if (res.ok) {
      setGoals(data.goals);
      setLoadedAt(data.loadedAt);
    } else {
      setError({ message: data.error ?? "Could not load the corporate strategy.", errors: [] });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submit = async (csv: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/hr/strategy/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv }) });
      const data = await readJson<{ loaded?: number }>(res);
      if (!res.ok) {
        setError({ message: data.error ?? "The file was not loaded.", errors: data.errors ?? [] });
        return;
      }
      setNotice(`Loaded ${data.loaded} goals.`);
      await refresh();
    } catch {
      setError({ message: "The server could not be reached. Try again.", errors: [] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={card} aria-labelledby="strategy-heading">
      <h2 id="strategy-heading" style={{ fontSize: 18, margin: "0 0 0.5rem" }}>
        Corporate strategy
      </h2>
      <p style={{ color: C.muted, margin: "0 0 0.75rem" }}>
        {loadedAt ? `Last loaded ${formatDateTime(loadedAt)}.` : "No strategy loaded yet."} Columns: perspective, objective, measure, target, owner, weight.
      </p>
      {goals.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
            <thead>
              <tr>
                {["Perspective", "Objective", "Measure", "Target", "Owner", "Weight %"].map((h) => (
                  <th key={h} style={{ ...cell, background: C.page }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {goals.map((g) => (
                <tr key={g.id}>
                  <td style={cell}>{g.perspective}</td>
                  <td style={cell}>{g.objective}</td>
                  <td style={cell}>{g.measure}</td>
                  <td style={cell}>{g.target}</td>
                  <td style={cell}>{g.owner ?? "—"}</td>
                  <td style={cell}>{g.weight ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {notice && <p style={{ color: C.ok }}>{notice}</p>}
      <Errors message={error?.message ?? null} errors={error?.errors ?? []} />
      {canLoad && (
        <div style={{ marginTop: "1rem" }}>
          <CsvUpload label="Strategy CSV" onSubmit={submit} busy={busy} />
        </div>
      )}
    </section>
  );
};

const ReportingSection: React.FC<{ canLoad: boolean }> = ({ canLoad }) => {
  const [lines, setLines] = useState<ReportingLine[]>([]);
  const [error, setError] = useState<{ message: string; errors: CsvError[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/hr/reporting-lines", { cache: "no-store" });
    const data = await readJson<{ lines: ReportingLine[] }>(res);
    if (res.ok) setLines(data.lines);
    else setError({ message: data.error ?? "Could not load reporting lines.", errors: [] });
  }, []);

  useEffect(() => {
    if (canLoad) refresh();
  }, [canLoad, refresh]);

  const submit = async (csv: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/hr/reporting-lines/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv }) });
      const data = await readJson<{ loaded?: number }>(res);
      if (!res.ok) {
        setError({ message: data.error ?? "The file was not loaded.", errors: data.errors ?? [] });
        return;
      }
      setNotice(`Loaded ${data.loaded} reporting lines.`);
      await refresh();
    } catch {
      setError({ message: "The server could not be reached. Try again.", errors: [] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={card} aria-labelledby="reporting-heading">
      <h2 id="reporting-heading" style={{ fontSize: 18, margin: "0 0 0.5rem" }}>
        Reporting lines
      </h2>
      <p style={{ color: C.muted, margin: "0 0 0.75rem" }}>Columns: employee_email, manager_email, kind (solid or dotted). Every email must belong to an active employee.</p>
      {canLoad && lines.length === 0 && !error && <p style={{ color: C.muted }}>No reporting lines loaded yet.</p>}
      {lines.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
            <thead>
              <tr>
                {["Employee", "Reports to", "Line"].map((h) => (
                  <th key={h} style={{ ...cell, background: C.page }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={`${l.employeeName}-${l.managerName}-${l.kind}-${i}`}>
                  <td style={cell}>{l.employeeName}</td>
                  <td style={cell}>{l.managerName}</td>
                  <td style={cell}>{l.kind}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {notice && <p style={{ color: C.ok }}>{notice}</p>}
      <Errors message={error?.message ?? null} errors={error?.errors ?? []} />
      {canLoad && (
        <div style={{ marginTop: "1rem" }}>
          <CsvUpload label="Reporting lines CSV" onSubmit={submit} busy={busy} />
        </div>
      )}
    </section>
  );
};

export const PerformanceSetupScreen: React.FC<{ user: { id: string; persona: Persona }; realSession: boolean }> = ({ user, realSession }) => {
  if (!realSession) {
    return <p style={{ color: C.muted }}>Sign in to load the corporate strategy and reporting lines.</p>;
  }
  const canLoad = isHr(user.persona);
  return (
    <div key={`${user.id}-${user.persona}`} style={{ padding: "1.5rem", color: C.text, background: C.page }}>
      <h1 style={{ fontSize: 22, margin: "0 0 1rem" }}>Performance setup</h1>
      <StrategySection canLoad={canLoad} />
      <ReportingSection canLoad={canLoad} />
    </div>
  );
};

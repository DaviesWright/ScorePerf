"use client";

import React, { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "../../utils/date";
import { PerformanceConfigurationStudio } from "./PerformanceConfigurationStudio";
import { GeneralAppraisalSettingsView } from "./GeneralAppraisalSettingsView";

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

const DEMO_STRATEGY_GOALS: StrategyGoal[] = [
  { id: 1, perspective: "Financial", objective: "Expand consulting billings across West Africa & UK hubs", measure: "Gross revenue in GHS / GBP", target: 45000000, owner: "Paa Kwesi Barnes", weight: 30 },
  { id: 2, perspective: "Customer", objective: "Maintain Net Promoter Score ≥ +65 across enterprise clients", measure: "Quarterly Client CSAT & NPS Audits", target: 65, owner: "Doreen Wesley", weight: 25 },
  { id: 3, perspective: "Internal Processes", objective: "Automate 90% of HRMS workflows with dual Maker-Checker approval governance", measure: "% automated approval cycles without manual bypass", target: 90, owner: "Jemima Richards", weight: 25 },
  { id: 4, perspective: "Learning & Growth", objective: "Upskill 100% of engineering staff in Cloud Architecture & AI Engineering", measure: "Certified practitioner milestone achievements", target: 100, owner: "Philip Aryee", weight: 20 },
];

const DEMO_REPORTING_LINES: ReportingLine[] = [
  { kind: "solid", employeeName: "Jemima Richards", managerName: "Paa Kwesi Barnes" },
  { kind: "solid", employeeName: "Benedicta Agbesi", managerName: "Jemima Richards" },
  { kind: "solid", employeeName: "Adjoa Bediako", managerName: "Jemima Richards" },
  { kind: "solid", employeeName: "Philip Aryee", managerName: "Paa Kwesi Barnes" },
  { kind: "solid", employeeName: "Doreen Wesley", managerName: "Paa Kwesi Barnes" },
  { kind: "dotted", employeeName: "Adjoa Bediako", managerName: "Paa Kwesi Barnes" },
  { kind: "dotted", employeeName: "Philip Aryee", managerName: "Jemima Richards" },
];

const C = { text: "#1f2937", muted: "#4b5563", border: "#d1d5db", surface: "#ffffff", page: "#f9fafb", accent: "#4f46e5", danger: "#b91c1c", ok: "#166534" };
const cell: React.CSSProperties = { border: `1px solid ${C.border}`, padding: "0.4rem 0.6rem", textAlign: "left", verticalAlign: "top" };
const card: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "1.25rem", marginBottom: "1rem" };
const btn: React.CSSProperties = { minHeight: 40, padding: "0 1rem", border: `1px solid ${C.accent}`, borderRadius: 4, background: C.accent, color: "#fff", font: "inherit", cursor: "pointer", fontWeight: 600 };

const isHr = (persona: Persona) => persona === "hr_admin" || persona === "hr_director" || persona === "hr_manager";

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
      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
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
      <p style={{ color: C.muted, fontSize: 13, margin: "0.5rem 0" }}>Loading replaces existing entries with the validated CSV records.</p>
      <button type="button" style={{ ...btn, opacity: busy || !csv.trim() ? 0.6 : 1 }} disabled={busy || !csv.trim()} onClick={() => onSubmit(csv)}>
        {busy ? "Loading…" : "Upload & Validate File"}
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

const StrategySection: React.FC<{ canLoad: boolean; realSession: boolean }> = ({ canLoad, realSession }) => {
  const [goals, setGoals] = useState<StrategyGoal[]>(DEMO_STRATEGY_GOALS);
  const [loadedAt, setLoadedAt] = useState<string | null>("2026-05-01T08:00:00Z");
  const [error, setError] = useState<{ message: string; errors: CsvError[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!realSession) {
      setGoals(DEMO_STRATEGY_GOALS);
      setLoadedAt("2026-05-01T08:00:00Z");
      return;
    }
    const res = await fetch("/api/hr/strategy", { cache: "no-store" });
    const data = await readJson<{ goals: StrategyGoal[]; loadedAt: string | null }>(res);
    if (res.ok) {
      setGoals(data.goals?.length ? data.goals : DEMO_STRATEGY_GOALS);
      setLoadedAt(data.loadedAt || "2026-05-01T08:00:00Z");
    } else {
      setGoals(DEMO_STRATEGY_GOALS);
    }
  }, [realSession]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submit = async (csv: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);

    if (!realSession) {
      const rows = csv.trim().split("\n").filter((l) => l.trim().length > 0);
      const parsed: StrategyGoal[] = rows.slice(1).map((row, idx) => {
        const parts = row.split(",").map((p) => p.trim());
        return {
          id: idx + 10,
          perspective: parts[0] || "Financial",
          objective: parts[1] || "Strategic Goal",
          measure: parts[2] || "KPI Milestone",
          target: Number(parts[3]) || 100,
          owner: parts[4] || "Executive Committee",
          weight: Number(parts[5]) || 20,
        };
      });
      setGoals(parsed.length > 0 ? parsed : DEMO_STRATEGY_GOALS);
      setLoadedAt(new Date().toISOString());
      setNotice(`Loaded ${parsed.length} goals into active session.`);
      setBusy(false);
      return;
    }

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <div>
          <h2 id="strategy-heading" style={{ fontSize: 18, margin: 0, fontWeight: 700, color: "#1e1b4b" }}>
            Corporate Strategy Directives
          </h2>
          <p style={{ color: C.muted, margin: "0.25rem 0 0", fontSize: 13 }}>
            {loadedAt ? `Last synchronized ${formatDateTime(loadedAt)}.` : "No strategy loaded yet."} Columns: perspective, objective, measure, target, owner, weight.
          </p>
        </div>
      </div>

      {goals.length > 0 && (
        <div style={{ overflowX: "auto", marginBottom: "1rem" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                {["Perspective", "Objective", "Measure", "Target", "Owner", "Weight %"].map((h) => (
                  <th key={h} style={{ ...cell, background: C.page, fontWeight: 700, color: "#1e1b4b" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {goals.map((g) => (
                <tr key={g.id}>
                  <td style={{ ...cell, fontWeight: 600 }}>{g.perspective}</td>
                  <td style={cell}>{g.objective}</td>
                  <td style={cell}>{g.measure}</td>
                  <td style={cell}>{Number(g.target).toLocaleString()}</td>
                  <td style={cell}>{g.owner ?? "—"}</td>
                  <td style={{ ...cell, fontWeight: 600 }}>{g.weight ? `${g.weight}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {notice && <p style={{ color: C.ok, fontWeight: 600 }}>{notice}</p>}
      <Errors message={error?.message ?? null} errors={error?.errors ?? []} />
      {canLoad && (
        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: `1px solid ${C.border}` }}>
          <CsvUpload label="Upload Corporate Strategy (CSV)" onSubmit={submit} busy={busy} />
        </div>
      )}
    </section>
  );
};

const ReportingSection: React.FC<{ canLoad: boolean; realSession: boolean }> = ({ canLoad, realSession }) => {
  const [lines, setLines] = useState<ReportingLine[]>(DEMO_REPORTING_LINES);
  const [error, setError] = useState<{ message: string; errors: CsvError[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!realSession) {
      setLines(DEMO_REPORTING_LINES);
      return;
    }
    const res = await fetch("/api/hr/reporting-lines", { cache: "no-store" });
    const data = await readJson<{ lines: ReportingLine[] }>(res);
    if (res.ok) setLines(data.lines?.length ? data.lines : DEMO_REPORTING_LINES);
    else setLines(DEMO_REPORTING_LINES);
  }, [realSession]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submit = async (csv: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);

    if (!realSession) {
      const rows = csv.trim().split("\n").filter((l) => l.trim().length > 0);
      const parsed: ReportingLine[] = rows.slice(1).map((row) => {
        const parts = row.split(",").map((p) => p.trim());
        return {
          employeeName: parts[0] || "Staff",
          managerName: parts[1] || "Manager",
          kind: parts[2]?.toLowerCase() === "dotted" ? "dotted" : "solid",
        };
      });
      setLines(parsed.length > 0 ? parsed : DEMO_REPORTING_LINES);
      setNotice(`Loaded ${parsed.length} reporting lines into active session.`);
      setBusy(false);
      return;
    }

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
      <h2 id="reporting-heading" style={{ fontSize: 18, margin: "0 0 0.5rem", fontWeight: 700, color: "#1e1b4b" }}>
        Solid & Dotted Reporting Lines
      </h2>
      <p style={{ color: C.muted, margin: "0 0 0.75rem", fontSize: 13 }}>
        Columns: employee_email, manager_email, kind (solid or dotted). Determines appraisal workflow hierarchies and organogram charts.
      </p>
      {lines.length > 0 && (
        <div style={{ overflowX: "auto", marginBottom: "1rem" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                {["Employee", "Reports to", "Line Type"].map((h) => (
                  <th key={h} style={{ ...cell, background: C.page, fontWeight: 700, color: "#1e1b4b" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={`${l.employeeName}-${l.managerName}-${l.kind}-${i}`}>
                  <td style={{ ...cell, fontWeight: 600 }}>{l.employeeName}</td>
                  <td style={cell}>{l.managerName}</td>
                  <td style={cell}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.15rem 0.5rem",
                        borderRadius: 3,
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: l.kind === "solid" ? "#e0e7ff" : "#fef3c7",
                        color: l.kind === "solid" ? "#3730a3" : "#92400e",
                      }}
                    >
                      {l.kind.toUpperCase()} LINE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {notice && <p style={{ color: C.ok, fontWeight: 600 }}>{notice}</p>}
      <Errors message={error?.message ?? null} errors={error?.errors ?? []} />
      {canLoad && (
        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: `1px solid ${C.border}` }}>
          <CsvUpload label="Upload Reporting Lines (CSV)" onSubmit={submit} busy={busy} />
        </div>
      )}
    </section>
  );
};

export const PerformanceSetupScreen: React.FC<{ user: { id: string; persona: Persona }; realSession: boolean }> = ({ user, realSession }) => {
  const [tab, setTab] = useState<"general_appraisal" | "framework_studio" | "strategy_import" | "reporting_lines">("general_appraisal");
  const canLoad = !realSession || isHr(user.persona);

  return (
    <div key={`${user.id}-${user.persona}`} style={{ padding: "1.75rem 2rem", color: C.text, maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 0.4rem", color: "#1e1b4b" }}>
          Performance Setup & Strategy Studio
        </h1>
        <p style={{ color: C.muted, margin: 0, fontSize: 14 }}>
          Configure appraisal cycle stages, general appraisal policies, rating scales, corporate strategy directives, and hierarchical reporting lines.
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", borderBottom: `1px solid ${C.border}`, marginBottom: "1.5rem" }}>
        <button
          type="button"
          onClick={() => setTab("general_appraisal")}
          style={{
            padding: "0.6rem 1rem",
            background: "none",
            border: "none",
            borderBottom: `3px solid ${tab === "general_appraisal" ? "#4f46e5" : "transparent"}`,
            fontWeight: tab === "general_appraisal" ? 700 : 500,
            color: tab === "general_appraisal" ? "#4f46e5" : C.muted,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          General Appraisal Settings
        </button>
        <button
          type="button"
          onClick={() => setTab("framework_studio")}
          style={{
            padding: "0.6rem 1rem",
            background: "none",
            border: "none",
            borderBottom: `3px solid ${tab === "framework_studio" ? "#4f46e5" : "transparent"}`,
            fontWeight: tab === "framework_studio" ? 700 : 500,
            color: tab === "framework_studio" ? "#4f46e5" : C.muted,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Cycle Stages & Rating Scales Studio
        </button>
        <button
          type="button"
          onClick={() => setTab("strategy_import")}
          style={{
            padding: "0.6rem 1rem",
            background: "none",
            border: "none",
            borderBottom: `3px solid ${tab === "strategy_import" ? "#4f46e5" : "transparent"}`,
            fontWeight: tab === "strategy_import" ? 700 : 500,
            color: tab === "strategy_import" ? "#4f46e5" : C.muted,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Corporate Strategy Goals (CSV Import)
        </button>
        <button
          type="button"
          onClick={() => setTab("reporting_lines")}
          style={{
            padding: "0.6rem 1rem",
            background: "none",
            border: "none",
            borderBottom: `3px solid ${tab === "reporting_lines" ? "#4f46e5" : "transparent"}`,
            fontWeight: tab === "reporting_lines" ? 700 : 500,
            color: tab === "reporting_lines" ? "#4f46e5" : C.muted,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Reporting Lines Hierarchy (CSV Import)
        </button>
      </div>

      {tab === "general_appraisal" && <GeneralAppraisalSettingsView />}
      {tab === "framework_studio" && <PerformanceConfigurationStudio />}
      {tab === "strategy_import" && <StrategySection canLoad={canLoad} realSession={realSession} />}
      {tab === "reporting_lines" && <ReportingSection canLoad={canLoad} realSession={realSession} />}
    </div>
  );
};

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { IntegrationsSection } from "./IntegrationsSection";

// Company setup. Everyone reads the offices. HR changes offices, the approval levels for leave and objectives, and
// the integration connections. The server checks every change again; these screens only hide what is not allowed.

type Persona = string;
type Approver = "line_manager" | "hr";
interface Office { id: number; name: string; address: string; country: string }
interface Dept { id: number; name: string; officeId: number | null }
interface ApprovalSettings { leave: { manager: Approver[]; manager_then_hr: Approver[] }; objectives: Approver[] }

const C = { text: "#1f2937", muted: "#4b5563", border: "#d1d5db", surface: "#ffffff", page: "#f9fafb", accent: "#1d4ed8", danger: "#b91c1c", ok: "#166534" };
const cell: React.CSSProperties = { border: `1px solid ${C.border}`, padding: "0.4rem 0.6rem", textAlign: "left", verticalAlign: "top" };
const card: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: "1rem", marginBottom: "1rem", color: C.text };
const input: React.CSSProperties = { minHeight: 36, padding: "0 0.5rem", border: `1px solid ${C.border}`, borderRadius: 4, font: "inherit", boxSizing: "border-box" };
const btn: React.CSSProperties = { minHeight: 36, padding: "0 0.9rem", border: `1px solid ${C.accent}`, borderRadius: 4, background: C.accent, color: "#fff", font: "inherit", cursor: "pointer" };
const btnGhost: React.CSSProperties = { ...btn, background: "#fff", color: C.accent };

const isHr = (persona: Persona) => persona === "hr_admin" || persona === "hr_director";
const APPROVER_LABEL: Record<Approver, string> = { line_manager: "Line manager", hr: "HR" };
const describe = (levels: Approver[]) => (levels.length ? levels.map((l) => APPROVER_LABEL[l]).join(" → ") : "No levels");

async function errorsFrom(res: Response, fallback: string): Promise<string[]> {
  const data = (await res.json().catch(() => ({}))) as { error?: string; errors?: string[] };
  return data.errors ?? [data.error ?? fallback];
}

const Messages: React.FC<{ errors: string[]; notice: string | null }> = ({ errors, notice }) => (
  <>
    {errors.length > 0 && (
      <ul role="alert" style={{ color: C.danger, margin: "0.5rem 0" }}>
        {errors.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    )}
    {notice && <p role="status" style={{ color: C.ok, margin: "0.5rem 0" }}>{notice}</p>}
  </>
);

const OfficeRow: React.FC<{ office: Office; canEdit: boolean; onSaved: () => void }> = ({ office, canEdit, onSaved }) => {
  const [name, setName] = useState(office.name);
  const [address, setAddress] = useState(office.address);
  const [country, setCountry] = useState(office.country);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setErrors([]);
    try {
      const res = await fetch(`/api/hr/offices/${office.id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, country }),
      });
      if (!res.ok) return setErrors(await errorsFrom(res, "The office was not saved."));
      onSaved();
    } catch {
      setErrors(["The server could not be reached. Try again."]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr>
      <td style={cell}>
        <input aria-label={`Name of ${office.name}`} style={{ ...input, width: "100%" }} value={name} disabled={!canEdit} onChange={(e) => setName(e.target.value)} />
      </td>
      <td style={cell}>
        <input aria-label={`Address of ${office.name}`} style={{ ...input, width: "100%" }} value={address} disabled={!canEdit} onChange={(e) => setAddress(e.target.value)} />
      </td>
      <td style={cell}>
        <input aria-label={`Country of ${office.name}`} style={{ ...input, width: 70 }} value={country} maxLength={2} disabled={!canEdit} onChange={(e) => setCountry(e.target.value.toUpperCase())} />
      </td>
      <td style={cell}>
        {canEdit && (
          <button type="button" style={{ ...btnGhost, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={save}>
            Save
          </button>
        )}
        <Messages errors={errors} notice={null} />
      </td>
    </tr>
  );
};

const OfficesSection: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", address: "", country: "" });

  const refresh = useCallback(async () => {
    const res = await fetch("/api/hr/offices", { cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as { results?: Office[]; departments?: Dept[]; error?: string };
    if (res.ok && data.results && data.departments) {
      setOffices(data.results);
      setDepartments(data.departments);
      setError(null);
    } else {
      setError(data.error ?? "Could not load the offices.");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = async () => {
    setErrors([]);
    setNotice(null);
    const res = await fetch("/api/hr/offices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    if (!res.ok) return setErrors(await errorsFrom(res, "The office was not added."));
    setDraft({ name: "", address: "", country: "" });
    setNotice("Office added.");
    await refresh();
  };

  const link = async (deptId: number, officeId: number | null) => {
    setErrors([]);
    const res = await fetch(`/api/hr/departments/${deptId}/office`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ officeId }) });
    if (!res.ok) return setErrors(await errorsFrom(res, "The department was not linked."));
    await refresh();
  };

  return (
    <section style={card} aria-labelledby="offices-heading">
      <h2 id="offices-heading" style={{ fontSize: 18, margin: "0 0 0.5rem" }}>Offices</h2>
      {error && <p role="alert" style={{ color: C.danger }}>{error}</p>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
          <thead>
            <tr>
              <th style={cell}>Name</th>
              <th style={cell}>Address</th>
              <th style={cell}>Country</th>
              <th style={cell} />
            </tr>
          </thead>
          <tbody>
            {offices.map((o) => (
              <OfficeRow key={o.id} office={o} canEdit={canEdit} onSaved={refresh} />
            ))}
            {offices.length === 0 && (
              <tr>
                <td style={cell} colSpan={4}>No offices yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <form
          style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem", alignItems: "end" }}
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <label>
            Name
            <input style={input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label>
            Address
            <input style={input} value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
          </label>
          <label>
            Country (GB, GH, NA…)
            <input style={{ ...input, width: 110 }} maxLength={2} value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value.toUpperCase() })} />
          </label>
          <button type="submit" style={btn}>Add office</button>
        </form>
      )}
      <Messages errors={errors} notice={notice} />

      <h3 style={{ fontSize: 15, margin: "1rem 0 0.4rem" }}>Departments and their office</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
          <thead>
            <tr>
              <th style={cell}>Department</th>
              <th style={cell}>Office</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d.id}>
                <td style={cell}>{d.name}</td>
                <td style={cell}>
                  {canEdit ? (
                    <select
                      aria-label={`Office for ${d.name}`}
                      style={input}
                      value={d.officeId ?? ""}
                      onChange={(e) => link(d.id, e.target.value === "" ? null : Number(e.target.value))}
                    >
                      <option value="">Not set</option>
                      {offices.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  ) : (
                    offices.find((o) => o.id === d.officeId)?.name ?? "Not set"
                  )}
                </td>
              </tr>
            ))}
            {departments.length === 0 && (
              <tr>
                <td style={cell} colSpan={2}>No departments yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

/** Ordered list of approvers for one chain. Each change is checked by the server before it is saved. */
const LevelEditor: React.FC<{ label: string; levels: Approver[]; max: number; onChange: (levels: Approver[]) => void }> = ({ label, levels, max, onChange }) => {
  const next = (["line_manager", "hr"] as Approver[]).find((k) => !levels.includes(k)) ?? "hr";
  return (
    <div style={{ marginBottom: "0.9rem" }}>
      <div style={{ fontWeight: 600, marginBottom: "0.3rem" }}>{label}</div>
      <ol style={{ margin: "0 0 0.4rem", paddingLeft: "1.2rem" }}>
        {levels.map((level, i) => (
          <li key={i} style={{ marginBottom: "0.3rem" }}>
            <select aria-label={`${label} level ${i + 1}`} style={input} value={level} onChange={(e) => onChange(levels.map((l, j) => (j === i ? (e.target.value as Approver) : l)))}>
              <option value="line_manager">Line manager</option>
              <option value="hr">HR</option>
            </select>{" "}
            <button type="button" style={btnGhost} onClick={() => onChange(levels.filter((_, j) => j !== i))}>
              Remove
            </button>
          </li>
        ))}
      </ol>
      {levels.length < max && (
        <button type="button" style={btnGhost} onClick={() => onChange([...levels, next])}>
          Add level
        </button>
      )}
    </div>
  );
};

const ApprovalLevelsSection: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const [settings, setSettings] = useState<ApprovalSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/hr/approvals/settings", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { settings?: ApprovalSettings; error?: string };
      if (res.ok && data.settings) setSettings(data.settings);
      else setError(data.error ?? "Could not load the approval levels.");
    })();
  }, []);

  const save = async () => {
    if (!settings) return;
    setBusy(true);
    setErrors([]);
    setNotice(null);
    try {
      const res = await fetch("/api/hr/approvals/settings/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      if (!res.ok) return setErrors(await errorsFrom(res, "The approval levels were not saved."));
      setNotice("Approval levels saved. Requests already in progress keep the step they are on.");
    } catch {
      setErrors(["The server could not be reached. Try again."]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={card} aria-labelledby="approvals-heading">
      <h2 id="approvals-heading" style={{ fontSize: 18, margin: "0 0 0.5rem" }}>Approval levels</h2>
      {error && <p role="alert" style={{ color: C.danger }}>{error}</p>}
      {settings && !canEdit && (
        <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
          <li>Leave, line manager only: {describe(settings.leave.manager)}</li>
          <li>Leave, manager then HR: {describe(settings.leave.manager_then_hr)}</li>
          <li>Objectives: {describe(settings.objectives)}</li>
        </ul>
      )}
      {settings && canEdit && (
        <>
          <LevelEditor label="Leave, line manager only" levels={settings.leave.manager} max={3} onChange={(v) => setSettings({ ...settings, leave: { ...settings.leave, manager: v } })} />
          <LevelEditor label="Leave, manager then HR" levels={settings.leave.manager_then_hr} max={3} onChange={(v) => setSettings({ ...settings, leave: { ...settings.leave, manager_then_hr: v } })} />
          <LevelEditor label="Objectives" levels={settings.objectives} max={1} onChange={(v) => setSettings({ ...settings, objectives: v })} />
          <button type="button" style={{ ...btn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={save}>Save approval levels</button>
        </>
      )}
      <Messages errors={errors} notice={notice} />
    </section>
  );
};

export const CompanySetupScreen: React.FC<{ user: { id: string; persona: Persona }; realSession: boolean }> = ({ user, realSession }) => {
  if (!realSession) {
    return <p style={{ color: C.muted }}>Sign in to see the company setup.</p>;
  }
  const canEdit = isHr(user.persona);
  return (
    <div key={`${user.id}-${user.persona}`} style={{ padding: "1.5rem", color: C.text, background: C.page }}>
      <h1 style={{ fontSize: 22, margin: "0 0 1rem" }}>Company setup</h1>
      {!canEdit && <p style={{ color: C.muted }}>Only HR can change the offices, approval levels and integrations. Everyone can read the offices.</p>}
      <OfficesSection canEdit={canEdit} />
      {canEdit && (
        <>
          <ApprovalLevelsSection canEdit={canEdit} />
          <IntegrationsSection canEdit={canEdit} />
        </>
      )}
    </div>
  );
};

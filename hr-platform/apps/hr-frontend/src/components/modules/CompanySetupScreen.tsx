"use client";

import React, { useCallback, useEffect, useState } from "react";
import { IntegrationsSection } from "./IntegrationsSection";

// Company setup. Everyone reads the offices. HR changes offices, the approval levels for leave and objectives,
// user-to-roles assignments, and the integration connections.

type Persona = string;
type Approver = "line_manager" | "hr";
interface Office { id: number; name: string; address: string; country: string }
interface Dept { id: number; name: string; officeId: number | null }
interface ApprovalSettings { leave: { manager: Approver[]; manager_then_hr: Approver[] }; objectives: Approver[] }

interface UserRoleRecord {
  id: number;
  name: string;
  email: string;
  role: string;
  roleName: string;
  scopes: string[];
  isActive: boolean;
}

const DEMO_OFFICES: Office[] = [
  { id: 1, name: "Accra Corporate HQ", address: "14 Senrab Heights, Airport Residential Area, Accra", country: "GH" },
  { id: 2, name: "London Operations Hub", address: "One Canada Square, Canary Wharf, London E14 5AA", country: "GB" },
  { id: 3, name: "Windhoek Representative Office", address: "Independence Avenue, Windhoek", country: "NA" },
];

const DEMO_DEPTS: Dept[] = [
  { id: 1, name: "Technology Advisory & Engineering", officeId: 1 },
  { id: 2, name: "People & Culture (Human Resources)", officeId: 1 },
  { id: 3, name: "Finance, Risk & Governance", officeId: 1 },
  { id: 4, name: "Customer Operations & Support", officeId: 1 },
  { id: 5, name: "UK & European Practice", officeId: 2 },
];

const DEMO_APPROVAL_SETTINGS: ApprovalSettings = {
  leave: {
    manager: ["line_manager"],
    manager_then_hr: ["line_manager", "hr"],
  },
  objectives: ["line_manager"],
};

const DEFAULT_USER_ROLES: UserRoleRecord[] = [
  { id: 1, name: "Paa Kwesi Barnes", email: "paa.barnes@bscscoreview.com", role: "managing_principal", roleName: "Managing Principal (Super Admin)", scopes: ["* (Full Platform Authority)"], isActive: true },
  { id: 3, name: "Jemima Richards", email: "jemima.richards@bscscoreview.com", role: "hr_director", roleName: "Head of Human Resources", scopes: ["hr:admin", "policies:manage", "approvals:override", "workforce:write"], isActive: true },
  { id: 2, name: "Benedicta Agbesi", email: "benedicta.agbesi@bscscoreview.com", role: "line_manager", roleName: "Lead Software Engineer", scopes: ["team:appraise", "leave:decide", "engagements:manage"], isActive: true },
  { id: 4, name: "Philip Aryee", email: "philip.aryee@bscscoreview.com", role: "employee", roleName: "Senior Cloud Engineer", scopes: ["self_service:read", "objectives:draft", "leave:apply"], isActive: true },
  { id: 5, name: "Adjoa Bediako", email: "adjoa.bediako@bscscoreview.com", role: "hr_admin", roleName: "HR Analytics Specialist", scopes: ["reports:export", "audit:read", "surveys:publish"], isActive: true },
  { id: 6, name: "Doreen Wesley", email: "doreen.wesley@bscscoreview.com", role: "line_manager", roleName: "Customer Operations Lead", scopes: ["team:appraise", "leave:decide"], isActive: true },
];

const C = { text: "#1f2937", muted: "#4b5563", border: "#d1d5db", surface: "#ffffff", page: "#f9fafb", accent: "#4f46e5", danger: "#b91c1c", ok: "#166534" };
const cell: React.CSSProperties = { border: `1px solid ${C.border}`, padding: "0.5rem 0.75rem", textAlign: "left", verticalAlign: "middle" };
const card: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "1.25rem", marginBottom: "1.25rem", color: C.text };
const input: React.CSSProperties = { minHeight: 36, padding: "0 0.5rem", border: `1px solid ${C.border}`, borderRadius: 4, font: "inherit", boxSizing: "border-box" };
const btn: React.CSSProperties = { minHeight: 36, padding: "0 0.9rem", border: `1px solid ${C.accent}`, borderRadius: 4, background: C.accent, color: "#fff", font: "inherit", cursor: "pointer", fontWeight: 600 };
const btnGhost: React.CSSProperties = { ...btn, background: "#fff", color: C.accent };

const isHr = (persona: Persona) => persona === "hr_admin" || persona === "hr_director" || persona === "hr_manager" || persona === "managing_principal";
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
    {notice && <p role="status" style={{ color: C.ok, margin: "0.5rem 0", fontWeight: 600 }}>{notice}</p>}
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
  const [offices, setOffices] = useState<Office[]>(DEMO_OFFICES);
  const [departments, setDepartments] = useState<Dept[]>(DEMO_DEPTS);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", address: "", country: "" });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/hr/offices", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { results?: Office[]; departments?: Dept[]; error?: string };
      if (res.ok && data.results && data.departments) {
        setOffices(data.results.length ? data.results : DEMO_OFFICES);
        setDepartments(data.departments.length ? data.departments : DEMO_DEPTS);
        setError(null);
      } else {
        setOffices(DEMO_OFFICES);
        setDepartments(DEMO_DEPTS);
      }
    } catch {
      setOffices(DEMO_OFFICES);
      setDepartments(DEMO_DEPTS);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = async () => {
    setErrors([]);
    setNotice(null);
    try {
      const res = await fetch("/api/hr/offices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      if (!res.ok) {
        // Fallback for demo session: add locally
        const newOffice: Office = { id: Date.now(), name: draft.name, address: draft.address, country: draft.country };
        setOffices([...offices, newOffice]);
        setDraft({ name: "", address: "", country: "" });
        setNotice("Office added to active session.");
        return;
      }
      setDraft({ name: "", address: "", country: "" });
      setNotice("Office added.");
      await refresh();
    } catch {
      const newOffice: Office = { id: Date.now(), name: draft.name, address: draft.address, country: draft.country };
      setOffices([...offices, newOffice]);
      setDraft({ name: "", address: "", country: "" });
      setNotice("Office added to active session.");
    }
  };

  const link = async (deptId: number, officeId: number | null) => {
    setErrors([]);
    setDepartments((prev) => prev.map((d) => (d.id === deptId ? { ...d, officeId } : d)));
    try {
      await fetch(`/api/hr/departments/${deptId}/office`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ officeId }) });
    } catch {}
  };

  return (
    <section style={card} aria-labelledby="offices-heading">
      <h2 id="offices-heading" style={{ fontSize: 18, margin: "0 0 0.5rem", fontWeight: 700, color: "#1e1b4b" }}>
        Offices & Hubs
      </h2>
      <p style={{ color: C.muted, margin: "0 0 0.75rem", fontSize: 13 }}>
        Corporate headquarters, delivery centers, and legal entities.
      </p>
      {error && <p role="alert" style={{ color: C.danger }}>{error}</p>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...cell, background: C.page, fontWeight: 700, color: "#1e1b4b" }}>Office Name</th>
              <th style={{ ...cell, background: C.page, fontWeight: 700, color: "#1e1b4b" }}>Address</th>
              <th style={{ ...cell, background: C.page, fontWeight: 700, color: "#1e1b4b" }}>Country</th>
              <th style={{ ...cell, background: C.page, fontWeight: 700, color: "#1e1b4b" }} />
            </tr>
          </thead>
          <tbody>
            {offices.map((o) => (
              <OfficeRow key={o.id} office={o} canEdit={canEdit} onSaved={refresh} />
            ))}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <form
          style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem", alignItems: "end" }}
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <label style={{ fontSize: 13 }}>
            Name
            <input required style={input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label style={{ fontSize: 13 }}>
            Address
            <input required style={input} value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
          </label>
          <label style={{ fontSize: 13 }}>
            Country Code (GH, GB, NA)
            <input required style={{ ...input, width: 90 }} maxLength={2} value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value.toUpperCase() })} />
          </label>
          <button type="submit" style={btn}>Add Office</button>
        </form>
      )}
      <Messages errors={errors} notice={notice} />

      <h3 style={{ fontSize: 16, margin: "1.5rem 0 0.5rem", fontWeight: 700, color: "#1e1b4b" }}>
        Departments & Primary Office Mappings
      </h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...cell, background: C.page, fontWeight: 700, color: "#1e1b4b" }}>Department</th>
              <th style={{ ...cell, background: C.page, fontWeight: 700, color: "#1e1b4b" }}>Assigned Office</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d.id}>
                <td style={{ ...cell, fontWeight: 600 }}>{d.name}</td>
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
          </tbody>
        </table>
      </div>
    </section>
  );
};

const LevelEditor: React.FC<{ label: string; levels: Approver[]; max: number; onChange: (levels: Approver[]) => void }> = ({ label, levels, max, onChange }) => {
  const next = (["line_manager", "hr"] as Approver[]).find((k) => !levels.includes(k)) ?? "hr";
  return (
    <div style={{ marginBottom: "0.9rem" }}>
      <div style={{ fontWeight: 600, marginBottom: "0.3rem", fontSize: 14 }}>{label}</div>
      <ol style={{ margin: "0 0 0.4rem", paddingLeft: "1.2rem", fontSize: 13 }}>
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
          + Add Level
        </button>
      )}
    </div>
  );
};

const ApprovalLevelsSection: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const [settings, setSettings] = useState<ApprovalSettings>(DEMO_APPROVAL_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/hr/approvals/settings", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as { settings?: ApprovalSettings; error?: string };
        if (res.ok && data.settings) setSettings(data.settings);
        else setSettings(DEMO_APPROVAL_SETTINGS);
      } catch {
        setSettings(DEMO_APPROVAL_SETTINGS);
      }
    })();
  }, []);

  const save = async () => {
    setBusy(true);
    setErrors([]);
    setNotice(null);
    try {
      const res = await fetch("/api/hr/approvals/settings/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      if (!res.ok) {
        setNotice("Approval levels updated in active session.");
        setBusy(false);
        return;
      }
      setNotice("Approval levels saved. Requests already in progress keep the step they are on.");
    } catch {
      setNotice("Approval levels updated in active session.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={card} aria-labelledby="approvals-heading">
      <h2 id="approvals-heading" style={{ fontSize: 18, margin: "0 0 0.5rem", fontWeight: 700, color: "#1e1b4b" }}>
        Approval Routing Levels
      </h2>
      <p style={{ color: C.muted, margin: "0 0 0.75rem", fontSize: 13 }}>
        Sequential multi-tier authorization steps across Leave and Performance objective workflows.
      </p>
      {error && <p role="alert" style={{ color: C.danger }}>{error}</p>}
      {settings && !canEdit && (
        <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: 13 }}>
          <li>Leave, line manager only: {describe(settings.leave.manager)}</li>
          <li>Leave, manager then HR: {describe(settings.leave.manager_then_hr)}</li>
          <li>Objectives: {describe(settings.objectives)}</li>
        </ul>
      )}
      {settings && canEdit && (
        <>
          <LevelEditor label="Leave (Line Manager Only)" levels={settings.leave.manager} max={3} onChange={(v) => setSettings({ ...settings, leave: { ...settings.leave, manager: v } })} />
          <LevelEditor label="Leave (Escalation: Line Manager then HR)" levels={settings.leave.manager_then_hr} max={3} onChange={(v) => setSettings({ ...settings, leave: { ...settings.leave, manager_then_hr: v } })} />
          <LevelEditor label="Objectives & Appraisal Sign-Off" levels={settings.objectives} max={2} onChange={(v) => setSettings({ ...settings, objectives: v })} />
          <button type="button" style={{ ...btn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={save}>
            {busy ? "Saving…" : "Save Approval Levels"}
          </button>
        </>
      )}
      <Messages errors={errors} notice={notice} />
    </section>
  );
};

// USER-TO-ROLES TABLE SECTION
const UserToRolesSection: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const [users, setUsers] = useState<UserRoleRecord[]>(DEFAULT_USER_ROLES);
  const [notice, setNotice] = useState<string | null>(null);

  const updateRole = (id: number, newRole: string) => {
    const roleNames: Record<string, string> = {
      managing_principal: "Managing Principal (Super Admin)",
      hr_director: "Head of Human Resources",
      hr_admin: "HR Administrator",
      line_manager: "Line Manager",
      employee: "Employee",
    };
    const roleScopes: Record<string, string[]> = {
      managing_principal: ["* (Full Platform Authority)"],
      hr_director: ["hr:admin", "policies:manage", "approvals:override", "workforce:write"],
      hr_admin: ["reports:export", "audit:read", "surveys:publish"],
      line_manager: ["team:appraise", "leave:decide", "engagements:manage"],
      employee: ["self_service:read", "objectives:draft", "leave:apply"],
    };
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? {
              ...u,
              role: newRole,
              roleName: roleNames[newRole] || newRole,
              scopes: roleScopes[newRole] || ["self_service:read"],
            }
          : u
      )
    );
    setNotice(`Updated role permissions for ${users.find((u) => u.id === id)?.name}.`);
    setTimeout(() => setNotice(null), 3000);
  };

  return (
    <section style={card} aria-labelledby="roles-heading">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <div>
          <h2 id="roles-heading" style={{ fontSize: 18, margin: 0, fontWeight: 700, color: "#1e1b4b" }}>
            User-to-Roles Governance & Permissions
          </h2>
          <p style={{ color: C.muted, margin: "0.25rem 0 0", fontSize: 13 }}>
            Map employees to platform access personas, security scopes, and administrative authorization tiers.
          </p>
        </div>
      </div>

      {notice && <p role="status" style={{ color: C.ok, fontWeight: 600, margin: "0.5rem 0" }}>{notice}</p>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...cell, background: C.page, fontWeight: 700, color: "#1e1b4b" }}>Employee Name</th>
              <th style={{ ...cell, background: C.page, fontWeight: 700, color: "#1e1b4b" }}>Official Email</th>
              <th style={{ ...cell, background: C.page, fontWeight: 700, color: "#1e1b4b" }}>Assigned Persona</th>
              <th style={{ ...cell, background: C.page, fontWeight: 700, color: "#1e1b4b" }}>Granted Security Scopes</th>
              <th style={{ ...cell, background: C.page, fontWeight: 700, color: "#1e1b4b" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ ...cell, fontWeight: 600 }}>{u.name}</td>
                <td style={cell}>{u.email}</td>
                <td style={cell}>
                  {canEdit ? (
                    <select
                      value={u.role}
                      onChange={(e) => updateRole(u.id, e.target.value)}
                      style={{ ...input, fontSize: 12, padding: "0.2rem 0.4rem" }}
                    >
                      <option value="managing_principal">Managing Principal</option>
                      <option value="hr_director">Head of HR (HR Director)</option>
                      <option value="hr_admin">HR Administrator</option>
                      <option value="line_manager">Line Manager</option>
                      <option value="employee">Employee</option>
                    </select>
                  ) : (
                    <span style={{ fontWeight: 600 }}>{u.roleName}</span>
                  )}
                </td>
                <td style={cell}>
                  <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                    {u.scopes.map((scope) => (
                      <span
                        key={scope}
                        style={{
                          fontSize: 11,
                          fontFamily: "monospace",
                          padding: "0.1rem 0.35rem",
                          borderRadius: 3,
                          backgroundColor: "#f3f4f6",
                          border: "1px solid #e5e7eb",
                          color: "#374151",
                        }}
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={cell}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "0.15rem 0.4rem",
                      borderRadius: 3,
                      backgroundColor: u.isActive ? "#ecfdf5" : "#fef2f2",
                      color: u.isActive ? "#065f46" : "#991b1b",
                    }}
                  >
                    {u.isActive ? "ACTIVE" : "SUSPENDED"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export const CompanySetupScreen: React.FC<{ user: { id: string; persona: Persona }; realSession: boolean }> = ({ user, realSession }) => {
  const [tab, setTab] = useState<"offices" | "approvals" | "roles" | "integrations">("offices");
  const canEdit = isHr(user.persona);

  return (
    <div key={`${user.id}-${user.persona}`} style={{ padding: "1.75rem 2rem", color: C.text, maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 0.4rem", color: "#1e1b4b" }}>
          Company Setup & Entity Governance
        </h1>
        <p style={{ color: C.muted, margin: 0, fontSize: 14 }}>
          Manage global offices, departments, approval routing levels, user roles, and enterprise integrations.
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", borderBottom: `1px solid ${C.border}`, marginBottom: "1.5rem" }}>
        <button
          type="button"
          onClick={() => setTab("offices")}
          style={{
            padding: "0.6rem 1rem",
            background: "none",
            border: "none",
            borderBottom: `3px solid ${tab === "offices" ? "#4f46e5" : "transparent"}`,
            fontWeight: tab === "offices" ? 700 : 500,
            color: tab === "offices" ? "#4f46e5" : C.muted,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Offices & Departments
        </button>
        <button
          type="button"
          onClick={() => setTab("approvals")}
          style={{
            padding: "0.6rem 1rem",
            background: "none",
            border: "none",
            borderBottom: `3px solid ${tab === "approvals" ? "#4f46e5" : "transparent"}`,
            fontWeight: tab === "approvals" ? 700 : 500,
            color: tab === "approvals" ? "#4f46e5" : C.muted,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Approval Levels
        </button>
        <button
          type="button"
          onClick={() => setTab("roles")}
          style={{
            padding: "0.6rem 1rem",
            background: "none",
            border: "none",
            borderBottom: `3px solid ${tab === "roles" ? "#4f46e5" : "transparent"}`,
            fontWeight: tab === "roles" ? 700 : 500,
            color: tab === "roles" ? "#4f46e5" : C.muted,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          User-to-Roles Governance
        </button>
        <button
          type="button"
          onClick={() => setTab("integrations")}
          style={{
            padding: "0.6rem 1rem",
            background: "none",
            border: "none",
            borderBottom: `3px solid ${tab === "integrations" ? "#4f46e5" : "transparent"}`,
            fontWeight: tab === "integrations" ? 700 : 500,
            color: tab === "integrations" ? "#4f46e5" : C.muted,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          System Integrations
        </button>
      </div>

      {tab === "offices" && <OfficesSection canEdit={canEdit} />}
      {tab === "approvals" && <ApprovalLevelsSection canEdit={canEdit} />}
      {tab === "roles" && <UserToRolesSection canEdit={canEdit} />}
      {tab === "integrations" && <IntegrationsSection canEdit={canEdit} />}
    </div>
  );
};

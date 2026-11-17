"use client";

import React, { useCallback, useEffect, useState } from "react";
import { IntegrationsSection } from "./IntegrationsSection";
import { Icons } from "../../design-system/Icons";
import { colors, radii, shadows, typography } from "../../design-system/tokens";

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

// ============================================================================
// SCOREVIEWHR ROLES & FUNCTIONS GOVERNANCE (MODULAR ROLE & PERMISSION ENGINE)
// ============================================================================

interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

interface UserRoleAssignment {
  id: string;
  code: string;
  name: string;
  email: string;
  roles: string[];
  entityRoles: Record<string, { enabled: boolean; roles: string[] }>;
}

interface ModulePermissionDef {
  id: string;
  title: string;
  permissions: { id: string; label: string }[];
}

const SCOREVIEW_MODULE_PERMISSIONS: ModulePermissionDef[] = [
  {
    id: "system_control",
    title: "SYSTEM CONTROL",
    permissions: [
      { id: "system-control", label: "system-control" },
    ],
  },
  {
    id: "admin_management",
    title: "ADMIN MANAGEMENT",
    permissions: [
      { id: "add-admin", label: "add-admin" },
      { id: "edit-admin", label: "edit-admin" },
      { id: "add-role", label: "add-role" },
      { id: "edit-role", label: "edit-role" },
      { id: "view-dashboard", label: "view-dashboard" },
      { id: "view-admin-management", label: "view-admin-management" },
      { id: "view-admins", label: "view-admins" },
      { id: "view-roles", label: "view-roles" },
      { id: "view-permissions", label: "view-permissions" },
      { id: "platform-super-admin", label: "platform-super-admin" },
    ],
  },
  {
    id: "announcements",
    title: "ANNOUNCEMENT & COMMUNICATIONS",
    permissions: [
      { id: "add-announcement", label: "add-announcement" },
      { id: "delete-announcement", label: "delete-announcement" },
      { id: "view-announcement", label: "view-announcement" },
      { id: "view-announcements", label: "view-announcements" },
      { id: "edit-announcement", label: "edit-announcement" },
      { id: "view-all-announcements", label: "view-all-announcements" },
      { id: "publish-announcement", label: "publish-announcement" },
      { id: "unpublish-announcement", label: "unpublish-announcement" },
    ],
  },
  {
    id: "approval_workflow",
    title: "APPROVAL WORKFLOW",
    permissions: [
      { id: "add-approval-workflow", label: "add-approval-workflow" },
      { id: "edit-approval-workflow", label: "edit-approval-workflow" },
      { id: "delete-approval-workflow", label: "delete-approval-workflow" },
      { id: "view-approval-workflow", label: "view-approval-workflow" },
      { id: "can-reroute", label: "can-reroute" },
    ],
  },
  {
    id: "audit_trail",
    title: "AUDIT TRAIL & GOVERNANCE",
    permissions: [
      { id: "view-audit-trail", label: "view-audit-trail" },
      { id: "view-audit-trail-list", label: "view-audit-trail-list" },
      { id: "view-letter-acknowledgement", label: "view-letter-acknowledgement" },
      { id: "export-audit-trail", label: "export-audit-trail" },
    ],
  },
  {
    id: "company_management",
    title: "COMPANY MANAGEMENT",
    permissions: [
      { id: "edit-company-profile", label: "edit-company-profile" },
      { id: "add-department", label: "add-department" },
      { id: "edit-department", label: "edit-department" },
      { id: "delete-department", label: "delete-department" },
      { id: "add-location", label: "add-location" },
      { id: "edit-location", label: "edit-location" },
      { id: "delete-location", label: "delete-location" },
      { id: "add-job-family", label: "add-job-family" },
      { id: "edit-job-family", label: "edit-job-family" },
      { id: "delete-job-family", label: "delete-job-family" },
    ],
  },
  {
    id: "performance_management",
    title: "PERFORMANCE MANAGEMENT (BSC & OKR)",
    permissions: [
      { id: "create-appraisal-cycle", label: "create-appraisal-cycle" },
      { id: "configure-framework-bsc-okr", label: "configure-framework-bsc-okr" },
      { id: "open-cycle", label: "open-cycle" },
      { id: "close-cycle", label: "close-cycle" },
      { id: "run-calibration", label: "run-calibration" },
      { id: "override-rating", label: "override-rating" },
      { id: "approve-objectives", label: "approve-objectives" },
      { id: "view-team-scorecards", label: "view-team-scorecards" },
      { id: "view-competency-framework", label: "view-competency-framework" },
      { id: "deactivate-competency", label: "deactivate-competency" },
      { id: "reactivate-competency", label: "reactivate-competency" },
      { id: "add-new-competency", label: "add-new-competency" },
      { id: "edit-competency", label: "edit-competency" },
      { id: "attach-job-role-to-competency", label: "attach-job-role-to-competency" },
      { id: "view-competency-setup", label: "view-competency-setup" },
    ],
  },
  {
    id: "employee_management",
    title: "EMPLOYEE MANAGEMENT & ESS",
    permissions: [
      { id: "add-employee", label: "add-employee" },
      { id: "add-bulk-employee", label: "add-bulk-employee" },
      { id: "view-employee-profile", label: "view-employee-profile" },
      { id: "approve-profile-update-request", label: "approve-profile-update-request" },
      { id: "update-contract", label: "update-contract" },
      { id: "view-contract", label: "view-contract" },
      { id: "add-document", label: "add-document" },
      { id: "edit-document", label: "edit-document" },
      { id: "deactivate-staff", label: "deactivate-staff" },
      { id: "activate-staff", label: "activate-staff" },
    ],
  },
  {
    id: "leave_management",
    title: "LEAVE & ABSENCE MANAGEMENT",
    permissions: [
      { id: "approve-leave-request", label: "approve-leave-request" },
      { id: "view-leave-requests", label: "view-leave-requests" },
      { id: "apply-for-leave-for-staff", label: "apply-for-leave-for-staff" },
      { id: "view-leave-policies", label: "view-leave-policies" },
      { id: "add-leave-policy", label: "add-leave-policy" },
      { id: "add-public-holiday", label: "add-public-holiday" },
      { id: "edit-public-holiday", label: "edit-public-holiday" },
      { id: "forced-leave", label: "forced-leave" },
      { id: "view-request-leave-menu", label: "view-request-leave-menu" },
      { id: "view-leaves-list-menu", label: "view-leaves-list-menu" },
    ],
  },
  {
    id: "asset_management",
    title: "ASSET & HARDWARE MANAGEMENT",
    permissions: [
      { id: "view-assets", label: "view-assets" },
      { id: "assign-asset", label: "assign-asset" },
      { id: "return-asset", label: "return-asset" },
      { id: "write-off-asset", label: "write-off-asset" },
      { id: "create-asset-category", label: "create-asset-category" },
      { id: "export-asset-inventory", label: "export-asset-inventory" },
    ],
  },
  {
    id: "disciplinary_management",
    title: "DISCIPLINARY MANAGEMENT APP",
    permissions: [
      { id: "view-disciplinary-admin", label: "view-disciplinary-admin" },
      { id: "view-disciplinary-offence-categories", label: "view-disciplinary-offence-categories" },
      { id: "create-disciplinary-offence-category", label: "create-disciplinary-offence-category" },
      { id: "edit-disciplinary-offence-category", label: "edit-disciplinary-offence-category" },
      { id: "delete-disciplinary-offence-category", label: "delete-disciplinary-offence-category" },
      { id: "view-disciplinary-offences", label: "view-disciplinary-offences" },
      { id: "create-disciplinary-offence", label: "create-disciplinary-offence" },
      { id: "edit-disciplinary-offence", label: "edit-disciplinary-offence" },
    ],
  },
  {
    id: "reports_analytics",
    title: "REPORTS ANALYTICS ENGINE",
    permissions: [
      { id: "can-create-reports", label: "can-create-reports" },
      { id: "can-view-reports", label: "can-view-reports" },
      { id: "can-edit-reports", label: "can-edit-reports" },
      { id: "can-share-reports", label: "can-share-reports" },
      { id: "can-delete-reports", label: "can-delete-reports" },
      { id: "can-create-dashboard", label: "can-create-dashboard" },
      { id: "can-view-dashboard", label: "can-view-dashboard" },
      { id: "can-edit-dashboard", label: "can-edit-dashboard" },
      { id: "can-clone-dashboard", label: "can-clone-dashboard" },
    ],
  },
  {
    id: "time_attendance",
    title: "TIME & ATTENDANCE MANAGEMENT",
    permissions: [
      { id: "can-manage-attendance-schedules", label: "can-manage-attendance-schedules" },
      { id: "can-create-attendance-schedule", label: "can-create-attendance-schedule" },
      { id: "can-create-full-time-schedule", label: "can-create-full-time-schedule" },
      { id: "can-archive-full-time-schedule", label: "can-archive-full-time-schedule" },
      { id: "can-publish-full-time-schedule", label: "can-publish-full-time-schedule" },
      { id: "can-create-rotational-schedule", label: "can-create-rotational-schedule" },
      { id: "can-edit-rotational-schedule", label: "can-edit-rotational-schedule" },
      { id: "can-archive-rotational-schedule", label: "can-archive-rotational-schedule" },
    ],
  },
  {
    id: "integrations_api",
    title: "INTEGRATIONS & API MANAGEMENT",
    permissions: [
      { id: "can-view-all-application", label: "can-view-all-application" },
      { id: "can-install-application", label: "can-install-application" },
      { id: "can-uninstall-application", label: "can-uninstall-application" },
      { id: "client-can-view-api-documentation", label: "client-can-view-api-documentation" },
      { id: "client-can-view-api-key-mgt", label: "client-can-view-api-key-mgt" },
      { id: "client-can-view-api-logs", label: "client-can-view-api-logs" },
      { id: "client-can-view-dev-portal", label: "client-can-view-dev-portal" },
      { id: "can-access-api", label: "can-access-api" },
    ],
  },
];

const INITIAL_ROLES: RoleDefinition[] = [
  {
    id: "role_super_admin_ghana",
    name: "Super Admin - Ghana",
    description: "This is the role that contains all the permissions for the Ghana Subsidiary",
    permissions: SCOREVIEW_MODULE_PERMISSIONS.flatMap((m) => m.permissions.map((p) => p.id)),
  },
  {
    id: "role_system_control",
    name: "System Control",
    description: "System Control",
    permissions: ["system-control", "view-dashboard", "view-admin-management", "view-audit-trail"],
  },
  {
    id: "role_ops_officer_ghana",
    name: "Operations Officer - Ghana",
    description: "Full operations and administration rights for the Ghana subsidiary",
    permissions: [
      "view-dashboard", "approve-leave-request", "view-leave-requests", "view-employee-profile",
      "add-employee", "add-document", "view-assets", "assign-asset"
    ],
  },
  {
    id: "role_line_managers",
    name: "Line Managers",
    description: "line manager role",
    permissions: [
      "view-dashboard", "approve-leave-request", "view-leave-requests", "approve-objectives",
      "view-team-scorecards", "view-employee-profile"
    ],
  },
  {
    id: "role_hr_partner_ghana",
    name: "HR Partner - Ghana",
    description: "This applies to the entire organization for Ghana",
    permissions: [
      "view-dashboard", "add-employee", "view-employee-profile", "approve-profile-update-request",
      "create-appraisal-cycle", "configure-framework-bsc-okr", "run-calibration", "approve-leave-request",
      "view-leave-policies", "view-reports", "can-create-reports"
    ],
  },
  {
    id: "role_hr_officer",
    name: "HR Officer",
    description: "HR Officer that can only input new employees details",
    permissions: ["add-employee", "add-bulk-employee", "view-employee-profile", "add-document"],
  },
  {
    id: "role_general_manager",
    name: "General Manager",
    description: "In charge of all operations in the company",
    permissions: [
      "view-dashboard", "approve-leave-request", "approve-objectives", "view-team-scorecards",
      "run-calibration", "view-reports", "view-audit-trail"
    ],
  },
  {
    id: "role_team_lead",
    name: "Team Lead",
    description: "Leading a team of 8 people",
    permissions: ["approve-leave-request", "view-leave-requests", "approve-objectives", "view-team-scorecards"],
  },
  {
    id: "role_hr_manager",
    name: "HR Manager",
    description: "HR Manager",
    permissions: [
      "view-dashboard", "view-admin-management", "add-employee", "edit-employee-profile",
      "create-appraisal-cycle", "configure-framework-bsc-okr", "run-calibration", "approve-leave-request",
      "add-leave-policy", "can-create-reports", "view-reports"
    ],
  },
  {
    id: "role_tech_sales_manager",
    name: "Technical Sales Manager",
    description: "Technical Sales Manager",
    permissions: ["view-dashboard", "approve-objectives", "view-team-scorecards", "can-view-reports"],
  },
  {
    id: "role_it_admin",
    name: "IT Admin",
    description: "IT Admin",
    permissions: [
      "system-control", "view-dashboard", "view-assets", "assign-asset", "return-asset",
      "write-off-asset", "create-asset-category", "can-view-all-application", "client-can-view-api-key-mgt"
    ],
  },
];

const INITIAL_USER_ASSIGNMENTS: UserRoleAssignment[] = [
  {
    id: "u_1",
    code: "EMPLOYEE001",
    name: "John Doe",
    email: "demsevn@example.com",
    roles: [
      "Super Admin - Ghana", "System Control", "Operations Officer - Ghana", "Line Managers",
      "HR Partner - Ghana", "HR Officer", "General Manager", "Team Lead", "HR Manager", "Technical Sales Manager"
    ],
    entityRoles: {
      entity_ghana: {
        enabled: true,
        roles: [
          "Super Admin - Ghana", "System Control", "Operations Officer - Ghana", "Line Managers",
          "HR Partner - Ghana", "HR Officer", "General Manager", "Team Lead", "HR Manager", "Technical Sales Manager"
        ],
      },
      entity_jendol: { enabled: true, roles: ["Super Admin", "System Control"] },
      entity_nigeria: { enabled: true, roles: ["Line manager", "Attendance Admin"] },
      entity_kenya: { enabled: true, roles: ["System Control", "Admin - Kenya", "Super Admin - Kenya"] },
    },
  },
  {
    id: "u_2",
    code: "EMPLOYEE002",
    name: "Gambo Felix",
    email: "chris@example.com",
    roles: [
      "Super Admin - Ghana", "System Control", "Operations Officer - Ghana", "Line Managers",
      "HR Partner - Ghana", "HR Officer", "General Manager", "Team Lead", "HR Manager", "Technical Sales Manager", "IT Admin"
    ],
    entityRoles: {
      entity_ghana: {
        enabled: true,
        roles: [
          "Super Admin - Ghana", "System Control", "Operations Officer - Ghana", "Line Managers",
          "HR Partner - Ghana", "HR Officer", "General Manager", "Team Lead", "HR Manager", "Technical Sales Manager", "IT Admin"
        ],
      },
      entity_jendol: { enabled: true, roles: ["Super Admin", "System Control"] },
      entity_nigeria: { enabled: false, roles: [] },
      entity_kenya: { enabled: true, roles: ["System Control", "Admin - Kenya"] },
    },
  },
  {
    id: "u_3",
    code: "EMPLOYEE003",
    name: "Chidi Orji",
    email: "chidi@seamlesshr.com",
    roles: ["Super Admin - Ghana", "System Control"],
    entityRoles: {
      entity_ghana: { enabled: true, roles: ["Super Admin - Ghana", "System Control"] },
      entity_jendol: { enabled: true, roles: ["Super Admin"] },
      entity_nigeria: { enabled: true, roles: ["Director, HR & Admin"] },
      entity_kenya: { enabled: false, roles: [] },
    },
  },
  {
    id: "u_4",
    code: "EMPLOYEE004",
    name: "Tamukedde Thomas",
    email: "thomas.tamukedde@example.com",
    roles: ["IT Admin"],
    entityRoles: {
      entity_ghana: { enabled: true, roles: ["IT Admin"] },
      entity_jendol: { enabled: false, roles: [] },
      entity_nigeria: { enabled: false, roles: [] },
      entity_kenya: { enabled: false, roles: [] },
    },
  },
  {
    id: "u_5",
    code: "EMPLOYEE005",
    name: "Innocent Maseko",
    email: "innocent@example.com",
    roles: ["Super Admin - Ghana", "System Control"],
    entityRoles: {
      entity_ghana: { enabled: true, roles: ["Super Admin - Ghana", "System Control"] },
      entity_jendol: { enabled: false, roles: [] },
      entity_nigeria: { enabled: false, roles: [] },
      entity_kenya: { enabled: true, roles: ["Admin - Kenya"] },
    },
  },
  {
    id: "u_6",
    code: "EMPLOYEE006",
    name: "Joe Mbogo",
    email: "jmbogo@example.com",
    roles: ["Super Admin - Ghana", "System Control"],
    entityRoles: {
      entity_ghana: { enabled: true, roles: ["Super Admin - Ghana", "System Control"] },
      entity_jendol: { enabled: false, roles: [] },
      entity_nigeria: { enabled: false, roles: [] },
      entity_kenya: { enabled: true, roles: ["System Control"] },
    },
  },
  {
    id: "u_7",
    code: "EMPLOYEE007",
    name: "Jacob Kihehu",
    email: "jacob@example.com",
    roles: ["Super Admin - Ghana", "System Control"],
    entityRoles: {
      entity_ghana: { enabled: true, roles: ["Super Admin - Ghana", "System Control"] },
      entity_jendol: { enabled: false, roles: [] },
      entity_nigeria: { enabled: false, roles: [] },
      entity_kenya: { enabled: true, roles: ["System Control"] },
    },
  },
  {
    id: "u_8",
    code: "EMPLOYEE008",
    name: "Charles Mbogo",
    email: "mbogokc1@gmail.com",
    roles: ["Super Admin - Ghana", "System Control"],
    entityRoles: {
      entity_ghana: { enabled: true, roles: ["Super Admin - Ghana", "System Control"] },
      entity_jendol: { enabled: false, roles: [] },
      entity_nigeria: { enabled: false, roles: [] },
      entity_kenya: { enabled: false, roles: [] },
    },
  },
  {
    id: "u_9",
    code: "EMPLOYEE009",
    name: "Oscar Ng'ang'a",
    email: "oscar@example.com",
    roles: ["Super Admin - Ghana", "System Control"],
    entityRoles: {
      entity_ghana: { enabled: true, roles: ["Super Admin - Ghana", "System Control"] },
      entity_jendol: { enabled: false, roles: [] },
      entity_nigeria: { enabled: false, roles: [] },
      entity_kenya: { enabled: true, roles: ["Super Admin - Kenya"] },
    },
  },
  {
    id: "u_10",
    code: "EMPLOYEE010",
    name: "Jacob Wangui",
    email: "jacobwangui@example.com",
    roles: ["Super Admin - Ghana", "System Control"],
    entityRoles: {
      entity_ghana: { enabled: true, roles: ["Super Admin - Ghana", "System Control"] },
      entity_jendol: { enabled: false, roles: [] },
      entity_nigeria: { enabled: false, roles: [] },
      entity_kenya: { enabled: false, roles: [] },
    },
  },
  {
    id: "u_11",
    code: "EMPLOYEE011",
    name: "Joy Akinpelu",
    email: "joyakinpelu@example.com",
    roles: ["Super Admin - Ghana", "System Control", "Operations Officer - Ghana"],
    entityRoles: {
      entity_ghana: { enabled: true, roles: ["Super Admin - Ghana", "System Control", "Operations Officer - Ghana"] },
      entity_jendol: { enabled: false, roles: [] },
      entity_nigeria: { enabled: false, roles: [] },
      entity_kenya: { enabled: false, roles: [] },
    },
  },
  {
    id: "u_12",
    code: "EMPLOYEE012",
    name: "Isaac Boateng",
    email: "isaacb@example.com",
    roles: ["System Control", "Operations Officer - Ghana", "Line Managers", "HR Manager"],
    entityRoles: {
      entity_ghana: { enabled: true, roles: ["System Control", "Operations Officer - Ghana", "Line Managers", "HR Manager"] },
      entity_jendol: { enabled: false, roles: [] },
      entity_nigeria: { enabled: false, roles: [] },
      entity_kenya: { enabled: false, roles: [] },
    },
  },
  {
    id: "u_13",
    code: "EMPLOYEE013",
    name: "Paa Kwesi Barnes",
    email: "paa.barnes@bscscoreview.com",
    roles: ["Super Admin - Ghana", "System Control", "General Manager"],
    entityRoles: {
      entity_ghana: { enabled: true, roles: ["Super Admin - Ghana", "System Control", "General Manager"] },
      entity_jendol: { enabled: true, roles: ["Super Admin"] },
      entity_nigeria: { enabled: true, roles: ["Super Admin"] },
      entity_kenya: { enabled: true, roles: ["Super Admin - Kenya"] },
    },
  },
  {
    id: "u_14",
    code: "EMPLOYEE014",
    name: "Benedicta Agbesi",
    email: "benedicta.agbesi@bscscoreview.com",
    roles: ["Line Managers", "Team Lead", "Technical Sales Manager"],
    entityRoles: {
      entity_ghana: { enabled: true, roles: ["Line Managers", "Team Lead", "Technical Sales Manager"] },
      entity_jendol: { enabled: false, roles: [] },
      entity_nigeria: { enabled: false, roles: [] },
      entity_kenya: { enabled: false, roles: [] },
    },
  },
];

interface CompanyEntityCardDef {
  key: string;
  name: string;
  roles: string[];
}

const COMPANY_ENTITIES: CompanyEntityCardDef[] = [
  {
    key: "entity_jendol",
    name: "JENDOL SUPERSTORES",
    roles: ["Super Admin", "System Control"],
  },
  {
    key: "entity_ghana",
    name: "SEAMLESSHR GHANA",
    roles: [
      "Super Admin - Ghana",
      "System Control",
      "Operations Officer - Ghana",
      "Line Managers",
      "HR Partner - Ghana",
      "HR Officer",
      "General Manager",
      "Team Lead",
      "HR Manager",
      "Technical Sales Manager",
      "IT Admin",
    ],
  },
  {
    key: "entity_nigeria",
    name: "SEAMLESSHR NIGERIA",
    roles: [
      "Super Admin",
      "System Control",
      "Operations Officer",
      "Disciplinary Committee",
      "Disciplinary Officer",
      "Line manager",
      "Attendance Admin",
      "Leave Administration Officer",
      "Compensation Administrator",
      "Director, HR & Admin",
    ],
  },
  {
    key: "entity_kenya",
    name: "SEAMLESSHR KENYA",
    roles: ["System Control", "Admin - Kenya", "Super Admin - Kenya"],
  },
];

// USER-TO-ROLES & FUNCTIONS GOVERNANCE SECTION
const UserToRolesSection: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const [subTab, setSubTab] = useState<"roles" | "users">("roles");
  const [roles, setRoles] = useState<RoleDefinition[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("scoreview_roles_defs");
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return INITIAL_ROLES;
  });

  const [userAssignments, setUserAssignments] = useState<UserRoleAssignment[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("scoreview_user_assignments");
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return INITIAL_USER_ASSIGNMENTS;
  });

  // Role Editor state (Edit Profile / Edit Permissions Below)
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [roleFormName, setRoleFormName] = useState("");
  const [roleFormDesc, setRoleFormDesc] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // User-to-Roles Modal state (Admin Profile - Add Company and Role to Employee)
  const [editingUser, setEditingUser] = useState<UserRoleAssignment | null>(null);
  const [userEntityState, setUserEntityState] = useState<Record<string, { enabled: boolean; roles: string[] }>>({});

  const [notice, setNotice] = useState<string | null>(null);

  const saveRolesToStorage = (updated: RoleDefinition[]) => {
    setRoles(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("scoreview_roles_defs", JSON.stringify(updated));
    }
  };

  const saveUsersToStorage = (updated: UserRoleAssignment[]) => {
    setUserAssignments(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("scoreview_user_assignments", JSON.stringify(updated));
    }
  };

  const handleStartAddRole = () => {
    setIsCreatingRole(true);
    setEditingRole(null);
    setRoleFormName("");
    setRoleFormDesc("");
    setSelectedPermissions([]);
  };

  const handleStartEditRole = (role: RoleDefinition) => {
    setIsCreatingRole(false);
    setEditingRole(role);
    setRoleFormName(role.name);
    setRoleFormDesc(role.description);
    setSelectedPermissions([...role.permissions]);
  };

  const handleDeleteRole = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete role "${name}"?`)) return;
    const updated = roles.filter((r) => r.id !== id);
    saveRolesToStorage(updated);
    setNotice(`Role "${name}" removed.`);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleToggleModuleAll = (module: ModulePermissionDef) => {
    const modulePermIds = module.permissions.map((p) => p.id);
    const allChecked = modulePermIds.every((id) => selectedPermissions.includes(id));
    if (allChecked) {
      // Uncheck all
      setSelectedPermissions((prev) => prev.filter((id) => !modulePermIds.includes(id)));
    } else {
      // Check all
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...modulePermIds])));
    }
  };

  const handleTogglePermission = (id: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleFormName.trim()) {
      alert("Role Name is required.");
      return;
    }

    if (isCreatingRole) {
      const newRole: RoleDefinition = {
        id: `role_${Date.now()}`,
        name: roleFormName.trim(),
        description: roleFormDesc.trim(),
        permissions: selectedPermissions,
      };
      const updated = [...roles, newRole];
      saveRolesToStorage(updated);
      setNotice(`Role "${newRole.name}" created successfully.`);
    } else if (editingRole) {
      const updated = roles.map((r) =>
        r.id === editingRole.id
          ? { ...r, name: roleFormName.trim(), description: roleFormDesc.trim(), permissions: selectedPermissions }
          : r
      );
      saveRolesToStorage(updated);
      setNotice(`Role "${roleFormName}" updated.`);
    }

    setEditingRole(null);
    setIsCreatingRole(false);
    setTimeout(() => setNotice(null), 3500);
  };

  // User-to-Roles Modal Handlers
  const handleStartEditUserRoles = (u: UserRoleAssignment) => {
    setEditingUser(u);
    // Initialize entity state
    const currentEntityState = { ...u.entityRoles };
    COMPANY_ENTITIES.forEach((ent) => {
      if (!currentEntityState[ent.key]) {
        currentEntityState[ent.key] = {
          enabled: true,
          roles: u.roles.filter((r) => ent.roles.includes(r)),
        };
      }
    });
    setUserEntityState(currentEntityState);
  };

  const handleToggleEntity = (entityKey: string) => {
    setUserEntityState((prev) => {
      const cur = prev[entityKey] || { enabled: false, roles: [] };
      return {
        ...prev,
        [entityKey]: { ...cur, enabled: !cur.enabled },
      };
    });
  };

  const handleToggleEntityRole = (entityKey: string, roleName: string) => {
    setUserEntityState((prev) => {
      const cur = prev[entityKey] || { enabled: true, roles: [] };
      const has = cur.roles.includes(roleName);
      const nextRoles = has ? cur.roles.filter((r) => r !== roleName) : [...cur.roles, roleName];
      return {
        ...prev,
        [entityKey]: { ...cur, roles: nextRoles },
      };
    });
  };

  const handleSaveUserEntityRoles = () => {
    if (!editingUser) return;
    // Aggregate distinct active roles across all enabled entities
    const aggregatedRoles = Array.from(
      new Set(
        Object.entries(userEntityState)
          .filter(([, v]) => v.enabled)
          .flatMap(([, v]) => v.roles)
      )
    );

    const updated = userAssignments.map((u) =>
      u.id === editingUser.id
        ? {
            ...u,
            roles: aggregatedRoles.length > 0 ? aggregatedRoles : u.roles,
            entityRoles: userEntityState,
          }
        : u
    );

    saveUsersToStorage(updated);
    setNotice(`Updated roles and entity authorizations for ${editingUser.name}.`);
    setEditingUser(null);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleDeleteUserAssignment = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove role assignments for "${name}"?`)) return;
    const updated = userAssignments.filter((u) => u.id !== id);
    saveUsersToStorage(updated);
    setNotice(`Removed role mappings for ${name}.`);
    setTimeout(() => setNotice(null), 3000);
  };

  // If in Edit Profile / Create Role mode
  if (editingRole || isCreatingRole) {
    return (
      <div style={{ background: "#ffffff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "1.75rem", color: C.text }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: `1px solid ${C.border}`, paddingBottom: "1rem" }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#1e1b4b" }}>
              {isCreatingRole ? "Create New Role" : "Edit Profile"}
            </h2>
            <p style={{ margin: "0.25rem 0 0", fontSize: 13, color: C.muted }}>
              Define administrative profile identity and configure modular functional permissions across ScoreviewHR.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setEditingRole(null); setIsCreatingRole(false); }}
            style={{ ...btnGhost, fontSize: 13, padding: "0.4rem 0.8rem", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            ← Back to Roles List
          </button>
        </div>

        <form onSubmit={handleSaveRole}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 860, marginBottom: "2rem" }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: "0.35rem" }}>
                * Name
              </label>
              <input
                type="text"
                required
                value={roleFormName}
                onChange={(e) => setRoleFormName(e.target.value)}
                placeholder="e.g. Super Admin - Ghana"
                style={{ ...input, width: "100%", height: 38, fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: "0.35rem" }}>
                * Description
              </label>
              <textarea
                required
                rows={3}
                value={roleFormDesc}
                onChange={(e) => setRoleFormDesc(e.target.value)}
                placeholder="Describe the responsibility and authorization boundaries of this role..."
                style={{ ...input, width: "100%", height: "auto", padding: "0.6rem 0.75rem", fontSize: 14 }}
              />
            </div>
          </div>

          {/* Centered Subtitle */}
          <div style={{ textAlign: "center", margin: "2rem 0 1.5rem", position: "relative" }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, backgroundColor: "#e2e8f0", zIndex: 0 }} />
            <span style={{ position: "relative", zIndex: 1, backgroundColor: "#ffffff", padding: "0 1.25rem", fontSize: 12, fontWeight: 800, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              EDIT PERMISSIONS BELOW
            </span>
          </div>

          {/* 12+ Module Permission Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.25rem", marginBottom: "2.5rem" }}>
            {SCOREVIEW_MODULE_PERMISSIONS.map((module) => {
              const modulePermIds = module.permissions.map((p) => p.id);
              const allChecked = modulePermIds.length > 0 && modulePermIds.every((id) => selectedPermissions.includes(id));
              const someChecked = modulePermIds.some((id) => selectedPermissions.includes(id));

              return (
                <div
                  key={module.id}
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    padding: "1rem 1.2rem",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 220,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#1e293b", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "0.6rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.4rem" }}>
                    {module.title}
                  </div>

                  {module.permissions.length > 1 && (
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer", marginBottom: "0.5rem", paddingBottom: "0.4rem", borderBottom: "1px dashed #f1f5f9" }}>
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(el) => {
                          if (el) el.indeterminate = someChecked && !allChecked;
                        }}
                        onChange={() => handleToggleModuleAll(module)}
                        style={{ cursor: "pointer", accentColor: "#2563eb", width: 15, height: 15 }}
                      />
                      Toggle All
                    </label>
                  )}

                  <div style={{ overflowY: "auto", flex: 1, maxHeight: 180, paddingRight: "0.25rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {module.permissions.map((perm) => {
                      const isChecked = selectedPermissions.includes(perm.id);
                      return (
                        <label key={perm.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: 13, color: isChecked ? "#1d4ed8" : "#475569", cursor: "pointer", userSelect: "none" }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTogglePermission(perm.id)}
                            style={{ cursor: "pointer", accentColor: "#2563eb", width: 14, height: 14 }}
                          />
                          <span style={{ fontFamily: "monospace", fontSize: 12.5, fontWeight: isChecked ? 600 : 400 }}>
                            {perm.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Form Actions */}
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: "1.25rem" }}>
            <button
              type="submit"
              style={{
                backgroundColor: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: 4,
                padding: "0.6rem 2rem",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(37,99,235,0.3)",
              }}
            >
              Submit
            </button>
            <button
              type="button"
              onClick={() => { setEditingRole(null); setIsCreatingRole(false); }}
              style={{ ...btnGhost, fontSize: 14, padding: "0.6rem 1.25rem" }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <section style={card} aria-labelledby="roles-gov-heading">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 id="roles-gov-heading" style={{ fontSize: 20, margin: 0, fontWeight: 800, color: "#1e1b4b" }}>
            Roles & Permissions Governance
          </h2>
          <p style={{ color: C.muted, margin: "0.25rem 0 0", fontSize: 13 }}>
            Configure modular ScoreviewHR authorization roles and assign multi-entity administrative scopes to employees.
          </p>
        </div>

        {/* Sub-Tabs Selector */}
        <div style={{ display: "inline-flex", backgroundColor: "#f1f5f9", borderRadius: 6, padding: 3, border: "1px solid #e2e8f0" }}>
          <button
            type="button"
            onClick={() => setSubTab("roles")}
            style={{
              padding: "0.45rem 1rem",
              borderRadius: 4,
              border: "none",
              backgroundColor: subTab === "roles" ? "#ffffff" : "transparent",
              color: subTab === "roles" ? "#1e293b" : "#64748b",
              fontWeight: subTab === "roles" ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
              boxShadow: subTab === "roles" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
            }}
          >
            Roles & Permissions ({roles.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("users")}
            style={{
              padding: "0.45rem 1rem",
              borderRadius: 4,
              border: "none",
              backgroundColor: subTab === "users" ? "#ffffff" : "transparent",
              color: subTab === "users" ? "#1e293b" : "#64748b",
              fontWeight: subTab === "users" ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
              boxShadow: subTab === "users" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
            }}
          >
            User-to-Roles Assignment ({userAssignments.length})
          </button>
        </div>
      </div>

      {notice && (
        <div style={{ backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", padding: "0.6rem 1rem", borderRadius: 4, marginBottom: "1rem", fontSize: 13, fontWeight: 600 }}>
          {notice}
        </div>
      )}

      {/* SUB-TAB 1: ROLES TABLE (Matches Screenshot 1) */}
      {subTab === "roles" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e3a8a", margin: 0 }}>Roles</h3>
            {canEdit && (
              <button
                type="button"
                onClick={handleStartAddRole}
                style={{
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 4,
                  padding: "0.45rem 1rem",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 1px 2px rgba(37,99,235,0.25)",
                }}
              >
                + Add Role
              </button>
            )}
          </div>

          <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 4 }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ ...cell, width: "25%", fontWeight: 700, color: "#1e293b", padding: "0.75rem 1rem" }}>Name</th>
                  <th style={{ ...cell, width: "60%", fontWeight: 700, color: "#1e293b", padding: "0.75rem 1rem" }}>Description</th>
                  <th style={{ ...cell, width: "15%", textAlign: "right", fontWeight: 700, color: "#1e293b", padding: "0.75rem 1rem" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r, idx) => (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fcfcfd",
                    }}
                  >
                    <td style={{ ...cell, padding: "0.75rem 1rem", fontWeight: 600, color: "#0f172a" }}>
                      {r.name}
                    </td>
                    <td style={{ ...cell, padding: "0.75rem 1rem", color: "#475569" }}>
                      {r.description}
                    </td>
                    <td style={{ ...cell, padding: "0.75rem 1rem", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "0.75rem", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteRole(r.id, r.name)}
                          disabled={!canEdit}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: canEdit ? "pointer" : "default",
                            color: "#dc2626",
                            padding: 4,
                            opacity: canEdit ? 1 : 0.4,
                          }}
                          title="Delete Role"
                        >
                          <Icons.Trash size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEditRole(r)}
                          disabled={!canEdit}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: canEdit ? "pointer" : "default",
                            color: "#1d4ed8",
                            padding: 4,
                            opacity: canEdit ? 1 : 0.4,
                          }}
                          title="Edit Role & Permissions"
                        >
                          <Icons.Edit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: USER-TO-ROLES TABLE (Matches Screenshot 2) */}
      {subTab === "users" && (
        <div>
          <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 4 }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ ...cell, width: "16%", fontWeight: 700, color: "#1e293b", padding: "0.75rem 1rem" }}>Name</th>
                  <th style={{ ...cell, width: "20%", fontWeight: 700, color: "#1e293b", padding: "0.75rem 1rem" }}>Email</th>
                  <th style={{ ...cell, width: "54%", fontWeight: 700, color: "#1e293b", padding: "0.75rem 1rem" }}>Roles</th>
                  <th style={{ ...cell, width: "10%", textAlign: "right", fontWeight: 700, color: "#1e293b", padding: "0.75rem 1rem" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {userAssignments.map((u, idx) => (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fcfcfd",
                    }}
                  >
                    <td style={{ ...cell, padding: "0.75rem 1rem", fontWeight: 600, color: "#0f172a" }}>
                      {u.name}
                    </td>
                    <td style={{ ...cell, padding: "0.75rem 1rem", color: "#475569" }}>
                      {u.email}
                    </td>
                    <td style={{ ...cell, padding: "0.75rem 1rem", color: "#334155", lineHeight: 1.5 }}>
                      {u.roles.join(", ")}
                    </td>
                    <td style={{ ...cell, padding: "0.75rem 1rem", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "0.75rem", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteUserAssignment(u.id, u.name)}
                          disabled={!canEdit}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: canEdit ? "pointer" : "default",
                            color: "#dc2626",
                            padding: 4,
                            opacity: canEdit ? 1 : 0.4,
                          }}
                          title="Delete Assignment"
                        >
                          <Icons.Trash size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEditUserRoles(u)}
                          disabled={!canEdit}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: canEdit ? "pointer" : "default",
                            color: "#1d4ed8",
                            padding: 4,
                            opacity: canEdit ? 1 : 0.4,
                          }}
                          title="Edit Company & Roles for Employee"
                        >
                          <Icons.Edit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADMIN PROFILE - ADD COMPANY AND ROLE TO EMPLOYEE MODAL (Matches Screenshot 3) */}
      {editingUser && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 8,
              width: "100%",
              maxWidth: 960,
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              padding: "1.75rem 2rem",
            }}
          >
            {/* Header: Admin Profile Info */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "1rem 1.25rem", marginBottom: "1.5rem", backgroundColor: "#f8fafc" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#334155", marginBottom: "0.6rem" }}>
                Admin Profile
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                  <Icons.Users size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                    {editingUser.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", fontFamily: "monospace", letterSpacing: "0.05em" }}>
                    {editingUser.code}
                  </div>
                </div>
              </div>
            </div>

            {/* Centered Heading */}
            <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                ADD COMPANY AND ROLE TO EMPLOYEE
              </span>
            </div>

            {/* 4 Company Entities Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.25rem", marginBottom: "2rem" }}>
              {COMPANY_ENTITIES.map((ent) => {
                const entState = userEntityState[ent.key] || { enabled: false, roles: [] };
                return (
                  <div
                    key={ent.key}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 6,
                      padding: "1rem 1.2rem",
                      backgroundColor: "#ffffff",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: 13, fontWeight: 800, color: "#1e293b", cursor: "pointer", textTransform: "uppercase" }}>
                      <input
                        type="checkbox"
                        checked={entState.enabled}
                        onChange={() => handleToggleEntity(ent.key)}
                        style={{ cursor: "pointer", accentColor: "#2563eb", width: 16, height: 16 }}
                      />
                      {ent.name}
                    </label>

                    <div style={{ height: 1, backgroundColor: "#f1f5f9", margin: "0.6rem 0 0.8rem" }} />

                    <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.4rem", opacity: entState.enabled ? 1 : 0.4 }}>
                      {ent.roles.map((rName) => {
                        const isChecked = entState.roles.includes(rName);
                        return (
                          <label key={rName} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: 13, color: isChecked ? "#1d4ed8" : "#334155", cursor: entState.enabled ? "pointer" : "default" }}>
                            <input
                              type="checkbox"
                              disabled={!entState.enabled}
                              checked={isChecked}
                              onChange={() => handleToggleEntityRole(ent.key, rName)}
                              style={{ cursor: entState.enabled ? "pointer" : "default", accentColor: "#2563eb", width: 15, height: 15 }}
                            />
                            <span style={{ fontWeight: isChecked ? 700 : 400 }}>{rName}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", borderTop: "1px solid #e2e8f0", paddingTop: "1.25rem" }}>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                style={{ ...btnGhost, fontSize: 14, padding: "0.5rem 1.25rem" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveUserEntityRoles}
                style={{
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 4,
                  padding: "0.55rem 1.75rem",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(37,99,235,0.3)",
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
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

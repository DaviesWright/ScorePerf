import React, { useState } from "react";
import { colors, typography, radii } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { DataTable, Column } from "../../design-system/DataTable";
import { DEMO_STAFF, PROFILE_FIELDS, PROFILE_MISSING, SITES, siteOf, type DemoStaff } from "../../data/demoData";

type Tab = "policies" | "handbooks" | "completeness";

interface PolicyDoc {
  id: number;
  title: string;
  category: string;
  version: string;
  owner: string;
  effective: string;
  status: "Published" | "Draft";
}

interface HandbookDoc {
  id: number;
  title: string;
  audience: string;
  version: string;
  updated: string;
  status: "Published" | "Draft";
}

const POLICY_CATEGORIES = ["Conduct", "Leave & Attendance", "Information Security", "Health & Safety", "Travel & Expenses"];

// Synthetic demo documents.
const INITIAL_POLICIES: PolicyDoc[] = [
  { id: 1, title: "Code of Conduct", category: "Conduct", version: "3.1", owner: "Richard Amoah", effective: "2026-01-01", status: "Published" },
  { id: 2, title: "Remote & Hybrid Working", category: "Leave & Attendance", version: "2.0", owner: "Richard Amoah", effective: "2026-03-01", status: "Published" },
  { id: 3, title: "Acceptable Use of Company Devices", category: "Information Security", version: "1.4", owner: "Philip Aryee", effective: "2026-05-15", status: "Published" },
  { id: 4, title: "Company Vehicle Use", category: "Health & Safety", version: "1.0", owner: "Tangeni Haufiku", effective: "2026-09-01", status: "Published" },
  { id: 5, title: "Travel & Expenses", category: "Travel & Expenses", version: "0.9", owner: "Kojo Antwi", effective: "2026-12-01", status: "Draft" },
];

const INITIAL_HANDBOOKS: HandbookDoc[] = [
  { id: 1, title: "Employee Handbook", audience: "All sites", version: "3.2", updated: "2026-02-10", status: "Published" },
  { id: 2, title: "Line Manager Handbook", audience: "Managers", version: "2.1", updated: "2026-04-22", status: "Published" },
  { id: 3, title: "Namibia Country Addendum", audience: "Windhoek Hub", version: "1.0", updated: "2026-09-18", status: "Published" },
  { id: 4, title: "UK Country Addendum", audience: "London Hub", version: "1.2", updated: "2026-07-03", status: "Published" },
  { id: 5, title: "Ghana Country Addendum", audience: "Accra Global Hub", version: "1.1", updated: "2026-07-03", status: "Draft" },
];

const MISSING = PROFILE_MISSING;

const field: React.CSSProperties = { padding: "0.5rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm };
const label: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: typography.sizes.sm, color: colors.textSecondary };
const score = (id: string) => Math.round(((PROFILE_FIELDS.length - (MISSING[id]?.length ?? 0)) / PROFILE_FIELDS.length) * 100);

export const PoliciesHandbookView: React.FC = () => {
  const [tab, setTab] = useState<Tab>("policies");
  const [policies, setPolicies] = useState(INITIAL_POLICIES);
  const [handbooks, setHandbooks] = useState(INITIAL_HANDBOOKS);
  const [reminded, setReminded] = useState<string[]>([]);
  const [modal, setModal] = useState<"policy" | "handbook" | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(POLICY_CATEGORIES[0]);
  const [audience, setAudience] = useState("All sites");
  const [owner, setOwner] = useState(DEMO_STAFF[2].name);
  const [feedback, setFeedback] = useState("");

  const today = () => new Date().toISOString().slice(0, 10);
  const closeModal = () => {
    setModal(null);
    setTitle("");
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const name = title.trim();
    if (!name) return;
    if (modal === "policy") {
      setPolicies([{ id: Math.max(0, ...policies.map((p) => p.id)) + 1, title: name, category, version: "0.1", owner, effective: today(), status: "Draft" }, ...policies]);
      setFeedback(`Policy "${name}" added as a draft.`);
    } else {
      setHandbooks([{ id: Math.max(0, ...handbooks.map((h) => h.id)) + 1, title: name, audience, version: "0.1", updated: today(), status: "Draft" }, ...handbooks]);
      setFeedback(`Handbook "${name}" added as a draft.`);
    }
    closeModal();
  };

  const publishPolicy = (id: number) => setPolicies(policies.map((p) => (p.id === id ? { ...p, status: "Published" } : p)));
  const publishHandbook = (id: number) => setHandbooks(handbooks.map((h) => (h.id === id ? { ...h, status: "Published" } : h)));

  const statusBadge = (s: "Published" | "Draft") => <Badge variant={s === "Published" ? "success" : "warning"} size="sm" dot>{s}</Badge>;

  const policyColumns: Column<PolicyDoc>[] = [
    { header: "Policy", accessor: (p) => <strong style={{ color: colors.textPrimary }}>{p.title}</strong> },
    { header: "Category", accessor: (p) => p.category },
    { header: "Version", accessor: (p) => p.version },
    { header: "Owner", accessor: (p) => p.owner },
    { header: "Effective", accessor: (p) => p.effective },
    { header: "Status", align: "center", accessor: (p) => statusBadge(p.status) },
    { header: "", align: "right", accessor: (p) => (p.status === "Draft" ? <Button variant="outline" size="sm" onClick={() => publishPolicy(p.id)}>Publish</Button> : null) },
  ];

  const handbookColumns: Column<HandbookDoc>[] = [
    { header: "Handbook", accessor: (h) => <strong style={{ color: colors.textPrimary }}>{h.title}</strong> },
    { header: "Audience", accessor: (h) => h.audience },
    { header: "Version", accessor: (h) => h.version },
    { header: "Updated", accessor: (h) => h.updated },
    { header: "Status", align: "center", accessor: (h) => statusBadge(h.status) },
    { header: "", align: "right", accessor: (h) => (h.status === "Draft" ? <Button variant="outline" size="sm" onClick={() => publishHandbook(h.id)}>Publish</Button> : null) },
  ];

  const completenessColumns: Column<DemoStaff>[] = [
    { header: "Employee", accessor: (s) => <div><div style={{ fontWeight: typography.weights.semibold, color: colors.textPrimary }}>{s.name}</div><div style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>{s.jobTitle} · {siteOf(s.site).city}</div></div> },
    {
      header: "Profile completeness",
      width: "240px",
      accessor: (s) => {
        const pct = score(s.id);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ flex: 1, height: "6px", backgroundColor: colors.surfaceSubtle, borderRadius: radii.full, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", backgroundColor: pct === 100 ? colors.emeraldAction : pct >= 60 ? colors.indigoAction : colors.peachAction }} />
            </div>
            <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: typography.sizes.sm, width: "3ch" }}>{pct}%</span>
          </div>
        );
      },
    },
    { header: "Missing", accessor: (s) => (MISSING[s.id]?.length ? MISSING[s.id].join(", ") : <span style={{ color: colors.emeraldDark }}>Complete</span>) },
    {
      header: "",
      align: "right",
      accessor: (s) =>
        MISSING[s.id]?.length ? (
          <Button variant="outline" size="sm" disabled={reminded.includes(s.id)} onClick={() => setReminded([...reminded, s.id])}>
            {reminded.includes(s.id) ? "Reminder sent" : "Send reminder"}
          </Button>
        ) : null,
    },
  ];

  const average = Math.round(DEMO_STAFF.reduce((sum, s) => sum + score(s.id), 0) / DEMO_STAFF.length);
  const tabs: { key: Tab; label: string }[] = [
    { key: "policies", label: `Policies (${policies.length})` },
    { key: "handbooks", label: `Handbooks (${handbooks.length})` },
    { key: "completeness", label: "Profile Completeness" },
  ];

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.textPrimary, letterSpacing: "-0.02em", margin: 0 }}>
          Policies & Handbooks
        </h1>
        {tab !== "completeness" && (
          <Button variant="primary" size="sm" onClick={() => setModal(tab === "policies" ? "policy" : "handbook")}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <Icons.Plus size={14} />
              <span>{tab === "policies" ? "Add Policy" : "Add Handbook"}</span>
            </span>
          </Button>
        )}
      </div>

      <div role="tablist" style={{ display: "flex", gap: "0.35rem", borderBottom: `1px solid ${colors.border}`, marginBottom: "1rem" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            style={{ padding: "0.5rem 0.9rem", border: "none", borderBottom: `2px solid ${tab === t.key ? colors.indigoAction : "transparent"}`, background: "none", cursor: "pointer", fontSize: typography.sizes.sm, fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? colors.indigoAction : colors.textSecondary }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {feedback && (
        <div role="status" style={{ marginBottom: "1rem", padding: "0.6rem 0.9rem", borderRadius: radii.md, backgroundColor: colors.emeraldSubtle, color: colors.emeraldDark, fontSize: typography.sizes.sm }}>
          {feedback}
        </div>
      )}

      {tab === "policies" && <DataTable columns={policyColumns} data={policies} keyExtractor={(p) => p.id} emptyMessage="No policies yet." />}
      {tab === "handbooks" && <DataTable columns={handbookColumns} data={handbooks} keyExtractor={(h) => h.id} emptyMessage="No handbooks yet." />}
      {tab === "completeness" && (
        <>
          <p style={{ margin: "0 0 0.75rem", fontSize: typography.sizes.sm, color: colors.textSecondary }}>
            Average completeness <strong>{average}%</strong> across {DEMO_STAFF.length} staff in {SITES.length} sites. Each of the {PROFILE_FIELDS.length} checklist items carries equal weight.
          </p>
          <DataTable columns={completenessColumns} data={DEMO_STAFF} keyExtractor={(s) => s.id} emptyMessage="No staff." />
        </>
      )}

      {modal && (
        <div role="dialog" aria-modal="true" aria-label={modal === "policy" ? "Add policy" : "Add handbook"} onClick={closeModal} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <form onSubmit={handleAdd} onClick={(e) => e.stopPropagation()} style={{ backgroundColor: colors.surface, borderRadius: radii.md, padding: "1.5rem", width: "min(440px, 92vw)", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <h2 style={{ margin: 0, fontSize: typography.sizes.lg, color: colors.textPrimary }}>{modal === "policy" ? "Add Policy" : "Add Handbook"}</h2>
            <label style={label}>Title
              <input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} style={field} />
            </label>
            {modal === "policy" ? (
              <>
                <label style={label}>Category
                  <select value={category} onChange={(e) => setCategory(e.target.value)} style={field}>
                    {POLICY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label style={label}>Owner
                  <select value={owner} onChange={(e) => setOwner(e.target.value)} style={field}>
                    {DEMO_STAFF.map((s) => <option key={s.id}>{s.name}</option>)}
                  </select>
                </label>
              </>
            ) : (
              <label style={label}>Audience
                <select value={audience} onChange={(e) => setAudience(e.target.value)} style={field}>
                  {["All sites", "Managers", ...SITES.map((s) => s.name)].map((a) => <option key={a}>{a}</option>)}
                </select>
              </label>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
              <Button variant="outline" size="sm" type="button" onClick={closeModal}>Cancel</Button>
              <Button variant="primary" size="sm" type="submit">{modal === "policy" ? "Add Policy" : "Add Handbook"}</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

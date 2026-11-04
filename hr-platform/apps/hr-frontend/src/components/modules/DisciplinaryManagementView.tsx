import React, { useState } from "react";
import { colors, typography, radii } from "../../design-system/tokens";
import { Badge, type BadgeVariant } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { MetricCard } from "../../design-system/MetricCard";
import { DataTable, Column } from "../../design-system/DataTable";
import { DEMO_STAFF } from "../../data/demoData";

const STAGES = ["Reported", "Investigation", "Hearing", "Outcome", "Closed"] as const;
type Stage = (typeof STAGES)[number];
type Severity = "Low" | "Medium" | "High";
const CASE_TYPES = ["Lateness / attendance", "Misconduct", "Policy breach", "Safety breach", "Performance"];

interface Review {
  date: string;
  reviewer: string;
  note: string;
}

interface DisciplinaryCase {
  id: string;
  staffId: string;
  type: string;
  severity: Severity;
  stage: Stage;
  opened: string;
  reviewer: string;
  summary: string;
  outcome?: string;
  reviews: Review[];
}

const REVIEWER = "Richard Mamphey";
const today = () => new Date().toISOString().slice(0, 10);
const staffName = (id: string) => DEMO_STAFF.find((s) => s.id === id)?.name ?? id;

// Synthetic demo cases.
const INITIAL_CASES: DisciplinaryCase[] = [
  { id: "DC-2026-001", staffId: "EMP-007", type: "Lateness / attendance", severity: "Low", stage: "Outcome", opened: "2026-10-06", reviewer: REVIEWER, summary: "Four late clock-ins in three weeks.", reviews: [{ date: "2026-10-13", reviewer: REVIEWER, note: "Informal conversation held; agreed revised start time." }] },
  { id: "DC-2026-002", staffId: "EMP-010", type: "Policy breach", severity: "Medium", stage: "Investigation", opened: "2026-10-19", reviewer: REVIEWER, summary: "Client data shared over a personal messaging account.", reviews: [{ date: "2026-10-21", reviewer: REVIEWER, note: "Evidence collected; IT audit log requested." }] },
  { id: "DC-2026-003", staffId: "EMP-012", type: "Safety breach", severity: "High", stage: "Hearing", opened: "2026-10-24", reviewer: REVIEWER, summary: "Company vehicle driven without a valid inspection sticker.", reviews: [{ date: "2026-10-28", reviewer: REVIEWER, note: "Hearing scheduled for 06 Nov; union representative invited." }] },
  { id: "DC-2026-004", staffId: "EMP-008", type: "Misconduct", severity: "Medium", stage: "Reported", opened: "2026-11-02", reviewer: REVIEWER, summary: "Expense claim submitted without receipts.", reviews: [] },
  { id: "DC-2026-005", staffId: "EMP-004", type: "Performance", severity: "Low", stage: "Closed", opened: "2026-08-11", reviewer: REVIEWER, summary: "Missed two reporting deadlines.", outcome: "No further action", reviews: [{ date: "2026-08-25", reviewer: REVIEWER, note: "Workload rebalanced; deadlines met since." }] },
  { id: "DC-2026-006", staffId: "EMP-009", type: "Misconduct", severity: "High", stage: "Closed", opened: "2026-06-03", reviewer: REVIEWER, summary: "Disrespectful conduct towards a client contact.", outcome: "Written warning", reviews: [{ date: "2026-06-30", reviewer: REVIEWER, note: "Hearing held; written warning issued, valid 12 months." }] },
];

const severityVariant: Record<Severity, BadgeVariant> = { Low: "info", Medium: "warning", High: "error" };
const field: React.CSSProperties = { padding: "0.5rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm };
const label: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: typography.sizes.sm, color: colors.textSecondary };

export const DisciplinaryManagementView: React.FC = () => {
  const [cases, setCases] = useState<DisciplinaryCase[]>(INITIAL_CASES);
  const [selectedId, setSelectedId] = useState<string | null>(INITIAL_CASES[2].id);
  const [showNew, setShowNew] = useState(false);
  const [newStaff, setNewStaff] = useState(DEMO_STAFF[0].id);
  const [newType, setNewType] = useState(CASE_TYPES[0]);
  const [newSeverity, setNewSeverity] = useState<Severity>("Low");
  const [newSummary, setNewSummary] = useState("");
  const [decision, setDecision] = useState("advance");
  const [note, setNote] = useState("");

  // Drill-down: the KPI cards filter the case table.
  const [stageFilter, setStageFilter] = useState<"ALL" | "OPEN" | Stage>("ALL");
  const selected = cases.find((c) => c.id === selectedId) ?? null;
  const open = cases.filter((c) => c.stage !== "Closed");
  const visibleCases = cases.filter((c) => (stageFilter === "ALL" ? true : stageFilter === "OPEN" ? c.stage !== "Closed" : c.stage === stageFilter));
  const toggleFilter = (f: "OPEN" | Stage) => setStageFilter(stageFilter === f ? "ALL" : f);

  const handleOpenCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSummary.trim()) return;
    const id = `DC-2026-${String(cases.length + 1).padStart(3, "0")}`;
    setCases([{ id, staffId: newStaff, type: newType, severity: newSeverity, stage: "Reported", opened: today(), reviewer: REVIEWER, summary: newSummary.trim(), reviews: [] }, ...cases]);
    setSelectedId(id);
    setShowNew(false);
    setNewSummary("");
  };

  const handleRecordReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || selected.stage === "Closed" || !note.trim()) return;
    const idx = STAGES.indexOf(selected.stage);
    const closing = decision !== "advance";
    const stage: Stage = closing ? "Closed" : STAGES[Math.min(idx + 1, STAGES.length - 1)];
    const outcome = decision === "warning" ? "Written warning" : decision === "none" ? "No further action" : stage === "Closed" ? "Closed" : undefined;
    const review: Review = { date: today(), reviewer: REVIEWER, note: note.trim() };
    setCases(cases.map((c) => (c.id === selected.id ? { ...c, stage, outcome: outcome ?? c.outcome, reviews: [...c.reviews, review] } : c)));
    setNote("");
    setDecision("advance");
  };

  const columns: Column<DisciplinaryCase>[] = [
    { header: "Case", width: "120px", accessor: (c) => <span style={{ fontFamily: typography.fontMono, fontSize: "12px", color: colors.brandBlue, fontWeight: 600 }}>{c.id}</span> },
    { header: "Employee", accessor: (c) => staffName(c.staffId) },
    { header: "Type", accessor: (c) => c.type },
    { header: "Severity", align: "center", accessor: (c) => <Badge variant={severityVariant[c.severity]} size="sm">{c.severity}</Badge> },
    { header: "Stage", accessor: (c) => <Badge variant={c.stage === "Closed" ? "neutral" : "info"} size="sm" dot>{c.stage}</Badge> },
    { header: "Opened", accessor: (c) => c.opened },
  ];

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.textPrimary, letterSpacing: "-0.02em", margin: 0 }}>
          Disciplinary Management
        </h1>
        <Button variant="primary" size="sm" onClick={() => setShowNew(true)}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <Icons.Plus size={14} />
            <span>Open Case</span>
          </span>
        </Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <MetricCard label="Open Cases" value={open.length} subtext="Not yet closed" badge={<Badge variant="warning" size="sm">Active</Badge>} onClick={() => toggleFilter("OPEN")} selected={stageFilter === "OPEN"} />
        <MetricCard label="In Investigation" value={cases.filter((c) => c.stage === "Investigation").length} subtext="Evidence being gathered" badge={<Badge variant="info" size="sm">Review</Badge>} onClick={() => toggleFilter("Investigation")} selected={stageFilter === "Investigation"} />
        <MetricCard label="Hearings" value={cases.filter((c) => c.stage === "Hearing").length} subtext="Awaiting a hearing" badge={<Badge variant="error" size="sm">Due</Badge>} onClick={() => toggleFilter("Hearing")} selected={stageFilter === "Hearing"} />
        <MetricCard label="Closed" value={cases.filter((c) => c.stage === "Closed").length} subtext="Resolved this year" badge={<Badge variant="success" size="sm">Done</Badge>} onClick={() => toggleFilter("Closed")} selected={stageFilter === "Closed"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(320px, 1fr)", gap: "1.25rem", alignItems: "start" }}>
        <div>
          {stageFilter !== "ALL" && (
            <div style={{ marginBottom: "0.5rem", fontSize: typography.sizes.xs, color: colors.textMuted }}>
              Showing {visibleCases.length} of {cases.length} cases ·{" "}
              <button type="button" onClick={() => setStageFilter("ALL")} style={{ background: "none", border: "none", padding: 0, color: colors.indigoAction, fontWeight: 600, fontSize: typography.sizes.xs, cursor: "pointer" }}>
                Clear filter
              </button>
            </div>
          )}
          <DataTable columns={columns} data={visibleCases} keyExtractor={(c) => c.id} onRowClick={(c) => setSelectedId(c.id)} emptyMessage="No disciplinary cases match this filter." />
        </div>

        <section aria-label="Case review" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: "1.25rem" }}>
          {!selected ? (
            <p style={{ margin: 0, color: colors.textMuted, fontSize: typography.sizes.sm }}>Select a case to review it.</p>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h2 style={{ margin: 0, fontSize: typography.sizes.base, color: colors.textPrimary }}>Case Review · {selected.id}</h2>
                <Badge variant={severityVariant[selected.severity]} size="sm">{selected.severity}</Badge>
              </div>
              <p style={{ margin: "0.5rem 0", fontSize: typography.sizes.sm, color: colors.textSecondary }}>
                <strong>{staffName(selected.staffId)}</strong> · {selected.type}. {selected.summary}
              </p>

              <ol style={{ display: "flex", gap: "0.35rem", listStyle: "none", padding: 0, margin: "0.75rem 0", flexWrap: "wrap" }}>
                {STAGES.map((s, i) => {
                  const done = i <= STAGES.indexOf(selected.stage);
                  return (
                    <li key={s} style={{ fontSize: "11px", padding: "0.2rem 0.6rem", borderRadius: radii.full, backgroundColor: done ? colors.indigoSubtle : colors.surfaceSubtle, color: done ? colors.indigoDark : colors.textMuted, fontWeight: done ? 700 : 500 }}>
                      {s}
                    </li>
                  );
                })}
              </ol>
              {selected.outcome && <p style={{ margin: "0 0 0.75rem", fontSize: typography.sizes.sm }}>Outcome: <strong>{selected.outcome}</strong></p>}

              <h3 style={{ fontSize: typography.sizes.sm, margin: "0.75rem 0 0.4rem", color: colors.textPrimary }}>Review log</h3>
              {selected.reviews.length === 0 ? (
                <p style={{ margin: 0, fontSize: typography.sizes.xs, color: colors.textMuted }}>No reviews recorded yet.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: typography.sizes.xs, color: colors.textSecondary }}>
                  {selected.reviews.map((r, i) => (
                    <li key={i}>{r.date} · {r.reviewer}: {r.note}</li>
                  ))}
                </ul>
              )}

              {selected.stage !== "Closed" && (
                <form onSubmit={handleRecordReview} style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "1rem" }}>
                  <label style={label}>
                    Decision
                    <select value={decision} onChange={(e) => setDecision(e.target.value)} style={field}>
                      <option value="advance">Advance to next stage</option>
                      <option value="warning">Issue written warning and close</option>
                      <option value="none">No further action and close</option>
                    </select>
                  </label>
                  <label style={label}>
                    Review note
                    <textarea required value={note} onChange={(e) => setNote(e.target.value)} rows={3} style={field} />
                  </label>
                  <Button variant="primary" size="sm" type="submit">Record Review</Button>
                </form>
              )}
            </>
          )}
        </section>
      </div>

      {showNew && (
        <div role="dialog" aria-modal="true" aria-label="Open case" onClick={() => setShowNew(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <form onSubmit={handleOpenCase} onClick={(e) => e.stopPropagation()} style={{ backgroundColor: colors.surface, borderRadius: radii.md, padding: "1.5rem", width: "min(460px, 92vw)", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <h2 style={{ margin: 0, fontSize: typography.sizes.lg, color: colors.textPrimary }}>Open Case</h2>
            <label style={label}>Employee
              <select value={newStaff} onChange={(e) => setNewStaff(e.target.value)} style={field}>
                {DEMO_STAFF.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label style={label}>Type
              <select value={newType} onChange={(e) => setNewType(e.target.value)} style={field}>
                {CASE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label style={label}>Severity
              <select value={newSeverity} onChange={(e) => setNewSeverity(e.target.value as Severity)} style={field}>
                {(["Low", "Medium", "High"] as Severity[]).map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label style={label}>Summary
              <textarea autoFocus required value={newSummary} onChange={(e) => setNewSummary(e.target.value)} rows={3} style={field} />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
              <Button variant="outline" size="sm" type="button" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button variant="primary" size="sm" type="submit">Open Case</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

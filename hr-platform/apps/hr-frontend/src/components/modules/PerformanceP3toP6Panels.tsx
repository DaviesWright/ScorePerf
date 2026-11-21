"use client";

import React, { useState } from "react";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { colors, radii, shadows, typography } from "../../design-system/tokens";
import { SEEDED_EMPLOYEES } from "../../data/enterpriseSeedData";
import { readJson, useLoad } from "./selfServiceUi";

// ============================================================================
// P3.1, P3.6, P3.7: RBAC Permission Matrix, Explainers & Data Provenance
// ============================================================================
export const RbacPermissionMatrixPanel: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const rows = [
    { setting: "Cycle Creation & Launch (P3.2)", emp: "None", mgr: "View", hr: "Edit", superAdmin: "Edit" },
    { setting: "Framework & Weights (P3.3)", emp: "None", mgr: "View", hr: "Edit", superAdmin: "Edit" },
    { setting: "Sign-off Flow & Stage Order (P3.4)", emp: "None", mgr: "View", hr: "Edit", superAdmin: "Edit" },
    { setting: "Agile OKR Stretch Bands (P3.5)", emp: "View", mgr: "View", hr: "Edit", superAdmin: "Edit" },
    { setting: "State Machine Workflow (P3.6)", emp: "None", mgr: "None", hr: "View", superAdmin: "Edit" },
    { setting: "Data Provenance & Audit Log (P3.7)", emp: "None", mgr: "View (Team)", hr: "View", superAdmin: "Edit" },
  ];

  const provenanceLog = [
    { id: "PROV-101", record: "EMP-001..EMP-054 (Core Staff)", source: "Verified HRIS Master", actor: "Jemima Richards (HR Admin)", timestamp: "2026-11-18 09:00 UTC" },
    { id: "PROV-102", record: "2026 Annual Cycle Weights", source: "Admin Configuration UI", actor: "Paa Kwesi Barnes (Super Admin)", timestamp: "2026-11-19 14:15 UTC" },
    { id: "PROV-103", record: "Leave Accrual Policy v2.0", source: "Migration 0023", actor: "System Governance", timestamp: "2026-11-20 08:00 UTC" },
  ];

  if (!isAdmin) {
    return (
      <div style={{ padding: "1rem", borderRadius: radii.md, backgroundColor: "#fffbeb", border: "1px solid #fcd34d", fontSize: 12, color: "#92400e" }}>
        <strong>Admin-Only Configuration (P3.1):</strong> Settings and workflow configuration are restricted to HR Admin and Super Admin roles.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem", marginBottom: "1.5rem" }}>
      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: "1.25rem", boxShadow: shadows.xs }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>
              Configuration Role-Based Permission Matrix (P3.1)
            </h3>
            <p style={{ margin: "0.15rem 0 0", fontSize: 11, color: colors.textMuted }}>
              Enforced on both UI and API. Pending final PKB sign-off where noted.
            </p>
          </div>
          <Badge variant="info" size="sm">Admin-Only Area</Badge>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", textAlign: "left", borderBottom: `1px solid ${colors.border}` }}>
                <th style={{ padding: "0.5rem" }}>Setting</th>
                <th style={{ padding: "0.5rem" }}>Employee</th>
                <th style={{ padding: "0.5rem" }}>Manager</th>
                <th style={{ padding: "0.5rem" }}>HR Admin</th>
                <th style={{ padding: "0.5rem" }}>Super Admin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.setting} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: "0.5rem", fontWeight: 600 }}>{r.setting}</td>
                  <td style={{ padding: "0.5rem" }}><Badge variant={r.emp === "None" ? "neutral" : "info"} size="sm">{r.emp}</Badge></td>
                  <td style={{ padding: "0.5rem" }}><Badge variant={r.mgr === "None" ? "neutral" : "info"} size="sm">{r.mgr}</Badge></td>
                  <td style={{ padding: "0.5rem" }}><Badge variant={r.hr === "Edit" ? "success" : "info"} size="sm">{r.hr}</Badge></td>
                  <td style={{ padding: "0.5rem" }}><Badge variant="success" size="sm">{r.superAdmin}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* P3.6 Plain-Language Explainers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: "1rem" }}>
          <h4 style={{ margin: "0 0 0.35rem", fontSize: 13, fontWeight: 700, color: colors.indigoPrimary }}>
            State Machine Workflow (Plain-Language Guide · P3.6)
          </h4>
          <p style={{ margin: 0, fontSize: 12, color: colors.textSecondary, lineHeight: 1.5 }}>
            Cycles move strictly through: <strong>Draft</strong> (HR sets weights) → <strong>Goal Setting</strong> (Staff &amp; managers align KPIs) → <strong>Active / Check-Ins</strong> (Progress updates) → <strong>Appraisal Open</strong> (Self &amp; manager reviews) → <strong>Calibration &amp; Locked</strong> (Final scores sealed).
          </p>
        </div>
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: "1rem" }}>
          <h4 style={{ margin: "0 0 0.35rem", fontSize: 13, fontWeight: 700, color: colors.indigoPrimary }}>
            Commercial Sales 4-Point Matrix (P3.6)
          </h4>
          <p style={{ margin: 0, fontSize: 12, color: colors.textSecondary, lineHeight: 1.5 }}>
            A quota-attainment 1–4 scale for Business Development teams (1 = &lt;70% Quota, 2 = 70–89%, 3 = 90–109%, 4 = ≥110% Stretch). Flagged for PKB confirmation to retain or retire.
          </p>
        </div>
      </div>

      {/* P3.7 Data Provenance & Audit Trail */}
      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: "1.1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: colors.indigoPrimary }}>
            Data Provenance &amp; Audit Trail (P3.7)
          </h4>
          <Badge variant="success" size="sm">Test Data Isolated from Live 54 Staff</Badge>
        </div>
        <div style={{ display: "grid", gap: "0.4rem", fontSize: 12 }}>
          {provenanceLog.map((p) => (
            <div key={p.id} style={{ padding: "0.45rem 0.65rem", borderRadius: radii.sm, backgroundColor: "#f8fafc", border: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
              <span><strong>{p.record}</strong> · Source: <code>{p.source}</code></span>
              <span style={{ color: colors.textMuted }}>{p.actor} · {p.timestamp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// P4: Performance–Potential Grid (Talent Matrix) with Hover & Click Explainers
// ============================================================================
interface TalentCell {
  id: string;
  name: string;
  potential: "High Potential" | "Medium Potential" | "Low Potential";
  performance: "Low Performance" | "Moderate Performance" | "High Performance";
  definition: string;
  typicalActions: string[];
  staff: string[];
  tone: "green" | "amber" | "red" | "neutral";
}

const TALENT_CELLS: TalentCell[] = [
  {
    id: "rough_diamond",
    name: "Rough Diamond",
    potential: "High Potential",
    performance: "Low Performance",
    definition: "Shows strong future leadership capacity but is currently under-delivering in role.",
    typicalActions: ["Assign executive mentor", "Clarify 90-day role expectations", "Evaluate role-fit"],
    staff: ["K. Mensah"],
    tone: "amber",
  },
  {
    id: "future_star",
    name: "Future Star",
    potential: "High Potential",
    performance: "Moderate Performance",
    definition: "High growth trajectory with solid current delivery; ready for stretch projects.",
    typicalActions: ["Assign cross-functional squad lead", "Pair with senior sponsor"],
    staff: ["Doreen Wesley", "P. Mensah"],
    tone: "green",
  },
  {
    id: "consistent_star",
    name: "Consistent Star (HiPo)",
    potential: "High Potential",
    performance: "High Performance",
    definition: "Top performer with demonstrated readiness for broader executive leadership.",
    typicalActions: ["Place on executive succession slate", "Provide retention & equity/bonus review"],
    staff: ["Emmanuel K. Quarshie", "Sarah Jenkins", "Benedicta Agbesi"],
    tone: "green",
  },
  {
    id: "inconsistent",
    name: "Inconsistent Performer",
    potential: "Medium Potential",
    performance: "Low Performance",
    definition: "Possesses capability to grow but delivery is erratic or below expectations.",
    typicalActions: ["Increase 1:1 check-in cadence", "Identify skill or workload blockers"],
    staff: [],
    tone: "amber",
  },
  {
    id: "core_contributor",
    name: "Core Contributor",
    potential: "Medium Potential",
    performance: "Moderate Performance",
    definition: "Reliable backbone of the practice delivering steady, predictable results.",
    typicalActions: ["Maintain skill upskilling", "Recognize consistent delivery"],
    staff: ["Adjoa Bediako", "Philip Aryee"],
    tone: "neutral",
  },
  {
    id: "high_performer",
    name: "High Performer",
    potential: "Medium Potential",
    performance: "High Performance",
    definition: "Consistently exceeds role targets and anchors team execution.",
    typicalActions: ["Reward high performance", "Offer lateral stretch or mentoring role"],
    staff: ["Marcus Chen", "Julian Vance"],
    tone: "green",
  },
  {
    id: "talent_action",
    name: "Risk / Talent Action",
    potential: "Low Potential",
    performance: "Low Performance",
    definition: "Not meeting current performance standards with limited near-term role stretch.",
    typicalActions: ["Initiate structured 5-stage PIP", "Review role alignment"],
    staff: ["E. Quaye"],
    tone: "red",
  },
  {
    id: "solid_pro",
    name: "Solid Professional",
    potential: "Low Potential",
    performance: "Moderate Performance",
    definition: "Dependable specialist performing well within defined domain boundaries.",
    typicalActions: ["Deepen technical mastery", "Keep engaged via domain recognition"],
    staff: ["B. Appiah"],
    tone: "neutral",
  },
  {
    id: "trusted_master",
    name: "Trusted Master",
    potential: "Low Potential",
    performance: "High Performance",
    definition: "Subject-matter expert delivering exceptional results in current specialist track.",
    typicalActions: ["Protect against flight risk", "Offer specialist career track & retention bonus"],
    staff: ["Jemima Richards"],
    tone: "amber",
  },
];

/** Response of GET /api/v1/performance/talent-matrix (certified results × committee-confirmed potential). */
interface TalentMatrixResponse {
  cycleId: string;
  cells: { cellId: string; employees: { assessmentId: string; employeeId: string; finalRating: number }[] }[];
  excluded: { assessmentId: string; employeeId: string; reason: string }[];
}

const EXCLUSION_LABELS: Record<string, string> = {
  POTENTIAL_NOT_CONFIRMED: "potential not confirmed",
  APPEAL_OPEN: "appeal open",
  NOT_CERTIFIED: "not certified",
};

/**
 * Live data comes only from certified results. Without a session or HR access the grid
 * shows the illustrative demo placement and says so.
 */
export const TalentMatrixGrid: React.FC<{ cycleId?: string }> = ({ cycleId = "CYC-2026-H2" }) => {
  const [selectedCell, setSelectedCell] = useState<TalentCell | null>(null);
  const live = useLoad<TalentMatrixResponse>(`/api/hr/performance/talent-matrix?cycleId=${encodeURIComponent(cycleId)}`);
  const isLive = live.data !== null && Array.isArray(live.data.cells);
  const cellsToShow: TalentCell[] = isLive
    ? TALENT_CELLS.map((cell) => ({
        ...cell,
        staff: (live.data!.cells.find((c) => c.cellId === cell.id)?.employees ?? []).map(
          (e) => `Employee ${e.employeeId} (${e.finalRating.toFixed(1)})`,
        ),
      }))
    : TALENT_CELLS;
  const excludedSummary = isLive
    ? Object.entries(
        live.data!.excluded.reduce<Record<string, number>>((acc, e) => {
          acc[e.reason] = (acc[e.reason] ?? 0) + 1;
          return acc;
        }, {}),
      )
        .map(([reason, n]) => `${n} ${EXCLUSION_LABELS[reason] ?? reason}`)
        .join(", ")
    : "";

  return (
    <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: "1.25rem", boxShadow: shadows.xs }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>
            Performance–Potential Grid (Talent Matrix)
          </h3>
          <p style={{ margin: "0.15rem 0 0", fontSize: 11, color: colors.textMuted }}>
            Hover any cell for definition &amp; typical actions; click a cell to inspect staff and development plan.
          </p>
        </div>
        <Badge variant={isLive ? "success" : "warning"} size="sm">
          {live.loading ? "Loading…" : isLive ? `Certified results · ${cycleId}` : "Demo data"}
        </Badge>
      </div>
      {!live.loading && !isLive && (
        <p style={{ margin: "0 0 0.75rem", fontSize: 11, color: colors.textMuted }}>
          Showing illustrative placements. {live.error || "Live placements appear once results are certified."}
        </p>
      )}
      {isLive && excludedSummary && (
        <p style={{ margin: "0 0 0.75rem", fontSize: 11, color: colors.textMuted }}>
          Not placed: {excludedSummary}.
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.85rem" }}>
        {cellsToShow.map((cell) => {
          const bg = cell.tone === "green" ? "#f0fdf4" : cell.tone === "red" ? "#fef2f2" : cell.tone === "amber" ? "#fffbeb" : "#f8fafc";
          const border = cell.tone === "green" ? "#86efac" : cell.tone === "red" ? "#fecaca" : cell.tone === "amber" ? "#fde68a" : colors.border;
          return (
            <button
              key={cell.id}
              type="button"
              title={`${cell.name}: ${cell.definition} Actions: ${cell.typicalActions.join("; ")}`}
              onClick={() => setSelectedCell(cell)}
              style={{
                textAlign: "left",
                padding: "0.85rem",
                borderRadius: radii.md,
                backgroundColor: bg,
                border: `1px solid ${border}`,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 118,
              }}
            >
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>
                  {cell.potential} · {cell.performance}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: colors.textPrimary, marginTop: 2 }}>{cell.name}</div>
                <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>{cell.definition}</div>
              </div>
              <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: colors.indigoAction }}>
                {cell.staff.length} Staff · Click for details →
              </div>
            </button>
          );
        })}
      </div>

      {selectedCell && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 1000 }}
          onClick={() => setSelectedCell(null)}
        >
          <div style={{ backgroundColor: colors.surface, borderRadius: radii.lg, border: `1px solid ${colors.border}`, padding: "1.25rem", width: "100%", maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 11, fontWeight: 700, color: colors.indigoAction }}>{selectedCell.potential} · {selectedCell.performance}</div>
            <h3 style={{ margin: "0.2rem 0 0.5rem", fontSize: typography.sizes.lg, color: colors.indigoPrimary }}>{selectedCell.name}</h3>
            <p style={{ fontSize: 13, color: colors.textSecondary, margin: "0 0 0.75rem" }}>{selectedCell.definition}</p>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Recommended Actions:</div>
            <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.25rem", fontSize: 12 }}>
              {selectedCell.typicalActions.map((a) => <li key={a}>{a}</li>)}
            </ul>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Assigned Staff ({selectedCell.staff.length}):</div>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              {selectedCell.staff.length > 0 ? selectedCell.staff.map((s) => <Badge key={s} variant="info" size="sm">{s}</Badge>) : <span style={{ fontSize: 12, color: colors.textMuted }}>None currently placed.</span>}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="primary" size="sm" onClick={() => setSelectedCell(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// P5: 5-Stage Performance Improvement Plan (PIP) Workflow
// ============================================================================
type PipStage = "Initiation" | "Acceptance" | "Sign-off" | "Execution" | "Closure";
interface PipPlan {
  id: string;
  employee: string;
  areas: string;
  stage: PipStage;
  history: Array<{ stage: PipStage; owner: string; timestamp: string; note: string }>;
  checkIns: Array<{ date: string; notes: string; status: string; evidence: string }>;
  outcome?: "Met" | "Partially Met" | "Not Met";
  outcomeReason?: string;
}

const DemoPipWorkflowPanel: React.FC = () => {
  const [plans, setPlans] = useState<PipPlan[]>([
    {
      id: "PIP-2026-01",
      employee: "E. Quaye",
      areas: "Improve sprint ticket SLA adherence from 68% to ≥90% and complete peer code reviews within 24h.",
      stage: "Execution",
      history: [
        { stage: "Initiation", owner: "Philip Aryee (Manager)", timestamp: "2026-11-01 09:30 UTC", note: "Documented 2 improvement areas." },
        { stage: "Acceptance", owner: "E. Quaye (Employee)", timestamp: "2026-11-02 11:15 UTC", note: "Plan accepted by employee." },
        { stage: "Sign-off", owner: "Jemima Richards (HR Admin)", timestamp: "2026-11-03 14:00 UTC", note: "HR approved 8-week PIP." },
      ],
      checkIns: [
        { date: "2026-11-10", notes: "SLA improved to 82% in Week 1.", status: "On Track", evidence: "Jira Sprint 41 Report" },
      ],
    },
  ]);

  const [newEmp, setNewEmp] = useState(SEEDED_EMPLOYEES[5]?.name || "Staff Member");
  const [newAreas, setNewAreas] = useState("");
  const [checkInNote, setCheckInNote] = useState("");
  const [checkInEvidence, setCheckInEvidence] = useState("");
  const [closureOutcome, setClosureOutcome] = useState<"Met" | "Partially Met" | "Not Met">("Met");
  const [closureReason, setClosureReason] = useState("");

  const nowTs = () => new Date().toISOString().slice(0, 19).replace("T", " ") + " UTC";

  return (
    <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: "1.25rem", boxShadow: shadows.xs }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.9rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>
            Performance Improvement Plan (PIP) — 5-Stage Workflow (P5)
          </h3>
          <Badge variant="warning" size="sm">Demo data</Badge>
          <p style={{ margin: "0.15rem 0 0", fontSize: 11, color: colors.textMuted }}>
            Stages: Initiation → Acceptance (Accept/Dispute) → Sign-off (HR) → Execution (Check-ins) → Closure (Met / Partially Met / Not Met).
          </p>
        </div>
      </div>

      {/* Initiate New PIP */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
        <select value={newEmp} onChange={(e) => setNewEmp(e.target.value)} style={{ padding: "0.4rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: 12 }}>
          {SEEDED_EMPLOYEES.slice(0, 15).map((e) => <option key={e.id} value={`${e.firstName} ${e.lastName}`}>{e.firstName} {e.lastName}</option>)}
        </select>
        <input
          type="text"
          value={newAreas}
          onChange={(e) => setNewAreas(e.target.value)}
          placeholder="Document measurable improvement areas..."
          style={{ flex: 1, minWidth: 220, padding: "0.4rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: 12 }}
        />
        <Button
          variant="primary"
          size="sm"
          disabled={!newAreas.trim()}
          onClick={() => {
            setPlans((prev) => [
              {
                id: `PIP-2026-0${prev.length + 1}`,
                employee: newEmp,
                areas: newAreas.trim(),
                stage: "Acceptance",
                history: [{ stage: "Initiation", owner: "Line Manager / Self", timestamp: nowTs(), note: "PIP initiated." }],
                checkIns: [],
              },
              ...prev,
            ]);
            setNewAreas("");
          }}
        >
          Initiate PIP
        </Button>
      </div>

      <div style={{ display: "grid", gap: "1rem" }}>
        {plans.map((p) => (
          <div key={p.id} style={{ border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: 6 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: colors.indigoAction }}>{p.id}</span> · <strong>{p.employee}</strong>
              </div>
              <Badge variant={p.stage === "Closure" ? "success" : "warning"} size="sm">Stage: {p.stage}</Badge>
            </div>
            <p style={{ margin: "0 0 0.65rem", fontSize: 12, color: colors.textSecondary }}>{p.areas}</p>

            {/* Stage Transition Actions */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.65rem" }}>
              {p.stage === "Acceptance" && (
                <>
                  <Button variant="primary" size="sm" onClick={() => setPlans((prev) => prev.map((x) => x.id === p.id ? { ...x, stage: "Sign-off", history: [...x.history, { stage: "Acceptance", owner: p.employee, timestamp: nowTs(), note: "Accepted plan" }] } : x))}>
                    Accept Plan
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPlans((prev) => prev.map((x) => x.id === p.id ? { ...x, history: [...x.history, { stage: "Acceptance", owner: p.employee, timestamp: nowTs(), note: "Disputed plan — escalated to HR" }] } : x))}>
                    Dispute Plan
                  </Button>
                </>
              )}
              {p.stage === "Sign-off" && (
                <Button variant="primary" size="sm" onClick={() => setPlans((prev) => prev.map((x) => x.id === p.id ? { ...x, stage: "Execution", history: [...x.history, { stage: "Sign-off", owner: "HR Admin", timestamp: nowTs(), note: "HR approved" }] } : x))}>
                  HR / Admin Sign-off
                </Button>
              )}
              {p.stage === "Execution" && (
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", width: "100%" }}>
                  <input type="text" placeholder="Check-in notes..." value={checkInNote} onChange={(e) => setCheckInNote(e.target.value)} style={{ flex: 1, minWidth: 160, padding: "0.35rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: 12 }} />
                  <input type="text" placeholder="Evidence link/ref..." value={checkInEvidence} onChange={(e) => setCheckInEvidence(e.target.value)} style={{ width: 150, padding: "0.35rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: 12 }} />
                  <Button variant="outline" size="sm" disabled={!checkInNote.trim()} onClick={() => {
                    setPlans((prev) => prev.map((x) => x.id === p.id ? { ...x, checkIns: [...x.checkIns, { date: new Date().toISOString().slice(0, 10), notes: checkInNote.trim(), status: "Logged", evidence: checkInEvidence.trim() || "None" }] } : x));
                    setCheckInNote("");
                    setCheckInEvidence("");
                  }}>
                    Log Check-in
                  </Button>
                  <select value={closureOutcome} onChange={(e) => setClosureOutcome(e.target.value as any)} style={{ padding: "0.35rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: 12 }}>
                    <option value="Met">Met</option>
                    <option value="Partially Met">Partially Met</option>
                    <option value="Not Met">Not Met</option>
                  </select>
                  <input type="text" placeholder="Closure reason..." value={closureReason} onChange={(e) => setClosureReason(e.target.value)} style={{ width: 160, padding: "0.35rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: 12 }} />
                  <Button variant="primary" size="sm" disabled={!closureReason.trim()} onClick={() => {
                    setPlans((prev) => prev.map((x) => x.id === p.id ? { ...x, stage: "Closure", outcome: closureOutcome, outcomeReason: closureReason.trim(), history: [...x.history, { stage: "Closure", owner: "HR Admin", timestamp: nowTs(), note: `${closureOutcome}: ${closureReason.trim()}` }] } : x));
                    setClosureReason("");
                  }}>
                    Close PIP
                  </Button>
                </div>
              )}
            </div>

            {p.outcome && (
              <div style={{ fontSize: 12, padding: "0.45rem 0.65rem", borderRadius: radii.sm, backgroundColor: "#ecfdf5", color: "#065f46", marginBottom: 6 }}>
                <strong>Closure Outcome:</strong> {p.outcome} — {p.outcomeReason}
              </div>
            )}

            <div style={{ fontSize: 11, color: colors.textMuted }}>
              <strong>Stage Audit:</strong> {p.history.map((h) => `${h.stage} (${h.owner}, ${h.timestamp})`).join(" → ")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Live PIPs from the API. HR opens a PIP only from a certified rating of 2 or below; the employee
// accepts (and may record disagreement); an HR director other than the initiator signs off; the
// manager or HR records check-ins; HR closes with an outcome. The API enforces every rule.
interface ApiPip {
  id: string;
  employee_id: string;
  manager_id: string | null;
  stage: "INITIATION" | "ACCEPTANCE" | "SIGN_OFF" | "EXECUTION" | "CLOSURE";
  trigger_rating: string | number;
  improvement_areas_json: { area: string; expectedStandard: string; measure: string }[];
  support_plan: string;
  start_date: string;
  end_date: string;
  employee_comment: string | null;
  outcome: string | null;
  outcome_reason: string | null;
}
interface PipCandidate {
  assessment_id: string;
  employee_id: string;
  final_rating: string | number;
}

const PIP_STAGE_LABEL: Record<ApiPip["stage"], string> = {
  INITIATION: "Initiation",
  ACCEPTANCE: "Awaiting employee acceptance",
  SIGN_OFF: "Awaiting HR director sign-off",
  EXECUTION: "In execution",
  CLOSURE: "Closed",
};

const inputStyle: React.CSSProperties = { padding: "0.4rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: 12 };

async function postJson(path: string, body: unknown): Promise<string | null> {
  try {
    const res = await fetch(`/api/hr/performance/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    if (res.ok) return null;
    const data = await readJson<{ code?: string; error?: unknown }>(res);
    return typeof data.error === "string" ? data.error : "The request was refused.";
  } catch {
    return "The server could not be reached. Try again.";
  }
}

const LivePipPanel: React.FC<{ cycleId: string; pips: ApiPip[]; reload: () => void }> = ({ cycleId, pips, reload }) => {
  const candidates = useLoad<{ results: PipCandidate[] }>(`/api/hr/performance/pips/candidates?cycleId=${encodeURIComponent(cycleId)}`);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ assessmentId: "", area: "", expectedStandard: "", measure: "", supportPlan: "", startDate: "", endDate: "" });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<Record<string, string>>({});

  const run = async (path: string, body: unknown) => {
    setBusy(true);
    const err = await postJson(path, body);
    setBusy(false);
    setMessage(err);
    if (!err) {
      reload();
      candidates.reload();
    }
    return err;
  };

  const canInitiate = candidates.data !== null && Array.isArray(candidates.data.results);

  return (
    <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: "1.25rem", boxShadow: shadows.xs }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.9rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>Performance Improvement Plans</h3>
          <p style={{ margin: "0.15rem 0 0", fontSize: 11, color: colors.textMuted }}>
            Opened by HR from a certified rating of 2 or below, never automatically. Employee acceptance, HR director sign-off, check-ins, closure.
          </p>
        </div>
        <Badge variant="success" size="sm">Live · {cycleId}</Badge>
      </div>

      {message && (
        <p role="alert" style={{ margin: "0 0 0.75rem", fontSize: 12, color: colors.error }}>{message}</p>
      )}

      {canInitiate && (
        <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
          <strong style={{ fontSize: 12 }}>Open a PIP ({candidates.data!.results.length} eligible)</strong>
          {candidates.data!.results.length === 0 ? (
            <span style={{ fontSize: 12, color: colors.textMuted }}>No certified results of 2 or below without an open PIP or appeal.</span>
          ) : (
            <>
              <select aria-label="Employee" value={form.assessmentId} onChange={(e) => setForm({ ...form, assessmentId: e.target.value })} style={inputStyle}>
                <option value="">Choose an employee…</option>
                {candidates.data!.results.map((c) => (
                  <option key={c.assessment_id} value={c.assessment_id}>
                    Employee {c.employee_id} · certified {Number(c.final_rating).toFixed(1)}
                  </option>
                ))}
              </select>
              <input aria-label="Improvement area" placeholder="Improvement area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} style={inputStyle} />
              <input aria-label="Expected standard" placeholder="Expected standard" value={form.expectedStandard} onChange={(e) => setForm({ ...form, expectedStandard: e.target.value })} style={inputStyle} />
              <input aria-label="How it is measured" placeholder="How it is measured" value={form.measure} onChange={(e) => setForm({ ...form, measure: e.target.value })} style={inputStyle} />
              <textarea aria-label="Support plan" placeholder="Support the organisation will give (at least 20 characters)" value={form.supportPlan} onChange={(e) => setForm({ ...form, supportPlan: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", fontSize: 12 }}>
                <label>Start <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={inputStyle} /></label>
                <label>End <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={inputStyle} /></label>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={busy || !form.assessmentId || !form.area.trim() || !form.supportPlan.trim() || !form.startDate || !form.endDate}
                  onClick={async () => {
                    const err = await run("pips", {
                      assessmentId: form.assessmentId,
                      improvementAreas: [{ area: form.area, expectedStandard: form.expectedStandard, measure: form.measure }],
                      supportPlan: form.supportPlan,
                      startDate: form.startDate,
                      endDate: form.endDate,
                    });
                    if (!err) setForm({ assessmentId: "", area: "", expectedStandard: "", measure: "", supportPlan: "", startDate: "", endDate: "" });
                  }}
                >
                  Open PIP
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {pips.length === 0 && <p style={{ fontSize: 12, color: colors.textMuted }}>No PIPs to show.</p>}
      <div style={{ display: "grid", gap: "1rem" }}>
        {pips.map((p) => (
          <div key={p.id} style={{ border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: 6 }}>
              <div style={{ fontSize: 13 }}>
                <strong>Employee {p.employee_id}</strong> · certified {Number(p.trigger_rating).toFixed(1)} · {String(p.start_date).slice(0, 10)} to {String(p.end_date).slice(0, 10)}
              </div>
              <Badge variant={p.stage === "CLOSURE" ? "success" : "warning"} size="sm">{PIP_STAGE_LABEL[p.stage]}</Badge>
            </div>
            <ul style={{ margin: "0 0 0.5rem", paddingLeft: "1.25rem", fontSize: 12, color: colors.textSecondary }}>
              {(p.improvement_areas_json ?? []).map((a, i) => (
                <li key={i}>{a.area}: {a.expectedStandard} ({a.measure})</li>
              ))}
            </ul>
            <p style={{ margin: "0 0 0.5rem", fontSize: 12 }}><strong>Support:</strong> {p.support_plan}</p>
            {p.employee_comment && <p style={{ margin: "0 0 0.5rem", fontSize: 12 }}><strong>Employee comment:</strong> {p.employee_comment}</p>}
            {p.outcome && <p style={{ margin: "0 0 0.5rem", fontSize: 12 }}><strong>Outcome:</strong> {p.outcome.replace("_", " ").toLowerCase()} — {p.outcome_reason}</p>}

            {p.stage !== "CLOSURE" && (
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
                <input
                  aria-label="Notes"
                  placeholder={p.stage === "ACCEPTANCE" ? "Optional comment (e.g. points you disagree with)" : "Notes or reason"}
                  value={notes[p.id] ?? ""}
                  onChange={(e) => setNotes({ ...notes, [p.id]: e.target.value })}
                  style={{ ...inputStyle, flex: 1, minWidth: 200 }}
                />
                {p.stage === "ACCEPTANCE" && (
                  <Button variant="primary" size="sm" disabled={busy} onClick={() => run(`pips/${p.id}/accept`, { comment: notes[p.id] || undefined })}>Accept plan</Button>
                )}
                {p.stage === "SIGN_OFF" && (
                  <Button variant="primary" size="sm" disabled={busy} onClick={() => run(`pips/${p.id}/sign-off`, {})}>HR director sign-off</Button>
                )}
                {p.stage === "EXECUTION" && (
                  <>
                    {(["ON_TRACK", "AT_RISK", "OFF_TRACK"] as const).map((st) => (
                      <Button key={st} variant="outline" size="sm" disabled={busy || (notes[p.id] ?? "").trim().length < 10} onClick={() => run(`pips/${p.id}/check-ins`, { status: st, notes: notes[p.id] })}>
                        Check-in: {st.replace("_", " ").toLowerCase()}
                      </Button>
                    ))}
                    <select aria-label="Outcome" value={outcome[p.id] ?? "MET"} onChange={(e) => setOutcome({ ...outcome, [p.id]: e.target.value })} style={inputStyle}>
                      <option value="MET">Met</option>
                      <option value="PARTIALLY_MET">Partially met</option>
                      <option value="NOT_MET">Not met</option>
                    </select>
                    <Button variant="primary" size="sm" disabled={busy || (notes[p.id] ?? "").trim().length < 20} onClick={() => run(`pips/${p.id}/close`, { outcome: outcome[p.id] ?? "MET", reason: notes[p.id] })}>
                      Close PIP
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" disabled={busy || (notes[p.id] ?? "").trim().length < 20} onClick={() => run(`pips/${p.id}/close`, { outcome: "WITHDRAWN", reason: notes[p.id] })}>
                  Withdraw
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/** Shows live PIPs when the API answers; otherwise the illustrative demo, labelled as such. */
export const PipWorkflowPanel: React.FC<{ cycleId?: string }> = ({ cycleId = "CYC-2026-H2" }) => {
  const live = useLoad<{ results: ApiPip[] }>("/api/hr/performance/pips");
  if (live.loading) return <p style={{ fontSize: 12, color: colors.textMuted }}>Loading improvement plans…</p>;
  if (live.data && Array.isArray(live.data.results)) {
    return <LivePipPanel cycleId={cycleId} pips={live.data.results} reload={live.reload} />;
  }
  return <DemoPipWorkflowPanel />;
};

// ============================================================================
// P6.2, P6.3, P6.4: MBO Cascade, Template Download & Dotted-Line Reviewers
// ============================================================================
export const MboAndMultiReviewerPanel: React.FC = () => {
  const [sequenceMode, setSequenceMode] = useState<"sequential" | "concurrent">("sequential");
  const [finalSay, setFinalSay] = useState<"solid_manager" | "hr_calibration">("solid_manager");
  const [mboRows, setMboRows] = useState([
    { id: "MBO-1", corporateGoal: "Scale Enterprise Cloud Margin", objective: "Automate CI/CD edge deployments", weight: 50, reviewer: "Paa Kwesi Barnes (Solid Line)" },
    { id: "MBO-2", corporateGoal: "Zero-Defect Compliance", objective: "Achieve 100% audit evidence coverage", weight: 50, reviewer: "Jemima Richards (Dotted Line)" },
  ]);
  const [newObj, setNewObj] = useState("");
  const [newParent, setNewParent] = useState("Scale Enterprise Cloud Margin");
  const [newReviewer, setNewReviewer] = useState("Paa Kwesi Barnes (Solid Line)");

  const downloadMboTemplate = () => {
    const csv = [
      "Employee ID,Objective Title,Parent Corporate Goal,Weight %,Target Metric,Assigned HRIS Reviewer",
      "EMP-002,Automate CI/CD edge deployments,Scale Enterprise Cloud Margin,50,100% automated,Paa Kwesi Barnes (Solid Line)",
    ].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "MBO_Objectives_Template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: "1.25rem", boxShadow: shadows.xs, marginTop: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.85rem" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>
            MBO Cascade &amp; Dotted-Line Multi-Reviewer Sequence (P6.2–P6.4)
          </h3>
          <p style={{ margin: "0.15rem 0 0", fontSize: 11, color: colors.textMuted }}>
            Reviewers are strictly constrained to HRIS solid-line and dotted-line reporting relationships.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadMboTemplate}>
          Download MBO Excel/CSV Template
        </Button>
      </div>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "0.85rem", fontSize: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Review Sequence:
          <select value={sequenceMode} onChange={(e) => setSequenceMode(e.target.value as any)} style={{ padding: "0.3rem", borderRadius: radii.sm, border: `1px solid ${colors.border}` }}>
            <option value="sequential">Sequential (Solid Line → Dotted Line)</option>
            <option value="concurrent">Concurrent (All Assigned Reviewers)</option>
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Final Say Authority:
          <select value={finalSay} onChange={(e) => setFinalSay(e.target.value as any)} style={{ padding: "0.3rem", borderRadius: radii.sm, border: `1px solid ${colors.border}` }}>
            <option value="solid_manager">Solid-Line Manager</option>
            <option value="hr_calibration">HR Calibration Panel</option>
          </select>
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
        <input type="text" placeholder="New MBO Objective..." value={newObj} onChange={(e) => setNewObj(e.target.value)} style={{ flex: 1, minWidth: 180, padding: "0.35rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: 12 }} />
        <select value={newParent} onChange={(e) => setNewParent(e.target.value)} style={{ padding: "0.35rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: 12 }}>
          <option value="Scale Enterprise Cloud Margin">Parent: Scale Enterprise Cloud Margin</option>
          <option value="Zero-Defect Compliance">Parent: Zero-Defect Compliance</option>
        </select>
        <select value={newReviewer} onChange={(e) => setNewReviewer(e.target.value)} style={{ padding: "0.35rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: 12 }}>
          <option value="Paa Kwesi Barnes (Solid Line)">Paa Kwesi Barnes (Solid Line)</option>
          <option value="Jemima Richards (Dotted Line)">Jemima Richards (Dotted Line)</option>
          <option value="All Assigned HRIS Reviewers">All Assigned HRIS Reviewers</option>
        </select>
        <Button variant="primary" size="sm" disabled={!newObj.trim()} onClick={() => {
          setMboRows((prev) => [...prev, { id: `MBO-${prev.length + 1}`, corporateGoal: newParent, objective: newObj.trim(), weight: 25, reviewer: newReviewer }]);
          setNewObj("");
        }}>
          Add Cascaded Objective
        </Button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ backgroundColor: "#f8fafc", textAlign: "left", borderBottom: `1px solid ${colors.border}` }}>
            <th style={{ padding: "0.45rem" }}>Objective</th>
            <th style={{ padding: "0.45rem" }}>Corporate Cascade Parent</th>
            <th style={{ padding: "0.45rem" }}>Weight</th>
            <th style={{ padding: "0.45rem" }}>Assigned HRIS Reviewer</th>
          </tr>
        </thead>
        <tbody>
          {mboRows.map((r) => (
            <tr key={r.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
              <td style={{ padding: "0.45rem", fontWeight: 600 }}>{r.objective}</td>
              <td style={{ padding: "0.45rem" }}>{r.corporateGoal}</td>
              <td style={{ padding: "0.45rem" }}>{r.weight}%</td>
              <td style={{ padding: "0.45rem" }}><Badge variant="info" size="sm">{r.reviewer}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

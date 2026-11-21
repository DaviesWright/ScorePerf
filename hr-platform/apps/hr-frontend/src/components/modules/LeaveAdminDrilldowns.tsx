"use client";

import React, { useEffect, useRef, useState } from "react";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { colors, radii, shadows, typography } from "../../design-system/tokens";
import { SEEDED_EMPLOYEES } from "../../data/enterpriseSeedData";
import { useRealSession } from "../../lib/sessionMode";
import { call } from "./assetApi";

type DrillCategory = "blocked" | "accrual" | "liability";

interface DrillRecord {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  inputs: Array<{ label: string; value: string }>;
  outputs: Array<{ label: string; value: string }>;
}

const BLOCKED_RECORDS: DrillRecord[] = [
  {
    id: "BLK-2026-01",
    title: "Q4 Audit & Year-End Close Blackout",
    subtitle: "2026-12-15 to 2026-12-31 · Finance & Executive",
    status: "Active",
    inputs: [
      { label: "Window", value: "2026-12-15 – 2026-12-31" },
      { label: "Departments", value: "Finance, Executive Leadership" },
      { label: "Rule", value: "Hard block on Annual Leave" },
    ],
    outputs: [
      { label: "Staff Covered", value: "9" },
      { label: "Conflicting Requests Blocked", value: "2" },
    ],
  },
  {
    id: "HOL-2026-03",
    title: "Ghana Independence Day",
    subtitle: "2026-03-06 · Accra Practice",
    status: "Statutory Holiday",
    inputs: [
      { label: "Date", value: "2026-03-06" },
      { label: "Location", value: "Accra Hub" },
      { label: "Rule", value: "Excluded from working-day deduction" },
    ],
    outputs: [
      { label: "Staff Covered", value: "36" },
      { label: "Leave Days Saved", value: "36" },
    ],
  },
];

const ACCRUAL_RECORDS: DrillRecord[] = [
  {
    id: "RUN-ACC-2026-11",
    title: "November 2026 Monthly Accrual Run",
    subtitle: "2026-11-01 · 54 Active Staff",
    status: "Completed",
    inputs: [
      { label: "Accrual Rate", value: "1.75 days / month" },
      { label: "Eligible Staff", value: "54" },
      { label: "Policy Version", value: "v2.0 (2026)" },
    ],
    outputs: [
      { label: "Total Days Credited", value: "94.5 days" },
      { label: "Exceptions", value: "0" },
    ],
  },
  {
    id: "RUN-CF-2026-01",
    title: "FY2025 → FY2026 Carry-Forward Run",
    subtitle: "2026-01-01 · 5-Day Cap Applied",
    status: "Completed",
    inputs: [
      { label: "Carry-Forward Cap", value: "5 days max" },
      { label: "Expiry Window", value: "90 days (31 Mar 2026)" },
      { label: "Staff Evaluated", value: "54" },
    ],
    outputs: [
      { label: "Days Carried Forward", value: "142 days" },
      { label: "Days Forfeited Above Cap", value: "18 days" },
    ],
  },
];

const LIABILITY_RECORDS: DrillRecord[] = SEEDED_EMPLOYEES.slice(0, 8).map((emp) => {
  const dailyRate = 185;
  const liability = emp.annualAvailable * dailyRate;
  return {
    id: `LIA-${emp.staffId}`,
    title: `${emp.firstName} ${emp.lastName}`,
    subtitle: `${emp.departmentName} · ${emp.annualAvailable} unused days`,
    status: emp.annualAvailable > 15 ? "High Balance" : "Normal",
    inputs: [
      { label: "Annual Entitlement", value: `${emp.annualEntitlement} days` },
      { label: "Used YTD", value: `${emp.annualUsed} days` },
      { label: "Daily Valuation Rate", value: `GH₵ ${dailyRate}` },
    ],
    outputs: [
      { label: "Available Balance", value: `${emp.annualAvailable} days` },
      { label: "Accrued Liability", value: `GH₵ ${liability.toLocaleString()}` },
    ],
  };
});

type ReportPayload = { columns: { key: string; label: string }[]; rows: Record<string, unknown>[]; suppressionReason?: string | null };

/** Turns governed report rows into drill-down records: first column is the title, the rest are shown as detail. */
function reportToRecords(prefix: string, data: ReportPayload, status: string): DrillRecord[] {
  const cols = data.columns ?? [];
  return (data.rows ?? []).map((row, idx) => {
    const cells = cols.map((c) => ({ label: c.label, value: String(row[c.key] ?? "") }));
    const half = Math.ceil(Math.max(0, cells.length - 2) / 2) + 2;
    return {
      id: `${prefix}-${idx}`,
      title: cells[0]?.value || `${prefix} ${idx + 1}`,
      subtitle: cells[1] ? `${cells[1].label}: ${cells[1].value}` : "",
      status,
      inputs: cells.slice(2, half),
      outputs: cells.slice(half),
    };
  });
}

export const LeaveAdminDrilldowns: React.FC<{ focus?: DrillCategory | null; focusNonce?: number }> = ({
  focus = null,
  focusNonce = 0,
}) => {
  const [activeCat, setActiveCat] = useState<DrillCategory | null>(focus);
  const [selectedRecord, setSelectedRecord] = useState<DrillRecord | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);

  // Signed in: each list comes from live data (company holidays, and the governed leave reports LV-004,
  // LV-005 and LV-020). The demo persona picker shows the sample records.
  const realSession = useRealSession();
  const [live, setLive] = useState<Record<DrillCategory, DrillRecord[]> | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  useEffect(() => {
    if (!realSession) return;
    let cancelled = false;
    Promise.all([
      call<{ results: { id: number; name: string; date: string }[] }>("GET", "holidays"),
      call<ReportPayload>("GET", "reports/leave/LV-004?pageSize=50"),
      call<ReportPayload>("GET", "reports/leave/LV-005?pageSize=50"),
      call<ReportPayload>("GET", "reports/leave/LV-020?pageSize=50"),
    ]).then(([hol, acc, cf, lia]) => {
      if (cancelled) return;
      if (!hol.ok && !acc.ok && !lia.ok) setLiveError("Could not load leave admin data.");
      setLive({
        blocked: hol.ok
          ? (hol.data.results ?? []).map((h) => ({
              id: `HOL-${h.id}`,
              title: h.name,
              subtitle: h.date,
              status: "Company holiday",
              inputs: [{ label: "Date", value: h.date }],
              outputs: [{ label: "Rule", value: "Excluded from working-day deduction" }],
            }))
          : [],
        accrual: [
          ...(acc.ok ? reportToRecords("Accrual", acc.data, "Accrual posting") : []),
          ...(cf.ok ? reportToRecords("Carry-forward", cf.data, "Carry-forward") : []),
        ],
        liability: lia.ok ? reportToRecords("Liability", lia.data, "Leave liability") : [],
      });
    });
    return () => {
      cancelled = true;
    };
  }, [realSession]);

  // Opened from a Leave Admin sidebar link: open that list and bring it into view.
  useEffect(() => {
    if (!focus) return;
    setActiveCat(focus);
    setSelectedRecord(null);
    requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [focus, focusNonce]);

  const records: DrillRecord[] = !activeCat
    ? []
    : live
      ? live[activeCat]
      : activeCat === "blocked"
        ? BLOCKED_RECORDS
        : activeCat === "accrual"
          ? ACCRUAL_RECORDS
          : LIABILITY_RECORDS;

  return (
    <section
      ref={sectionRef}
      id="leave-admin-drilldowns"
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.lg,
        padding: "1.25rem",
        marginBottom: "1.5rem",
        boxShadow: shadows.xs,
      }}
    >
      <div style={{ marginBottom: "0.85rem" }}>
        <h2 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>
          Leave Admin Operations &amp; Run Drill-Downs
        </h2>
        <p style={{ margin: "0.15rem 0 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
          Click any operational area to open the list, then select a record to inspect inputs, outputs, and run status.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.85rem" }}>
        {[
          { key: "blocked" as const, title: "Blocked Periods & Holidays", count: `${(live?.blocked ?? BLOCKED_RECORDS).length} active`, desc: "Blackout windows & statutory calendars" },
          { key: "accrual" as const, title: "Accrual & Carry-Forward Runs", count: `${(live?.accrual ?? ACCRUAL_RECORDS).length} records`, desc: "Monthly credit batches & cap runs" },
          { key: "liability" as const, title: "Leave Liability & Allowances", count: `${(live?.liability ?? LIABILITY_RECORDS).length} rows`, desc: "Unused day balances & financial exposure" },
        ].map((card) => {
          const isActive = activeCat === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => {
                setActiveCat(isActive ? null : card.key);
                setSelectedRecord(null);
              }}
              style={{
                textAlign: "left",
                padding: "0.9rem 1rem",
                borderRadius: radii.md,
                border: `1px solid ${isActive ? colors.indigoAction : colors.border}`,
                backgroundColor: isActive ? "#eef2ff" : "#f8fafc",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: colors.indigoPrimary }}>{card.title}</span>
                <Badge variant={isActive ? "info" : "neutral"} size="sm">{card.count}</Badge>
              </div>
              <div style={{ fontSize: 11, color: colors.textMuted }}>{card.desc}</div>
            </button>
          );
        })}
      </div>

      {activeCat && (
        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: `1px solid ${colors.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: selectedRecord ? "1fr 1fr" : "1fr", gap: "1rem" }}>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {liveError && <div role="alert" style={{ fontSize: 12, color: "#991b1b" }}>{liveError}</div>}
              {records.length === 0 && !liveError && (
                <div style={{ fontSize: 12, color: colors.textMuted }}>
                  {realSession && !live ? "Loading…" : "No records yet for this area."}
                </div>
              )}
              {records.map((rec) => (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => setSelectedRecord(rec)}
                  style={{
                    textAlign: "left",
                    padding: "0.65rem 0.85rem",
                    borderRadius: radii.md,
                    border: `1px solid ${selectedRecord?.id === rec.id ? colors.indigoAction : colors.border}`,
                    backgroundColor: selectedRecord?.id === rec.id ? "#eef2ff" : "#ffffff",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: colors.textPrimary }}>{rec.title}</div>
                    <div style={{ fontSize: 11, color: colors.textMuted }}>{rec.subtitle}</div>
                  </div>
                  <Badge variant={rec.status === "High Balance" ? "warning" : "success"} size="sm">{rec.status}</Badge>
                </button>
              ))}
            </div>

            {selectedRecord && (
              <div
                style={{
                  padding: "0.9rem 1rem",
                  borderRadius: radii.md,
                  border: `1px solid ${colors.indigoBorder}`,
                  backgroundColor: "#f8fafc",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: colors.indigoAction }}>{selectedRecord.id}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>{selectedRecord.title}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedRecord(null)}>
                    Close
                  </Button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, marginBottom: 4 }}>RUN INPUTS</div>
                    {selectedRecord.inputs.map((inp) => (
                      <div key={inp.label} style={{ marginBottom: 3 }}>
                        <span style={{ color: colors.textMuted }}>{inp.label}: </span>
                        <strong>{inp.value}</strong>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, marginBottom: 4 }}>RUN OUTPUTS</div>
                    {selectedRecord.outputs.map((out) => (
                      <div key={out.label} style={{ marginBottom: 3 }}>
                        <span style={{ color: colors.textMuted }}>{out.label}: </span>
                        <strong>{out.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

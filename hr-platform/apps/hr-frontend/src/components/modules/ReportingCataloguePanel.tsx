"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { colors, radii, typography } from "../../design-system/tokens";
import { SEEDED_DEPARTMENTS } from "../../data/enterpriseSeedData";

interface CatalogueItem {
  reportKey: string;
  name: string;
  module: "hris" | "leave" | "performance" | "assets" | "cross";
  purpose: string;
  grain: string;
  columns: { key: string; label: string; type: string }[];
  filters: string[];
  drillDown: string;
  sensitivity: "Public" | "Internal" | "Confidential" | "Restricted";
  frequency: string;
  phase: 1 | 2 | 3;
  accessible: boolean;
}

interface ReportEnvelope {
  reportKey: string;
  title: string;
  module: string;
  phase: number;
  sensitivity: string;
  generatedAt: string;
  asAt: string;
  filters: Record<string, string | undefined>;
  columns: { key: string; label: string; type: string }[];
  rows: Record<string, unknown>[];
  totals: { rowCount: number; page: number; pageSize: number };
  drillDown: string;
  suppressed: boolean;
  suppressionReason: string | null;
}

const MODULE_LABELS: Record<string, string> = {
  all: "All Modules",
  hris: "HRIS (20)",
  leave: "Leave (20)",
  performance: "Performance (15)",
  assets: "Assets (10)",
  cross: "Cross-Module (15)",
};

export const ReportingCataloguePanel: React.FC = () => {
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [loadingCatalogue, setLoadingCatalogue] = useState(true);
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const [selected, setSelected] = useState<CatalogueItem | null>(null);
  const [deptFilter, setDeptFilter] = useState<string>("COMPANY");
  const [scopeFilter, setScopeFilter] = useState<string>("");
  const [reportData, setReportData] = useState<ReportEnvelope | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/hr/reports/catalogue", { credentials: "include" });
        if (res.ok && !cancelled) {
          const body = await res.json();
          setCatalogue(Array.isArray(body.reports) ? body.reports : []);
        }
      } catch {
        // Non-authenticated demo mode
      } finally {
        if (!cancelled) setLoadingCatalogue(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return catalogue.filter((r) => {
      if (moduleFilter !== "all" && r.module !== moduleFilter) return false;
      if (phaseFilter !== "all" && String(r.phase) !== phaseFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !r.reportKey.toLowerCase().includes(q) &&
          !r.name.toLowerCase().includes(q) &&
          !r.purpose.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [catalogue, moduleFilter, phaseFilter, search]);

  const runReport = useCallback(
    async (item: CatalogueItem, dept = deptFilter, scope = scopeFilter) => {
      setSelected(item);
      setRunning(true);
      setReportError(null);
      setReportData(null);
      try {
        const params = new URLSearchParams();
        if (dept && dept !== "COMPANY") params.set("dept", dept);
        if (scope) params.set("scope", scope);
        const res = await fetch(
          `/api/hr/reports/${item.module}/${item.reportKey}?${params.toString()}`,
          { credentials: "include" }
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setReportError(body.message || `Access denied (${res.status})`);
        } else {
          setReportData(body as ReportEnvelope);
        }
      } catch (err) {
        setReportError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        setRunning(false);
      }
    },
    [deptFilter, scopeFilter]
  );

  const handleExportCsv = () => {
    if (!selected) return;
    const params = new URLSearchParams({ format: "csv" });
    if (deptFilter && deptFilter !== "COMPANY") params.set("dept", deptFilter);
    if (scopeFilter) params.set("scope", scopeFilter);
    window.open(`/api/hr/reports/${selected.module}/${selected.reportKey}?${params.toString()}`, "_blank");
  };

  const handleExportPdf = () => {
    if (!reportData) return;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(`${reportData.reportKey} · ${reportData.title}`, 14, 16);
    doc.setFontSize(9);
    doc.text(
      `As at: ${new Date(reportData.asAt).toLocaleString()} | Scope: ${reportData.filters.scope || "default"} | Sensitivity: ${reportData.sensitivity}`,
      14,
      23
    );
    let y = 32;
    const headers = reportData.columns.map((c) => c.label).join(" | ");
    doc.text(headers.slice(0, 140), 14, y);
    y += 6;
    for (const row of reportData.rows.slice(0, 28)) {
      const line = reportData.columns.map((c) => String(row[c.key] ?? "")).join(" | ");
      doc.text(line.slice(0, 140), 14, y);
      y += 5;
      if (y > 190) break;
    }
    doc.save(`${reportData.reportKey}.pdf`);
  };

  if (!loadingCatalogue && catalogue.length === 0) {
    return null;
  }

  return (
    <section
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.lg,
        padding: "1.25rem",
        marginBottom: "1.5rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: typography.sizes.lg, fontWeight: 700, color: colors.indigoPrimary }}>
            HRIS Reporting Catalogue (v1.0)
          </h2>
          <p style={{ margin: "0.2rem 0 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
            Unified `/reports/&#123;module&#125;/&#123;reportKey&#125;` engine · RBAC-scoped, audited, small-group suppressed (&lt; 5), CSV &amp; PDF export.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search key or name (e.g. LV-014)..."
            style={{
              padding: "0.35rem 0.65rem",
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              fontSize: typography.sizes.xs,
            }}
          />
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            style={{
              padding: "0.35rem 0.65rem",
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              fontSize: typography.sizes.xs,
            }}
          >
            {Object.entries(MODULE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            style={{
              padding: "0.35rem 0.65rem",
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              fontSize: typography.sizes.xs,
            }}
          >
            <option value="all">All Phases</option>
            <option value="1">Phase 1</option>
            <option value="2">Phase 2</option>
            <option value="3">Phase 3</option>
          </select>
        </div>
      </div>

      {loadingCatalogue ? (
        <p style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>Loading reporting catalogue…</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem", maxHeight: 340, overflowY: "auto", paddingRight: 4 }}>
          {filtered.map((item) => (
            <div
              key={item.reportKey}
              style={{
                border: `1px solid ${selected?.reportKey === item.reportKey ? colors.indigoAction : colors.border}`,
                borderRadius: radii.md,
                padding: "0.75rem",
                backgroundColor: item.accessible ? "#ffffff" : "#f8fafc",
                opacity: item.accessible ? 1 : 0.7,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.5rem",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: colors.indigoAction }}>{item.reportKey}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Badge variant={item.sensitivity === "Restricted" ? "error" : item.sensitivity === "Confidential" ? "warning" : "neutral"} size="sm">
                      {item.sensitivity}
                    </Badge>
                    <Badge variant="info" size="sm">P{item.phase}</Badge>
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>{item.name}</div>
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{item.purpose}</div>
              </div>

              <Button
                variant={selected?.reportKey === item.reportKey ? "primary" : "outline"}
                size="sm"
                disabled={!item.accessible}
                onClick={() => runReport(item)}
              >
                {item.accessible ? "Run Report" : "Restricted"}
              </Button>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div
          style={{
            marginTop: "1rem",
            paddingTop: "1rem",
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>
                {selected.reportKey} · {selected.name}
              </h3>
              {reportData && (
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  As at {new Date(reportData.asAt).toLocaleString()} · Scope: {reportData.filters.scope || "default"} · Rows: {reportData.totals.rowCount}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value);
                  runReport(selected, e.target.value, scopeFilter);
                }}
                style={{ padding: "0.3rem 0.55rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: 12 }}
              >
                <option value="COMPANY">All Departments</option>
                {SEEDED_DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
              <select
                value={scopeFilter}
                onChange={(e) => {
                  setScopeFilter(e.target.value);
                  runReport(selected, deptFilter, e.target.value);
                }}
                style={{ padding: "0.3rem 0.55rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: 12 }}
              >
                <option value="">Default Scope</option>
                <option value="self">Self</option>
                <option value="team">Team</option>
                <option value="department">Department</option>
                <option value="company">Company</option>
              </select>
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={!reportData}>
                Export PDF
              </Button>
            </div>
          </div>

          {running && <p style={{ fontSize: 12, color: colors.textMuted }}>Running query…</p>}
          {reportError && <p role="alert" style={{ fontSize: 12, color: "#b91c1c" }}>{reportError}</p>}
          {reportData?.suppressed && (
            <div style={{ padding: "0.75rem", borderRadius: radii.md, backgroundColor: "#fffbeb", border: "1px solid #fcd34d", fontSize: 12, color: "#92400e", marginBottom: "0.75rem" }}>
              {reportData.suppressionReason}
            </div>
          )}
          {reportData && !reportData.suppressed && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", textAlign: "left" }}>
                    {reportData.columns.map((col) => (
                      <th key={col.key} style={{ padding: "0.5rem", borderBottom: `1px solid ${colors.border}`, fontWeight: 700 }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={reportData.columns.length} style={{ padding: "0.75rem", color: colors.textMuted }}>
                        No rows match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    reportData.rows.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${colors.border}` }}>
                        {reportData.columns.map((col) => (
                          <td key={col.key} style={{ padding: "0.45rem 0.5rem" }}>
                            {String(row[col.key] ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

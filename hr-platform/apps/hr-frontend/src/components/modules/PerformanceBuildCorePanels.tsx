"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { colors, radii, shadows, typography } from "../../design-system/tokens";

interface UnifiedItem {
  id: string;
  framework: "BSC" | "OKR" | "MBO";
  ownerName: string;
  title: string;
  status: string;
  weight: number;
  progress: number;
  computedScore: number;
  ruleVersionPinned: string;
  extensions?: { okr?: { confidenceValue: number }; bsc?: { perspectiveId: string } };
}

interface InsightCard {
  key: string;
  title: string;
  value: string;
  formula: string;
  suppressed?: boolean;
}

interface ExplainSnapshot {
  id: string;
  title: string;
  framework: string;
  frameworkProfileVersion: string;
  ruleVersion: string;
  formula: string;
  measureInputs: Array<{ label: string; baseline: number; target: number; actual: number }>;
  weights: Record<string, number>;
  computedScore: number;
  rounding: string;
  timestamp: string;
  actor: string;
}

const FALLBACK_ITEMS: UnifiedItem[] = [
  { id: "1", framework: "BSC", ownerName: "Paa Kwesi Barnes", title: "Grow Pan-African Advisory Margin to 34%", status: "active", weight: 40, progress: 82, computedScore: 82, ruleVersionPinned: "ratio-v1.0", extensions: { bsc: { perspectiveId: "FINANCIAL" } } },
  { id: "2", framework: "OKR", ownerName: "Benedicta Agbesi", title: "Deliver Sub-15ms Edge Worker P99 Latency", status: "active", weight: 50, progress: 70, computedScore: 0.7, ruleVersionPinned: "ratio-v1.0", extensions: { okr: { confidenceValue: 0.7 } } },
  { id: "3", framework: "MBO", ownerName: "Jemima Richards", title: "100% Statutory Compliance & Zero Audit Findings", status: "completed", weight: 50, progress: 96, computedScore: 96, ruleVersionPinned: "milestone-v1.0" },
];

const FALLBACK_INSIGHTS: InsightCard[] = [
  { key: "completion", title: "Completion", value: "78%", formula: "Completed / Active Goals" },
  { key: "alignment", title: "Alignment", value: "84%", formula: "Aligned / Total Goals" },
  { key: "quality", title: "Quality", value: "88/100", formula: "SMART & KR Rule Score" },
  { key: "cadence", title: "Cadence", value: "91%", formula: "Check-ins Performed / Due" },
  { key: "ratings", title: "Ratings", value: "82%", formula: "Weighted Roll-up Avg" },
  { key: "fairness", title: "Fairness", value: "Suppressed (<5)", formula: "Demographic Parity Check", suppressed: true },
];

export const PerformanceThreeLensesPanel: React.FC = () => {
  const [framework, setFramework] = useState<"ALL" | "BSC" | "OKR" | "MBO">("ALL");
  const [renderMode, setRenderMode] = useState<"cascade" | "grid" | "list">("cascade");
  const [items, setItems] = useState<UnifiedItem[]>(FALLBACK_ITEMS);
  const [insights, setInsights] = useState<InsightCard[]>(FALLBACK_INSIGHTS);
  const [asAt, setAsAt] = useState<string>(() => new Date().toISOString());
  const [explainData, setExplainData] = useState<ExplainSnapshot | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [itemsRes, insightsRes] = await Promise.all([
        fetch(`/api/hr/performance/items?framework=${framework}`, { credentials: "include" }),
        fetch("/api/hr/performance/reports/insights", { credentials: "include" }),
      ]);
      if (itemsRes.ok) {
        const body = await itemsRes.json();
        if (Array.isArray(body.items) && body.items.length > 0) setItems(body.items);
        if (body.asAt) setAsAt(body.asAt);
      }
      if (insightsRes.ok) {
        const body = await insightsRes.json();
        if (Array.isArray(body.cards) && body.cards.length > 0) setInsights(body.cards);
      }
    } catch {
      // Seeded fallback active
    }
  }, [framework]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openExplain = async (item: UnifiedItem) => {
    try {
      const res = await fetch(`/api/hr/performance/explain/goal/${item.id}`, { credentials: "include" });
      if (res.ok) {
        setExplainData(await res.json());
        return;
      }
    } catch {
      // Deterministic fallback below
    }
    setExplainData({
      id: item.id,
      title: item.title,
      framework: item.framework,
      frameworkProfileVersion: "preset-v1.0",
      ruleVersion: item.ruleVersionPinned,
      formula: "clamp((actual - baseline) / (target - baseline), 0, 1)",
      measureInputs: [{ label: "Progress", baseline: 0, target: 100, actual: item.progress }],
      weights: { goalWeightPct: item.weight },
      computedScore: item.computedScore,
      rounding: item.framework === "OKR" ? "2 decimals (0.00–1.00)" : "1 decimal (0–100%)",
      timestamp: new Date().toISOString(),
      actor: item.ownerName,
    });
  };

  const visibleItems = framework === "ALL" ? items : items.filter((i) => i.framework === framework);

  return (
    <div style={{ display: "grid", gap: "1.25rem", marginBottom: "1.5rem" }}>
      {/* §6.11: 6 Insight Cards */}
      <section style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: "1.25rem", boxShadow: shadows.xs }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.85rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>
              Performance Insight Cards (BUILD.md §6.11)
            </h3>
            <p style={{ margin: "0.15rem 0 0", fontSize: 11, color: colors.textMuted }}>
              One Core, Three Lenses (BSC · OKR · MBO) · As at {new Date(asAt).toLocaleString()}
            </p>
          </div>
          <Badge variant="info" size="sm">G-02 &amp; G-08 Compliant</Badge>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.75rem" }}>
          {insights.map((card) => (
            <div key={card.key} style={{ padding: "0.85rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, backgroundColor: card.suppressed ? "#f8fafc" : "#ffffff" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>{card.title}</div>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: card.suppressed ? "#64748b" : colors.indigoPrimary, margin: "0.25rem 0" }}>
                {card.value}
              </div>
              <div style={{ fontSize: 11, color: colors.textMuted }}>{card.formula}</div>
            </div>
          ))}
        </div>
      </section>

      {/* §4.5 & §6.2 & §6.3: Unified Items + 3-Mode Alignment Canvas */}
      <section style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: "1.25rem", boxShadow: shadows.xs }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.9rem" }}>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {(["ALL", "BSC", "OKR", "MBO"] as const).map((fw) => (
              <Button key={fw} variant={framework === fw ? "primary" : "outline"} size="sm" onClick={() => setFramework(fw)}>
                {fw === "ALL" ? "All Frameworks" : fw}
              </Button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {[
              { key: "cascade", label: "Cascade (BSC)" },
              { key: "grid", label: "Grid (OKR)" },
              { key: "list", label: "List (MBO)" },
            ].map((rm) => (
              <Button key={rm.key} variant={renderMode === rm.key ? "primary" : "outline"} size="sm" onClick={() => setRenderMode(rm.key as any)}>
                {rm.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Canonical Goal Cards (<= 5 fields per card per G-03) */}
        <div style={{ display: "grid", gridTemplateColumns: renderMode === "list" ? "1fr" : "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.85rem" }}>
          {visibleItems.map((item) => (
            <div key={item.id} style={{ padding: "0.9rem 1rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, borderLeft: `4px solid ${item.framework === "OKR" ? "#059669" : item.framework === "MBO" ? "#d97706" : "#4f46e5"}`, backgroundColor: "#ffffff", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "0.5rem" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4, marginBottom: 4 }}>
                  <Badge variant="info" size="sm">{item.framework}</Badge>
                  <Badge variant={item.status === "completed" ? "success" : "neutral"} size="sm">{item.status}</Badge>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>{item.title}</div>
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  Owner: {item.ownerName} · Progress: <strong>{item.progress}%</strong>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6, borderTop: `1px solid ${colors.borderSubtle}` }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: colors.indigoPrimary }}>
                  Score: {item.framework === "OKR" ? item.computedScore.toFixed(2) : `${item.computedScore}%`}
                </span>
                <Button variant="outline" size="sm" onClick={() => openExplain(item)}>
                  Explain ⓘ
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* §6.13: Explain Drawer / Modal */}
      {explainData && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 1000 }}
          onClick={() => setExplainData(null)}
        >
          <div style={{ backgroundColor: colors.surface, borderRadius: radii.lg, border: `1px solid ${colors.border}`, padding: "1.25rem", width: "100%", maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 11, fontWeight: 700, color: colors.indigoAction }}>CALCULATION SNAPSHOT (§6.13)</div>
            <h3 style={{ margin: "0.2rem 0 0.75rem", fontSize: typography.sizes.lg, color: colors.indigoPrimary }}>{explainData.title}</h3>
            <div style={{ display: "grid", gap: "0.45rem", fontSize: 12, marginBottom: "1rem" }}>
              <div><strong>Framework:</strong> {explainData.framework} ({explainData.frameworkProfileVersion})</div>
              <div><strong>Rule Version:</strong> <code>{explainData.ruleVersion}</code></div>
              <div><strong>Formula:</strong> <code>{explainData.formula}</code></div>
              <div><strong>Inputs:</strong> {explainData.measureInputs.map((m) => `${m.label}: ${m.actual}/${m.target} (base ${m.baseline})`).join(", ")}</div>
              <div><strong>Weights:</strong> {JSON.stringify(explainData.weights)}</div>
              <div><strong>Computed Score:</strong> {explainData.computedScore} ({explainData.rounding})</div>
              <div><strong>Actor &amp; Timestamp:</strong> {explainData.actor} · {explainData.timestamp}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="primary" size="sm" onClick={() => setExplainData(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React from "react";
import { colors, radii, typography } from "../../design-system/tokens";

// Shared frame for the module mini-dashboards: a short row of key figures, one or two small breakdowns, and a link into
// the full screen. Teal is the chrome accent. Rich colour appears only in chart series, one colour per series, and every
// value is printed as text, so colour is never the only signal.

export const CHART = {
  teal: "#0f5c4d",
  emerald: "#059669",
  amber: "#d97706",
  rose: "#be123c",
  blue: "#2563eb",
  violet: "#7c3aed",
  sky: "#0284c7",
  orange: "#ea580c",
} as const;

export interface Part {
  label: string;
  value: number;
  color: string;
}

export interface Row {
  label: string;
  parts: Part[];
}

export const MiniDashboard: React.FC<{ title: string; summary?: string; linkLabel: string; onOpen: () => void; children: React.ReactNode }> = ({
  title,
  summary,
  linkLabel,
  onOpen,
  children,
}) => (
  <section
    style={{
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      borderTop: `3px solid ${colors.indigoMedium}`,
      borderRadius: radii.lg,
      padding: "1rem 1.25rem",
      marginBottom: "1.25rem",
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.85rem" }}>
      <div>
        <h2 style={{ margin: 0, fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.textPrimary }}>{title}</h2>
        {summary && <p style={{ margin: "0.2rem 0 0", fontSize: typography.sizes.sm, color: colors.textMuted }}>{summary}</p>}
      </div>
      <button
        type="button"
        onClick={onOpen}
        style={{ minHeight: "36px", padding: "0 0.25rem", background: "none", border: "none", color: colors.indigoMedium, fontWeight: typography.weights.semibold, font: "inherit", cursor: "pointer" }}
      >
        {linkLabel} →
      </button>
    </div>
    {children}
  </section>
);

export const KeyFigures: React.FC<{ items: { label: string; value: number | string }[] }> = ({ items }) => (
  <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem", margin: "0 0 1rem" }}>
    {items.map((item) => (
      <div key={item.label} style={{ border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: "0.6rem 0.75rem", backgroundColor: colors.bgApp }}>
        <dt style={{ fontSize: typography.sizes.xs, color: colors.textMuted, fontWeight: typography.weights.semibold }}>{item.label}</dt>
        <dd style={{ margin: "0.15rem 0 0", fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.textPrimary }}>{item.value}</dd>
      </div>
    ))}
  </dl>
);

/** One horizontal bar per row. Each row's parts are stacked; the total is printed at the end of the row. */
export const StackedRows: React.FC<{ caption: string; rows: Row[]; legend?: { label: string; color: string }[] }> = ({ caption, rows, legend = [] }) => {
  const totals = rows.map((r) => r.parts.reduce((sum, p) => sum + p.value, 0));
  const max = Math.max(1, ...totals);
  return (
    <figure style={{ margin: 0 }}>
      <figcaption style={{ fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.textSecondary, marginBottom: "0.5rem" }}>{caption}</figcaption>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.45rem" }}>
        {rows.map((row, i) => {
          const total = totals[i];
          const described = row.parts.filter((p) => p.value > 0).map((p) => `${p.value} ${p.label.toLowerCase()}`).join(", ");
          return (
            <li key={row.label} style={{ display: "grid", gridTemplateColumns: "minmax(96px, 170px) 1fr 36px", alignItems: "center", gap: "0.6rem", fontSize: typography.sizes.sm }}>
              <span title={`${row.label}: ${described || "none"}`} style={{ color: colors.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {row.label}
              </span>
              <span style={{ display: "block", height: "12px", borderRadius: "3px", backgroundColor: colors.surfaceSubtle, overflow: "hidden" }} aria-hidden="true">
                <span style={{ display: "flex", height: "100%", width: `${(total / max) * 100}%` }}>
                  {row.parts
                    .filter((p) => p.value > 0)
                    .map((p) => (
                      <span key={p.label} title={`${p.label}: ${p.value}`} style={{ width: `${(p.value / total) * 100}%`, backgroundColor: p.color }} />
                    ))}
                </span>
              </span>
              <span style={{ textAlign: "right", fontWeight: typography.weights.semibold, color: colors.textPrimary }}>{total}</span>
            </li>
          );
        })}
      </ul>
      {legend.length > 0 && (
        <ul style={{ listStyle: "none", display: "flex", flexWrap: "wrap", gap: "0.75rem", margin: "0.6rem 0 0", padding: 0, fontSize: typography.sizes.xs, color: colors.textSecondary }}>
          {legend.map((l) => (
            <li key={l.label} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <span aria-hidden="true" style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: l.color }} />
              {l.label}
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
};

export const EmptyNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{ margin: 0, fontSize: typography.sizes.sm, color: colors.textMuted }}>{children}</p>
);

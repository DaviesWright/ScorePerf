import React from "react";

// Shared look for the assets screens. Moved out of AssetsSimple.tsx so the panels in AssetsWriteOff.tsx and
// AssetsAdmin.tsx match it. Importers: AssetsSimple.tsx, AssetsWriteOff.tsx, AssetsAdmin.tsx.

export const S = {
  page: { padding: "1.5rem", maxWidth: "1100px" } as React.CSSProperties,
  h2: { margin: "1.5rem 0 0.5rem", fontSize: "17px", color: "#4338ca" } as React.CSSProperties,
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.75rem" } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse", background: "#ffffff", border: "1px solid #d1d5db" } as React.CSSProperties,
  th: { textAlign: "left", padding: "0.6rem 0.75rem", borderBottom: "1px solid #d1d5db", background: "#eef2ff", color: "#3730a3", fontWeight: 600 } as React.CSSProperties,
  td: { padding: "0.6rem 0.75rem", borderBottom: "1px solid #d1d5db", verticalAlign: "top" } as React.CSSProperties,
  btn: { minHeight: "40px", padding: "0 0.9rem", border: "1px solid #d1d5db", borderRadius: "4px", background: "#ffffff", color: "#1f2937", font: "inherit", cursor: "pointer" } as React.CSSProperties,
  primary: { minHeight: "44px", padding: "0 1.2rem", border: "1px solid #1d4ed8", borderRadius: "4px", background: "#1d4ed8", color: "#ffffff", font: "inherit", cursor: "pointer" } as React.CSSProperties,
  danger: { minHeight: "44px", padding: "0 1.2rem", border: "1px solid #be123c", borderRadius: "4px", background: "#be123c", color: "#ffffff", font: "inherit", cursor: "pointer" } as React.CSSProperties,
  input: { minHeight: "40px", padding: "0.4rem 0.6rem", border: "1px solid #d1d5db", borderRadius: "4px", font: "inherit", background: "#ffffff" } as React.CSSProperties,
  field: { display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "0.75rem" } as React.CSSProperties,
  panel: { border: "1px solid #d1d5db", background: "#ffffff", padding: "1rem", marginTop: "0.75rem" } as React.CSSProperties,
  note: { color: "#4b5563", margin: "0.25rem 0 0" } as React.CSSProperties,
  error: { color: "#b91c1c", fontWeight: 600 } as React.CSSProperties,
};

/** Visually hidden table caption, for screen readers. */
export const Caption = ({ children }: { children: string }) =>
  React.createElement("caption", { style: { textAlign: "left", position: "absolute", left: "-9999px" } }, children);

"use client";

import React, { useEffect, useMemo, useState } from "react";

// HR's progress heatmap: one row per person, one cell per approved objective, shaded by its progress.
// Each row ends with the weighted average as text, so the number is readable without colour.
const RAMP = ["#f2f1ed", "#cfe3dc", "#8fc2b3", "#4f9a88", "#0f5c4d"];
const band = (p: number) => (p >= 100 ? 4 : p >= 75 ? 3 : p >= 50 ? 2 : p >= 25 ? 1 : 0);

interface ProgressRow {
  id: number;
  employeeId: number;
  employeeName: string;
  department: string | null;
  title: string;
  weight: number;
  progress: number;
}

export function ProgressHeatmap() {
  const [rows, setRows] = useState<ProgressRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/objectives/team-progress", { cache: "no-store" })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error ?? "Could not load progress.");
        return body.results as ProgressRow[];
      })
      .then((d) => !cancelled && setRows(d))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Could not load progress."));
    return () => {
      cancelled = true;
    };
  }, []);

  const people = useMemo(() => {
    const m = new Map<number, { name: string; department: string | null; items: ProgressRow[] }>();
    for (const r of rows ?? []) {
      const p = m.get(r.employeeId) ?? { name: r.employeeName, department: r.department, items: [] };
      p.items.push(r);
      m.set(r.employeeId, p);
    }
    return [...m.entries()];
  }, [rows]);

  if (error) return <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>;
  if (rows === null) return <p role="status">Loading progress…</p>;
  if (people.length === 0) return <p style={{ color: "#79756c" }}>No approved objectives in this cycle yet.</p>;

  return (
    <section aria-label="Objective progress heatmap" style={{ marginBottom: "1.5rem" }}>
      <h3 style={{ margin: "0 0 0.25rem", fontSize: "16px" }}>Objective progress across the company</h3>
      <p style={{ margin: "0 0 0.75rem", fontSize: "12px", color: "#79756c" }}>
        Each cell is one approved objective. Darker means further along. Hover a cell for its title and percent.
      </p>
      {people.map(([employeeId, p]) => {
        const totalWeight = p.items.reduce((s, i) => s + i.weight, 0);
        const avg = totalWeight > 0 ? Math.round(p.items.reduce((s, i) => s + i.progress * i.weight, 0) / totalWeight) : 0;
        return (
          <div
            key={employeeId}
            style={{ display: "grid", gridTemplateColumns: "minmax(160px, 220px) 1fr 56px", alignItems: "center", gap: "0.75rem", padding: "0.4rem 0", borderTop: "1px solid #efede8" }}
          >
            <div>
              <div style={{ fontWeight: 600, color: "#1c1b19" }}>{p.name}</div>
              {p.department && <div style={{ fontSize: "12px", color: "#79756c" }}>{p.department}</div>}
            </div>
            <div role="img" aria-label={`${p.name}: ${p.items.length} objectives, weighted progress ${avg} percent`} style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {p.items.map((i) => (
                <span
                  key={i.id}
                  title={`${i.title}: ${i.progress}%`}
                  style={{ width: "22px", height: "22px", borderRadius: "4px", backgroundColor: RAMP[band(i.progress)], border: "1px solid #e4e1da", boxSizing: "border-box" }}
                />
              ))}
            </div>
            <div style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "#1c1b19" }}>{avg}%</div>
          </div>
        );
      })}
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.5rem", fontSize: "11px", color: "#79756c" }}>
        <span>0%</span>
        {RAMP.map((c) => (
          <span key={c} style={{ width: "12px", height: "12px", borderRadius: "2px", backgroundColor: c, border: "1px solid #e4e1da", boxSizing: "border-box" }} />
        ))}
        <span>100%</span>
      </div>
    </section>
  );
}

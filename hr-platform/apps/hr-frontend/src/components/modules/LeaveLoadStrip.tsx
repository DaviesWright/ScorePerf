"use client";

import React, { useMemo } from "react";
import { formatDate } from "../../utils/date";

// Intensity strip: one cell per day, darker teal for more people off. Warm neutral is "none".
// Each cell has a title with the date and count, and the strip has a summary label, so colour is not the only signal.
const RAMP = ["#f2f1ed", "#cfe3dc", "#8fc2b3", "#4f9a88", "#0f5c4d"];

export interface LoadRow {
  employeeName: string;
  startDate: string;
  endDate: string;
}

/** Every calendar day from `from` to `to`, inclusive, as YYYY-MM-DD. Capped at 366 days. */
function dayList(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end && out.length < 366) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export function LeaveLoadStrip({ rows, from, to, caption }: { rows: LoadRow[]; from: string; to: string; caption: string }) {
  const days = useMemo(() => dayList(from, to), [from, to]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      for (const d of days) if (d >= r.startDate && d <= r.endDate) m.set(d, (m.get(d) ?? 0) + 1);
    }
    return m;
  }, [rows, days]);

  if (days.length === 0) return null;
  const max = Math.max(1, ...counts.values());
  const busiest = Math.max(0, ...counts.values());

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <p style={{ margin: "0 0 0.4rem 0", fontSize: "12px", color: "#79756c" }}>{caption}</p>
      <div
        role="img"
        aria-label={`${caption}. Busiest day has ${busiest} ${busiest === 1 ? "person" : "people"} off.`}
        style={{ display: "flex", flexWrap: "wrap", gap: "2px" }}
      >
        {days.map((d) => {
          const n = counts.get(d) ?? 0;
          const step = n === 0 ? 0 : Math.min(4, 1 + Math.floor(((n - 1) / max) * 4));
          return (
            <span
              key={d}
              title={`${formatDate(d)}: ${n} ${n === 1 ? "person" : "people"} off`}
              style={{ width: "14px", height: "14px", borderRadius: "3px", backgroundColor: RAMP[step], border: "1px solid #e4e1da", boxSizing: "border-box" }}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.4rem", fontSize: "11px", color: "#79756c" }}>
        <span>Fewer</span>
        {RAMP.map((c) => (
          <span key={c} style={{ width: "12px", height: "12px", borderRadius: "2px", backgroundColor: c, border: "1px solid #e4e1da", boxSizing: "border-box" }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

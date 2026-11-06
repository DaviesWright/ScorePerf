"use client";

import React, { useEffect, useState } from "react";

// "Where you sit": your managers above you, your direct reports below. Solid lines are the approving reporting line;
// dotted lines are visibility only. Live data only; the demo login has no API behind it.

interface Me {
  firstName: string;
  lastName: string;
  jobTitle: string;
  department: string | null;
}
interface Link {
  kind: "solid" | "dotted";
  id: number;
  name: string;
}
interface Lines {
  managers: Link[];
  reports: Link[];
}

const PALETTE = ["#4f46e5", "#0d9488", "#d97706", "#e11d48", "#7c3aed", "#0284c7", "#16a34a", "#db2777"];
const colourFor = (id: number) => PALETTE[Math.abs(id) % PALETTE.length];
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

function Avatar({ id, name, size = 40 }: { id: number; name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: colourFor(id),
        color: "#ffffff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size / 2.8,
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </span>
  );
}

// Vertical connector: solid for the approving line, dashed for a dotted line.
const Connector = ({ dotted = false }: { dotted?: boolean }) => (
  <div
    aria-hidden="true"
    style={{
      width: 0,
      height: 22,
      margin: "0 auto",
      borderLeft: dotted ? "2px dashed #94a3b8" : "2px solid #64748b",
    }}
  />
);

export const OrgPosition: React.FC<{ realSession: boolean }> = ({ realSession }) => {
  const [me, setMe] = useState<Me | null>(null);
  const [lines, setLines] = useState<Lines | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!realSession) return;
    let cancelled = false;
    Promise.all([
      fetch("/api/hr/me", { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject(new Error("Could not load your profile.")))),
      fetch("/api/hr/reporting-lines/me", { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject(new Error("Could not load your reporting lines.")))),
    ])
      .then(([profile, rl]) => {
        if (cancelled) return;
        setMe(profile);
        setLines({ managers: rl.managers ?? [], reports: rl.reports ?? [] });
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Could not load."));
    return () => {
      cancelled = true;
    };
  }, [realSession]);

  if (!realSession) return null;
  if (error) return <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>;
  if (!me || !lines) return <p role="status">Loading your position…</p>;

  const myName = `${me.firstName} ${me.lastName}`;
  const dotted = lines.reports.filter((r) => r.kind === "dotted").length;
  const shown = lines.reports.slice(0, 24);

  return (
    <section
      aria-label="Your position in the organisation"
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
        padding: "1.25rem",
        marginTop: "1rem",
      }}
    >
      <h2 style={{ margin: "0 0 0.25rem", fontSize: "17px", color: "#4338ca" }}>Your place in the organisation</h2>
      <p style={{ margin: "0 0 1rem", color: "#475569" }}>Solid lines approve your work. Dashed lines keep you in the loop.</p>

      {/* Managers */}
      <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        {lines.managers.length === 0 && <p style={{ color: "#64748b", margin: 0 }}>No manager recorded yet.</p>}
        {lines.managers.map((m) => (
          <div
            key={`${m.kind}-${m.id}`}
            style={{
              background: "#ffffff",
              border: m.kind === "solid" ? `2px solid ${colourFor(m.id)}` : `2px dashed ${colourFor(m.id)}`,
              borderRadius: 10,
              padding: "0.5rem 0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              minWidth: 180,
            }}
          >
            <Avatar id={m.id} name={m.name} size={34} />
            <div>
              <div style={{ fontWeight: 600, color: "#1e293b" }}>{m.name}</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>{m.kind === "solid" ? "Approves your work" : "Dotted line"}</div>
            </div>
          </div>
        ))}
      </div>

      <Connector />

      {/* Me */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #4f46e5 0%, #0891b2 100%)",
            color: "#ffffff",
            borderRadius: 14,
            padding: "0.9rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            boxShadow: "0 6px 16px rgba(79,70,229,0.25)",
            minWidth: 240,
          }}
        >
          <span
            aria-hidden="true"
            style={{ width: 48, height: 48, borderRadius: "50%", background: "#ffffff", color: "#4338ca", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}
          >
            {initials(myName)}
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "16px" }}>{myName}</div>
            <div style={{ opacity: 0.9, fontSize: "13px" }}>
              {me.jobTitle}
              {me.department ? ` · ${me.department}` : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Reports */}
      {lines.reports.length > 0 ? (
        <>
          <Connector />
          <p style={{ textAlign: "center", margin: "0 0 0.75rem", color: "#334155" }}>
            <strong>{lines.reports.length}</strong> {lines.reports.length === 1 ? "report" : "reports"}
            {dotted > 0 ? ` · ${dotted} on a dotted line` : ""}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "0.6rem" }}>
            {shown.map((r) => (
              <div
                key={`${r.kind}-${r.id}`}
                style={{
                  background: "#ffffff",
                  borderRadius: 10,
                  padding: "0.5rem 0.6rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  border: r.kind === "solid" ? "1px solid #cbd5e1" : "1px dashed #94a3b8",
                }}
              >
                <Avatar id={r.id} name={r.name} size={32} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                  <div style={{ fontSize: "11px", color: r.kind === "solid" ? "#047857" : "#64748b" }}>{r.kind === "solid" ? "Solid line" : "Dotted line"}</div>
                </div>
              </div>
            ))}
          </div>
          {lines.reports.length > shown.length && (
            <p style={{ color: "#64748b", marginTop: "0.5rem" }}>Showing {shown.length} of {lines.reports.length}.</p>
          )}
        </>
      ) : (
        <p style={{ textAlign: "center", color: "#64748b", marginTop: "0.75rem" }}>No direct reports.</p>
      )}
    </section>
  );
};

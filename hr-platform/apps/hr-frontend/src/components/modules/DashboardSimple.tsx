"use client";

import React, { useEffect, useState } from "react";
import type { AccessRole } from "@hr-platform/shared";
import { HomePanels } from "./HomePanels";

// Plain dashboard: figures for everyone, approval queues and upcoming leave for deciders. Live data only; the
// demo login has no API behind it, so it says so instead of showing made-up numbers.

interface Tally {
  total: number;
  approved: number;
  approvedPct: number | null;
  awaiting?: number;
}

interface DashboardData {
  onLeaveToday: number;
  myPendingLeave: number;
  cycle: { id: number; title: string; status: string; open: boolean } | null;
  objectives: { company: Tally | null; mine: Tally | null };
  approvals: { leavePending: number; peopleWaiting: number } | null;
  upcomingLeave: { startDate: string; endDate: string; leaveType: string; employeeName: string; department: string | null }[] | null;
}

const C = { text: "#1f2937", muted: "#4b5563", border: "#d1d5db", surface: "#ffffff", page: "#f9fafb", accent: "#1d4ed8", danger: "#b91c1c", warn: "#92400e" };

const S = {
  page: { padding: "1.5rem", maxWidth: "1100px" } as React.CSSProperties,
  h1: { margin: "0 0 0.25rem", fontSize: "22px" } as React.CSSProperties,
  h2: { margin: "1.5rem 0 0.5rem", fontSize: "17px" } as React.CSSProperties,
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" } as React.CSSProperties,
  card: { border: `1px solid ${C.border}`, background: C.surface, padding: "0.9rem 1rem" } as React.CSSProperties,
  big: { fontSize: "26px", fontWeight: 700, margin: "0.25rem 0" } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse", background: C.surface, border: `1px solid ${C.border}` } as React.CSSProperties,
  th: { textAlign: "left", padding: "0.6rem 0.75rem", borderBottom: `1px solid ${C.border}`, background: C.page, fontWeight: 600 } as React.CSSProperties,
  td: { padding: "0.6rem 0.75rem", borderBottom: `1px solid ${C.border}`, verticalAlign: "top" } as React.CSSProperties,
  note: { color: C.muted, margin: "0.25rem 0 0" } as React.CSSProperties,
};

const Caption = ({ children }: { children: string }) => <caption style={{ textAlign: "left", position: "absolute", left: "-9999px" }}>{children}</caption>;

const fmt = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });

type Tone = "blue" | "green" | "amber" | "violet" | "rose" | "teal";
const TONES: Record<Tone, { edge: string; bg: string; text: string }> = {
  blue: { edge: "#2563eb", bg: "#eff6ff", text: "#1e40af" },
  green: { edge: "#16a34a", bg: "#f0fdf4", text: "#166534" },
  amber: { edge: "#d97706", bg: "#fffbeb", text: "#92400e" },
  violet: { edge: "#7c3aed", bg: "#f5f3ff", text: "#5b21b6" },
  rose: { edge: "#e11d48", bg: "#fff1f2", text: "#9f1239" },
  teal: { edge: "#0d9488", bg: "#f0fdfa", text: "#115e59" },
};

function Card({ label, value, note, tone }: { label: string; value: string | number; note?: string; tone: Tone }) {
  const t = TONES[tone];
  return (
    <div style={{ ...S.card, background: t.bg, borderTop: `4px solid ${t.edge}` }}>
      <div style={{ color: t.text, fontWeight: 600 }}>{label}</div>
      <div style={{ ...S.big, color: t.edge }}>{value}</div>
      {note && <div style={{ ...S.note, color: t.text }}>{note}</div>}
    </div>
  );
}

export const DashboardScreen: React.FC<{ user: { id: string; persona: AccessRole }; realSession: boolean }> = ({ user, realSession }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(realSession);

  useEffect(() => {
    if (!realSession) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/dashboard", { cache: "no-store" })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error ?? `Could not load the dashboard (${r.status}).`);
        return body as DashboardData;
      })
      .then((d) => !cancelled && (setData(d), setError("")))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Could not load the dashboard."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [realSession, user.id]);

  const decider = user.persona === "line_manager" || user.persona === "hr_admin" || user.persona === "hr_director";

  return (
    <div style={S.page}>
      <div style={{ background: "linear-gradient(135deg, #4f46e5 0%, #0891b2 100%)", color: "#ffffff", padding: "1.25rem 1.5rem", borderRadius: "8px", marginBottom: "0.5rem" }}>
        <h1 style={{ ...S.h1, color: "#ffffff", margin: 0 }}>Dashboard</h1>
        <p style={{ margin: "0.35rem 0 0", opacity: 0.92 }}>{data?.cycle ? `Cycle: ${data.cycle.title}` : "No performance cycle is open for goal setting."}</p>
      </div>

      {!realSession && <p role="status" style={{ ...S.note, marginTop: "1rem" }}>Sign in to see live figures. The demo login has no data behind this screen.</p>}
      <HomePanels realSession={realSession} />
      {realSession && loading && <p role="status">Loading…</p>}
      {realSession && error && <p role="alert" style={{ color: C.danger }}>{error}</p>}

      {data && (
        <>
          <div style={{ ...S.grid, marginTop: "1rem" }}>
            <Card tone="blue" label="Away today" value={data.onLeaveToday} note="Employees on approved leave" />
            <Card tone="amber" label="My leave pending" value={data.myPendingLeave} />
            <Card
              tone="green"
              label="Objectives approved (company)"
              value={data.objectives.company?.approvedPct == null ? "-" : `${data.objectives.company.approvedPct}%`}
              note={data.objectives.company ? `${data.objectives.company.approved} of ${data.objectives.company.total} approved` : undefined}
            />
            <Card
              tone="violet"
              label="My objectives"
              value={data.objectives.mine && data.objectives.mine.total > 0 ? `${data.objectives.mine.approved} of ${data.objectives.mine.total}` : "-"}
              note={data.objectives.mine && data.objectives.mine.awaiting ? `${data.objectives.mine.awaiting} still to be approved` : undefined}
            />
          </div>

          {data.approvals && (
            <>
              <h2 style={S.h2}>Waiting for you</h2>
              <div style={S.grid}>
                <Card tone="rose" label="Leave requests to decide" value={data.approvals.leavePending} />
                <Card tone="teal" label="People with objectives to approve" value={data.approvals.peopleWaiting} />
              </div>
            </>
          )}

          {data.upcomingLeave && (
            <>
              <h2 style={S.h2}>Leave starting in the next 14 days</h2>
              {data.upcomingLeave.length === 0 ? (
                <p style={S.note}>No approved leave starts in the next 14 days.</p>
              ) : (
                <table style={S.table}>
                  <Caption>Leave starting in the next 14 days</Caption>
                  <thead>
                    <tr>{["Employee", "Department", "Dates", "Type"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {data.upcomingLeave.map((r, i) => (
                      <tr key={`${r.employeeName}-${r.startDate}-${i}`}>
                        <td style={S.td}><strong>{r.employeeName}</strong></td>
                        <td style={S.td}>{r.department ?? "-"}</td>
                        <td style={S.td}>{r.startDate === r.endDate ? fmt(r.startDate) : `${fmt(r.startDate)} to ${fmt(r.endDate)}`}</td>
                        <td style={S.td}>{r.leaveType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
          {!decider && <p style={{ ...S.note, marginTop: "1rem" }}>Approval queues and team leave are shown to line managers and HR.</p>}
          {decider && data.cycle && !data.cycle.open && (
            <p style={{ ...S.note, color: C.warn, marginTop: "1rem" }}>Goal setting is closed for this cycle.</p>
          )}
        </>
      )}
    </div>
  );
};

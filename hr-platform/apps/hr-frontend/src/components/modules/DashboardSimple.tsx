"use client";

import React, { useEffect, useState } from "react";
import type { AccessRole } from "@hr-platform/shared";
import type { ModuleViewKey } from "../shell/AppSidebar";
import { formatDate } from "../../utils/date";
import { HomePanels, NotificationsPanel } from "./HomePanels";
import { OrgPosition } from "./OrgPosition";

// Dashboard: colourful tiles. Each figure tile opens the page behind it (drilldown); the section tiles link to the
// main pages. Live data only; the demo login has no API behind it, so it says so instead of showing made-up numbers.

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

const C = { text: "#1c1b19", muted: "#79756c", border: "#e4e1da", surface: "#ffffff", page: "#f7f6f3", accent: "#0f5c4d", danger: "#b91c1c", warn: "#92400e" };

const S = {
  page: { padding: "1.5rem", maxWidth: "1100px" } as React.CSSProperties,
  h1: { margin: "0 0 0.25rem", fontSize: "22px" } as React.CSSProperties,
  h2: { margin: "1.5rem 0 0.5rem", fontSize: "17px" } as React.CSSProperties,
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" } as React.CSSProperties,
  card: { border: `1px solid ${C.border}`, padding: "0.9rem 1rem", borderRadius: "6px", minHeight: "104px" } as React.CSSProperties,
  big: { fontSize: "26px", fontWeight: 600, margin: "0.25rem 0", fontVariantNumeric: "tabular-nums" } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse", background: C.surface, border: `1px solid ${C.border}` } as React.CSSProperties,
  th: { textAlign: "left", padding: "0.6rem 0.75rem", borderBottom: `1px solid ${C.border}`, background: C.page, fontWeight: 600 } as React.CSSProperties,
  td: { padding: "0.6rem 0.75rem", borderBottom: `1px solid ${C.border}`, verticalAlign: "top" } as React.CSSProperties,
  note: { color: C.muted, margin: "0.25rem 0 0" } as React.CSSProperties,
};

const Caption = ({ children }: { children: string }) => <caption style={{ textAlign: "left", position: "absolute", left: "-9999px" }}>{children}</caption>;

const fmt = (iso: string) => formatDate(iso);

type Tone = "blue" | "green" | "amber" | "violet" | "rose" | "teal" | "indigo" | "orange";
// One neutral surface and one accent for every tile. The tone prop is kept so call sites do not change.
const TONES: Record<Tone, { edge: string; bg: string; text: string }> = {
  blue: { edge: C.accent, bg: C.surface, text: C.text },
  green: { edge: C.accent, bg: C.surface, text: C.text },
  amber: { edge: C.accent, bg: C.surface, text: C.text },
  violet: { edge: C.accent, bg: C.surface, text: C.text },
  rose: { edge: C.accent, bg: C.surface, text: C.text },
  teal: { edge: C.accent, bg: C.surface, text: C.text },
  indigo: { edge: C.accent, bg: C.surface, text: C.text },
  orange: { edge: C.accent, bg: C.surface, text: C.text },
};

/** A coloured tile. With onOpen it is a button that opens the page behind it. */
function Tile({ label, value, note, tone, onOpen }: { label: string; value?: string | number; note?: string; tone: Tone; onOpen?: () => void }) {
  const t = TONES[tone];
  const style: React.CSSProperties = {
    ...S.card,
    background: t.bg,
    borderTop: `4px solid ${t.edge}`,
    display: "block",
    width: "100%",
    textAlign: "left",
    font: "inherit",
    color: C.text,
    cursor: onOpen ? "pointer" : "default",
  };
  const body = (
    <>
      <div style={{ color: t.text, fontWeight: 600 }}>{label}</div>
      {value !== undefined && <div style={{ ...S.big, color: t.edge }}>{value}</div>}
      {note && <div style={{ ...S.note, color: t.text }}>{note}</div>}
      {onOpen && <div style={{ color: t.text, fontSize: "13px", marginTop: "0.5rem", fontWeight: 600 }}>Open {label.toLowerCase()} →</div>}
    </>
  );
  return onOpen ? (
    <button type="button" onClick={onOpen} style={style}>{body}</button>
  ) : (
    <div style={style}>{body}</div>
  );
}

// Section tiles: each links to the main page of that area.
const SECTIONS: { label: string; tone: Tone; view: ModuleViewKey; note: string }[] = [
  { label: "My Self-Service", tone: "indigo", view: "self_service", note: "Your details, documents and requests" },
  { label: "Payslips", tone: "green", view: "payslips", note: "Your payslips" },
  { label: "Leave", tone: "blue", view: "time_and_leave", note: "Leave requests and calendar" },
  { label: "Performance", tone: "violet", view: "performance_pms", note: "Cycles, goals and reviews" },
  { label: "Workforce Directory", tone: "teal", view: "workforce_directory", note: "Find people and their details" },
  { label: "Organogram", tone: "orange", view: "organogram", note: "Company structure and job titles" },
  { label: "Assets Management", tone: "amber", view: "assets", note: "Register, assignments and overdue items" },
  { label: "IT Helpdesk", tone: "rose", view: "helpdesk", note: "Support tickets" },
  { label: "Client Engagements", tone: "indigo", view: "projects", note: "Projects and client work" },
  { label: "Reports", tone: "violet", view: "reports_analytics", note: "Reports and analytics" },
  { label: "Company Setup", tone: "orange", view: "company_setup", note: "Company settings" },
];

export const DashboardScreen: React.FC<{
  user: { id: string; persona: AccessRole };
  realSession: boolean;
  onNavigate?: (view: ModuleViewKey) => void;
}> = ({ user, realSession, onNavigate }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(realSession);
  const [leaveWindow, setLeaveWindow] = useState(14);

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
  }, [realSession, user.id, leaveWindow]);

  const decider = user.persona === "line_manager" || user.persona === "hr_admin" || user.persona === "hr_director";
  const open = (view: ModuleViewKey) => (onNavigate ? () => onNavigate(view) : undefined);

  return (
    <div style={S.page}>
      <div style={{ borderBottom: `1px solid ${C.border}`, color: C.text, padding: "0.25rem 0 1rem", marginBottom: "0.5rem" }}>
        <h1 style={{ ...S.h1, color: C.text, fontWeight: 600, margin: 0 }}>Dashboard</h1>
        <p style={{ margin: "0.35rem 0 0", opacity: 0.92 }}>{data?.cycle ? `Cycle: ${data.cycle.title}` : "No performance cycle is open for goal setting."}</p>
      </div>

      {!realSession && <p role="status" style={{ ...S.note, marginTop: "1rem" }}>Sign in to see live figures. The demo login has no data behind this screen.</p>}
      {realSession && loading && <p role="status">Loading…</p>}
      {realSession && error && <p role="alert" style={{ color: C.danger }}>{error}</p>}

      {data && (
        <div style={{ ...S.grid, marginTop: "1rem" }}>
          <Tile tone="blue" label="Away today" value={data.onLeaveToday} note="Employees on approved leave" onOpen={open("time_and_leave")} />
          <Tile tone="amber" label="My leave pending" value={data.myPendingLeave} onOpen={open("time_and_leave")} />
          <Tile
            tone="green"
            label="Objectives approved"
            value={data.objectives.company?.approvedPct == null ? "-" : `${data.objectives.company.approvedPct}%`}
            note={data.objectives.company ? `${data.objectives.company.approved} of ${data.objectives.company.total} approved` : undefined}
            onOpen={open("objectives")}
          />
          <Tile
            tone="violet"
            label="My objectives"
            value={data.objectives.mine && data.objectives.mine.total > 0 ? `${data.objectives.mine.approved} of ${data.objectives.mine.total}` : "-"}
            note={data.objectives.mine && data.objectives.mine.awaiting ? `${data.objectives.mine.awaiting} still to be approved` : undefined}
            onOpen={open("my_performance")}
          />
        </div>
      )}

      {data?.approvals && (
        <>
          <h2 style={S.h2}>Waiting for you</h2>
          <div style={S.grid}>
            <Tile tone="rose" label="Leave requests to decide" value={data.approvals.leavePending} onOpen={open("time_and_leave")} />
            <Tile tone="teal" label="People with objectives to approve" value={data.approvals.peopleWaiting} onOpen={open("performance_pms")} />
          </div>
        </>
      )}

      {onNavigate && (
        <>
          <h2 style={S.h2}>Go to</h2>
          <div style={S.grid}>
            {SECTIONS.map((s) => (
              <Tile key={s.view} tone={s.tone} label={s.label} note={s.note} onOpen={open(s.view)} />
            ))}
          </div>
        </>
      )}

      {data && (
        <>
          <OrgPosition realSession={realSession} />
          <NotificationsPanel realSession={realSession} />
          <HomePanels realSession={realSession} />

          {data.upcomingLeave && (
            <>
              <h2 style={{ ...S.h2, display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                Leave starting in the next
                <select value={leaveWindow} onChange={(e) => setLeaveWindow(Number(e.target.value))} aria-label="Leave window" style={{ minHeight: "32px", padding: "0 0.4rem", font: "inherit" }}>
                  {[7, 14, 30].map((d) => <option key={d} value={d}>{d} days</option>)}
                </select>
              </h2>
              {data.upcomingLeave.length === 0 ? (
                <p style={S.note}>No approved leave starts in the next {leaveWindow} days.</p>
              ) : (
                <table style={S.table}>
                  <Caption>{`Leave starting in the next ${leaveWindow} days`}</Caption>
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

"use client";

import React, { useEffect, useState } from "react";
import type { AccessRole } from "@hr-platform/shared";
import type { ModuleViewKey } from "../shell/AppSidebar";
import { isViewEnabled } from "../../config/modules";
import { formatDate } from "../../utils/date";
import { HomePanels, NotificationsPanel } from "./HomePanels";
import { OrgPosition } from "./OrgPosition";

// Dashboard: an at-a-glance overview. Figures and links open the page behind them. Charts use live aggregates from
// /api/dashboard. The demo login has no API behind it, so it says so instead of showing made-up numbers.

interface Tally {
  total: number;
  approved: number;
  approvedPct: number | null;
  awaiting?: number;
}

interface Charts {
  leaveByMonth: { month: string; approved: number; pending: number }[];
  headcount: { department: string; office: string; n: number }[];
  objectivesByDepartment: { department: string; total: number; approved: number; avgProgress: number }[];
}

interface DashboardData {
  onLeaveToday: number;
  myPendingLeave: number;
  cycle: { id: number; title: string; status: string; open: boolean } | null;
  objectives: { company: Tally | null; mine: Tally | null };
  approvals: { leavePending: number; peopleWaiting: number } | null;
  upcomingLeave: { startDate: string; endDate: string; leaveType: string; employeeName: string; department: string | null }[] | null;
  charts?: Charts | null;
}

const C = { text: "#1c1b19", muted: "#79756c", border: "#e4e1da", surface: "#ffffff", page: "#f7f6f3", accent: "#0f5c4d", danger: "#b91c1c", warn: "#92400e" };

// Rainbow for the charts only. Each series keeps one colour for every chart it appears in.
const RAINBOW = ["#d9534f", "#f08a24", "#e5b72e", "#4caf7a", "#20a4a4", "#3b82c4", "#5b5bd6", "#9b5de5"];
const APPROVED = "#4caf7a";
const PENDING = "#f08a24";
const colourFor = (names: string[], name: string) => RAINBOW[Math.max(0, names.indexOf(name)) % RAINBOW.length];

const S = {
  page: { padding: "1.5rem", maxWidth: "1100px" } as React.CSSProperties,
  h1: { margin: "0 0 0.25rem", fontSize: "22px" } as React.CSSProperties,
  h2: { margin: "1.5rem 0 0.5rem", fontSize: "17px" } as React.CSSProperties,
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" } as React.CSSProperties,
  chartGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "0.75rem" } as React.CSSProperties,
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
// Teal shades for most tiles, with blue and gold for contrast. The tone prop is kept so call sites do not change.
const TONES: Record<Tone, { edge: string; bg: string; text: string }> = {
  indigo: { edge: "#0b3f35", bg: "#e7f0ed", text: "#0b3f35" },
  violet: { edge: "#0f5c4d", bg: "#e7f0ed", text: "#0b3f35" },
  green: { edge: "#2f8474", bg: "#e6f2ef", text: "#1f5f52" },
  teal: { edge: "#4f9a88", bg: "#eef7f4", text: "#2f6f61" },
  blue: { edge: "#2f5d8a", bg: "#e8eef6", text: "#1f4370" },
  amber: { edge: "#b7892b", bg: "#fbf5e6", text: "#7a5a14" },
  orange: { edge: "#b7892b", bg: "#fbf5e6", text: "#7a5a14" },
  rose: { edge: "#c9a24a", bg: "#fdf8ec", text: "#7a5a14" },
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

// Coverage list: each entry links to the main page of that area.
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

/** The last n months as "YYYY-MM" keys, oldest first. */
function lastMonths(n: number): string[] {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}
const monthLabel = (key: string) => new Date(`${key}-01T00:00:00`).toLocaleString("en-GB", { month: "short" });

function ChartCard({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section style={{ border: `1px solid ${C.border}`, borderRadius: "6px", background: C.surface, padding: "0.9rem 1rem" }}>
      <h3 style={{ margin: 0, fontSize: "15px", color: C.text }}>{title}</h3>
      {note && <p style={{ ...S.note, fontSize: "13px" }}>{note}</p>}
      <div style={{ marginTop: "0.6rem" }}>{children}</div>
    </section>
  );
}

function Legend({ items }: { items: { label: string; colour: string }[] }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: "0.5rem 0 0", display: "flex", flexWrap: "wrap", gap: "0.35rem 0.9rem", fontSize: "13px", color: C.muted }}>
      {items.map((i) => (
        <li key={i.label} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 2, background: i.colour, display: "inline-block" }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Horizontal bars, one colour per row. Each row carries its own text, so the figures are readable without the bar. */
function HBars({ rows }: { rows: { label: string; detail: string; pct: number; colour: string }[] }) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.5rem" }}>
      {rows.map((r) => (
        <li key={r.label}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", fontSize: "13px" }}>
            <span>{r.label}</span>
            <span style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>{r.detail}</span>
          </div>
          <div aria-hidden="true" style={{ background: C.page, borderRadius: "3px", height: "10px", overflow: "hidden" }}>
            <div style={{ width: `${Math.max(0, Math.min(100, r.pct))}%`, background: r.colour, height: "100%" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function LeaveTrend({ rows }: { rows: Charts["leaveByMonth"] }) {
  const byKey = new Map(rows.map((r) => [r.month, r]));
  const series = lastMonths(12).map((m) => ({ m, label: monthLabel(m), approved: byKey.get(m)?.approved ?? 0, pending: byKey.get(m)?.pending ?? 0 }));
  const max = Math.max(1, ...series.map((s) => Math.max(s.approved, s.pending)));
  const W = 640;
  const H = 220;
  const pad = { l: 32, r: 8, t: 10, b: 28 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const slot = plotW / series.length;
  const barW = slot * 0.36;
  const y = (v: number) => pad.t + plotH - (v / max) * plotH;
  const h = (v: number) => (v / max) * plotH;
  const summary = series.map((s) => `${s.label} ${s.approved} approved, ${s.pending} pending`).join("; ");

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Leave requests by start month, last 12 months: ${summary}`} style={{ width: "100%", height: "auto" }}>
        {[0, 0.5, 1].map((f) => {
          const v = Math.round(max * f);
          return (
            <g key={f}>
              <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke={C.border} />
              <text x={pad.l - 6} y={y(v) + 4} fontSize="11" textAnchor="end" fill={C.muted}>{v}</text>
            </g>
          );
        })}
        {series.map((s, i) => {
          const x0 = pad.l + i * slot + slot * 0.14;
          return (
            <g key={s.m}>
              <rect x={x0} y={y(s.approved)} width={barW} height={h(s.approved)} fill={APPROVED} rx="2">
                <title>{`${s.label}: ${s.approved} approved`}</title>
              </rect>
              <rect x={x0 + barW + 2} y={y(s.pending)} width={barW} height={h(s.pending)} fill={PENDING} rx="2">
                <title>{`${s.label}: ${s.pending} pending`}</title>
              </rect>
              <text x={x0 + barW} y={H - 8} fontSize="11" textAnchor="middle" fill={C.muted}>{s.label}</text>
            </g>
          );
        })}
      </svg>
      <Legend items={[{ label: "Approved", colour: APPROVED }, { label: "Pending", colour: PENDING }]} />
    </>
  );
}

const pctOf = (n: number, max: number) => (max === 0 ? 0 : Math.round((n / max) * 100));

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

  // Chart data. Department and office colours are fixed by name so the same department keeps its colour everywhere.
  const charts = data?.charts ?? null;
  const deptNames = charts
    ? [...new Set([...charts.headcount.map((r) => r.department), ...charts.objectivesByDepartment.map((r) => r.department)])].sort()
    : [];
  const headcountByDept = deptNames
    .map((d) => ({ name: d, n: charts ? charts.headcount.filter((r) => r.department === d).reduce((s, r) => s + r.n, 0) : 0 }))
    .filter((r) => r.n > 0);
  const headcountTotal = charts ? charts.headcount.reduce((s, r) => s + r.n, 0) : null;
  const officeNames = charts ? [...new Set(charts.headcount.map((r) => r.office))].sort() : [];
  const headcountByOffice = officeNames
    .map((o) => ({ name: o, n: charts ? charts.headcount.filter((r) => r.office === o).reduce((s, r) => s + r.n, 0) : 0 }))
    .filter((o) => o.n > 0);
  const maxDept = Math.max(1, ...headcountByDept.map((r) => r.n));

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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", marginTop: "1rem", border: `1px solid ${C.border}`, borderRadius: "6px", background: C.surface }} aria-label="Key figures">
          {[
            { label: "Headcount", value: headcountTotal ?? "-", note: "Active employees", onOpen: open("workforce_directory") },
            { label: "Away today", value: data.onLeaveToday, note: "On approved leave", onOpen: open("time_and_leave") },
            { label: "Objectives approved", value: data.objectives.company?.approvedPct == null ? "-" : `${data.objectives.company.approvedPct}%`, note: data.objectives.company ? `${data.objectives.company.approved} of ${data.objectives.company.total}` : "No open cycle", onOpen: open("objectives") },
            { label: "My objectives", value: data.objectives.mine && data.objectives.mine.total > 0 ? `${data.objectives.mine.approved} of ${data.objectives.mine.total}` : "-", note: data.objectives.mine?.awaiting ? `${data.objectives.mine.awaiting} to be approved` : "Approved", onOpen: open("my_performance") },
            { label: "My leave pending", value: data.myPendingLeave, note: "Awaiting a decision", onOpen: open("time_and_leave") },
          ].map((k, i) => (
            <button
              key={k.label}
              type="button"
              onClick={k.onOpen}
              disabled={!k.onOpen}
              style={{ font: "inherit", textAlign: "left", background: "transparent", border: "none", borderLeft: i === 0 ? "none" : `1px solid ${C.border}`, padding: "0.8rem 1rem", color: C.text, cursor: k.onOpen ? "pointer" : "default" }}
            >
              <div style={{ fontSize: "13px", color: C.muted }}>{k.label}</div>
              <div style={{ ...S.big, color: C.accent }}>{k.value}</div>
              <div style={{ fontSize: "12px", color: C.muted }}>{k.note}</div>
            </button>
          ))}
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

      {charts && (
        <>
          <h2 style={S.h2}>At a glance</h2>
          <div style={S.chartGrid}>
            <ChartCard title="Leave by month" note="Requests by start month, last 12 months">
              <LeaveTrend rows={charts.leaveByMonth} />
            </ChartCard>

            <ChartCard title="Objective progress by department" note="Average progress of approved objectives in the open cycle">
              {charts.objectivesByDepartment.length === 0 ? (
                <p style={S.note}>No objectives in the current cycle yet.</p>
              ) : (
                <HBars
                  rows={charts.objectivesByDepartment.map((r) => ({
                    label: r.department,
                    detail: `${r.avgProgress}% · ${r.approved} of ${r.total} approved`,
                    pct: r.avgProgress,
                    colour: colourFor(deptNames, r.department),
                  }))}
                />
              )}
            </ChartCard>

            <ChartCard title="Headcount by department" note="Active employees">
              {headcountByDept.length === 0 ? (
                <p style={S.note}>No active employees yet.</p>
              ) : (
                <HBars rows={headcountByDept.map((r) => ({ label: r.name, detail: String(r.n), pct: pctOf(r.n, maxDept), colour: colourFor(deptNames, r.name) }))} />
              )}
            </ChartCard>

            <ChartCard title="Headcount by office" note="Active employees, by office">
              {!headcountTotal ? (
                <p style={S.note}>No active employees yet.</p>
              ) : (
                <>
                  <div aria-hidden="true" style={{ display: "flex", height: "18px", borderRadius: "3px", overflow: "hidden", background: C.page }}>
                    {headcountByOffice.map((o) => (
                      <div key={o.name} title={`${o.name}: ${o.n}`} style={{ width: `${pctOf(o.n, headcountTotal)}%`, background: colourFor(officeNames, o.name) }} />
                    ))}
                  </div>
                  <Legend items={headcountByOffice.map((o) => ({ label: `${o.name} (${o.n})`, colour: colourFor(officeNames, o.name) }))} />
                </>
              )}
            </ChartCard>
          </div>
        </>
      )}

      {onNavigate && (
        <>
          <h2 style={S.h2}>What ScoReview covers</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.5rem" }}>
            {SECTIONS.filter((s) => isViewEnabled(s.view)).map((s) => (
              <li key={s.view}>
                <button
                  type="button"
                  onClick={open(s.view)}
                  style={{ display: "block", width: "100%", textAlign: "left", font: "inherit", color: C.text, background: C.surface, border: `1px solid ${C.border}`, borderLeft: `4px solid ${TONES[s.tone].edge}`, borderRadius: "6px", padding: "0.7rem 0.9rem", cursor: "pointer" }}
                >
                  <span style={{ fontWeight: 600 }}>{s.label}</span>
                  <span style={{ display: "block", color: C.muted, fontSize: "13px" }}>{s.note}</span>
                </button>
              </li>
            ))}
          </ul>
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

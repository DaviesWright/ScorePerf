import React, { useEffect, useMemo, useState } from "react";
import { colors, typography, radii } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { DataTable, Column } from "../../design-system/DataTable";
import { DEMO_STAFF, SITES, siteOf, type DemoStaff } from "../../data/demoData";
import { drillProps } from "../../utils/drill";

// Attendance report that shows the same working day in several time zones. Accra and London are both
// UTC+0 in November, so Windhoek (Africa/Windhoek, UTC+2 all year) is what makes the difference visible.
const SAMPLE_DAY = "2026-11-03";
const SITE_SHIFT: Record<string, { start: string; end: string }> = {
  ACC: { start: "08:00", end: "16:00" },
  LON: { start: "09:00", end: "17:00" },
  WDH: { start: "08:00", end: "16:00" },
};
const LATE_AFTER_MINUTES = 15;

// Local clock-in/out per staff member on the sample day. `out: null` means still clocked in.
const CLOCKINGS: Record<string, { in: string; out: string | null }> = {
  "EMP-001": { in: "07:52", out: "16:10" },
  "EMP-002": { in: "08:57", out: "17:05" },
  "EMP-003": { in: "08:05", out: "16:02" },
  "EMP-004": { in: "08:21", out: "16:00" },
  "EMP-005": { in: "07:50", out: "16:05" },
  "EMP-006": { in: "08:03", out: "16:00" },
  "EMP-007": { in: "08:30", out: "16:10" },
  "EMP-008": { in: "08:00", out: "15:58" },
  "EMP-009": { in: "07:58", out: "16:30" },
  "EMP-010": { in: "09:18", out: "17:00" },
  "EMP-011": { in: "09:02", out: "17:01" },
  "EMP-012": { in: "07:55", out: null },
};

const REPORT_ZONES = ["Africa/Accra", "Europe/London", "Africa/Windhoek", "UTC"];

function offsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return Math.round((Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second")) - utcMs) / 60000);
}

/** Local wall-clock time on SAMPLE_DAY in `timeZone` to a UTC instant (milliseconds). */
function toUtc(hhmm: string, timeZone: string): number {
  const [y, mo, d] = SAMPLE_DAY.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  return guess - offsetMinutes(guess, timeZone) * 60000;
}

const fmtTime = (utcMs: number, timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(utcMs));

const utcLabel = (utcMs: number, timeZone: string) => {
  const m = offsetMinutes(utcMs, timeZone);
  return `UTC${m >= 0 ? "+" : "-"}${Math.abs(m) / 60}`;
};

interface Row {
  staff: DemoStaff;
  shiftStart: number;
  shiftEnd: number;
  clockIn: number;
  clockOut: number | null;
  late: boolean;
}

export const AttendanceTimeZonesPanel: React.FC = () => {
  const [reportZone, setReportZone] = useState("Africa/Accra");
  // Drill-down: a site card filters the table to that site's staff.
  const [siteFilter, setSiteFilter] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);

  // Set after mount so server and client render the same markup.
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const rows: Row[] = useMemo(
    () =>
      DEMO_STAFF.filter((s) => CLOCKINGS[s.id]).map((staff) => {
        const tz = siteOf(staff.site).timeZone;
        const shift = SITE_SHIFT[staff.site];
        const c = CLOCKINGS[staff.id];
        const shiftStart = toUtc(shift.start, tz);
        const clockIn = toUtc(c.in, tz);
        return {
          staff,
          shiftStart,
          shiftEnd: toUtc(shift.end, tz),
          clockIn,
          clockOut: c.out ? toUtc(c.out, tz) : null,
          late: clockIn - shiftStart > LATE_AFTER_MINUTES * 60000,
        };
      }),
    []
  );

  // Hours when every site is inside its scheduled shift at once.
  const overlap = useMemo(() => {
    const start = Math.max(...SITES.map((s) => toUtc(SITE_SHIFT[s.code].start, s.timeZone)));
    const end = Math.min(...SITES.map((s) => toUtc(SITE_SHIFT[s.code].end, s.timeZone)));
    return end > start ? { start, end } : null;
  }, []);

  const columns: Column<Row>[] = [
    {
      header: "Staff",
      accessor: (r) => (
        <div>
          <div style={{ fontWeight: typography.weights.semibold, color: colors.textPrimary }}>{r.staff.name}</div>
          <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>{siteOf(r.staff.site).city}</div>
        </div>
      ),
    },
    {
      header: "Local shift",
      accessor: (r) => {
        const tz = siteOf(r.staff.site).timeZone;
        return `${fmtTime(r.shiftStart, tz)}–${fmtTime(r.shiftEnd, tz)}`;
      },
    },
    {
      header: "Clock in (local)",
      accessor: (r) => fmtTime(r.clockIn, siteOf(r.staff.site).timeZone),
    },
    {
      header: `Clock in (${reportZone})`,
      accessor: (r) => fmtTime(r.clockIn, reportZone),
    },
    {
      header: `Clock out (${reportZone})`,
      accessor: (r) => (r.clockOut ? fmtTime(r.clockOut, reportZone) : "—"),
    },
    {
      header: "Hours",
      align: "right",
      accessor: (r) => (r.clockOut ? ((r.clockOut - r.clockIn) / 3_600_000).toFixed(1) : "In progress"),
    },
    {
      header: "Status",
      align: "center",
      accessor: (r) => (
        <Badge variant={r.late ? "warning" : "success"} size="sm" dot>
          {r.late ? "Late" : "On time"}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, fontSize: typography.sizes.lg, color: colors.textPrimary }}>Attendance by Time Zone</h2>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: typography.sizes.sm, color: colors.textSecondary }}>
          Report time zone
          <select
            value={reportZone}
            onChange={(e) => setReportZone(e.target.value)}
            style={{ padding: "0.4rem 0.7rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, backgroundColor: colors.surface }}
          >
            {REPORT_ZONES.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
        {SITES.map((s) => {
          const siteRows = rows.filter((r) => r.staff.site === s.code);
          const hours = siteRows.reduce((sum, r) => sum + (r.clockOut ? (r.clockOut - r.clockIn) / 3_600_000 : 0), 0);
          const ref = toUtc("12:00", s.timeZone);
          return (
            <div
              key={s.code}
              {...drillProps(() => setSiteFilter(siteFilter === s.code ? null : s.code), `Show attendance for ${s.name}`)}
              aria-pressed={siteFilter === s.code}
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                padding: "1rem",
                cursor: "pointer",
                outline: siteFilter === s.code ? `2px solid ${colors.indigoAction}` : "none",
                outlineOffset: "2px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ color: colors.textPrimary }}>{s.name}</strong>
                <span style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>{utcLabel(ref, s.timeZone)}</span>
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: colors.indigoPrimary, fontVariantNumeric: "tabular-nums", margin: "0.35rem 0" }}>
                {now === null ? "--:--" : fmtTime(now, s.timeZone)}
              </div>
              <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>
                {siteRows.length} staff · {hours.toFixed(1)} h logged · {s.timeZone}
              </div>
            </div>
          );
        })}
      </div>

      {overlap && (
        <div style={{ marginBottom: "1rem", padding: "0.65rem 0.9rem", borderRadius: radii.md, backgroundColor: colors.indigoSubtle, color: colors.indigoDark, fontSize: typography.sizes.sm }}>
          All three sites are in their scheduled shift together from <strong>{fmtTime(overlap.start, reportZone)}</strong> to{" "}
          <strong>{fmtTime(overlap.end, reportZone)}</strong> ({reportZone}) on {SAMPLE_DAY}.
        </div>
      )}

      {siteFilter && (
        <div style={{ marginBottom: "0.5rem", fontSize: typography.sizes.xs, color: colors.textMuted }}>
          Showing {rows.filter((r) => r.staff.site === siteFilter).length} of {rows.length} staff ·{" "}
          <button type="button" onClick={() => setSiteFilter(null)} style={{ background: "none", border: "none", padding: 0, color: colors.indigoAction, fontWeight: 600, fontSize: typography.sizes.xs, cursor: "pointer" }}>
            Show all sites
          </button>
        </div>
      )}
      <DataTable columns={columns} data={siteFilter ? rows.filter((r) => r.staff.site === siteFilter) : rows} keyExtractor={(r) => r.staff.id} density="compact" emptyMessage="No attendance records." />
    </div>
  );
};

"use client";

import React, { useState } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { formatDate } from "../../utils/date";

export interface MyLeaveItem {
  id: number;
  leaveType: "Annual Leave" | "Sick Leave" | "Casual Leave" | "Compassionate" | "Maternity / Paternity";
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  handoverColleague: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  submittedAt: string;
}

interface MyLeaveScreenProps {
  user?: { id: string; persona: string; name?: string };
  realSession?: boolean;
}

export const MyLeaveScreen: React.FC<MyLeaveScreenProps> = () => {
  const [leaves, setLeaves] = useState<MyLeaveItem[]>([
    {
      id: 1,
      leaveType: "Annual Leave",
      startDate: "2026-06-15",
      endDate: "2026-06-26",
      days: 10,
      reason: "Mid-year family vacation and rest",
      handoverColleague: "Sarah Jenkins (Senior Consultant)",
      status: "APPROVED",
      submittedAt: "2026-05-02",
    },
    {
      id: 2,
      leaveType: "Sick Leave",
      startDate: "2026-03-12",
      endDate: "2026-03-13",
      days: 2,
      reason: "Medical appointment and recovery",
      handoverColleague: "Marcus Chen (Engineering Lead)",
      status: "APPROVED",
      submittedAt: "2026-03-11",
    },
    {
      id: 3,
      leaveType: "Annual Leave",
      startDate: "2026-08-10",
      endDate: "2026-08-14",
      days: 5,
      reason: "Personal leave & family commitment",
      handoverColleague: "Benedicta Agbesi (HR Specialist)",
      status: "PENDING",
      submittedAt: "2026-05-10",
    },
  ]);

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [leaveType, setLeaveType] = useState<MyLeaveItem["leaveType"]>("Annual Leave");
  const [startDate, setStartDate] = useState("2026-09-01");
  const [endDate, setEndDate] = useState("2026-09-04");
  const [reason, setReason] = useState("");
  const [handoverColleague, setHandoverColleague] = useState("Sarah Jenkins (Senior Consultant)");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Compute days count
  const computeDays = (start: string, end: string) => {
    try {
      const s = new Date(start);
      const e = new Date(end);
      const diffTime = Math.abs(e.getTime() - s.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return isNaN(diffDays) ? 1 : diffDays;
    } catch {
      return 1;
    }
  };

  const annualTotal = 25;
  const annualUsed = 15;
  const annualRemaining = annualTotal - annualUsed;

  const sickTotal = 10;
  const sickUsed = 2;
  const sickRemaining = sickTotal - sickUsed;

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert("Please provide a reason for your leave request.");
      return;
    }

    const calculatedDays = computeDays(startDate, endDate);
    const newLeave: MyLeaveItem = {
      id: Date.now(),
      leaveType,
      startDate,
      endDate,
      days: calculatedDays,
      reason,
      handoverColleague,
      status: "PENDING",
      submittedAt: new Date().toISOString().split("T")[0],
    };

    setLeaves([newLeave, ...leaves]);
    setShowApplyModal(false);
    setReason("");
    setStatusMessage(`Leave application for ${calculatedDays} days submitted to your Line Manager for approval.`);
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleCancelLeave = (id: number) => {
    if (confirm("Are you sure you want to cancel this pending leave request?")) {
      setLeaves(leaves.filter((l) => l.id !== id));
      setStatusMessage("Pending leave request cancelled.");
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1140px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header Banner */}
      <div
        style={{
          padding: "1.25rem 1.5rem",
          borderRadius: radii.lg,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.xs,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Icons.Calendar size={20} color={colors.indigoAction} />
            <h1 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
              My Leave Portal
            </h1>
            <Badge variant="success" size="sm">Self-Service</Badge>
          </div>
          <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.35rem 0 0 0" }}>
            Review your approved allowances, track active approval workflows, and submit new leave requests.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setShowApplyModal(true)}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Icons.Plus size={14} />
            <span>Apply for Leave</span>
          </span>
        </Button>
      </div>

      {statusMessage && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: radii.md, backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", fontSize: typography.sizes.xs, fontWeight: 600 }}>
          ✓ {statusMessage}
        </div>
      )}

      {/* Leave Balance Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <div style={{ backgroundColor: colors.surface, padding: "1.25rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, boxShadow: shadows.xs }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>Annual Leave</span>
            <Badge variant="success" size="sm">Paid</Badge>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: colors.indigoPrimary, marginTop: "0.35rem" }}>
            {annualRemaining} <span style={{ fontSize: "13px", fontWeight: 500, color: colors.textMuted }}>/ {annualTotal} days left</span>
          </div>
          <div style={{ marginTop: "0.5rem", fontSize: "11px", color: colors.textMuted }}>
            Used: {annualUsed} days • Cycle: FY2026
          </div>
        </div>

        <div style={{ backgroundColor: colors.surface, padding: "1.25rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, boxShadow: shadows.xs }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>Sick Leave</span>
            <Badge variant="info" size="sm">Certified</Badge>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: colors.indigoPrimary, marginTop: "0.35rem" }}>
            {sickRemaining} <span style={{ fontSize: "13px", fontWeight: 500, color: colors.textMuted }}>/ {sickTotal} days left</span>
          </div>
          <div style={{ marginTop: "0.5rem", fontSize: "11px", color: colors.textMuted }}>
            Used: {sickUsed} days • Medical sign-off after 2 days
          </div>
        </div>

        <div style={{ backgroundColor: colors.surface, padding: "1.25rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, boxShadow: shadows.xs }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>Compassionate &amp; Family</span>
            <Badge variant="neutral" size="sm">Special</Badge>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: colors.indigoPrimary, marginTop: "0.35rem" }}>
            5 <span style={{ fontSize: "13px", fontWeight: 500, color: colors.textMuted }}>days available</span>
          </div>
          <div style={{ marginTop: "0.5rem", fontSize: "11px", color: colors.textMuted }}>
            Requires line manager notification
          </div>
        </div>
      </div>

      {/* Leave History & Requests Table */}
      <div style={{ backgroundColor: colors.surface, borderRadius: radii.lg, border: `1px solid ${colors.border}`, overflow: "hidden", boxShadow: shadows.xs }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${colors.borderSubtle}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
            Leave History &amp; Requests ({leaves.length})
          </h2>
          <span style={{ fontSize: "11px", color: colors.textMuted }}>Sorted by latest submission</span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
          <thead>
            <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
              <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>LEAVE TYPE</th>
              <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>PERIOD</th>
              <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>DAYS</th>
              <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>REASON</th>
              <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>HANDOVER</th>
              <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>STATUS</th>
              <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textAlign: "right" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {leaves.map((l) => (
              <tr key={l.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                <td style={{ padding: "0.85rem 1rem" }}>
                  <div style={{ fontWeight: 700, color: colors.textPrimary }}>{l.leaveType}</div>
                  <div style={{ fontSize: "10px", color: colors.textMuted }}>Applied: {formatDate(l.submittedAt)}</div>
                </td>
                <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>
                  {formatDate(l.startDate)} &rarr; {formatDate(l.endDate)}
                </td>
                <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: colors.indigoPrimary }}>
                  {l.days} {l.days === 1 ? "day" : "days"}
                </td>
                <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary, maxWidth: "220px" }}>
                  {l.reason}
                </td>
                <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>
                  {l.handoverColleague}
                </td>
                <td style={{ padding: "0.85rem 1rem" }}>
                  <Badge variant={l.status === "APPROVED" ? "success" : l.status === "PENDING" ? "warning" : "error"} size="sm">
                    {l.status === "APPROVED" ? "Approved ✓" : l.status === "PENDING" ? "Pending Manager" : "Declined"}
                  </Badge>
                </td>
                <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                  {l.status === "PENDING" && (
                    <Button variant="outline" size="sm" onClick={() => handleCancelLeave(l.id)}>
                      Cancel
                    </Button>
                  )}
                  {l.status === "APPROVED" && (
                    <span style={{ fontSize: "11px", color: colors.emeraldDark, fontWeight: 600 }}>Active on file</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Apply for Leave Modal */}
      {showApplyModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              maxWidth: "520px",
              width: "100%",
              boxShadow: shadows.lg,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: `1px solid ${colors.borderSubtle}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: colors.surfaceSubtle,
              }}
            >
              <h3 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.indigoPrimary, margin: 0 }}>
                Submit Leave Application
              </h3>
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: colors.textMuted }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyLeave} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Leave Type
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as MyLeaveItem["leaveType"])}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                >
                  <option value="Annual Leave">Annual Leave ({annualRemaining} days remaining)</option>
                  <option value="Sick Leave">Sick Leave ({sickRemaining} days remaining)</option>
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Compassionate">Compassionate Leave</option>
                  <option value="Maternity / Paternity">Maternity / Paternity Leave</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Handover Colleague
                </label>
                <input
                  type="text"
                  value={handoverColleague}
                  onChange={(e) => setHandoverColleague(e.target.value)}
                  placeholder="Colleague covering your responsibilities"
                  style={{ width: "100%", padding: "0.55rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Reason / Handover Notes *
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide context for your leave and handover preparations..."
                  style={{ width: "100%", padding: "0.55rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <Button variant="outline" size="sm" type="button" onClick={() => setShowApplyModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Submit Leave Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

"use client";

import React, { useState } from "react";
import { colors, typography, radii, shadows, space, text } from "../../design-system/tokens";
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
  resumptionStatus?: "NOT_DUE" | "AWAITING_CONFIRMATION" | "CONFIRMED_RETURNED";
  actualResumptionDate?: string;
  resumptionNotes?: string;
}

export interface PlannedLeaveBlock {
  id: number;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  startDate: string;
  endDate: string;
  days: number;
  purpose: string;
  preferredReliefOfficer: string;
  status: "Draft" | "Submitted to Manager" | "Approved";
}

interface MyLeaveScreenProps {
  user?: { id: string; persona: string; name?: string };
  realSession?: boolean;
}

export const MyLeaveScreen: React.FC<MyLeaveScreenProps> = () => {
  const [activeSubTab, setActiveSubTab] = useState<
    "balances_history" | "plan_leave" | "confirm_resumption"
  >("balances_history");

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
      resumptionStatus: "AWAITING_CONFIRMATION",
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
      resumptionStatus: "CONFIRMED_RETURNED",
      actualResumptionDate: "2026-03-16",
      resumptionNotes: "Returned on schedule; all sprint items resumed from Marcus Chen.",
    },
    {
      id: 3,
      leaveType: "Annual Leave",
      startDate: "2026-12-14",
      endDate: "2026-12-18",
      days: 5,
      reason: "End-of-year personal leave & family commitment",
      handoverColleague: "Benedicta Agbesi (HR Specialist)",
      status: "PENDING",
      submittedAt: "2026-11-10",
      resumptionStatus: "NOT_DUE",
    },
  ]);

  // Planned Leave Blocks (Annual Leave Planner)
  const [plannedBlocks, setPlannedBlocks] = useState<PlannedLeaveBlock[]>([
    {
      id: 101,
      quarter: "Q2",
      startDate: "2026-06-15",
      endDate: "2026-06-26",
      days: 10,
      purpose: "Mid-year family break",
      preferredReliefOfficer: "Sarah Jenkins",
      status: "Approved",
    },
    {
      id: 102,
      quarter: "Q4",
      startDate: "2026-12-14",
      endDate: "2026-12-24",
      days: 9,
      purpose: "Year-end holiday rest",
      preferredReliefOfficer: "Marcus Chen",
      status: "Submitted to Manager",
    },
  ]);

  // Apply for Leave Modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [leaveType, setLeaveType] = useState<MyLeaveItem["leaveType"]>("Annual Leave");
  const [startDate, setStartDate] = useState("2026-11-23");
  const [endDate, setEndDate] = useState("2026-11-27");
  const [reason, setReason] = useState("");
  const [handoverColleague, setHandoverColleague] = useState("Sarah Jenkins (Senior Consultant)");

  // Plan Leave Form state
  const [planQuarter, setPlanQuarter] = useState<PlannedLeaveBlock["quarter"]>("Q3");
  const [planStart, setPlanStart] = useState("2026-09-07");
  const [planEnd, setPlanEnd] = useState("2026-09-11");
  const [planPurpose, setPlanPurpose] = useState("");
  const [planRelief, setPlanRelief] = useState("Marcus Chen (Engineering Lead)");

  // Confirm Resumption state
  const [resumptionDateInput, setResumptionDateInput] = useState("2026-06-29");
  const [resumptionNotesInput, setResumptionNotesInput] = useState(
    "Resumed full duty on schedule; completed handover debrief with relief officer."
  );

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 5000);
  };

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
      alert("Please provide a reason and handover summary for your leave request.");
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
      resumptionStatus: "NOT_DUE",
    };

    setLeaves([newLeave, ...leaves]);
    setShowApplyModal(false);
    setReason("");
    showToast(`Leave application for ${calculatedDays} days submitted to your Line Manager for approval.`);
  };

  const handleCancelLeave = (id: number) => {
    if (confirm("Are you sure you want to cancel this pending leave request?")) {
      setLeaves(leaves.filter((l) => l.id !== id));
      showToast("Pending leave request cancelled.");
    }
  };

  const handleAddPlannedBlock = (e: React.FormEvent) => {
    e.preventDefault();
    const days = computeDays(planStart, planEnd);
    const block: PlannedLeaveBlock = {
      id: Date.now(),
      quarter: planQuarter,
      startDate: planStart,
      endDate: planEnd,
      days,
      purpose: planPurpose.trim() || `${planQuarter} Planned Annual Leave`,
      preferredReliefOfficer: planRelief,
      status: "Submitted to Manager",
    };
    setPlannedBlocks((prev) => [...prev, block]);
    setPlanPurpose("");
    showToast(`Added ${days}-day planned leave window (${planQuarter}) and shared with your Line Manager.`);
  };

  const handleConfirmResumption = (id: number) => {
    setLeaves((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              resumptionStatus: "CONFIRMED_RETURNED",
              actualResumptionDate: resumptionDateInput,
              resumptionNotes: resumptionNotesInput,
            }
          : l
      )
    );
    showToast("Resumption confirmed and logged. Your Line Manager and HR have been notified.");
  };

  const totalPlannedDays = plannedBlocks.reduce((s, b) => s + b.days, 0);
  const pendingResumptions = leaves.filter((l) => l.resumptionStatus === "AWAITING_CONFIRMATION").length;

  return (
    <div style={{ padding: `${space[5]} ${space[6]}`, maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column", gap: space[5] }}>
      {/* Header Banner */}
      <div
        style={{
          padding: space[4],
          borderRadius: radii.md,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.sm,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: space[4],
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
            <Icons.Calendar size={20} color={colors.indigoAction} />
            <h1 style={{ fontSize: text.h1.fontSize, fontWeight: text.h1.fontWeight, color: colors.textPrimary, margin: 0 }}>
              My Leave (Employee Self-Service)
            </h1>
            <Badge variant="success" size="sm">Experience 1 · ESS</Badge>
          </div>
          <p style={{ fontSize: text.body.fontSize, color: colors.textSecondary, margin: `${space[1]} 0 0 0` }}>
            Apply for leave, check your personal balances, plan annual leave windows, view history, and confirm return-to-duty resumption.
          </p>
        </div>

        <div style={{ display: "flex", gap: space[2], flexWrap: "wrap" }}>
          <Button
            variant={activeSubTab === "balances_history" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveSubTab("balances_history")}
          >
            Balances &amp; History ({leaves.length})
          </Button>
          <Button
            variant={activeSubTab === "plan_leave" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveSubTab("plan_leave")}
          >
            Plan Leave ({totalPlannedDays}d Planned)
          </Button>
          <Button
            variant={activeSubTab === "confirm_resumption" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveSubTab("confirm_resumption")}
          >
            Confirm Resumption {pendingResumptions > 0 ? `(${pendingResumptions} Due)` : ""}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowApplyModal(true)}>
            <span style={{ display: "flex", alignItems: "center", gap: space[1] }}>
              <Icons.Plus size={16} />
              <span>Apply for Leave</span>
            </span>
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div
          role="status"
          style={{
            padding: `${space[3]} ${space[4]}`,
            borderRadius: radii.md,
            backgroundColor: colors.successBg,
            border: `1px solid ${colors.successBorder}`,
            color: colors.success,
            fontSize: text.bodyStrong.fontSize,
            fontWeight: 600,
          }}
        >
          ✓ {statusMessage}
        </div>
      )}

      {/* Leave Balance Metric Cards (Always Visible in ESS) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: space[4], fontVariantNumeric: "tabular-nums" }}>
        <div style={{ backgroundColor: colors.surface, padding: space[4], borderRadius: radii.md, border: `1px solid ${colors.border}`, boxShadow: shadows.sm }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: text.micro.fontSize, fontWeight: 600, color: colors.textMuted, textTransform: "uppercase" }}>Annual Leave</span>
            <Badge variant="success" size="sm">Paid Entitlement</Badge>
          </div>
          <div style={{ fontSize: text.display.fontSize, fontWeight: 700, color: colors.indigoPrimary, marginTop: space[1] }}>
            {annualRemaining} <span style={{ fontSize: text.small.fontSize, fontWeight: 500, color: colors.textMuted }}>/ {annualTotal} days left</span>
          </div>
          <div style={{ marginTop: space[1], fontSize: text.small.fontSize, color: colors.textSecondary }}>
            Used: {annualUsed}d · Planned: {totalPlannedDays}d · Carry-over cap: 5d
          </div>
        </div>

        <div style={{ backgroundColor: colors.surface, padding: space[4], borderRadius: radii.md, border: `1px solid ${colors.border}`, boxShadow: shadows.sm }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: text.micro.fontSize, fontWeight: 600, color: colors.textMuted, textTransform: "uppercase" }}>Sick Leave</span>
            <Badge variant="info" size="sm">Medical</Badge>
          </div>
          <div style={{ fontSize: text.display.fontSize, fontWeight: 700, color: colors.indigoPrimary, marginTop: space[1] }}>
            {sickRemaining} <span style={{ fontSize: text.small.fontSize, fontWeight: 500, color: colors.textMuted }}>/ {sickTotal} days left</span>
          </div>
          <div style={{ marginTop: space[1], fontSize: text.small.fontSize, color: colors.textSecondary }}>
            Used: {sickUsed}d · Medical note required &gt;2 days
          </div>
        </div>

        <div style={{ backgroundColor: colors.surface, padding: space[4], borderRadius: radii.md, border: `1px solid ${colors.border}`, boxShadow: shadows.sm }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: text.micro.fontSize, fontWeight: 600, color: colors.textMuted, textTransform: "uppercase" }}>Compassionate &amp; Family</span>
            <Badge variant="neutral" size="sm">Statutory</Badge>
          </div>
          <div style={{ fontSize: text.display.fontSize, fontWeight: 700, color: colors.indigoPrimary, marginTop: space[1] }}>
            5 <span style={{ fontSize: text.small.fontSize, fontWeight: 500, color: colors.textMuted }}>days available</span>
          </div>
          <div style={{ marginTop: space[1], fontSize: text.small.fontSize, color: colors.textSecondary }}>
            Requires line manager notification
          </div>
        </div>

        <div style={{ backgroundColor: colors.surface, padding: space[4], borderRadius: radii.md, border: `1px solid ${colors.border}`, boxShadow: shadows.sm }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: text.micro.fontSize, fontWeight: 600, color: colors.textMuted, textTransform: "uppercase" }}>Resumption Status</span>
            <Badge variant={pendingResumptions > 0 ? "warning" : "success"} size="sm">
              {pendingResumptions > 0 ? "Action Needed" : "Up to Date"}
            </Badge>
          </div>
          <div style={{ fontSize: text.h2.fontSize, fontWeight: 600, color: colors.textPrimary, marginTop: space[2] }}>
            {pendingResumptions > 0 ? `${pendingResumptions} Return Confirmation Due` : "All Returns Confirmed"}
          </div>
          <div style={{ marginTop: space[1], fontSize: text.small.fontSize, color: colors.textSecondary }}>
            Confirm return-to-duty within 24h of resumption
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: BALANCES & LEAVE HISTORY */}
      {activeSubTab === "balances_history" && (
        <div style={{ backgroundColor: colors.surface, borderRadius: radii.md, border: `1px solid ${colors.border}`, overflow: "hidden", boxShadow: shadows.sm }}>
          <div style={{ padding: space[4], borderBottom: `1px solid ${colors.borderSubtle}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: text.h3.fontSize, fontWeight: text.h3.fontWeight, color: colors.textPrimary, margin: 0 }}>
              My Leave Applications &amp; History ({leaves.length})
            </h2>
            <span style={{ fontSize: text.small.fontSize, color: colors.textMuted }}>Personal ESS Ledger</span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: text.body.fontSize, fontVariantNumeric: "tabular-nums" }}>
            <thead>
              <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary, fontWeight: 600 }}>LEAVE TYPE</th>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary, fontWeight: 600 }}>PERIOD</th>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary, fontWeight: 600 }}>DAYS</th>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary, fontWeight: 600 }}>RELIEF OFFICER</th>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary, fontWeight: 600 }}>STATUS</th>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary, fontWeight: 600 }}>RESUMPTION</th>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary, fontWeight: 600, textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                  <td style={{ padding: space[3] }}>
                    <div style={{ fontWeight: 600, color: colors.textPrimary }}>{l.leaveType}</div>
                    <div style={{ fontSize: text.small.fontSize, color: colors.textMuted }}>{l.reason}</div>
                  </td>
                  <td style={{ padding: space[3], color: colors.textSecondary }}>
                    {formatDate(l.startDate)} &rarr; {formatDate(l.endDate)}
                  </td>
                  <td style={{ padding: space[3], fontWeight: 600, color: colors.indigoPrimary }}>
                    {l.days} {l.days === 1 ? "day" : "days"}
                  </td>
                  <td style={{ padding: space[3], color: colors.textSecondary }}>{l.handoverColleague}</td>
                  <td style={{ padding: space[3] }}>
                    <Badge variant={l.status === "APPROVED" ? "success" : l.status === "PENDING" ? "warning" : "error"} size="sm">
                      {l.status === "APPROVED" ? "Approved ✓" : l.status === "PENDING" ? "Pending Manager" : "Declined"}
                    </Badge>
                  </td>
                  <td style={{ padding: space[3] }}>
                    {l.resumptionStatus === "CONFIRMED_RETURNED" && (
                      <Badge variant="success" size="sm">
                        Resumed ({formatDate(l.actualResumptionDate || l.endDate)})
                      </Badge>
                    )}
                    {l.resumptionStatus === "AWAITING_CONFIRMATION" && (
                      <Badge variant="warning" size="sm">Confirmation Due</Badge>
                    )}
                    {(!l.resumptionStatus || l.resumptionStatus === "NOT_DUE") && (
                      <span style={{ fontSize: text.small.fontSize, color: colors.textMuted }}>Upcoming</span>
                    )}
                  </td>
                  <td style={{ padding: space[3], textAlign: "right" }}>
                    {l.status === "PENDING" && (
                      <Button variant="outline" size="sm" onClick={() => handleCancelLeave(l.id)}>
                        Cancel Request
                      </Button>
                    )}
                    {l.resumptionStatus === "AWAITING_CONFIRMATION" && (
                      <Button variant="primary" size="sm" onClick={() => setActiveSubTab("confirm_resumption")}>
                        Confirm Return
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SUB-TAB 2: PLAN LEAVE (ANNUAL LEAVE PLANNER) */}
      {activeSubTab === "plan_leave" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: space[4] }}>
          {/* Propose Planned Leave Block Form */}
          <form
            onSubmit={handleAddPlannedBlock}
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              padding: space[4],
              boxShadow: shadows.sm,
              display: "flex",
              flexDirection: "column",
              gap: space[3],
            }}
          >
            <div>
              <h2 style={{ fontSize: text.h3.fontSize, fontWeight: text.h3.fontWeight, color: colors.textPrimary, margin: 0 }}>
                Plan Annual Leave Window
              </h2>
              <span style={{ fontSize: text.small.fontSize, color: colors.textMuted }}>
                Schedule tentative leave windows early so your Line Manager can coordinate squad coverage and relief officers.
              </span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: text.small.fontSize, fontWeight: 600, marginBottom: space[1] }}>
                Target Quarter
              </label>
              <select
                value={planQuarter}
                onChange={(e) => setPlanQuarter(e.target.value as PlannedLeaveBlock["quarter"])}
                style={{ width: "100%", height: "38px", padding: `0 ${space[2]}`, borderRadius: radii.sm, border: `1px solid ${colors.border}` }}
              >
                <option value="Q1">Q1 (Jan – Mar)</option>
                <option value="Q2">Q2 (Apr – Jun)</option>
                <option value="Q3">Q3 (Jul – Sep)</option>
                <option value="Q4">Q4 (Oct – Dec)</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space[2] }}>
              <div>
                <label style={{ display: "block", fontSize: text.small.fontSize, fontWeight: 600, marginBottom: space[1] }}>
                  Planned Start
                </label>
                <input
                  type="date"
                  value={planStart}
                  onChange={(e) => setPlanStart(e.target.value)}
                  style={{ width: "100%", height: "38px", padding: `0 ${space[2]}`, borderRadius: radii.sm, border: `1px solid ${colors.border}` }}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: text.small.fontSize, fontWeight: 600, marginBottom: space[1] }}>
                  Planned End
                </label>
                <input
                  type="date"
                  value={planEnd}
                  onChange={(e) => setPlanEnd(e.target.value)}
                  style={{ width: "100%", height: "38px", padding: `0 ${space[2]}`, borderRadius: radii.sm, border: `1px solid ${colors.border}` }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: text.small.fontSize, fontWeight: 600, marginBottom: space[1] }}>
                Preferred Relief Officer
              </label>
              <input
                type="text"
                value={planRelief}
                onChange={(e) => setPlanRelief(e.target.value)}
                style={{ width: "100%", height: "38px", padding: `0 ${space[2]}`, borderRadius: radii.sm, border: `1px solid ${colors.border}` }}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: text.small.fontSize, fontWeight: 600, marginBottom: space[1] }}>
                Notes / Purpose
              </label>
              <input
                type="text"
                value={planPurpose}
                onChange={(e) => setPlanPurpose(e.target.value)}
                placeholder="e.g. Annual rest / school holidays"
                style={{ width: "100%", height: "38px", padding: `0 ${space[2]}`, borderRadius: radii.sm, border: `1px solid ${colors.border}` }}
              />
            </div>

            <Button variant="primary" size="sm" type="submit">
              + Add to Annual Leave Plan
            </Button>
          </form>

          {/* Planned Leave Windows Table */}
          <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, overflow: "hidden", boxShadow: shadows.sm }}>
            <div style={{ padding: space[4], borderBottom: `1px solid ${colors.borderSubtle}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: text.h3.fontSize, fontWeight: text.h3.fontWeight, color: colors.textPrimary, margin: 0 }}>
                My FY2026 Leave Plan ({totalPlannedDays} / {annualTotal} Days Scheduled)
              </h3>
              <Badge variant="info" size="sm">{annualTotal - totalPlannedDays}d Unscheduled</Badge>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: text.body.fontSize, fontVariantNumeric: "tabular-nums" }}>
              <thead>
                <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary }}>QUARTER</th>
                  <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary }}>PLANNED DATES</th>
                  <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary }}>DAYS</th>
                  <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary }}>RELIEF OFFICER</th>
                  <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {plannedBlocks.map((b) => (
                  <tr key={b.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: space[3], fontWeight: 700, color: colors.indigoAction }}>{b.quarter}</td>
                    <td style={{ padding: space[3] }}>
                      <div style={{ fontWeight: 600 }}>{formatDate(b.startDate)} &rarr; {formatDate(b.endDate)}</div>
                      <div style={{ fontSize: text.small.fontSize, color: colors.textMuted }}>{b.purpose}</div>
                    </td>
                    <td style={{ padding: space[3], fontWeight: 600 }}>{b.days}d</td>
                    <td style={{ padding: space[3], color: colors.textSecondary }}>{b.preferredReliefOfficer}</td>
                    <td style={{ padding: space[3] }}>
                      <Badge variant={b.status === "Approved" ? "success" : "info"} size="sm">{b.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: CONFIRM RESUMPTION (RETURN TO DUTY) */}
      {activeSubTab === "confirm_resumption" && (
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: space[4], boxShadow: shadows.sm }}>
          <div style={{ marginBottom: space[4] }}>
            <h2 style={{ fontSize: text.h3.fontSize, fontWeight: text.h3.fontWeight, color: colors.textPrimary, margin: 0 }}>
              Confirm Return-to-Duty Resumption
            </h2>
            <p style={{ fontSize: text.small.fontSize, color: colors.textSecondary, margin: `${space[1]} 0 0 0` }}>
              Log your actual resumption date after completed leave so attendance, payroll cutoffs, and relief officer handovers close cleanly.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
            {leaves
              .filter((l) => l.status === "APPROVED")
              .map((l) => (
                <div
                  key={l.id}
                  style={{
                    padding: space[4],
                    borderRadius: radii.sm,
                    border: `1px solid ${l.resumptionStatus === "AWAITING_CONFIRMATION" ? colors.warningBorder : colors.border}`,
                    backgroundColor: l.resumptionStatus === "AWAITING_CONFIRMATION" ? colors.warningBg : colors.surfaceSubtle,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: space[4],
                  }}
                >
                  <div style={{ flex: "1 1 320px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                      <span style={{ fontWeight: 700, fontSize: text.bodyStrong.fontSize, color: colors.textPrimary }}>
                        {l.leaveType} ({l.days} days)
                      </span>
                      <Badge
                        variant={l.resumptionStatus === "CONFIRMED_RETURNED" ? "success" : "warning"}
                        size="sm"
                      >
                        {l.resumptionStatus === "CONFIRMED_RETURNED" ? "Return Confirmed ✓" : "Awaiting Return Confirmation"}
                      </Badge>
                    </div>
                    <div style={{ fontSize: text.small.fontSize, color: colors.textSecondary, marginTop: space[1] }}>
                      Leave Period: {formatDate(l.startDate)} &rarr; {formatDate(l.endDate)} · Relief Officer: <strong>{l.handoverColleague}</strong>
                    </div>
                    {l.resumptionNotes && (
                      <div style={{ fontSize: text.small.fontSize, color: colors.textMuted, marginTop: "4px" }}>
                        Handover Log: &ldquo;{l.resumptionNotes}&rdquo;
                      </div>
                    )}
                  </div>

                  {l.resumptionStatus === "AWAITING_CONFIRMATION" && (
                    <div style={{ display: "flex", gap: space[2], alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="date"
                        aria-label="Actual resumption date"
                        value={resumptionDateInput}
                        onChange={(e) => setResumptionDateInput(e.target.value)}
                        style={{
                          height: "36px",
                          padding: `0 ${space[2]}`,
                          borderRadius: radii.sm,
                          border: `1px solid ${colors.borderStrong}`,
                          backgroundColor: colors.surface,
                        }}
                      />
                      <input
                        type="text"
                        aria-label="Resumption handover notes"
                        value={resumptionNotesInput}
                        onChange={(e) => setResumptionNotesInput(e.target.value)}
                        placeholder="Handover retrieval notes..."
                        style={{
                          height: "36px",
                          width: "240px",
                          padding: `0 ${space[2]}`,
                          borderRadius: radii.sm,
                          border: `1px solid ${colors.borderStrong}`,
                          backgroundColor: colors.surface,
                        }}
                      />
                      <Button variant="primary" size="sm" onClick={() => handleConfirmResumption(l.id)}>
                        Confirm Resumption
                      </Button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Apply for Leave Modal */}
      {showApplyModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: space[4],
          }}
        >
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              maxWidth: "520px",
              width: "100%",
              boxShadow: shadows.modal,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: space[4], borderBottom: `1px solid ${colors.borderSubtle}`, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surfaceSubtle }}>
              <h3 style={{ fontSize: text.h3.fontSize, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
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

            <form onSubmit={handleApplyLeave} style={{ padding: space[4], display: "flex", flexDirection: "column", gap: space[3] }}>
              <div>
                <label style={{ display: "block", fontSize: text.small.fontSize, fontWeight: 600, marginBottom: space[1] }}>
                  Leave Type
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as MyLeaveItem["leaveType"])}
                  style={{ width: "100%", height: "40px", padding: `0 ${space[2]}`, borderRadius: radii.sm, border: `1px solid ${colors.border}` }}
                >
                  <option value="Annual Leave">Annual Leave ({annualRemaining} days remaining)</option>
                  <option value="Sick Leave">Sick Leave ({sickRemaining} days remaining)</option>
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Compassionate">Compassionate Leave</option>
                  <option value="Maternity / Paternity">Maternity / Paternity Leave</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space[3] }}>
                <div>
                  <label style={{ display: "block", fontSize: text.small.fontSize, fontWeight: 600, marginBottom: space[1] }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ width: "100%", height: "40px", padding: `0 ${space[2]}`, borderRadius: radii.sm, border: `1px solid ${colors.border}` }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: text.small.fontSize, fontWeight: 600, marginBottom: space[1] }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ width: "100%", height: "40px", padding: `0 ${space[2]}`, borderRadius: radii.sm, border: `1px solid ${colors.border}` }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: text.small.fontSize, fontWeight: 600, marginBottom: space[1] }}>
                  Designated Relief Officer (Handover Colleague)
                </label>
                <input
                  type="text"
                  value={handoverColleague}
                  onChange={(e) => setHandoverColleague(e.target.value)}
                  placeholder="Colleague covering your responsibilities"
                  style={{ width: "100%", height: "40px", padding: `0 ${space[2]}`, borderRadius: radii.sm, border: `1px solid ${colors.border}` }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: text.small.fontSize, fontWeight: 600, marginBottom: space[1] }}>
                  Reason &amp; Handover Checklist *
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide context for your leave and handover preparations..."
                  style={{ width: "100%", padding: space[2], borderRadius: radii.sm, border: `1px solid ${colors.border}` }}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: space[2], marginTop: space[2] }}>
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

"use client";

import React, { useEffect, useState, useMemo } from "react";
import { colors, radii, shadows, space, text } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { formatDate } from "../../utils/date";
import {
  INITIAL_LEAVE_LEDGER_TRANSACTIONS,
  LeaveLedgerTransaction,
  PartialDayMode,
  calculateLeaveDuration,
  deriveBalanceFromLedger,
  fromBp,
  toBp,
} from "../../domain/leaveEngine";

export interface MyLeaveItem {
  id: number;
  applicationNumber: string;
  leaveType: "Annual Leave" | "Sick Leave" | "Casual Leave" | "Compassionate" | "Maternity / Paternity";
  leaveTypeCode: "ANNUAL" | "SICK" | "COMPASSIONATE";
  startDate: string;
  endDate: string;
  partialDay: PartialDayMode;
  days: number;
  resumptionDate: string;
  reason: string;
  handoverColleague: string;
  status: "DRAFT" | "APPROVED" | "PENDING" | "REJECTED" | "WITHDRAWN" | "CANCELLED";
  submittedAt: string;
  policyVersionId: string;
  resumptionStatus?: "NOT_DUE" | "AWAITING_CONFIRMATION" | "CONFIRMED_RETURNED";
  actualResumptionDate?: string;
  resumptionNotes?: string;
  attachmentName?: string;
  linkedExtensions?: { id: string; additionalEndDate: string; additionalDays: number; status: string }[];
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
  initialSubTab?: string;
}

export const MyLeaveScreen: React.FC<MyLeaveScreenProps> = ({ initialSubTab }) => {
  const [activeSubTab, setActiveSubTab] = useState<
    "balances_history" | "ledger" | "plan_leave" | "confirm_resumption"
  >("balances_history");

  // Append-Only Ledger State (§0.1, §4.2, §5.3: never overwrite a balance field)
  const [ledger, setLedger] = useState<LeaveLedgerTransaction[]>(
    INITIAL_LEAVE_LEDGER_TRANSACTIONS
  );

  // Derive balances strictly from the append-only ledger
  const annualBal = useMemo(
    () => deriveBalanceFromLedger(ledger, "ANNUAL", "Annual Leave", "POL-ANNUAL-GH-v2.1"),
    [ledger]
  );
  const sickBal = useMemo(
    () => deriveBalanceFromLedger(ledger, "SICK", "Sick Leave", "POL-SICK-GH-v1.4"),
    [ledger]
  );
  const compBal = useMemo(
    () => deriveBalanceFromLedger(ledger, "COMPASSIONATE", "Compassionate & Family", "POL-COMP-GH-v1.0"),
    [ledger]
  );

  const [leaves, setLeaves] = useState<MyLeaveItem[]>([
    {
      id: 1,
      applicationNumber: "APP-2026-001",
      leaveType: "Annual Leave",
      leaveTypeCode: "ANNUAL",
      startDate: "2026-06-15",
      endDate: "2026-06-26",
      partialDay: "FULL",
      days: 10,
      resumptionDate: "2026-06-29",
      reason: "Mid-year family vacation and rest",
      handoverColleague: "Sarah Jenkins (Senior Consultant)",
      status: "APPROVED",
      submittedAt: "2026-05-02",
      policyVersionId: "POL-ANNUAL-GH-v2.1",
      resumptionStatus: "AWAITING_CONFIRMATION",
      linkedExtensions: [],
    },
    {
      id: 2,
      applicationNumber: "APP-2026-002",
      leaveType: "Sick Leave",
      leaveTypeCode: "SICK",
      startDate: "2026-03-12",
      endDate: "2026-03-13",
      partialDay: "FULL",
      days: 2,
      resumptionDate: "2026-03-16",
      reason: "Medical appointment and recovery",
      handoverColleague: "Marcus Chen (Engineering Lead)",
      status: "APPROVED",
      submittedAt: "2026-03-11",
      policyVersionId: "POL-SICK-GH-v1.4",
      resumptionStatus: "CONFIRMED_RETURNED",
      actualResumptionDate: "2026-03-16",
      resumptionNotes: "Returned on schedule; all sprint items resumed from Marcus Chen.",
    },
    {
      id: 3,
      applicationNumber: "APP-2026-003",
      leaveType: "Annual Leave",
      leaveTypeCode: "ANNUAL",
      startDate: "2026-12-14",
      endDate: "2026-12-18",
      partialDay: "FULL",
      days: 5,
      resumptionDate: "2026-12-21",
      reason: "End-of-year personal leave & family commitment",
      handoverColleague: "Benedicta Agbesi (HR Specialist)",
      status: "PENDING",
      submittedAt: "2026-11-10",
      policyVersionId: "POL-ANNUAL-GH-v2.1",
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
      purpose: "Mid-year family break (Converted to APP-2026-001)",
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

  // Apply for Leave Modal state (§4.3)
  const [showApplyModal, setShowApplyModal] = useState(false);

  useEffect(() => {
    if (!initialSubTab) return;
    if (initialSubTab === "plan_leave") {
      setActiveSubTab("plan_leave");
    } else if (initialSubTab === "apply") {
      setActiveSubTab("balances_history");
      setShowApplyModal(true);
    } else if (initialSubTab === "history" || initialSubTab === "balances_history") {
      setActiveSubTab("balances_history");
      if (initialSubTab === "history" && typeof document !== "undefined") {
        setTimeout(() => {
          document.getElementById("my-leave-history")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      }
    }
  }, [initialSubTab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("scoreview_my_leaves");
      if (saved) {
        const parsed = JSON.parse(saved) as MyLeaveItem[];
        if (Array.isArray(parsed) && parsed.length > 0) setLeaves(parsed);
      }
    } catch { }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("scoreview_my_leaves", JSON.stringify(leaves));
      window.dispatchEvent(new CustomEvent("scoreview:leaves-updated", { detail: leaves }));
    } catch { }
  }, [leaves]);
  const [leaveType, setLeaveType] = useState<MyLeaveItem["leaveType"]>("Annual Leave");
  const [startDate, setStartDate] = useState("2026-11-23");
  const [endDate, setEndDate] = useState("2026-11-29"); // Mon-Sun test case: 7 calendar days -> 5 working days charged!
  const [partialDay, setPartialDay] = useState<PartialDayMode>("FULL");
  const [reason, setReason] = useState("");
  const [handoverColleague, setHandoverColleague] = useState("Sarah Jenkins (Senior Consultant)");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [saveAsDraftMode, setSaveAsDraftMode] = useState(false);

  // Linked Extension Modal state
  const [extendingLeave, setExtendingLeave] = useState<MyLeaveItem | null>(null);
  const [extEndDate, setExtEndDate] = useState("2026-07-02");
  const [extReason, setExtReason] = useState("");

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
    setTimeout(() => setStatusMessage(null), 5500);
  };

  // Live deterministic calculation of selected dates (§4.3, §6 LV-004)
  const calc = useMemo(
    () => calculateLeaveDuration(startDate, endDate, partialDay),
    [startDate, endDate, partialDay]
  );

  const activeTypeBal =
    leaveType === "Sick Leave"
      ? sickBal
      : leaveType === "Compassionate"
      ? compBal
      : annualBal;

  const isInsufficientBalance = calc.chargedDays > activeTypeBal.availableBalance;

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveAsDraftMode && !reason.trim()) {
      alert("Please provide a reason and handover summary for your leave request.");
      return;
    }
    if (!saveAsDraftMode && isInsufficientBalance) {
      alert(
        `Requested ${calc.chargedDays} working days exceeds available balance of ${activeTypeBal.availableBalance} days.`
      );
      return;
    }

    const appNum = `APP-2026-00${leaves.length + 1}`;
    const typeCode: MyLeaveItem["leaveTypeCode"] =
      leaveType === "Sick Leave"
        ? "SICK"
        : leaveType === "Compassionate"
        ? "COMPASSIONATE"
        : "ANNUAL";

    const newLeave: MyLeaveItem = {
      id: Date.now(),
      applicationNumber: appNum,
      leaveType,
      leaveTypeCode: typeCode,
      startDate,
      endDate,
      partialDay,
      days: calc.chargedDays,
      resumptionDate: calc.resumptionDate,
      reason: reason.trim() || "Draft leave application",
      handoverColleague,
      status: saveAsDraftMode ? "DRAFT" : "PENDING",
      submittedAt: new Date().toISOString().split("T")[0],
      policyVersionId: calc.policyVersion,
      resumptionStatus: "NOT_DUE",
      attachmentName: attachmentFile?.name,
    };

    setLeaves([newLeave, ...leaves]);
    setShowApplyModal(false);
    setReason("");
    const attachedMsg = attachmentFile ? ` · Attached: ${attachmentFile.name}` : "";
    setAttachmentFile(null);
    showToast(
      saveAsDraftMode
        ? `Saved ${appNum} as Draft (${calc.chargedDays} working days; invisible to approvers, no reservation hold)${attachedMsg}.`
        : `Submitted ${appNum} (${calc.chargedDays} working days charged, ${calc.excludedDays} weekend/holiday days excluded; Resumption: ${formatDate(calc.resumptionDate)})${attachedMsg}.`
    );
  };

  const handleCancelOrWithdrawLeave = (leave: MyLeaveItem) => {
    if (leave.status === "APPROVED") {
      // LV-009: Cancelling an approved leave releases the reservation in the append-only ledger
      const releaseTx: LeaveLedgerTransaction = {
        id: `LTX-${Date.now()}`,
        employeeId: "EMP-PKB-001",
        leaveTypeCode: leave.leaveTypeCode,
        entitlementPeriodId: `PER-2026-${leave.leaveTypeCode}`,
        transactionType: "RESERVATION_RELEASE",
        quantityBp: toBp(leave.days),
        effectiveDate: new Date().toISOString().slice(0, 10),
        sourceType: "LEAVE_CANCELLATION",
        sourceId: leave.applicationNumber,
        policyVersionId: leave.policyVersionId,
        reason: `Released reservation on cancellation of ${leave.applicationNumber}`,
        createdBy: "Paa Kwesi Barnes (Self-Service)",
        createdAt: new Date().toISOString(),
      };
      setLedger((prev) => [...prev, releaseTx]);
      setLeaves((prev) =>
        prev.map((l) => (l.id === leave.id ? { ...l, status: "CANCELLED" } : l))
      );
      showToast(
        `Cancelled ${leave.applicationNumber} and appended RESERVATION_RELEASE (+${leave.days}d restored) to ledger.`
      );
    } else {
      setLeaves((prev) =>
        prev.map((l) => (l.id === leave.id ? { ...l, status: "WITHDRAWN" } : l))
      );
      showToast(`Withdrew ${leave.applicationNumber}.`);
    }
  };

  // Section 5.3 & LV-010: Confirm Resumption reclassifies RESERVATION -> LEAVE_TAKEN in the append-only ledger
  const handleConfirmResumption = (leave: MyLeaveItem) => {
    const releaseTx: LeaveLedgerTransaction = {
      id: `LTX-REL-${Date.now()}`,
      employeeId: "EMP-PKB-001",
      leaveTypeCode: leave.leaveTypeCode,
      entitlementPeriodId: `PER-2026-${leave.leaveTypeCode}`,
      transactionType: "RESERVATION_RELEASE",
      quantityBp: toBp(leave.days),
      effectiveDate: resumptionDateInput,
      sourceType: "LEAVE_RESUMPTION",
      sourceId: leave.applicationNumber,
      policyVersionId: leave.policyVersionId,
      reason: `Reclassified active reservation upon confirmed return for ${leave.applicationNumber}`,
      createdBy: "Paa Kwesi Barnes (Employee Confirmation)",
      createdAt: new Date().toISOString(),
    };
    const takenTx: LeaveLedgerTransaction = {
      id: `LTX-TKN-${Date.now() + 1}`,
      employeeId: "EMP-PKB-001",
      leaveTypeCode: leave.leaveTypeCode,
      entitlementPeriodId: `PER-2026-${leave.leaveTypeCode}`,
      transactionType: "LEAVE_TAKEN",
      quantityBp: toBp(leave.days),
      effectiveDate: resumptionDateInput,
      sourceType: "LEAVE_RESUMPTION",
      sourceId: leave.applicationNumber,
      policyVersionId: leave.policyVersionId,
      reason: `Confirmed leave consumption (${leave.days}d) upon return on ${resumptionDateInput}`,
      createdBy: "Paa Kwesi Barnes (Employee Confirmation)",
      createdAt: new Date().toISOString(),
    };

    setLedger((prev) => [...prev, releaseTx, takenTx]);
    setLeaves((prev) =>
      prev.map((l) =>
        l.id === leave.id
          ? {
              ...l,
              resumptionStatus: "CONFIRMED_RETURNED",
              actualResumptionDate: resumptionDateInput,
              resumptionNotes: resumptionNotesInput,
            }
          : l
      )
    );
    showToast(
      `Resumption confirmed for ${leave.applicationNumber}. Ledger updated: RESERVATION_RELEASE (−${leave.days}d hold) + LEAVE_TAKEN (+${leave.days}d consumed).`
    );
  };

  // Rule LV-022: Extending approved leave creates a linked LeaveExtension, never silently overwriting original dates
  const handleCreateLinkedExtension = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendingLeave) return;
    const extStart = addWorkingExtensionStart(extendingLeave.endDate);
    const extCalc = calculateLeaveDuration(extStart, extEndDate, "FULL");
    const extRecord = {
      id: `EXT-${Date.now().toString().slice(-4)}`,
      additionalEndDate: extEndDate,
      additionalDays: extCalc.chargedDays,
      status: "PENDING_APPROVAL",
    };
    setLeaves((prev) =>
      prev.map((l) =>
        l.id === extendingLeave.id
          ? { ...l, linkedExtensions: [...(l.linkedExtensions || []), extRecord] }
          : l
      )
    );
    showToast(
      `Created linked LeaveExtension ${extRecord.id} (+${extCalc.chargedDays} working days) attached to ${extendingLeave.applicationNumber} without mutating original approved dates.`
    );
    setExtendingLeave(null);
    setExtReason("");
  };

  const addWorkingExtensionStart = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + 1));
    return dt.toISOString().slice(0, 10);
  };

  const handleAddPlannedBlock = (e: React.FormEvent) => {
    e.preventDefault();
    const c = calculateLeaveDuration(planStart, planEnd, "FULL");
    const block: PlannedLeaveBlock = {
      id: Date.now(),
      quarter: planQuarter,
      startDate: planStart,
      endDate: planEnd,
      days: c.chargedDays,
      purpose: planPurpose.trim() || `${planQuarter} Planned Annual Leave`,
      preferredReliefOfficer: planRelief,
      status: "Submitted to Manager",
    };
    setPlannedBlocks((prev) => [...prev, block]);
    setPlanPurpose("");
    showToast(`Added ${c.chargedDays}-working-day planned leave window (${planQuarter}) to Annual Leave Planner.`);
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
            <Badge variant="success" size="sm">Self-Service</Badge>
          </div>
          <p style={{ fontSize: text.body.fontSize, color: colors.textSecondary, margin: `${space[1]} 0 0 0` }}>
            Apply for leave with work-calendar day calculation, inspect append-only ledger balances, plan annual leave, and confirm return-to-duty resumption.
          </p>
        </div>

        <div style={{ display: "flex", gap: space[2], flexWrap: "wrap" }}>
          <Button
            variant={activeSubTab === "balances_history" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveSubTab("balances_history")}
          >
            My Applications &amp; History ({leaves.length})
          </Button>
          <Button
            variant={activeSubTab === "ledger" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveSubTab("ledger")}
          >
            Balance Ledger ({ledger.length})
          </Button>
          <Button
            variant={activeSubTab === "plan_leave" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveSubTab("plan_leave")}
          >
            Annual Leave Planner ({totalPlannedDays}d)
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

      {/* §4.2 Leave Availability Cards (Derived Strictly from Append-Only Ledger + Explicit Circular Utilisation Label) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: space[4], fontVariantNumeric: "tabular-nums" }}>
        {[annualBal, sickBal, compBal].map((bal) => (
          <div
            key={bal.leaveTypeCode}
            style={{
              backgroundColor: colors.surface,
              padding: space[4],
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              boxShadow: shadows.sm,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: space[3],
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: text.micro.fontSize, fontWeight: 600, color: colors.textMuted, textTransform: "uppercase" }}>
                  {bal.leaveTypeName} Availability
                </span>
                <div style={{ fontSize: text.display.fontSize, fontWeight: 700, color: colors.indigoPrimary, marginTop: "2px" }}>
                  {bal.availableBalance} <span style={{ fontSize: text.body.fontSize, fontWeight: 600, color: colors.textSecondary }}>Available</span>
                </div>
                <div style={{ fontSize: text.micro.fontSize, color: colors.textMuted }}>
                  Policy: <code>{bal.policyVersionId}</code> · As at 2026-11-17
                </div>
              </div>

              {/* Circular Indicator Explicitly Labelled with "Utilisation" (§4.2) */}
              <div style={{ textAlign: "center" }} title="Percentage of annual entitlement consumed (Taken / Entitlement)">
                <svg width="56" height="56" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke={colors.surfaceSubtle} strokeWidth="5" />
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    fill="none"
                    stroke={colors.indigoAction}
                    strokeWidth="5"
                    strokeDasharray={`${(bal.utilisationPct / 100) * 138.2} 138.2`}
                    strokeLinecap="round"
                    transform="rotate(-90 28 28)"
                  />
                  <text x="28" y="31" textAnchor="middle" fontSize="11" fontWeight="700" fill={colors.textPrimary}>
                    {bal.utilisationPct}%
                  </text>
                </svg>
                <div style={{ fontSize: text.micro.fontSize, fontWeight: 600, color: colors.textMuted }}>
                  Utilisation
                </div>
              </div>
            </div>

            {/* §4.2 Mandatory 4-Row Breakdown */}
            <div
              style={{
                padding: space[3],
                borderRadius: radii.sm,
                backgroundColor: colors.surfaceSubtle,
                border: `1px solid ${colors.borderSubtle}`,
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                fontSize: text.small.fontSize,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: colors.textSecondary }}>Annual entitlement (incl. carry-forward/credits)</span>
                <strong>{bal.annualEntitlement} days</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: colors.textSecondary }}>Taken (confirmed consumed)</span>
                <strong>{bal.taken} days</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: colors.textSecondary }}>Approved / reserved (future holds)</span>
                <strong style={{ color: colors.warning }}>{bal.reserved} days</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${colors.border}`, paddingTop: "4px", marginTop: "2px" }}>
                <span style={{ fontWeight: 600, color: colors.textPrimary }}>Available for application</span>
                <strong style={{ color: colors.emeraldDark }}>{bal.availableBalance} days</strong>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Button variant="ghost" size="sm" onClick={() => setActiveSubTab("ledger")}>
                View Ledger Transactions &rarr;
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLeaveType(
                    bal.leaveTypeCode === "SICK"
                      ? "Sick Leave"
                      : bal.leaveTypeCode === "COMPASSIONATE"
                      ? "Compassionate"
                      : "Annual Leave"
                  );
                  setShowApplyModal(true);
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* SUB-TAB 1: APPLICATIONS & LEAVE HISTORY (§4.3, §4.5) */}
      {activeSubTab === "balances_history" && (
        <div id="my-leave-history" style={{ backgroundColor: colors.surface, borderRadius: radii.md, border: `1px solid ${colors.border}`, overflow: "hidden", boxShadow: shadows.sm }}>
          <div style={{ padding: space[4], borderBottom: `1px solid ${colors.borderSubtle}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: text.h3.fontSize, fontWeight: text.h3.fontWeight, color: colors.textPrimary, margin: 0 }}>
                My Leave Applications &amp; Episode History ({leaves.length})
              </h2>
              <span style={{ fontSize: text.small.fontSize, color: colors.textMuted }}>
                Retains effective policy version, work-calendar charged days, resumption status, and linked extensions.
              </span>
            </div>
            <Badge variant="neutral" size="sm">Append-Only Audit Trail</Badge>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: text.body.fontSize, fontVariantNumeric: "tabular-nums" }}>
            <thead>
              <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary, fontWeight: 600 }}>REF &amp; TYPE</th>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary, fontWeight: 600 }}>LEAVE DATES &amp; RESUMPTION</th>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary, fontWeight: 600 }}>CHARGED DAYS</th>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary, fontWeight: 600 }}>RELIEF OFFICER</th>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary, fontWeight: 600 }}>STATUS</th>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary, fontWeight: 600, textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                  <td style={{ padding: space[3] }}>
                    <div style={{ fontWeight: 600, color: colors.textPrimary }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: text.mono.fontSize, color: colors.indigoAction, marginRight: space[1] }}>
                        {l.applicationNumber}
                      </span>
                      {l.leaveType}
                    </div>
                    <div style={{ fontSize: text.small.fontSize, color: colors.textMuted }}>
                      {l.reason} · Policy: <code>{l.policyVersionId}</code>
                    </div>
                    {l.linkedExtensions && l.linkedExtensions.length > 0 && (
                      <div style={{ marginTop: "4px", display: "flex", gap: space[1], flexWrap: "wrap" }}>
                        {l.linkedExtensions.map((ext) => (
                          <Badge key={ext.id} variant="info" size="sm">
                            Linked {ext.id}: +{ext.additionalDays}d &rarr; {formatDate(ext.additionalEndDate)} ({ext.status})
                          </Badge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: space[3], color: colors.textSecondary }}>
                    <div>{formatDate(l.startDate)} &rarr; {formatDate(l.endDate)}</div>
                    <div style={{ fontSize: text.small.fontSize, color: colors.textMuted }}>
                      Scheduled Return: <strong>{formatDate(l.resumptionDate)}</strong>
                    </div>
                  </td>
                  <td style={{ padding: space[3], fontWeight: 600, color: colors.indigoPrimary }}>
                    {l.days} {l.days === 1 ? "working day" : "working days"} ({l.partialDay})
                  </td>
                  <td style={{ padding: space[3], color: colors.textSecondary }}>{l.handoverColleague}</td>
                  <td style={{ padding: space[3] }}>
                    <Badge
                      variant={
                        l.status === "APPROVED"
                          ? "success"
                          : l.status === "PENDING"
                          ? "warning"
                          : l.status === "DRAFT"
                          ? "neutral"
                          : "error"
                      }
                      size="sm"
                    >
                      {l.status}
                    </Badge>
                  </td>
                  <td style={{ padding: space[3], textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: space[1], flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {l.status === "APPROVED" && (
                        <Button variant="outline" size="sm" onClick={() => setExtendingLeave(l)}>
                          Extend
                        </Button>
                      )}
                      {(l.status === "PENDING" || l.status === "DRAFT" || l.status === "APPROVED") && (
                        <Button variant="ghost" size="sm" onClick={() => handleCancelOrWithdrawLeave(l)}>
                          {l.status === "APPROVED" ? "Cancel" : "Withdraw"}
                        </Button>
                      )}
                      {l.resumptionStatus === "AWAITING_CONFIRMATION" && (
                        <Button variant="primary" size="sm" onClick={() => setActiveSubTab("confirm_resumption")}>
                          Confirm Return
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SUB-TAB 2: APPEND-ONLY BALANCE LEDGER (§0.1, §4.2, §7.2) */}
      {activeSubTab === "ledger" && (
        <div style={{ backgroundColor: colors.surface, borderRadius: radii.md, border: `1px solid ${colors.border}`, overflow: "hidden", boxShadow: shadows.sm }}>
          <div style={{ padding: space[4], borderBottom: `1px solid ${colors.borderSubtle}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: text.h3.fontSize, fontWeight: text.h3.fontWeight, color: colors.textPrimary, margin: 0 }}>
                Leave Entitlement &amp; Balance Ledger ({ledger.length} Transactions)
              </h2>
              <span style={{ fontSize: text.small.fontSize, color: colors.textMuted }}>
                Complete history of entitlement allocations, accruals, reservations, and leave taken.
              </span>
            </div>
            <Badge variant="info" size="sm">Immutable Audit Ledger</Badge>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: text.body.fontSize, fontVariantNumeric: "tabular-nums" }}>
            <thead>
              <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary }}>TX ID</th>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary }}>EFFECTIVE DATE</th>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary }}>LEAVE TYPE</th>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary }}>TRANSACTION TYPE</th>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary }}>QUANTITY (DAYS)</th>
                <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary }}>SOURCE &amp; POLICY VERSION</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((tx) => {
                const isCredit =
                  tx.transactionType === "OPENING" ||
                  tx.transactionType === "ALLOCATION" ||
                  tx.transactionType === "ACCRUAL" ||
                  tx.transactionType === "ADDITIONAL_CREDIT" ||
                  tx.transactionType === "CARRY_FORWARD_IN" ||
                  tx.transactionType === "RESERVATION_RELEASE" ||
                  tx.transactionType === "RECALL_RESTORE";
                return (
                  <tr key={tx.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: space[3], fontFamily: "var(--font-mono)", fontSize: text.mono.fontSize, color: colors.indigoAction }}>
                      {tx.id}
                    </td>
                    <td style={{ padding: space[3], color: colors.textSecondary }}>{formatDate(tx.effectiveDate)}</td>
                    <td style={{ padding: space[3] }}>
                      <Badge variant="neutral" size="sm">{tx.leaveTypeCode}</Badge>
                    </td>
                    <td style={{ padding: space[3] }}>
                      <Badge variant={isCredit ? "success" : "warning"} size="sm">
                        {tx.transactionType}
                      </Badge>
                    </td>
                    <td style={{ padding: space[3], fontWeight: 700, color: isCredit ? colors.emeraldDark : colors.warning }}>
                      {isCredit ? "+" : "−"}{fromBp(tx.quantityBp).toFixed(2)} d
                    </td>
                    <td style={{ padding: space[3] }}>
                      <div style={{ fontWeight: 600, color: colors.textPrimary }}>{tx.reason}</div>
                      <div style={{ fontSize: text.small.fontSize, color: colors.textMuted }}>
                        Source: <code>{tx.sourceId}</code> · Policy: <code>{tx.policyVersionId}</code> · Actor: {tx.createdBy}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* SUB-TAB 3: PLAN LEAVE (ANNUAL LEAVE PLANNER §4.7) */}
      {activeSubTab === "plan_leave" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: space[4] }}>
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
                Proposed leave plans are indicative until converted into a formal application.
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

          <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, overflow: "hidden", boxShadow: shadows.sm }}>
            <div style={{ padding: space[4], borderBottom: `1px solid ${colors.borderSubtle}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: text.h3.fontSize, fontWeight: text.h3.fontWeight, color: colors.textPrimary, margin: 0 }}>
                My FY2026 Leave Plan ({totalPlannedDays} / {annualBal.annualEntitlement} Working Days)
              </h3>
              <Badge variant="info" size="sm">Plan vs Actual Tracked</Badge>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: text.body.fontSize, fontVariantNumeric: "tabular-nums" }}>
              <thead>
                <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary }}>QUARTER</th>
                  <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary }}>PLANNED DATES</th>
                  <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary }}>WORKING DAYS</th>
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

      {/* SUB-TAB 4: CONFIRM RESUMPTION (§4.6, LV-010, LV-022) */}
      {activeSubTab === "confirm_resumption" && (
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: space[4], boxShadow: shadows.sm }}>
          <div style={{ marginBottom: space[4] }}>
            <h2 style={{ fontSize: text.h3.fontSize, fontWeight: text.h3.fontWeight, color: colors.textPrimary, margin: 0 }}>
              Confirm Return-to-Duty Resumption
            </h2>
            <p style={{ fontSize: text.small.fontSize, color: colors.textSecondary, margin: `${space[1]} 0 0 0` }}>
              Confirming return reclassifies your approved reservation into confirmed <code>LEAVE_TAKEN</code> in the append-only ledger without double-deducting entitlement.
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
                        {l.applicationNumber} · {l.leaveType} ({l.days} working days)
                      </span>
                      <Badge
                        variant={l.resumptionStatus === "CONFIRMED_RETURNED" ? "success" : "warning"}
                        size="sm"
                      >
                        {l.resumptionStatus === "CONFIRMED_RETURNED" ? "Return Confirmed ✓" : "Resumption Pending"}
                      </Badge>
                    </div>
                    <div style={{ fontSize: text.small.fontSize, color: colors.textSecondary, marginTop: space[1] }}>
                      Leave Period: {formatDate(l.startDate)} &rarr; {formatDate(l.endDate)} · Scheduled Return: <strong>{formatDate(l.resumptionDate)}</strong> · Relief: <strong>{l.handoverColleague}</strong>
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
                      <Button variant="primary" size="sm" onClick={() => handleConfirmResumption(l)}>
                        Confirm Resumption
                      </Button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* MODAL 1: APPLY FOR LEAVE WITH LIVE WORK-CALENDAR CALCULATOR (§4.3, LV-004) */}
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
              maxWidth: "600px",
              width: "100%",
              boxShadow: shadows.modal,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: space[4], borderBottom: `1px solid ${colors.borderSubtle}`, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surfaceSubtle }}>
              <div>
                <h3 style={{ fontSize: text.h3.fontSize, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
                  Leave Application
                </h3>
                <span style={{ fontSize: text.micro.fontSize, color: colors.textMuted }}>
                  Calendar: <code>{calc.calendarVersion}</code> · Policy: <code>{calc.policyVersion}</code>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: colors.textMuted }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyLeave} style={{ padding: space[4], display: "flex", flexDirection: "column", gap: space[3] }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: space[3] }}>
                <div>
                  <label style={{ display: "block", fontSize: text.small.fontSize, fontWeight: 600, marginBottom: space[1] }}>
                    Leave Type
                  </label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as MyLeaveItem["leaveType"])}
                    style={{ width: "100%", height: "40px", padding: `0 ${space[2]}`, borderRadius: radii.sm, border: `1px solid ${colors.border}` }}
                  >
                    <option value="Annual Leave">Annual Leave ({annualBal.availableBalance}d available)</option>
                    <option value="Sick Leave">Sick Leave ({sickBal.availableBalance}d available)</option>
                    <option value="Compassionate">Compassionate Leave ({compBal.availableBalance}d available)</option>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Maternity / Paternity">Maternity / Paternity Leave</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: text.small.fontSize, fontWeight: 600, marginBottom: space[1] }}>
                    Partial Day Mode
                  </label>
                  <select
                    value={partialDay}
                    onChange={(e) => setPartialDay(e.target.value as PartialDayMode)}
                    style={{ width: "100%", height: "40px", padding: `0 ${space[2]}`, borderRadius: radii.sm, border: `1px solid ${colors.border}` }}
                  >
                    <option value="FULL">Full Working Days (1.0d)</option>
                    <option value="FIRST_HALF">First Half — Morning (0.5d)</option>
                    <option value="SECOND_HALF">Second Half — Afternoon (0.5d)</option>
                  </select>
                </div>
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

              {/* Live Deterministic Calculation Snapshot Box (§4.3, §6) */}
              <div
                style={{
                  padding: space[3],
                  borderRadius: radii.sm,
                  backgroundColor: isInsufficientBalance ? colors.errorBg : colors.indigoSubtle,
                  border: `1px solid ${isInsufficientBalance ? colors.errorBorder : colors.indigoBorder}`,
                  fontSize: text.small.fontSize,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, color: colors.textPrimary }}>
                  <span>
                    Charged Duration: <strong>{calc.chargedDays} working days</strong> (out of {calc.calendarDays} calendar days; {calc.excludedDays} non-working excluded)
                  </span>
                  <span>Resumption Date: <strong>{formatDate(calc.resumptionDate)}</strong></span>
                </div>
                <div style={{ marginTop: "4px", color: isInsufficientBalance ? colors.error : colors.textSecondary }}>
                  Balance Snapshot: Available <strong>{activeTypeBal.availableBalance}d</strong> &rarr; Projected Remaining:{" "}
                  <strong>{(activeTypeBal.availableBalance - calc.chargedDays).toFixed(1)}d</strong>{" "}
                  {isInsufficientBalance && "(Exceeds Available Balance)"}
                </div>
                <div style={{ marginTop: "4px", fontSize: text.micro.fontSize, color: colors.textMuted }}>
                  Approval Route Preview: Stage 1 Line Manager (Sarah Jenkins) &rarr; Stage 2 HR Verification
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: text.small.fontSize, fontWeight: 600, marginBottom: space[1] }}>
                  Proposed Relief Officer
                </label>
                <input
                  type="text"
                  value={handoverColleague}
                  onChange={(e) => setHandoverColleague(e.target.value)}
                  style={{ width: "100%", height: "40px", padding: `0 ${space[2]}`, borderRadius: radii.sm, border: `1px solid ${colors.border}` }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: text.small.fontSize, fontWeight: 600, marginBottom: space[1] }}>
                  Reason &amp; Handover Instructions *
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide context for your leave and handover preparations..."
                  style={{ width: "100%", padding: space[2], borderRadius: radii.sm, border: `1px solid ${colors.border}` }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: text.small.fontSize, fontWeight: 600, marginBottom: space[1] }}>
                  Supporting Document — Doctor&apos;s Note or Handover Doc (PDF, PNG, JPG)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: space[2], flexWrap: "wrap" }}>
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg"
                    onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
                    style={{ fontSize: text.small.fontSize }}
                  />
                  {attachmentFile && (
                    <Badge variant="success" size="sm">
                      {attachmentFile.name} ({Math.max(1, Math.round(attachmentFile.size / 1024))} KB)
                    </Badge>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: space[1] }}>
                <Button
                  variant="secondary"
                  size="sm"
                  type="submit"
                  onClick={() => setSaveAsDraftMode(true)}
                >
                  Save as Draft (No Hold)
                </Button>

                <div style={{ display: "flex", gap: space[2] }}>
                  <Button variant="outline" size="sm" type="button" onClick={() => setShowApplyModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={isInsufficientBalance}
                    onClick={() => setSaveAsDraftMode(false)}
                  >
                    Submit Leave Request
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LINKED LEAVE EXTENSION (§4.18, Rule LV-022) */}
      {extendingLeave && (
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
          <form
            onSubmit={handleCreateLinkedExtension}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              maxWidth: "500px",
              width: "100%",
              boxShadow: shadows.modal,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: space[4], borderBottom: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.surfaceSubtle }}>
              <h3 style={{ fontSize: text.h3.fontSize, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
                Request Linked Leave Extension
              </h3>
              <span style={{ fontSize: text.small.fontSize, color: colors.textMuted }}>
                Parent Episode: {extendingLeave.applicationNumber} ({formatDate(extendingLeave.startDate)} &rarr; {formatDate(extendingLeave.endDate)})
              </span>
            </div>

            <div style={{ padding: space[4], display: "flex", flexDirection: "column", gap: space[3] }}>
              <div style={{ fontSize: text.small.fontSize, color: colors.textSecondary }}>
                Extending an approved leave creates a linked extension request routed for manager approval.
              </div>

              <div>
                <label style={{ display: "block", fontSize: text.small.fontSize, fontWeight: 600, marginBottom: space[1] }}>
                  Revised Extension End Date
                </label>
                <input
                  type="date"
                  min={extendingLeave.endDate}
                  value={extEndDate}
                  onChange={(e) => setExtEndDate(e.target.value)}
                  style={{ width: "100%", height: "38px", padding: `0 ${space[2]}`, borderRadius: radii.sm, border: `1px solid ${colors.border}` }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: text.small.fontSize, fontWeight: 600, marginBottom: space[1] }}>
                  Extension Reason *
                </label>
                <textarea
                  rows={2}
                  value={extReason}
                  onChange={(e) => setExtReason(e.target.value)}
                  placeholder="Reason for requesting additional days..."
                  style={{ width: "100%", padding: space[2], borderRadius: radii.sm, border: `1px solid ${colors.border}` }}
                  required
                />
              </div>
            </div>

            <div style={{ padding: space[4], borderTop: `1px solid ${colors.borderSubtle}`, display: "flex", justifyContent: "flex-end", gap: space[2] }}>
              <Button variant="outline" size="sm" type="button" onClick={() => setExtendingLeave(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Submit Linked Extension
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

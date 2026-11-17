// ==============================================================================
// ScoreviewHR — Enterprise Leave Domain & Append-Only Ledger Engine (BUILD.md v2.0)
// Non-Negotiable Engineering Rules (§0.1, §5, §6 LV-001..LV-025):
//   1. Fixed-precision arithmetic: 1 day = 10,000 basis points (NUMERIC(12,4)).
//   2. Every balance is derived from immutable append-only ledger transactions.
//   3. Work-calendar aware day calculation (excludes weekends & public holidays).
//   4. Effective-dated policy version & calendar version retained per transaction.
// ==============================================================================

export type LedgerTransactionType =
  | "OPENING"
  | "ALLOCATION"
  | "ACCRUAL"
  | "ADDITIONAL_CREDIT"
  | "CARRY_FORWARD_IN"
  | "RESERVATION"
  | "RESERVATION_RELEASE"
  | "CONSUMPTION"
  | "LEAVE_TAKEN"
  | "EXPIRY"
  | "ENCASHMENT"
  | "CARRY_FORWARD_OUT"
  | "RECALL_RESTORE"
  | "ADJUSTMENT"
  | "REVERSAL";

export type PartialDayMode = "FULL" | "FIRST_HALF" | "SECOND_HALF";

export interface LeaveLedgerTransaction {
  id: string;
  employeeId: string;
  leaveTypeCode: "ANNUAL" | "SICK" | "COMPASSIONATE";
  entitlementPeriodId: string;
  transactionType: LedgerTransactionType;
  quantityBp: number; // 10,000 bp = 1.0000 day (fixed precision, never float)
  effectiveDate: string; // YYYY-MM-DD
  sourceType: string;
  sourceId: string;
  policyVersionId: string;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface DerivedLeaveBalance {
  leaveTypeCode: "ANNUAL" | "SICK" | "COMPASSIONATE";
  leaveTypeName: string;
  policyVersionId: string;
  entitlementPeriod: string;
  annualEntitlement: number;
  opening: number;
  allocated: number;
  accrued: number;
  carryForwardIn: number;
  additionalCredits: number;
  reserved: number; // active approved future reservations
  taken: number; // confirmed consumed leave
  expired: number;
  encashed: number;
  adjustments: number;
  earnedBalance: number;
  availableBalance: number; // Section 6 conceptual balance formula
  utilisationPct: number; // Section 4.22: Taken / Eligible Entitlement * 100
}

export interface CalculatedLeaveDay {
  date: string;
  weekdayName: string;
  isWorkingDay: boolean;
  chargedQuantity: number; // 1, 0.5, or 0
  exclusionReason: string | null; // null if charged, else "Weekend (Sat/Sun)" or holiday name
}

export interface LeaveDurationCalculation {
  startDate: string;
  endDate: string;
  partialDay: PartialDayMode;
  chargedDays: number;
  calendarDays: number;
  excludedDays: number;
  resumptionDate: string; // Next working day after endDate
  days: CalculatedLeaveDay[];
  calendarVersion: string;
  policyVersion: string;
}

// Fixed-precision helper: convert days -> basis points (1 day = 10,000 bp)
export const toBp = (days: number): number => Math.round(days * 10000);
export const fromBp = (bp: number): number => Number((bp / 10000).toFixed(4));

// Ghana Statutory Public Holidays Calendar (effective-dated Work Calendar v2026.1)
export const GHANA_PUBLIC_HOLIDAYS_2026: Record<string, string> = {
  "2026-01-01": "New Year's Day",
  "2026-01-07": "Constitution Day",
  "2026-03-06": "Independence Day (Ghana)",
  "2026-04-03": "Good Friday",
  "2026-04-06": "Easter Monday",
  "2026-05-01": "May Day (Workers' Day)",
  "2026-07-01": "Republic Day",
  "2026-08-04": "Founders' Day",
  "2026-09-21": "Kwame Nkrumah Memorial Day",
  "2026-12-04": "Farmers' Day",
  "2026-12-25": "Christmas Day",
  "2026-12-26": "Boxing Day",
};

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const isWorkingDate = (dateStr: string): { working: boolean; reason: string | null } => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const dow = dt.getUTCDay();
  if (dow === 0 || dow === 6) {
    return { working: false, reason: `Weekend (${WEEKDAY_NAMES[dow]})` };
  }
  const holiday = GHANA_PUBLIC_HOLIDAYS_2026[dateStr];
  if (holiday) {
    return { working: false, reason: `Public Holiday: ${holiday}` };
  }
  return { working: true, reason: null };
};

export const addDaysIso = (dateStr: string, delta: number): string => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + delta));
  return dt.toISOString().slice(0, 10);
};

export const getNextWorkingDay = (afterDateStr: string): string => {
  let cursor = addDaysIso(afterDateStr, 1);
  for (let i = 0; i < 14; i++) {
    if (isWorkingDate(cursor).working) return cursor;
    cursor = addDaysIso(cursor, 1);
  }
  return cursor;
};

// Section 6 (LV-004, LV-006): Deterministic Working-Day Calculation Engine
export const calculateLeaveDuration = (
  startDate: string,
  endDate: string,
  partialDay: PartialDayMode = "FULL"
): LeaveDurationCalculation => {
  const days: CalculatedLeaveDay[] = [];
  if (!startDate || !endDate || endDate < startDate) {
    return {
      startDate,
      endDate,
      partialDay,
      chargedDays: 0,
      calendarDays: 0,
      excludedDays: 0,
      resumptionDate: startDate || "2026-11-18",
      days: [],
      calendarVersion: "CAL-GH-ACCRA-2026.v1",
      policyVersion: "POL-ANNUAL-GH-v2.1",
    };
  }

  let cursor = startDate;
  let chargedBp = 0;
  let excludedCount = 0;
  let safety = 0;

  while (cursor <= endDate && safety < 366) {
    safety++;
    const [y, m, d] = cursor.split("-").map(Number);
    const dow = new Date(Date.UTC(y, (m || 1) - 1, d || 1)).getUTCDay();
    const check = isWorkingDate(cursor);

    let dayChargeBp = 0;
    if (check.working) {
      dayChargeBp = partialDay === "FULL" ? 10000 : 5000;
    } else {
      excludedCount++;
    }

    chargedBp += dayChargeBp;
    days.push({
      date: cursor,
      weekdayName: WEEKDAY_NAMES[dow],
      isWorkingDay: check.working,
      chargedQuantity: fromBp(dayChargeBp),
      exclusionReason: check.reason,
    });

    cursor = addDaysIso(cursor, 1);
  }

  return {
    startDate,
    endDate,
    partialDay,
    chargedDays: fromBp(chargedBp),
    calendarDays: days.length,
    excludedDays: excludedCount,
    resumptionDate: getNextWorkingDay(endDate),
    days,
    calendarVersion: "CAL-GH-ACCRA-2026.v1",
    policyVersion: "POL-ANNUAL-GH-v2.1",
  };
};

// Section 4.2 & Section 6: Derive Balance Strictly from Append-Only Ledger Transactions
export const deriveBalanceFromLedger = (
  transactions: LeaveLedgerTransaction[],
  leaveTypeCode: "ANNUAL" | "SICK" | "COMPASSIONATE",
  leaveTypeName: string,
  policyVersionId = "POL-ANNUAL-GH-v2.1"
): DerivedLeaveBalance => {
  const scoped = transactions.filter((t) => t.leaveTypeCode === leaveTypeCode);

  let openingBp = 0;
  let allocatedBp = 0;
  let accruedBp = 0;
  let carryForwardInBp = 0;
  let additionalCreditsBp = 0;
  let reservationHoldsBp = 0;
  let reservationReleasesBp = 0;
  let takenBp = 0;
  let expiredBp = 0;
  let encashedBp = 0;
  let carryForwardOutBp = 0;
  let recallRestoresBp = 0;
  let adjustmentsBp = 0;

  for (const tx of scoped) {
    switch (tx.transactionType) {
      case "OPENING":
        openingBp += tx.quantityBp;
        break;
      case "ALLOCATION":
        allocatedBp += tx.quantityBp;
        break;
      case "ACCRUAL":
        accruedBp += tx.quantityBp;
        break;
      case "CARRY_FORWARD_IN":
        carryForwardInBp += tx.quantityBp;
        break;
      case "ADDITIONAL_CREDIT":
        additionalCreditsBp += tx.quantityBp;
        break;
      case "RESERVATION":
        reservationHoldsBp += tx.quantityBp;
        break;
      case "RESERVATION_RELEASE":
        reservationReleasesBp += tx.quantityBp;
        break;
      case "CONSUMPTION":
      case "LEAVE_TAKEN":
        takenBp += tx.quantityBp;
        break;
      case "EXPIRY":
        expiredBp += tx.quantityBp;
        break;
      case "ENCASHMENT":
        encashedBp += tx.quantityBp;
        break;
      case "CARRY_FORWARD_OUT":
        carryForwardOutBp += tx.quantityBp;
        break;
      case "RECALL_RESTORE":
        recallRestoresBp += tx.quantityBp;
        break;
      case "ADJUSTMENT":
      case "REVERSAL":
        adjustmentsBp += tx.quantityBp;
        break;
    }
  }

  const activeReservationsBp = Math.max(0, reservationHoldsBp - reservationReleasesBp);
  const netTakenBp = Math.max(0, takenBp - recallRestoresBp);

  const earnedBp =
    openingBp +
    allocatedBp +
    accruedBp +
    carryForwardInBp +
    additionalCreditsBp +
    adjustmentsBp;

  // Section 6 Conceptual Balance Formula:
  // Available = eligible earned credits + carry-forward + additional credits
  //           - taken consumption - active approved reservations - expiry/encashment
  const availableBp =
    earnedBp -
    netTakenBp -
    activeReservationsBp -
    expiredBp -
    encashedBp -
    carryForwardOutBp;

  const totalEntitlementBp = Math.max(10000, earnedBp);
  const utilisationPct = Math.min(
    100,
    Math.max(0, Math.round((netTakenBp / totalEntitlementBp) * 100))
  );

  return {
    leaveTypeCode,
    leaveTypeName,
    policyVersionId,
    entitlementPeriod: "FY2026 (2026-01-01 → 2026-12-31)",
    annualEntitlement: fromBp(earnedBp),
    opening: fromBp(openingBp),
    allocated: fromBp(allocatedBp),
    accrued: fromBp(accruedBp),
    carryForwardIn: fromBp(carryForwardInBp),
    additionalCredits: fromBp(additionalCreditsBp),
    reserved: fromBp(activeReservationsBp),
    taken: fromBp(netTakenBp),
    expired: fromBp(expiredBp),
    encashed: fromBp(encashedBp),
    adjustments: fromBp(adjustmentsBp),
    earnedBalance: fromBp(earnedBp),
    availableBalance: fromBp(availableBp),
    utilisationPct,
  };
};

// Initial Seeded Append-Only Ledger Transactions for the Authenticated Employee
export const INITIAL_LEAVE_LEDGER_TRANSACTIONS: LeaveLedgerTransaction[] = [
  {
    id: "LTX-2026-001",
    employeeId: "EMP-PKB-001",
    leaveTypeCode: "ANNUAL",
    entitlementPeriodId: "PER-2026-ANNUAL",
    transactionType: "CARRY_FORWARD_IN",
    quantityBp: toBp(3),
    effectiveDate: "2026-01-01",
    sourceType: "CARRY_FORWARD_RUN",
    sourceId: "CF-2025-2026",
    policyVersionId: "POL-ANNUAL-GH-v2.1",
    reason: "Approved FY2025 carry-forward within 5-day statutory cap",
    createdBy: "System Carry-Forward Engine",
    createdAt: "2026-01-01T00:05:00Z",
  },
  {
    id: "LTX-2026-002",
    employeeId: "EMP-PKB-001",
    leaveTypeCode: "ANNUAL",
    entitlementPeriodId: "PER-2026-ANNUAL",
    transactionType: "ALLOCATION",
    quantityBp: toBp(20),
    effectiveDate: "2026-01-01",
    sourceType: "ENTITLEMENT_ALLOCATION",
    sourceId: "ALLOC-2026-H1",
    policyVersionId: "POL-ANNUAL-GH-v2.1",
    reason: "FY2026 annual entitlement allocation (Ghana Labour Act 651 compliant)",
    createdBy: "System Entitlement Engine",
    createdAt: "2026-01-01T00:10:00Z",
  },
  {
    id: "LTX-2026-003",
    employeeId: "EMP-PKB-001",
    leaveTypeCode: "ANNUAL",
    entitlementPeriodId: "PER-2026-ANNUAL",
    transactionType: "ADDITIONAL_CREDIT",
    quantityBp: toBp(2),
    effectiveDate: "2026-04-01",
    sourceType: "ADDITIONAL_CREDIT_GRANT",
    sourceId: "ACG-2026-014",
    policyVersionId: "POL-ANNUAL-GH-v2.1",
    reason: "Compensatory credit for Easter weekend production cutover stewardship",
    createdBy: "Jemima Richards (HR Director)",
    createdAt: "2026-04-02T09:30:00Z",
  },
  {
    id: "LTX-2026-004",
    employeeId: "EMP-PKB-001",
    leaveTypeCode: "ANNUAL",
    entitlementPeriodId: "PER-2026-ANNUAL",
    transactionType: "RESERVATION",
    quantityBp: toBp(10),
    effectiveDate: "2026-05-02",
    sourceType: "LEAVE_APPLICATION",
    sourceId: "APP-2026-001",
    policyVersionId: "POL-ANNUAL-GH-v2.1",
    reason: "Atomic reservation on approval of APP-2026-001 (2026-06-15 → 2026-06-26)",
    createdBy: "Sarah Jenkins (Line Manager)",
    createdAt: "2026-05-02T14:20:00Z",
  },
  {
    id: "LTX-2026-005",
    employeeId: "EMP-PKB-001",
    leaveTypeCode: "SICK",
    entitlementPeriodId: "PER-2026-SICK",
    transactionType: "ALLOCATION",
    quantityBp: toBp(10),
    effectiveDate: "2026-01-01",
    sourceType: "ENTITLEMENT_ALLOCATION",
    sourceId: "ALLOC-2026-SICK",
    policyVersionId: "POL-SICK-GH-v1.4",
    reason: "FY2026 paid medical / sick leave entitlement",
    createdBy: "System Entitlement Engine",
    createdAt: "2026-01-01T00:10:00Z",
  },
  {
    id: "LTX-2026-006",
    employeeId: "EMP-PKB-001",
    leaveTypeCode: "SICK",
    entitlementPeriodId: "PER-2026-SICK",
    transactionType: "LEAVE_TAKEN",
    quantityBp: toBp(2),
    effectiveDate: "2026-03-16",
    sourceType: "LEAVE_RESUMPTION",
    sourceId: "APP-2026-002",
    policyVersionId: "POL-SICK-GH-v1.4",
    reason: "Confirmed consumption upon return from 2-day medical leave (APP-2026-002)",
    createdBy: "Marcus Chen (Line Manager)",
    createdAt: "2026-03-16T08:45:00Z",
  },
  {
    id: "LTX-2026-007",
    employeeId: "EMP-PKB-001",
    leaveTypeCode: "COMPASSIONATE",
    entitlementPeriodId: "PER-2026-COMP",
    transactionType: "ALLOCATION",
    quantityBp: toBp(5),
    effectiveDate: "2026-01-01",
    sourceType: "ENTITLEMENT_ALLOCATION",
    sourceId: "ALLOC-2026-COMP",
    policyVersionId: "POL-COMP-GH-v1.0",
    reason: "FY2026 bereavement & family compassionate entitlement",
    createdBy: "System Entitlement Engine",
    createdAt: "2026-01-01T00:10:00Z",
  },
];
